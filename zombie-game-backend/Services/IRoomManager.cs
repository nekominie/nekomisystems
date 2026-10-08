using zombie_game_backend.Models;

namespace zombie_game_backend.Services;

public interface IRoomManager
{
    RoomSummaryDto GetOrCreateGlobalRoom();
    
    (bool Success, string Message, RoomSummaryDto? Room) CreateRoom(
        string name, 
        int maxPlayers, 
        bool isPrivate, 
        string? password, 
        string hostConnectionId, 
        string hostNickname);
        
    (bool Success, string Message, RoomSummaryDto? Room) JoinRoom(
        string roomId, 
        string connectionId, 
        string nickname, 
        string? password = null);
        
    (string? RoomId, string? Nickname) LeaveRoom(string connectionId);
    
    string? GetPlayerRoom(string connectionId);
    
    List<RoomSummaryDto> GetPublicRooms();
    
    List<PlayerNetworkState> GetPlayersInRoom(string roomId);
    
    void UpdatePlayerState(string connectionId, PlayerNetworkState state);
    
    PlayerNetworkState? GetPlayerState(string connectionId);
}
