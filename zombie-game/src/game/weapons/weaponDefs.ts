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
  // --- Segundo lote (modelos procedurales data-driven) ---
  pipeWrench: 'pipe_wrench',
  fireAxe: 'fire_axe',
  katana: 'katana',
  combatKnife: 'combat_knife',
  revolver357: 'revolver_357',
  pistolSuppressed: 'pistol_suppressed',
  pistolDesert: 'pistol_desert',
  smgMac10: 'smg_mac10',
  smgP90: 'smg_p90',
  smgTommy: 'smg_tommy',
  shotgunDouble: 'shotgun_double',
  shotgunSpas: 'shotgun_spas',
  shotgunSawed: 'shotgun_sawed',
  rifleScar: 'rifle_scar',
  rifleBurst: 'rifle_burst',
  rifleCarbine: 'rifle_carbine',
  sniperMarksman: 'sniper_marksman',
  sniperHeavy50: 'sniper_heavy50',
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

// ============================================================================
// 6-23) Segundo lote: dataset externo de 18 armas con modelo procedural.
// NOTAS DE INTEGRACIÓN (motor):
// - spreadRecoverySpeed del dataset (3-12) viene en otra escala que la del
//   motor (rad/s, banda 0.07-0.3): se mapea linealmente 3→0.08 / 9→0.3 para
//   conservar el orden relativo. En melee se pone 0 (no hay bloom).
// - recoilForce del dataset (~x10 sobre la banda del motor, que satura el
//   clamp de ±0.14 rad del RecoilController): se divide entre 4.
// - melee con magSize 0 (convención del motor: 0 = sin munición).
// - rifle_burst (Famas) queda semi-automático: el motor solo tiene
//   semi/auto, no modo ráfaga de 3.
// ============================================================================

// ---- MELEE ----
registerWeapon({
  id: WEAPON_IDS.pipeWrench,
  name: 'Llave Inglesa Pesada',
  category: 'melee',
  damage: 65,
  fireRateRPM: 70,
  magSize: 0,
  reloadDuration: 0,
  baseSpread: 0.1,
  spreadRecoverySpeed: 0,
  pellets: 1,
  effectiveRange: 2.0,
  noiseRadius: 0.8,
  isAutomatic: false,
  recoilForce: { pitch: 0.013, yawVariation: 0.005 },
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.03, 0.03, 0.5, 8], color: 0x7f1d1d, offset: [0, 0, 0] },
      { type: 'box', dims: [0.08, 0.14, 0.05], color: 0x475569, offset: [0, 0.28, 0] },
      { type: 'box', dims: [0.05, 0.04, 0.05], color: 0x334155, offset: [0.03, 0.32, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.fireAxe,
  name: 'Hacha de Bombero',
  category: 'melee',
  damage: 110,
  fireRateRPM: 48,
  magSize: 0,
  reloadDuration: 0,
  baseSpread: 0.12,
  spreadRecoverySpeed: 0,
  pellets: 1,
  effectiveRange: 2.4,
  noiseRadius: 1.0,
  isAutomatic: false,
  recoilForce: { pitch: 0.02, yawVariation: 0.01 },
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.03, 0.03, 0.85, 8], color: 0xf59e0b, offset: [0, 0, 0] },
      { type: 'box', dims: [0.22, 0.14, 0.04], color: 0x991b1b, offset: [0.06, 0.4, 0] },
      { type: 'box', dims: [0.08, 0.04, 0.03], color: 0xd1d5db, offset: [0.18, 0.4, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.katana,
  name: 'Katana de Supervivencia',
  category: 'melee',
  damage: 85,
  fireRateRPM: 95,
  magSize: 0,
  reloadDuration: 0,
  baseSpread: 0.05,
  spreadRecoverySpeed: 0,
  pellets: 1,
  effectiveRange: 2.3,
  noiseRadius: 0.5,
  isAutomatic: false,
  recoilForce: { pitch: 0.01, yawVariation: 0.005 },
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.025, 0.025, 0.25, 8], color: 0x111827, offset: [0, -0.2, 0] },
      { type: 'cylinder', dims: [0.08, 0.08, 0.015, 8], color: 0xd97706, offset: [0, -0.07, 0] },
      { type: 'box', dims: [0.025, 0.8, 0.008], color: 0xe2e8f0, offset: [0, 0.35, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.combatKnife,
  name: 'Cuchillo Táctico Militar',
  category: 'melee',
  damage: 45,
  fireRateRPM: 140,
  magSize: 0,
  reloadDuration: 0,
  baseSpread: 0.03,
  spreadRecoverySpeed: 0,
  pellets: 1,
  effectiveRange: 1.4,
  noiseRadius: 0.2,
  isAutomatic: false,
  recoilForce: { pitch: 0.005, yawVariation: 0.003 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.03, 0.14, 0.03], color: 0x1e293b, offset: [0, -0.07, 0] },
      { type: 'box', dims: [0.06, 0.015, 0.035], color: 0x0f172a, offset: [0, 0.005, 0] },
      { type: 'box', dims: [0.03, 0.22, 0.006], color: 0x64748b, offset: [0, 0.12, 0] },
    ],
  },
});

// ---- PISTOLAS ----
registerWeapon({
  id: WEAPON_IDS.revolver357,
  name: 'Revólver .357 Cobra',
  category: 'pistol',
  damage: 95,
  fireRateRPM: 120,
  magSize: 6,
  reloadDuration: 2.8,
  baseSpread: 0.02,
  spreadRecoverySpeed: 0.153,
  pellets: 1,
  effectiveRange: 32,
  noiseRadius: 38,
  isAutomatic: false,
  recoilForce: { pitch: 0.03, yawVariation: 0.013 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.11, 0.05], color: 0x78350f, offset: [0, -0.05, -0.04] },
      { type: 'cylinder', dims: [0.04, 0.04, 0.07, 10], color: 0x94a3b8, offset: [0, 0.02, 0], rot: [Math.PI / 2, 0, 0] },
      { type: 'box', dims: [0.03, 0.04, 0.2], color: 0xcbd5e1, offset: [0, 0.03, 0.12] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.pistolSuppressed,
  name: 'P9 Silenciada',
  category: 'pistol',
  damage: 32,
  fireRateRPM: 350,
  magSize: 15,
  reloadDuration: 1.5,
  baseSpread: 0.035,
  spreadRecoverySpeed: 0.263,
  pellets: 1,
  effectiveRange: 20,
  noiseRadius: 6,
  isAutomatic: false,
  recoilForce: { pitch: 0.008, yawVariation: 0.005 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.12, 0.05], color: 0x18181b, offset: [0, -0.06, -0.02] },
      { type: 'box', dims: [0.04, 0.05, 0.18], color: 0x27272a, offset: [0, 0.02, 0.04] },
      { type: 'cylinder', dims: [0.022, 0.022, 0.14, 12], color: 0x09090b, offset: [0, 0.02, 0.19], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.pistolDesert,
  name: 'Magnum .50 Heavy',
  category: 'pistol',
  damage: 140,
  fireRateRPM: 160,
  magSize: 7,
  reloadDuration: 2.2,
  baseSpread: 0.04,
  spreadRecoverySpeed: 0.117,
  pellets: 1,
  effectiveRange: 35,
  noiseRadius: 45,
  isAutomatic: false,
  recoilForce: { pitch: 0.045, yawVariation: 0.02 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.045, 0.14, 0.06], color: 0x18181b, offset: [0, -0.07, -0.03] },
      { type: 'box', dims: [0.05, 0.07, 0.26], color: 0xd4d4d8, offset: [0, 0.03, 0.08] },
      { type: 'box', dims: [0.03, 0.02, 0.04], color: 0x09090b, offset: [0, 0.07, 0.19] },
    ],
  },
});

// ---- SUBFUSILES (SMG) ----
registerWeapon({
  id: WEAPON_IDS.smgMac10,
  name: 'Micro SMG Vector-10',
  category: 'smg',
  damage: 24,
  fireRateRPM: 950,
  magSize: 32,
  reloadDuration: 1.8,
  baseSpread: 0.08,
  spreadRecoverySpeed: 0.227,
  pellets: 1,
  effectiveRange: 18,
  noiseRadius: 26,
  isAutomatic: true,
  recoilForce: { pitch: 0.015, yawVariation: 0.015 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.16, 0.045], color: 0x1f2937, offset: [0, -0.08, 0] },
      { type: 'box', dims: [0.05, 0.09, 0.22], color: 0x374151, offset: [0, 0.04, 0.04] },
      { type: 'cylinder', dims: [0.018, 0.018, 0.08, 8], color: 0x111827, offset: [0, 0.04, 0.18], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.smgP90,
  name: 'P-900 Bullpup',
  category: 'smg',
  damage: 30,
  fireRateRPM: 850,
  magSize: 50,
  reloadDuration: 2.6,
  baseSpread: 0.045,
  spreadRecoverySpeed: 0.263,
  pellets: 1,
  effectiveRange: 30,
  noiseRadius: 28,
  isAutomatic: true,
  recoilForce: { pitch: 0.01, yawVariation: 0.008 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.06, 0.14, 0.38], color: 0x15803d, offset: [0, -0.02, 0] },
      { type: 'box', dims: [0.045, 0.03, 0.22], color: 0xe2e8f0, offset: [0, 0.065, -0.04] },
      { type: 'cylinder', dims: [0.02, 0.02, 0.08, 8], color: 0x1e293b, offset: [0, 0.02, 0.22], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.smgTommy,
  name: 'Subfusil Chicago .45',
  category: 'smg',
  damage: 42,
  fireRateRPM: 650,
  magSize: 30,
  reloadDuration: 2.4,
  baseSpread: 0.06,
  spreadRecoverySpeed: 0.19,
  pellets: 1,
  effectiveRange: 25,
  noiseRadius: 30,
  isAutomatic: true,
  recoilForce: { pitch: 0.018, yawVariation: 0.01 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.08, 0.2], color: 0x78350f, offset: [0, -0.04, -0.16] },
      { type: 'box', dims: [0.05, 0.07, 0.3], color: 0x27272a, offset: [0, 0.02, 0.06] },
      { type: 'cylinder', dims: [0.018, 0.018, 0.2, 8], color: 0x18181b, offset: [0, 0.02, 0.28], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

// ---- ESCOPETAS ----
registerWeapon({
  id: WEAPON_IDS.shotgunDouble,
  name: 'Escopeta Yuxtapuesta Doble',
  category: 'shotgun',
  damage: 28,
  fireRateRPM: 220,
  magSize: 2,
  reloadDuration: 2.5,
  baseSpread: 0.11,
  spreadRecoverySpeed: 0.153,
  pellets: 12,
  effectiveRange: 14,
  noiseRadius: 42,
  isAutomatic: false,
  recoilForce: { pitch: 0.06, yawVariation: 0.02 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.09, 0.28], color: 0x92400e, offset: [0, -0.05, -0.2] },
      { type: 'box', dims: [0.06, 0.06, 0.12], color: 0x475569, offset: [0, 0.01, -0.02] },
      { type: 'cylinder', dims: [0.018, 0.018, 0.5, 8], color: 0x1e293b, offset: [-0.016, 0.02, 0.28], rot: [Math.PI / 2, 0, 0] },
      { type: 'cylinder', dims: [0.018, 0.018, 0.5, 8], color: 0x1e293b, offset: [0.016, 0.02, 0.28], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.shotgunSpas,
  name: 'Escopeta Táctica S-12',
  category: 'shotgun',
  damage: 22,
  fireRateRPM: 260,
  magSize: 8,
  reloadDuration: 3.8,
  baseSpread: 0.09,
  spreadRecoverySpeed: 0.153,
  pellets: 8,
  effectiveRange: 18,
  noiseRadius: 40,
  isAutomatic: false,
  recoilForce: { pitch: 0.045, yawVariation: 0.013 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.12, 0.06], color: 0x18181b, offset: [0, -0.07, -0.1] },
      { type: 'box', dims: [0.05, 0.07, 0.38], color: 0x334155, offset: [0, 0.02, 0.1] },
      { type: 'cylinder', dims: [0.025, 0.025, 0.45, 8], color: 0x0f172a, offset: [0, 0.02, 0.48], rot: [Math.PI / 2, 0, 0] },
      { type: 'box', dims: [0.045, 0.02, 0.25], color: 0x09090b, offset: [0, 0.08, 0.0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.shotgunSawed,
  name: 'Escopeta Recortada',
  category: 'shotgun',
  damage: 35,
  fireRateRPM: 180,
  magSize: 2,
  reloadDuration: 2.2,
  baseSpread: 0.18,
  spreadRecoverySpeed: 0.117,
  pellets: 10,
  effectiveRange: 8,
  noiseRadius: 44,
  isAutomatic: false,
  recoilForce: { pitch: 0.07, yawVariation: 0.03 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.035, 0.08, 0.14], color: 0x78350f, offset: [0, -0.04, -0.08] },
      { type: 'cylinder', dims: [0.02, 0.02, 0.22, 8], color: 0x334155, offset: [0, 0.02, 0.12], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

// ---- RIFLES DE ASALTO ----
registerWeapon({
  id: WEAPON_IDS.rifleScar,
  name: 'Rifle de Asalto SCAR-H 7.62',
  category: 'rifle',
  damage: 58,
  fireRateRPM: 550,
  magSize: 20,
  reloadDuration: 2.4,
  baseSpread: 0.025,
  spreadRecoverySpeed: 0.227,
  pellets: 1,
  effectiveRange: 75,
  noiseRadius: 48,
  isAutomatic: true,
  recoilForce: { pitch: 0.028, yawVariation: 0.01 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.05, 0.08, 0.48], color: 0xd97706, offset: [0, 0.03, 0.06] },
      { type: 'box', dims: [0.045, 0.07, 0.24], color: 0xb45309, offset: [0, 0.01, -0.25] },
      { type: 'box', dims: [0.04, 0.14, 0.06], color: 0x1c1917, offset: [0, -0.08, 0.02] },
      { type: 'cylinder', dims: [0.016, 0.016, 0.24, 8], color: 0x1c1917, offset: [0, 0.03, 0.4], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.rifleBurst,
  name: 'Famas F1 Ráfagas',
  category: 'rifle',
  damage: 36,
  fireRateRPM: 700,
  magSize: 30,
  reloadDuration: 2.3,
  baseSpread: 0.02,
  spreadRecoverySpeed: 0.263,
  pellets: 1,
  effectiveRange: 60,
  noiseRadius: 42,
  // El dataset pide ráfaga de 3, pero el motor solo tiene semi/auto:
  // queda semi-automático (un disparo por clic) hasta tener modo ráfaga.
  isAutomatic: false,
  recoilForce: { pitch: 0.018, yawVariation: 0.005 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.05, 0.12, 0.42], color: 0x1f2937, offset: [0, 0.0, 0] },
      { type: 'box', dims: [0.04, 0.07, 0.26], color: 0x111827, offset: [0, 0.11, 0.04] },
      { type: 'box', dims: [0.035, 0.12, 0.05], color: 0x374151, offset: [0, -0.08, -0.14] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.rifleCarbine,
  name: 'Carabina Ligera M1',
  category: 'rifle',
  damage: 62,
  fireRateRPM: 280,
  magSize: 15,
  reloadDuration: 2.0,
  baseSpread: 0.018,
  spreadRecoverySpeed: 0.3,
  pellets: 1,
  effectiveRange: 65,
  noiseRadius: 36,
  isAutomatic: false,
  recoilForce: { pitch: 0.015, yawVariation: 0.005 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.07, 0.55], color: 0x78350f, offset: [0, -0.02, 0] },
      { type: 'cylinder', dims: [0.015, 0.015, 0.35, 8], color: 0x475569, offset: [0, 0.03, 0.38], rot: [Math.PI / 2, 0, 0] },
      { type: 'box', dims: [0.03, 0.1, 0.04], color: 0x1e293b, offset: [0, -0.08, 0.08] },
    ],
  },
});

// ---- FRANCOTIRADORES (SNIPER) ----
registerWeapon({
  id: WEAPON_IDS.sniperMarksman,
  name: 'DMR SVD Dragunov',
  category: 'sniper',
  damage: 125,
  fireRateRPM: 180,
  magSize: 10,
  reloadDuration: 2.8,
  baseSpread: 0.008,
  spreadRecoverySpeed: 0.19,
  pellets: 1,
  effectiveRange: 130,
  noiseRadius: 52,
  isAutomatic: false,
  recoilForce: { pitch: 0.04, yawVariation: 0.008 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.04, 0.09, 0.3], color: 0x92400e, offset: [0, -0.04, -0.25] },
      { type: 'box', dims: [0.05, 0.07, 0.35], color: 0x334155, offset: [0, 0.02, 0.05] },
      { type: 'cylinder', dims: [0.018, 0.018, 0.6, 8], color: 0x0f172a, offset: [0, 0.02, 0.5], rot: [Math.PI / 2, 0, 0] },
      { type: 'cylinder', dims: [0.022, 0.022, 0.22, 8], color: 0x1e293b, offset: [0, 0.09, 0.05], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});

registerWeapon({
  id: WEAPON_IDS.sniperHeavy50,
  name: 'Rifle Antimaterial .50 BMG',
  category: 'sniper',
  damage: 380,
  fireRateRPM: 35,
  magSize: 5,
  reloadDuration: 4.2,
  baseSpread: 0.004,
  spreadRecoverySpeed: 0.08,
  pellets: 1,
  effectiveRange: 220,
  noiseRadius: 75,
  isAutomatic: false,
  recoilForce: { pitch: 0.088, yawVariation: 0.025 },
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.06, 0.1, 0.6], color: 0x18181b, offset: [0, 0, -0.1] },
      { type: 'cylinder', dims: [0.025, 0.025, 0.75, 10], color: 0x27272a, offset: [0, 0.02, 0.55], rot: [Math.PI / 2, 0, 0] },
      { type: 'box', dims: [0.08, 0.05, 0.1], color: 0x52525b, offset: [0, 0.02, 0.95] },
      { type: 'cylinder', dims: [0.03, 0.03, 0.32, 10], color: 0x09090b, offset: [0, 0.11, 0.02], rot: [Math.PI / 2, 0, 0] },
    ],
  },
});
