export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface PlayerNetworkState {
  connectionId: string;
  nickname: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  steer?: number;
  speed: number;
  isMoving: boolean;
  isRunning: boolean;
  isStealth?: boolean;
  currentAnim: string;
  health: number;
  maxHealth: number;
  isInVehicle: boolean;
  vehicleId?: string | null;
  vehicleSeat?: number;
  equippedWeapon?: string | null;
  timestamp: number;
}

export interface VehicleNetworkState {
  vehicleId: string;
  archetype?: string;
  driverConnectionId: string;
  driverNickname: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  speed: number;
  steer: number;
  durability: number;
  maxDurability: number;
  fuel: number;
  isEngineRunning: boolean;
  timestamp: number;
}

export interface ZombieHitNetworkEvent {
  zombieId: string;
  attackerConnectionId: string;
  attackerNickname: string;
  damage: number;
  impulseX: number;
  impulseY: number;
  impulseZ: number;
  isKilled: boolean;
  isCarHit: boolean;
  carId?: string | null;
  zombieX?: number;
  zombieZ?: number;
}

export interface ChatMessageDto {
  id?: number;
  roomId: string;
  senderName: string;
  senderConnectionId: string;
  message: string;
  channel: 'room' | 'global' | 'system' | 'proximity';
  timestamp: string | Date;
  posX?: number | null;
  posZ?: number | null;
}

export interface RoomSummaryDto {
  roomId: string;
  name: string;
  currentPlayers: number;
  maxPlayers: number;
  isPrivate: boolean;
  hostNickname: string;
  seed?: number;
  dayNightTime?: number;
  createdAt: string | Date;
}

export interface ZombieSyncDto {
  id: string;
  x: number;
  z: number;
  rot: number;
  speed: number;
  animState: string;
  health: number;
  dead: boolean;
  targetX?: number | null;
  targetZ?: number | null;
}

export interface ZombieSpawnDto {
  id: string;
  x: number;
  z: number;
  rot: number;
  tier: string;
  heightVar?: number;
}

export interface VehicleSpawnDto {
  vehicleId: string;
  archetype: string;
  x: number;
  z: number;
  heading: number;
  durability: number;
  fuel: number;
}

export interface ItemDropDto {
  id: string;
  weaponId: string;
  x: number;
  z: number;
  ammo?: number;
  reserve?: number;
}

export interface PelletResultDto {
  endX: number;
  endY: number;
  endZ: number;
  blocked?: boolean;
  hit?: boolean;
}

export interface PlayerShotNetworkEvent {
  shooterConnectionId?: string;
  shooterNickname?: string;
  weaponId: string;
  category: string;
  isMelee: boolean;
  muzzleX: number;
  muzzleY: number;
  muzzleZ: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  pellets: PelletResultDto[];
}
