using Microsoft.EntityFrameworkCore;
using zombie_game_backend.Data;
using zombie_game_backend.Hubs;
using zombie_game_backend.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Configuración de Base de Datos PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=zombiedb;Username=postgres;Password=postgres";

builder.Services.AddDbContext<GameDbContext>(options =>
{
    options.UseNpgsql(connectionString);
});

// 2. Registro de Servicios del Juego
builder.Services.AddSingleton<IRoomManager, RoomManager>();

// 3. Configuración de SignalR para WebSockets en tiempo real
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 64 * 1024; // 64 KB por paquete
});

// 4. Configuración de CORS para el Frontend (Vite / Vue 3)
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() 
    ?? new[] { "http://localhost:5173", "http://127.0.0.1:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("GameCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Obligatorio para WebSockets y SignalR
    });
});

var app = builder.Build();

// 5. Inicialización Resiliente de Base de Datos
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    var db = scope.ServiceProvider.GetService<GameDbContext>();
    if (db != null)
    {
        try
        {
            logger.LogInformation("Verificando conexión con PostgreSQL...");
            if (db.Database.CanConnect())
            {
                db.Database.EnsureCreated();
                logger.LogInformation("Base de datos PostgreSQL inicializada y esquemas listos.");
            }
            else
            {
                logger.LogWarning("No se pudo conectar a PostgreSQL. El servidor operará con salas y partidas en memoria.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning("PostgreSQL no disponible actualmente ({Message}). El servidor funcionará en modo memoria.", ex.Message);
        }
    }
}

// 6. Pipeline HTTP
app.UseCors("GameCorsPolicy");

// 7. Mapeo del Hub de SignalR
app.MapHub<GameHub>("/hubs/game");

// 8. Endpoints REST de Monitoreo e Información
app.MapGet("/", () => Results.Ok(new
{
    service = "Zombie Game Multiplayer Backend",
    status = "running",
    version = "1.0.0",
    signalr_hub = "/hubs/game"
}));

app.MapGet("/api/health", (GameDbContext? db) =>
{
    bool dbConnected = false;
    try
    {
        dbConnected = db != null && db.Database.CanConnect();
    }
    catch
    {
        dbConnected = false;
    }

    return Results.Ok(new
    {
        status = "healthy",
        timestamp = DateTime.UtcNow,
        database_connected = dbConnected
    });
});

app.MapGet("/api/rooms", (IRoomManager roomManager) =>
{
    return Results.Ok(roomManager.GetPublicRooms());
});

app.MapGet("/api/stats", (IRoomManager roomManager) =>
{
    var rooms = roomManager.GetPublicRooms();
    var totalPlayers = rooms.Sum(r => r.CurrentPlayers);
    return Results.Ok(new
    {
        active_rooms = rooms.Count,
        online_players = totalPlayers,
        server_time = DateTime.UtcNow
    });
});

app.Run();
