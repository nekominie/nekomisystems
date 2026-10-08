namespace zombie_game_backend.Data.Entities;

public class ChatMessageEntity
{
    public long Id { get; set; }
    public string RoomId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string SenderConnectionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Channel { get; set; } = "room"; // "global", "room", "proximity"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
