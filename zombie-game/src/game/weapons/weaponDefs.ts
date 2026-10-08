import type { WeaponDef, WeaponId } from './weaponTypes';

/**
 * Registro de armas. Los zombis tienen 100 de vida, así que, de forma aproximada:
 *  - Bate: 3 golpes.
 *  - Pistola: 4 balas al cuerpo (2 a la cabeza).
 *  - Escopeta: 8 perdigones x 14 = 112 a quemarropa (mata de un disparo), decae rápido con la distancia.
 *  - Rifle de asalto: 5 balas, 600 RPM, se descontrola en ráfagas largas.
 *  - Rifle de caza: 2 al cuerpo o 1 a la cabeza (x4), cerrojo lento.
 * Para añadir un arma basta con llamar a registerWeapon() (y darle modelo en weaponModels.ts).
 */
const REGISTRY = new Map<WeaponId, WeaponDef>();

export function registerWeapon(def: WeaponDef) {
  REGISTRY.set(def.id, Object.freeze({ ...def, recoilForce: Object.freeze({ ...def.recoilForce }) }));
}

export function getWeaponDef(id: WeaponId): WeaponDef | undefined {
  return REGISTRY.get(id);
}

export function hasWeapon(id: WeaponId): boolean {
  return REGISTRY.has(id);
}

export function allWeaponDefs(): WeaponDef[] {
  return [...REGISTRY.values()];
}

export const WEAPON_IDS = {
  bat: 'baseball_bat',
  pistol: 'pistol_9mm',
  shotgun: 'pump_shotgun',
  assaultRifle: 'assault_rifle',
  huntingRifle: 'hunting_rifle',
} as const;

// 1) Bate de béisbol (cuerpo a cuerpo)
registerWeapon({
  id: WEAPON_IDS.bat,
  name: 'Bate de béisbol',
  category: 'melee',
  damage: 34,
  fireRateRPM: 75,
  magSize: 0,
  reloadDuration: 0,
  baseSpread: 0,
  spreadRecoverySpeed: 0,
  pellets: 1,
  effectiveRange: 2.4,
  noiseRadius: 7,
  isAutomatic: false,
  recoilForce: { pitch: 0, yawVariation: 0 },
  meleeArc: 1.7,
  meleeMaxTargets: 2,
});

// 2) Pistola 9mm
registerWeapon({
  id: WEAPON_IDS.pistol,
  name: 'Pistola 9mm',
  category: 'pistol',
  damage: 26,
  fireRateRPM: 270,
  magSize: 15,
  reloadDuration: 1.6,
  baseSpread: 0.035,
  spreadRecoverySpeed: 0.07,
  pellets: 1,
  effectiveRange: 28,
  noiseRadius: 45,
  isAutomatic: false,
  recoilForce: { pitch: 0.012, yawVariation: 0.005 },
  headshotMultiplier: 2.2,
});

// 3) Escopeta de bomba (8 perdigones)
registerWeapon({
  id: WEAPON_IDS.shotgun,
  name: 'Escopeta de bomba',
  category: 'shotgun',
  damage: 14,
  fireRateRPM: 68,
  magSize: 6,
  reloadDuration: 3.4,
  baseSpread: 0.11,
  spreadRecoverySpeed: 0.2,
  pellets: 8,
  effectiveRange: 12,
  noiseRadius: 70,
  isAutomatic: false,
  recoilForce: { pitch: 0.04, yawVariation: 0.012 },
  headshotMultiplier: 1.5,
  maxRange: 32,
  startReserveMags: 3,
});

// 4) Rifle de asalto (automático)
registerWeapon({
  id: WEAPON_IDS.assaultRifle,
  name: 'Rifle de asalto',
  category: 'rifle',
  damage: 22,
  fireRateRPM: 600,
  magSize: 30,
  reloadDuration: 2.3,
  baseSpread: 0.03,
  // Menor que lo que sube en ráfaga (~0.18 rad/s a 600 RPM): así la dispersión se acumula hasta el tope
  spreadRecoverySpeed: 0.12,
  pellets: 1,
  effectiveRange: 60,
  noiseRadius: 85,
  isAutomatic: true,
  recoilForce: { pitch: 0.014, yawVariation: 0.007 },
  headshotMultiplier: 2,
});

// 5) Rifle de caza (francotirador, cerrojo, daño crítico a la cabeza)
registerWeapon({
  id: WEAPON_IDS.huntingRifle,
  name: 'Rifle de caza',
  category: 'sniper',
  damage: 85,
  fireRateRPM: 38,
  magSize: 5,
  reloadDuration: 3.0,
  baseSpread: 0.004,
  spreadRecoverySpeed: 0.3,
  pellets: 1,
  effectiveRange: 110,
  noiseRadius: 110,
  isAutomatic: false,
  recoilForce: { pitch: 0.05, yawVariation: 0.01 },
  headshotMultiplier: 4,
  maxRange: 180,
  startReserveMags: 3,
});
