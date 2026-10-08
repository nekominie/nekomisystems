namespace zombie_game_backend.Models;

/// <summary>
/// Paquete de estado de red enviado por el jugador (posición, rotación, animación y estado de vehículo).
/// </summary>
public class PlayerNetworkState
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Nickname { get; set; } = string.Empty;
    
    // Coordenadas espaciales 3D
    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }
    
    // Orientación y giro
    public float Heading { get; set; }
    public float Steer { get; set; }
    public float Speed { get; set; }
    
    // Estados de animación y movimiento
    public bool IsMoving { get; set; }
    public bool IsRunning { get; set; }
    public string CurrentAnim { get; set; } = "idle";
    
    // Estado vital
    public float Health { get; set; } = 100f;
    public float MaxHealth { get; set; } = 100f;
    
    // Interacción con vehículos
    public bool IsInVehicle { get; set; }
    public string? VehicleId { get; set; }
    public int VehicleSeat { get; set; } = 0; // 0 = conductor, 1 = pasajero
    
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

/// <summary>
/// Estado físico y visual del vehículo transmitido por el conductor.
/// </summary>
public class VehicleNetworkState
{
    public string VehicleId { get; set; } = string.Empty;
    public string DriverConnectionId { get; set; } = string.Empty;
    public string DriverNickname { get; set; } = string.Empty;
    
    public float X { get; set; }
    public float Y { get; set; }
    public float Z { get; set; }
    public float Heading { get; set; }
    public float Speed { get; set; }
    public float Steer { get; set; }
    
    public float Durability { get; set; }
    public float MaxDurability { get; set; }
    public float Fuel { get; set; }
    public bool IsEngineRunning { get; set; }
    
    public long Timestamp { get; set; } = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
}

/// <summary>
/// Evento de impacto o muerte sobre un zombi (daño, empuje, atropello con ragdoll).
/// </summary>
public class ZombieHitNetworkEvent
{
    public string ZombieId { get; set; } = string.Empty;
    public string AttackerConnectionId { get; set; } = string.Empty;
    public string AttackerNickname { get; set; } = string.Empty;
    public float Damage { get; set; }
    
    // Vector de impulso físico (ragdoll)
    public float ImpulseX { get; set; }
    public float ImpulseY { get; set; }
    public float ImpulseZ { get; set; }
    
    public bool IsKilled { get; set; }
    public bool IsCarHit { get; set; }
    public string? CarId { get; set; }
}

/// <summary>
/// Mensaje de chat en tiempo real.
/// </summary>
public class ChatMessageDto
{
    public long Id { get; set; }
    public string RoomId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string SenderConnectionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Channel { get; set; } = "room"; // "room", "global", "proximity", "system"
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Coordenadas para chat por proximidad
    public float? PosX { get; set; }
    public float? PosZ { get; set; }
}

/// <summary>
/// Resumen de información de una sala de juego.
/// </summary>
public class RoomSummaryDto
{
    public string RoomId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int CurrentPlayers { get; set; }
    public int MaxPlayers { get; set; }
    public bool IsPrivate { get; set; }
    public string HostNickname { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
