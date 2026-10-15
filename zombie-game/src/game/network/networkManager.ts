import * as signalR from '@microsoft/signalr';
import type {
  ConnectionStatus,
  PlayerNetworkState,
  VehicleNetworkState,
  ZombieHitNetworkEvent,
  ChatMessageDto,
  RoomSummaryDto,
  VehicleSpawnDto,
  ItemDropDto,
  PlayerShotNetworkEvent,
} from './networkTypes';

export type NetworkEventHandler<T> = (data: T) => void;

/**
 * URL por defecto del backend multijugador.
 * - Prioridad 1: variable de build `VITE_GAME_SERVER_URL` (configurar al compilar).
 * - Desarrollo local: `http://localhost:5000`.
 * - Producción: subdominio dedicado del backend (Cloudflare → Docker).
 */
const DEV_SERVER_URL = 'http://localhost:5000';
const PROD_SERVER_URL = 'https://zombie-api.nekomisystems.com';

export const DEFAULT_SERVER_URL: string =
  (import.meta.env.VITE_GAME_SERVER_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? DEV_SERVER_URL : PROD_SERVER_URL);

/**
 * URL de servidor recordada del navegador (la que el usuario escribió en
 * "Avanzado"). En PRODUCCIÓN se ignoran valores de localhost: son restos de
 * pruebas locales y romperían la conexión para cualquier visitante.
 */
export function getSavedServerUrl(): string {
  const saved = localStorage.getItem('zombie_game_server')?.trim() || '';
  if (!saved) return DEFAULT_SERVER_URL;
  if (!import.meta.env.DEV && /^https?:\/\/(localhost|127\.|0\.0\.0\.0)/i.test(saved)) {
    return DEFAULT_SERVER_URL;
  }
  return saved;
}

export class NetworkManager {
  private hub: signalR.HubConnection | null = null;
  private serverUrl = DEFAULT_SERVER_URL;
  private _status: ConnectionStatus = 'disconnected';
  private _currentNickname = 'Superviviente';
  private _currentRoom: RoomSummaryDto | null = null;
  private _currentRoomPlayers: PlayerNetworkState[] = [];
  private _connectionId: string | null = null;

  // Tasa de transmisión (15-20 Hz -> ~50-66ms)
  private lastStateSentTime = 0;
  private readonly SEND_INTERVAL_MS = 55;

  // Event callbacks
  public onStatusChange?: (status: ConnectionStatus, message?: string) => void;
  public onNicknameConfirmed?: (nick: string) => void;
  public onJoinedRoom?: (room: RoomSummaryDto, players: PlayerNetworkState[]) => void;
  public onPlayerJoined?: (player: PlayerNetworkState) => void;
  public onPlayerLeft?: (connectionId: string, nickname: string) => void;
  public onRemotePlayerUpdate?: (state: PlayerNetworkState) => void;
  public onRemoteVehicleUpdate?: (state: VehicleNetworkState) => void;
  public onZombieHitEvent?: (hit: ZombieHitNetworkEvent) => void;
  public onReceiveChatMessage?: (msg: ChatMessageDto) => void;
  public onRoomListUpdated?: (rooms: RoomSummaryDto[]) => void;
  public onZombieAlertEvent?: (zombieId: string, x: number, z: number) => void;
  public onZombieSpawnEvent?: (spawn: any) => void;
  public onZombieSyncBatch?: (zombies: any[]) => void;
  public onDayNightSyncEvent?: (time: number) => void;
  public onVehicleSpawnEvent?: (spawn: VehicleSpawnDto) => void;
  public onZombieClearEvent?: (x: number, z: number, radius: number) => void;
  public chatMessages: ChatMessageDto[] = [];
  public onItemDropEvent?: (drop: ItemDropDto) => void;
  public onItemPickupEvent?: (dropId: string) => void;
  public onPlayerShotEvent?: (shot: PlayerShotNetworkEvent) => void;
  public onError?: (errorMessage: string) => void;

  private _listeners: Record<string, ((...args: any[]) => void)[]> = {};

  public on(event: string, listener: (...args: any[]) => void): () => void {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(listener);
    return () => this.off(event, listener);
  }

  public off(event: string, listener: (...args: any[]) => void): void {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter((l) => l !== listener);
  }

  public emit(event: string, ...args: any[]): void {
    const list = this._listeners[event];
    if (list) {
      for (const fn of list) {
        try {
          fn(...args);
        } catch (err) {
          console.error(`[NetworkManager] Error in listener for event "${event}":`, err);
        }
      }
    }
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected' && this.hub?.state === signalR.HubConnectionState.Connected;
  }

  get currentNickname(): string {
    const saved = localStorage.getItem('zombie_game_nick')?.trim();
    if (saved && saved !== this._currentNickname) {
      this._currentNickname = saved;
    }
    return this._currentNickname;
  }

  get currentRoom(): RoomSummaryDto | null {
    return this._currentRoom;
  }

  get currentRoomPlayers(): PlayerNetworkState[] {
    return this._currentRoomPlayers;
  }

  get connectionId(): string | null {
    return this._connectionId;
  }

  private setStatus(status: ConnectionStatus, msg?: string) {
    this._status = status;
    this.onStatusChange?.(status, msg);
    this.emit('statusChange', status, msg);
  }

  /**
   * Conecta al backend SignalR mediante WebSockets.
   */
  async connect(serverUrl = DEFAULT_SERVER_URL, nickname?: string): Promise<boolean> {
    const desiredNick = (nickname?.trim() || localStorage.getItem('zombie_game_nick')?.trim() || this._currentNickname || 'Superviviente');

    if (this.isConnected) {
      if (desiredNick && desiredNick !== this._currentNickname) {
        await this.setNickname(desiredNick);
      }
      return true;
    }

    this.serverUrl = serverUrl.replace(/\/+$/, '');
    this._currentNickname = desiredNick;
    this.setStatus('connecting');

    try {
      this.hub = new signalR.HubConnectionBuilder()
        .withUrl(`${this.serverUrl}/hubs/game`, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.registerEvents();

      await this.hub.start();
      this._connectionId = this.hub.connectionId ?? null;
      this.setStatus('connected');

      // Establecer nickname inicial
      await this.setNickname(this._currentNickname);

      return true;
    } catch (err: any) {
      console.warn(`[NetworkManager] Error conectando a SignalR en ${this.serverUrl}:`, err);
      this.setStatus('error', `${err?.message ?? 'No se pudo conectar'} (${this.serverUrl})`);
      return false;
    }
  }

  /**
   * Desconecta limpiamente del servidor.
   */
  async disconnect(): Promise<void> {
    if (!this.hub) return;
    try {
      await this.hub.stop();
    } catch {
      // Ignorar errores al desconectar
    } finally {
      this.hub = null;
      this._currentRoom = null;
      this._currentRoomPlayers = [];
      this._connectionId = null;
      this.setStatus('disconnected');
    }
  }

  private registerEvents() {
    if (!this.hub) return;

    this.hub.onclose(() => {
      this._currentRoom = null;
      this._currentRoomPlayers = [];
      this.setStatus('disconnected');
    });

    this.hub.onreconnecting((err) => {
      this.setStatus('reconnecting', err?.message);
    });

    this.hub.onreconnected((newConnectionId) => {
      this._connectionId = newConnectionId ?? null;
      this.setStatus('connected');
      // Re-establecer nickname
      if (this._currentNickname) {
        this.setNickname(this._currentNickname);
      }
    });

    this.hub.on('OnNicknameConfirmed', (nick: string) => {
      this._currentNickname = nick;
      this.onNicknameConfirmed?.(nick);
    });

    this.hub.on('OnJoinedRoom', (room: RoomSummaryDto, players: PlayerNetworkState[]) => {
      this._currentRoom = room;
      this._currentRoomPlayers = players || [];
      this.onJoinedRoom?.(room, players);
      this.emit('joinedRoom', room, players);
    });

    this.hub.on('OnPlayerJoined', (player: PlayerNetworkState) => {
      const idx = this._currentRoomPlayers.findIndex((p) => p.connectionId === player.connectionId);
      if (idx >= 0) {
        this._currentRoomPlayers[idx] = player;
      } else {
        this._currentRoomPlayers.push(player);
      }
      this.onPlayerJoined?.(player);
      this.emit('playerJoined', player);
    });

    this.hub.on('OnPlayerLeft', (connId: string, nick: string) => {
      this._currentRoomPlayers = this._currentRoomPlayers.filter((p) => p.connectionId !== connId);
      this.onPlayerLeft?.(connId, nick);
      this.emit('playerLeft', connId, nick);
    });

    this.hub.on('OnRemotePlayerUpdate', (state: PlayerNetworkState) => {
      this.onRemotePlayerUpdate?.(state);
    });

    this.hub.on('OnRemoteVehicleUpdate', (state: VehicleNetworkState) => {
      this.onRemoteVehicleUpdate?.(state);
    });

    this.hub.on('OnZombieHitEvent', (hit: ZombieHitNetworkEvent) => {
      this.onZombieHitEvent?.(hit);
    });

    this.hub.on('OnReceiveChatMessage', (msg: ChatMessageDto) => {
      if (msg.senderConnectionId === this._connectionId && (!msg.senderName || msg.senderName === 'Superviviente')) {
        msg.senderName = this.currentNickname;
      }
      this.chatMessages.push(msg);
      if (this.chatMessages.length > 50) this.chatMessages.shift();
      this.onReceiveChatMessage?.(msg);
      this.emit('receiveChatMessage', msg);
    });

    this.hub.on('OnRoomListUpdated', (rooms: RoomSummaryDto[]) => {
      this.onRoomListUpdated?.(rooms);
      this.emit('roomListUpdated', rooms);
    });

    this.hub.on('OnZombieAlertEvent', (zombieId: string, x: number, z: number) => {
      this.onZombieAlertEvent?.(zombieId, x, z);
    });

    this.hub.on('OnZombieSpawnEvent', (spawn: any) => {
      this.onZombieSpawnEvent?.(spawn);
    });

    this.hub.on('OnZombieSyncBatch', (zombies: any[]) => {
      this.onZombieSyncBatch?.(zombies);
    });

    this.hub.on('OnDayNightSyncEvent', (time: number) => {
      this.onDayNightSyncEvent?.(time);
    });

    this.hub.on('OnVehicleSpawnEvent', (spawn: VehicleSpawnDto) => {
      this.onVehicleSpawnEvent?.(spawn);
    });

    this.hub.on('OnZombieClearEvent', (x: number, z: number, radius: number) => {
      this.onZombieClearEvent?.(x, z, radius);
    });

    this.hub.on('OnItemDropEvent', (drop: ItemDropDto) => {
      this.onItemDropEvent?.(drop);
    });

    this.hub.on('OnItemPickupEvent', (dropId: string) => {
      this.onItemPickupEvent?.(dropId);
    });

    this.hub.on('OnPlayerShotEvent', (shot: PlayerShotNetworkEvent) => {
      this.onPlayerShotEvent?.(shot);
    });

    this.hub.on('OnError', (err: string) => {
      this.onError?.(err);
    });
  }

  // --- MÉTODOS CLIENTE -> SERVIDOR ---

  async setNickname(nickname: string): Promise<void> {
    const clean = nickname.trim() || 'Superviviente';
    this._currentNickname = clean;
    localStorage.setItem('zombie_game_nick', clean);
    if (!this.isConnected || !this.hub) return;
    try {
      await this.hub.invoke('SetNickname', clean);
    } catch (err) {
      console.warn('[NetworkManager] Error invocando SetNickname:', err);
    }
  }

  async joinGlobalRoom(): Promise<void> {
    if (!this.isConnected || !this.hub) return;
    await this.hub.invoke('JoinGlobalRoom');
  }

  async createRoom(name: string, maxPlayers = 16, isPrivate = false, password?: string): Promise<void> {
    if (!this.isConnected || !this.hub) return;
    await this.hub.invoke('CreateRoom', name, maxPlayers, isPrivate, password ?? null);
  }

  async joinRoom(roomId: string, password?: string): Promise<void> {
    if (!this.isConnected || !this.hub) return;
    await this.hub.invoke('JoinRoom', roomId, password ?? null);
  }

  async leaveRoom(): Promise<void> {
    if (!this.isConnected || !this.hub) return;
    await this.hub.invoke('LeaveCurrentRoom');
    this._currentRoom = null;
    this._currentRoomPlayers = [];
    this.emit('leftRoom');
  }

  async getRoomList(): Promise<RoomSummaryDto[]> {
    if (!this.isConnected || !this.hub) return [];
    try {
      return await this.hub.invoke<RoomSummaryDto[]>('GetRoomList');
    } catch {
      return [];
    }
  }

  /**
   * Envía el estado del jugador con tasa de refresco controlada (15-20 Hz).
   */
  sendPlayerState(state: Omit<PlayerNetworkState, 'connectionId' | 'nickname' | 'timestamp'>): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;

    const now = performance.now();
    if (now - this.lastStateSentTime < this.SEND_INTERVAL_MS) return;
    this.lastStateSentTime = now;

    const fullState: PlayerNetworkState = {
      ...state,
      connectionId: this._connectionId || '',
      nickname: this.currentNickname,
      timestamp: Date.now(),
    };

    this.hub.invoke('SendPlayerState', fullState).catch(() => {});
  }

  sendVehicleState(state: Omit<VehicleNetworkState, 'driverConnectionId' | 'driverNickname' | 'timestamp'>): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;

    const fullState: VehicleNetworkState = {
      ...state,
      driverConnectionId: this._connectionId || '',
      driverNickname: this.currentNickname,
      timestamp: Date.now(),
    };

    this.hub.invoke('SendVehicleState', fullState).catch(() => {});
  }

  sendZombieHit(hit: Omit<ZombieHitNetworkEvent, 'attackerConnectionId' | 'attackerNickname'>): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;

    const fullHit: ZombieHitNetworkEvent = {
      ...hit,
      attackerConnectionId: this._connectionId || '',
      attackerNickname: this.currentNickname,
    };

    this.hub.invoke('SendZombieHit', fullHit).catch(() => {});
  }

  sendZombieAlert(zombieId: string, x: number, z: number): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendZombieAlert', zombieId, x, z).catch(() => {});
  }

  sendZombieSpawn(spawn: any): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendZombieSpawn', spawn).catch(() => {});
  }

  sendZombieSync(zombies: any[]): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendZombieSync', zombies).catch(() => {});
  }

  sendDayNightSync(time: number): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendDayNightSync', time).catch(() => {});
  }

  sendVehicleSpawn(spawn: VehicleSpawnDto): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendVehicleSpawn', spawn).catch(() => {});
  }

  sendZombieClear(x: number, z: number, radius: number): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendZombieClear', x, z, radius).catch(() => {});
  }

  sendItemDrop(drop: ItemDropDto): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendItemDrop', drop).catch(() => {});
  }

  sendItemPickup(dropId: string): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    this.hub.invoke('SendItemPickup', dropId).catch(() => {});
  }

  sendPlayerShot(shot: Omit<PlayerShotNetworkEvent, 'shooterConnectionId' | 'shooterNickname'>): void {
    if (!this.isConnected || !this.hub || !this._currentRoom) return;
    const fullShot: PlayerShotNetworkEvent = {
      ...shot,
      shooterConnectionId: this._connectionId || '',
      shooterNickname: this.currentNickname,
    };
    this.hub.invoke('SendPlayerShot', fullShot).catch(() => {});
  }

  sendChatMessage(message: string, channel: 'room' | 'global' | 'proximity' = 'room', posX?: number, posZ?: number): void {
    if (!this.isConnected || !this.hub) return;
    const nick = this.currentNickname;
    this.hub.invoke('SendChatMessage', message, channel, posX ?? null, posZ ?? null, nick).catch(() => {});
  }
}

// Instancia singleton para acceso global
export const networkManager = new NetworkManager();
