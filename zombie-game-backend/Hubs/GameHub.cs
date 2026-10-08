using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using zombie_game_backend.Data;
using zombie_game_backend.Data.Entities;
using zombie_game_backend.Models;
using zombie_game_backend.Services;

namespace zombie_game_backend.Hubs;

public class GameHub : Hub
{
    private readonly IRoomManager _roomManager;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GameHub> _logger;

    public GameHub(
        IRoomManager roomManager, 
        IServiceScopeFactory scopeFactory,
        ILogger<GameHub> logger)
    {
        _roomManager = roomManager;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    /// <summary>
    /// Establece el nombre de usuario del jugador y lo persiste en PostgreSQL.
    /// </summary>
    public async Task SetNickname(string nickname)
    {
        var cleanNick = string.IsNullOrWhiteSpace(nickname) ? "Superviviente" : nickname.Trim();
        if (cleanNick.Length > 32) cleanNick = cleanNick[..32];

        Context.Items["Nickname"] = cleanNick;

        // Persistir o actualizar jugador en la base de datos de forma asíncrona
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<GameDbContext>();
                if (db != null && await db.Database.CanConnectAsync())
                {
                    var existing = await db.Players.FirstOrDefaultAsync(p => p.Nickname == cleanNick);
                    if (existing == null)
                    {
                        db.Players.Add(new PlayerEntity
                        {
                            Nickname = cleanNick,
                            CreatedAt = DateTime.UtcNow,
                            LastSeenAt = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        existing.LastSeenAt = DateTime.UtcNow;
                    }
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error guardando jugador {Nick} en base de datos", cleanNick);
            }
        });

        await Clients.Caller.SendAsync("OnNicknameConfirmed", cleanNick);
    }

    /// <summary>
    /// Unirse directamente a la sala global abierta.
    /// </summary>
    public async Task JoinGlobalRoom()
    {
        await JoinRoom("GLOBAL", null);
    }

    /// <summary>
    /// Crea una nueva sala personalizada.
    /// </summary>
    public async Task CreateRoom(string name, int maxPlayers, bool isPrivate, string? password)
    {
        var nickname = GetCurrentNickname();
        var (success, message, room) = _roomManager.CreateRoom(
            name, maxPlayers, isPrivate, password, Context.ConnectionId, nickname);

        if (!success || room == null)
        {
            await Clients.Caller.SendAsync("OnError", message);
            return;
        }

        await JoinRoom(room.RoomId, password);
        await BroadcastRoomListUpdated();
    }

    /// <summary>
    /// Unirse a una sala específica mediante su identificador.
    /// </summary>
    public async Task JoinRoom(string roomId, string? password = null)
    {
        var nickname = GetCurrentNickname();
        var (success, message, room) = _roomManager.JoinRoom(roomId, Context.ConnectionId, nickname, password);

        if (!success || room == null)
        {
            await Clients.Caller.SendAsync("OnError", message);
            return;
        }

        // Agregar la conexión al grupo de SignalR
        await Groups.AddToGroupAsync(Context.ConnectionId, room.RoomId);

        // Obtener jugadores actuales en la sala
        var playersInRoom = _roomManager.GetPlayersInRoom(room.RoomId);

        // Notificar al jugador que ingresó con los datos de la sala y los jugadores presentes
        await Clients.Caller.SendAsync("OnJoinedRoom", room, playersInRoom);

        // Notificar a los demás jugadores de la sala sobre el nuevo participante
        var myState = _roomManager.GetPlayerState(Context.ConnectionId);
        if (myState != null)
        {
            await Clients.OthersInGroup(room.RoomId).SendAsync("OnPlayerJoined", myState);
        }

        // Mensaje de sistema en el chat de la sala
        var systemMsg = new ChatMessageDto
        {
            RoomId = room.RoomId,
            SenderName = "Sistema",
            SenderConnectionId = "system",
            Message = $"{nickname} se ha unido a la partida.",
            Channel = "system",
            Timestamp = DateTime.UtcNow
        };
        await Clients.Group(room.RoomId).SendAsync("OnReceiveChatMessage", systemMsg);

        await BroadcastRoomListUpdated();
    }

    /// <summary>
    /// Abandona la sala actual.
    /// </summary>
    public async Task LeaveCurrentRoom()
    {
        var (roomId, nickname) = _roomManager.LeaveRoom(Context.ConnectionId);
        if (string.IsNullOrEmpty(roomId)) return;

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

        var leaveMsg = new ChatMessageDto
        {
            RoomId = roomId,
            SenderName = "Sistema",
            SenderConnectionId = "system",
            Message = $"{nickname ?? "Un superviviente"} ha salido de la partida.",
            Channel = "system",
            Timestamp = DateTime.UtcNow
        };

        await Clients.Group(roomId).SendAsync("OnPlayerLeft", Context.ConnectionId, nickname ?? "Superviviente");
        await Clients.Group(roomId).SendAsync("OnReceiveChatMessage", leaveMsg);

        await BroadcastRoomListUpdated();
    }

    /// <summary>
    /// Sincroniza la posición, rotación, velocidad y animación del jugador.
    /// Retransmite a los demás jugadores en la misma sala.
    /// </summary>
    public async Task SendPlayerState(PlayerNetworkState state)
    {
        var roomId = _roomManager.GetPlayerRoom(Context.ConnectionId);
        if (string.IsNullOrEmpty(roomId)) return;

        state.ConnectionId = Context.ConnectionId;
        state.Nickname = GetCurrentNickname();
        state.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        _roomManager.UpdatePlayerState(Context.ConnectionId, state);

        // Reenvío de baja latencia a los demás miembros de la sala
        await Clients.OthersInGroup(roomId).SendAsync("OnRemotePlayerUpdate", state);
    }

    /// <summary>
    /// Sincroniza las físicas y estado del vehículo conducido por el jugador.
    /// </summary>
    public async Task SendVehicleState(VehicleNetworkState state)
    {
        var roomId = _roomManager.GetPlayerRoom(Context.ConnectionId);
        if (string.IsNullOrEmpty(roomId)) return;

        state.DriverConnectionId = Context.ConnectionId;
        state.DriverNickname = GetCurrentNickname();
        state.Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        await Clients.OthersInGroup(roomId).SendAsync("OnRemoteVehicleUpdate", state);
    }

    /// <summary>
    /// Notifica un golpe, daño o muerte sobre un zombi (incluye atropellos con física ragdoll).
    /// </summary>
    public async Task SendZombieHit(ZombieHitNetworkEvent hit)
    {
        var roomId = _roomManager.GetPlayerRoom(Context.ConnectionId);
        if (string.IsNullOrEmpty(roomId)) return;

        hit.AttackerConnectionId = Context.ConnectionId;
        hit.AttackerNickname = GetCurrentNickname();

        await Clients.Group(roomId).SendAsync("OnZombieHitEvent", hit);
    }

    /// <summary>
    /// Envío de mensaje de chat (global, de sala o de proximidad).
    /// </summary>
    public async Task SendChatMessage(string message, string channel = "room", float? posX = null, float? posZ = null)
    {
        if (string.IsNullOrWhiteSpace(message)) return;

        var cleanMsg = message.Trim();
        if (cleanMsg.Length > 256) cleanMsg = cleanMsg[..256];

        var nickname = GetCurrentNickname();
        var roomId = _roomManager.GetPlayerRoom(Context.ConnectionId) ?? "GLOBAL";

        var chatDto = new ChatMessageDto
        {
            RoomId = roomId,
            SenderName = nickname,
            SenderConnectionId = Context.ConnectionId,
            Message = cleanMsg,
            Channel = channel.ToLowerInvariant(),
            Timestamp = DateTime.UtcNow,
            PosX = posX,
            PosZ = posZ
        };

        // Persistir en base de datos PostgreSQL
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetService<GameDbContext>();
                if (db != null && await db.Database.CanConnectAsync())
                {
                    db.ChatMessages.Add(new ChatMessageEntity
                    {
                        RoomId = roomId,
                        SenderName = nickname,
                        SenderConnectionId = Context.ConnectionId,
                        Message = cleanMsg,
                        Channel = chatDto.Channel,
                        CreatedAt = DateTime.UtcNow
                    });
                    await db.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error guardando mensaje de chat en PostgreSQL");
            }
        });

        if (chatDto.Channel == "global")
        {
            await Clients.All.SendAsync("OnReceiveChatMessage", chatDto);
        }
        else
        {
            // Retransmisión a la sala (los clientes pueden atenuar si es proximidad usando PosX / PosZ)
            await Clients.Group(roomId).SendAsync("OnReceiveChatMessage", chatDto);
        }
    }

    /// <summary>
    /// Devuelve la lista de salas públicas disponibles.
    /// </summary>
    public Task<List<RoomSummaryDto>> GetRoomList()
    {
        return Task.FromResult(_roomManager.GetPublicRooms());
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await LeaveCurrentRoom();
        await base.OnDisconnectedAsync(exception);
    }

    private string GetCurrentNickname()
    {
        if (Context.Items.TryGetValue("Nickname", out var nickObj) && nickObj is string nick && !string.IsNullOrWhiteSpace(nick))
        {
            return nick;
        }
        return "Superviviente";
    }

    private async Task BroadcastRoomListUpdated()
    {
        var publicRooms = _roomManager.GetPublicRooms();
        await Clients.All.SendAsync("OnRoomListUpdated", publicRooms);
    }
}
