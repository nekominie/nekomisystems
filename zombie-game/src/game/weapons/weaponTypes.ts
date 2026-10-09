export type WeaponCategory = 'melee' | 'pistol' | 'smg' | 'shotgun' | 'rifle' | 'sniper';

/** Identificador de arma (clave del registro en weaponDefs.ts). */
export type WeaponId = string;

export interface RecoilForce {
  /** Empuje vertical de la cámara por disparo (radianes). */
  pitch: number;
  /** Variación lateral aleatoria máxima de la cámara por disparo (radianes, ±). */
  yawVariation: number;
}

/** Pieza del modelo procedural de un arma (ver buildWeaponMesh en weaponModels.ts). */
export interface ProceduralPart {
  type: 'box' | 'cylinder';
  /** box: [ancho, alto, largo]; cylinder: [radioSup, radioInf, alto, segmentos?] */
  dims: number[];
  color: number;
  offset?: [number, number, number];
  /** Rotación euleriana XYZ en radianes. */
  rot?: [number, number, number];
}

/** Modelo 3D declarativo del arma: se construye pieza por pieza. */
export interface ProceduralModel {
  parts: ProceduralPart[];
}

/** Definición estática (datos puros) de un arma. El estado en partida vive en la clase Weapon. */
export interface WeaponDef {
  id: WeaponId;
  name: string;
  category: WeaponCategory;
  /** Daño por proyectil / perdigón (por golpe en cuerpo a cuerpo). */
  damage: number;
  /** Cadencia en disparos (o golpes) por minuto. */
  fireRateRPM: number;
  /** Balas por cargador (0 = no usa munición: cuerpo a cuerpo). */
  magSize: number;
  /** Segundos que tarda en recargar. */
  reloadDuration: number;
  /** Dispersión base: semi-ángulo del cono, en radianes. */
  baseSpread: number;
  /** Radianes por segundo con los que se recupera la dispersión acumulada al disparar. */
  spreadRecoverySpeed: number;
  /** Proyectiles por disparo (1 = estándar, 6-10 = escopetas). */
  pellets: number;
  /** Alcance en metros hasta el que el daño es completo (después decae). */
  effectiveRange: number;
  /** Radio (metros) en el que el disparo alerta a los zombis. */
  noiseRadius: number;
  /** true = mantener el gatillo dispara en ráfaga. */
  isAutomatic: boolean;
  recoilForce: RecoilForce;

  // --- Opcionales ---
  /** Multiplicador de daño en la cabeza (por defecto 2). */
  headshotMultiplier?: number;
  /** Alcance máximo del proyectil (por defecto 2 x effectiveRange). */
  maxRange?: number;
  /** Cargadores de reserva con los que aparece el arma (por defecto 2). */
  startReserveMags?: number;
  /** Dispersión que se acumula por disparo (por defecto 50% de baseSpread + 0.003). */
  bloomPerShot?: number;
  /** Arco del golpe cuerpo a cuerpo en radianes (por defecto 1.7). */
  meleeArc?: number;
  /** Máximo de enemigos que puede golpear un solo ataque cuerpo a cuerpo (por defecto 2). */
  meleeMaxTargets?: number;
  /** Modelo 3D declarativo (si se omite se usa el constructor heredado por id en weaponModels.ts). */
  proceduralModel?: ProceduralModel;
}
