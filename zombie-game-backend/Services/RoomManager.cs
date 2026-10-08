using System.Collections.Concurrent;
using zombie_game_backend.Models;

namespace zombie_game_backend.Services;

public class GameRoomSession
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int MaxPlayers { get; set; } = 32;
    public bool IsPrivate { get; set; }
    public string? Password { get; set; }
    public string HostConnectionId { get; set; } = string.Empty;
    public string HostNickname { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ConcurrentDictionary<string, PlayerNetworkState> Players { get; } = new();

    public RoomSummaryDto ToSummary()
    {
        return new RoomSummaryDto
        {
            RoomId = Id,
            Name = Name,
            CurrentPlayers = Players.Count,
            MaxPlayers = MaxPlayers,
            IsPrivate = IsPrivate,
            HostNickname = HostNickname,
            CreatedAt = CreatedAt
        };
    }
}

public class RoomManager : IRoomManager
{
    private const string GlobalRoomId = "GLOBAL";
    private readonly ConcurrentDictionary<string, GameRoomSession> _rooms = new();
    private readonly ConcurrentDictionary<string, string> _playerToRoom = new();
    private readonly ConcurrentDictionary<string, PlayerNetworkState> _playerStates = new();

    public RoomManager()
    {
        // Inicializar la sala global pública persistente
        GetOrCreateGlobalRoom();
    }

    public RoomSummaryDto GetOrCreateGlobalRoom()
    {
        var globalRoom = _rooms.GetOrAdd(GlobalRoomId, id => new GameRoomSession
        {
            Id = id,
            Name = "Sala Global (Mundo Abierto)",
            MaxPlayers = 128,
            IsPrivate = false,
            HostNickname = "Servidor",
            CreatedAt = DateTime.UtcNow
        });

        return globalRoom.ToSummary();
    }

    public (bool Success, string Message, RoomSummaryDto? Room) CreateRoom(
        string name, 
        int maxPlayers, 
        bool isPrivate, 
        string? password, 
        string hostConnectionId, 
        string hostNickname)
    {
        if (string.IsNullOrWhiteSpace(name))
            return (false, "El nombre de la sala no puede estar vacío.", null);

        if (maxPlayers is < 2 or > 64)
            maxPlayers = 16;

        var roomId = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
        var session = new GameRoomSession
        {
            Id = roomId,
            Name = name.Trim(),
            MaxPlayers = maxPlayers,
            IsPrivate = isPrivate,
            Password = string.IsNullOrWhiteSpace(password) ? null : password.Trim(),
            HostConnectionId = hostConnectionId,
            HostNickname = hostNickname,
            CreatedAt = DateTime.UtcNow
        };

        if (!_rooms.TryAdd(roomId, session))
            return (false, "No se pudo registrar la sala.", null);

        return (true, "Sala creada con éxito.", session.ToSummary());
    }

    public (bool Success, string Message, RoomSummaryDto? Room) JoinRoom(
        string roomId, 
        string connectionId, 
        string nickname, 
        string? password = null)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            roomId = GlobalRoomId;

        roomId = roomId.Trim().ToUpperInvariant();

        if (!_rooms.TryGetValue(roomId, out var room))
        {
            if (roomId == GlobalRoomId)
            {
                GetOrCreateGlobalRoom();
                room = _rooms[GlobalRoomId];
            }
            else
            {
                return (false, "La sala especificada no existe.", null);
            }
        }

        if (room.IsPrivate && !string.IsNullOrEmpty(room.Password))
        {
            if (room.Password != password)
                return (false, "Contraseña de sala incorrecta.", null);
        }

        if (room.Players.Count >= room.MaxPlayers)
            return (false, "La sala está llena.", null);

        // Si el jugador ya estaba en otra sala, sacarlo
        LeaveRoom(connectionId);

        var playerState = _playerStates.GetOrAdd(connectionId, id => new PlayerNetworkState
        {
            ConnectionId = id,
            Nickname = string.IsNullOrWhiteSpace(nickname) ? "Superviviente" : nickname.Trim(),
            Health = 100f,
            MaxHealth = 100f
        });
        playerState.Nickname = string.IsNullOrWhiteSpace(nickname) ? playerState.Nickname : nickname.Trim();

        room.Players[connectionId] = playerState;
        _playerToRoom[connectionId] = roomId;

        return (true, "Conectado a la sala.", room.ToSummary());
    }

    public (string? RoomId, string? Nickname) LeaveRoom(string connectionId)
    {
        if (!_playerToRoom.TryRemove(connectionId, out var roomId))
            return (null, null);

        string? nickname = null;
        if (_playerStates.TryGetValue(connectionId, out var state))
            nickname = state.Nickname;

        if (_rooms.TryGetValue(roomId, out var room))
        {
            room.Players.TryRemove(connectionId, out _);

            // Si es una sala personalizada y quedó vacía, eliminarla para liberar memoria
            if (roomId != GlobalRoomId && room.Players.IsEmpty)
            {
                _rooms.TryRemove(roomId, out _);
            }
        }

        _playerStates.TryRemove(connectionId, out _);
        return (roomId, nickname);
    }

    public string? GetPlayerRoom(string connectionId)
    {
        return _playerToRoom.TryGetValue(connectionId, out var roomId) ? roomId : null;
    }

    public List<RoomSummaryDto> GetPublicRooms()
    {
        return _rooms.Values
            .Where(r => !r.IsPrivate || r.Id == GlobalRoomId)
            .OrderByDescending(r => r.Id == GlobalRoomId)
            .ThenByDescending(r => r.Players.Count)
            .Select(r => r.ToSummary())
            .ToList();
    }

    public List<PlayerNetworkState> GetPlayersInRoom(string roomId)
    {
        if (string.IsNullOrWhiteSpace(roomId))
            roomId = GlobalRoomId;

        roomId = roomId.Trim().ToUpperInvariant();

        return _rooms.TryGetValue(roomId, out var room) 
            ? room.Players.Values.ToList() 
            : new List<PlayerNetworkState>();
    }

    public void UpdatePlayerState(string connectionId, PlayerNetworkState state)
    {
        state.ConnectionId = connectionId;
        _playerStates[connectionId] = state;

        if (_playerToRoom.TryGetValue(connectionId, out var roomId) && _rooms.TryGetValue(roomId, out var room))
        {
            room.Players[connectionId] = state;
        }
    }

    public PlayerNetworkState? GetPlayerState(string connectionId)
    {
        return _playerStates.TryGetValue(connectionId, out var state) ? state : null;
    }
}
