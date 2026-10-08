# Zombie Game Multiplayer Backend (.NET + SignalR + PostgreSQL)

Backend en tiempo real para el juego de supervivencia zombi con arquitectura de salas, chat y sincronización física/entorno.

## Tecnologías
- **ASP.NET Core (SignalR):** WebSockets para sincronización de alto rendimiento.
- **PostgreSQL:** Persistencia de jugadores, historial de salas y mensajes de chat.
- **Entity Framework Core (Npgsql):** ORM con inicialización y esquemas automáticos.
- **Docker & Docker Compose:** Listo para desplegar en servidores de producción.

---

## Cómo Ejecutar

### Opción 1: Con Docker Compose (Recomendado)
Levanta PostgreSQL y el backend con un solo comando:
```bash
docker compose up -d --build
```
- API y WebSockets disponibles en: `http://localhost:5000`
- Base de datos PostgreSQL en puerto `5432`

Para detener:
```bash
docker compose down
```

### Opción 2: Desarrollo Local (.NET CLI)
```bash
dotnet restore
dotnet run
```
*Nota: Si PostgreSQL no está corriendo localmente, el servidor iniciará en modo resiliente con salas y estado en memoria.*

---

## SignalR Hub: `/hubs/game`

### Métodos Cliente -> Servidor (Invocables con `.invoke()`)
| Método | Parámetros | Descripción |
| :--- | :--- | :--- |
| `SetNickname` | `nickname: string` | Establece el nombre del jugador y lo persiste en PostgreSQL. |
| `JoinGlobalRoom` | *(ninguno)* | Se une directamente a la sala global abierta `"GLOBAL"`. |
| `CreateRoom` | `name: string, maxPlayers: int, isPrivate: bool, password?: string` | Crea una sala personalizada y une al anfitrión. |
| `JoinRoom` | `roomId: string, password?: string` | Se une a una sala existente por ID. |
| `LeaveCurrentRoom` | *(ninguno)* | Sale de la sala actual y regresa al lobby. |
| `SendPlayerState` | `state: PlayerNetworkState` | Sincroniza posición (x,y,z), giro, velocidad, animación y vehículo. |
| `SendVehicleState` | `state: VehicleNetworkState` | Sincroniza la física y daños del coche conducido. |
| `SendZombieHit` | `hit: ZombieHitNetworkEvent` | Sincroniza el daño/muerte de zombis y ragdolls por atropello. |
| `SendChatMessage` | `message: string, channel: string, posX?: float, posZ?: float` | Envía mensaje de chat (sala, global o proximidad). |
| `GetRoomList` | *(ninguno)* | Obtiene el listado de salas públicas disponibles. |

### Eventos Servidor -> Cliente (Escuchables con `.on()`)
| Evento | Parámetros | Descripción |
| :--- | :--- | :--- |
| `OnNicknameConfirmed` | `nickname: string` | Confirmación del nombre de usuario. |
| `OnJoinedRoom` | `room: RoomSummaryDto, players: PlayerNetworkState[]` | Notificación de ingreso con lista de jugadores. |
| `OnPlayerJoined` | `player: PlayerNetworkState` | Un nuevo jugador entró a la sala. |
| `OnPlayerLeft` | `connectionId: string, nickname: string` | Un jugador salió de la sala. |
| `OnRemotePlayerUpdate` | `state: PlayerNetworkState` | Actualización de posición/animación de otro jugador. |
| `OnRemoteVehicleUpdate` | `state: VehicleNetworkState` | Actualización de posición/estado de vehículo remoto. |
| `OnZombieHitEvent` | `hit: ZombieHitNetworkEvent` | Evento de daño o atropello de zombi recibido. |
| `OnReceiveChatMessage` | `msg: ChatMessageDto` | Mensaje de chat recibido. |
| `OnRoomListUpdated` | `rooms: RoomSummaryDto[]` | Notificación cuando se crea/cierra una sala. |
| `OnError` | `errorMessage: string` | Mensaje de error (sala llena, contraseña errónea, etc.). |

---

## Endpoints REST
- `GET /` -> Información del servicio y versión.
- `GET /api/health` -> Chequeo de salud del servicio y estado de conexión a PostgreSQL.
- `GET /api/rooms` -> Listado JSON de salas activas.
- `GET /api/stats` -> Jugadores online y salas activas.
