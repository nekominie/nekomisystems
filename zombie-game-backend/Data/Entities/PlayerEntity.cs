namespace zombie_game_backend.Data.Entities;

public class PlayerEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Nickname { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public int Kills { get; set; } = 0;
    public int Deaths { get; set; } = 0;
    public int Score { get; set; } = 0;
}
