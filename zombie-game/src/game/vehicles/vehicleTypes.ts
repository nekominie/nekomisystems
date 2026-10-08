import * as THREE from 'three';

/** Arquetipos de vehículos del juego (Project Zomboid style) */
export type VehicleArchetype = 'compact' | 'sedan' | 'offroad' | 'truck' | 'sport' | 'emergency';

/** Biomas procedurales reconocidos por el generador de mundo */
export type VehicleBiome = 'city' | 'town' | 'countryside' | 'camp' | 'cabin';

/** Estados de cerradura y operatividad */
export type VehicleLockState = 'unlocked' | 'locked' | 'broken';

/** Tipos de superficie para física de adherencia */
export type TerrainType = 'asphalt' | 'dirt' | 'grass';

/** Entradas de control de conducción */
export interface DriveInput {
  /** +1 acelerar hacia adelante (W), -1 frenar / reversa (S) */
  throttle: number;
  /** +1 girar a la izquierda (A), -1 girar a la derecha (D) */
  steer: number;
  /** Freno de mano (Espacio) */
  handbrake: boolean;
}

/** Dimensiones y particularidades visuales 3D del modelo procedural */
export interface VehicleMeshDims {
  L: number;
  W: number;
  bodyH: number;
  bodyY: number;
  cabL: number;
  cabW: number;
  cabH: number;
  cabZ: number;
  /** Para pickups y camiones: volquete o batea trasera abierta */
  bedL?: number;
  /** Para ambulancias y patrullas: torreta superior de emergencia con luces */
  lightBar?: boolean;
}

/**
 * Especificación técnica de un modelo de vehículo (balance físico y gameplay).
 */
export interface VehicleConfig {
  /** Identificador único del modelo (ej. 'classic_sedan') */
  id: string;
  /** Nombre amigable para HUD y UI */
  name: string;
  /** Arquetipo funcional */
  archetype: VehicleArchetype;
  /** Masa en kilogramos (afecta inercia, transferencia de energía en atropellos y colisiones) */
  mass: number;
  /** Velocidad máxima hacia adelante en m/s (1 m/s = 3.6 km/h) */
  maxSpeed: number;
  /** Fuerza motriz de aceleración lineal (m/s²) */
  accelerationForce: number;
  /** Fuerza de frenado de servicio (m/s²) */
  brakingForce: number;
  /** Ángulo máximo de giro de las ruedas delanteras en radianes */
  steerAngle: number;
  /** Penalización de velocidad y agarre fuera de asfalto (0.1 = resbala mucho, 1.0 = agarre total) */
  offroadTractionMultiplier: number;
  /** Durabilidad máxima del chasis/motor antes de avería catastrófica */
  maxDurability: number;
  /** Capacidad del tanque de combustible en litros */
  fuelCapacity: number;
  /** Litros consumidos por metro recorrido y esfuerzo de aceleración */
  fuelConsumptionRate: number;
  /** Radio de alerta sonora a zombis con motor en ralentí (metros) */
  engineNoiseIdle: number;
  /** Radio de alerta sonora a zombis acelerando a fondo (metros) */
  engineNoiseMax: number;
  /** Capacidad de carga del maletero/caja en ranuras */
  trunkStorageSlots: number;
  /** Dimensiones físicas de la caja de colisión y malla procedural */
  dims: VehicleMeshDims;
  /** Paleta de colores estándar para generación */
  defaultColors: number[];
}
