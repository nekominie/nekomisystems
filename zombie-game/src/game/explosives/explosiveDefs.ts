import type { ExplosiveConfig, ExplosiveId } from './explosiveTypes';

/**
 * Catálogo inicial de explosivos (5 base). Los zombis tienen 100 de vida:
 *  - M67: ~110 en el epicentro (mata al centro, hiere grave al borde).
 *  - Molotov: sin explosión (impacto), fuego 8 s a 25/s (4 s dentro = muerte).
 *  - Bomba de tubo: 90 + atrae durante la mecha de 4 s.
 *  - Mina: 160 en 3.5 m (revienta zombis y castiga chasis).
 *  - C4: 220 en 9 m, solo por detonador remoto (tecla T).
 * Para añadir uno basta con registrarlo aquí (y darle conteo inicial en el HUD).
 */
const CATALOG = new Map<ExplosiveId, ExplosiveConfig>();

export function registerExplosive(def: ExplosiveConfig) {
  CATALOG.set(def.id, Object.freeze(def));
}

export function getExplosiveDef(id: ExplosiveId): ExplosiveConfig | undefined {
  return CATALOG.get(id);
}

export function allExplosiveDefs(): ExplosiveConfig[] {
  return [...CATALOG.values()];
}

export const EXPLOSIVE_IDS = {
  frag: 'frag_grenade',
  molotov: 'molotov',
  pipeBomb: 'pipe_bomb',
  landmine: 'landmine',
  c4: 'c4_charge',
} as const;

// 1) M67: verde olivo, mecha 3.5 s, rebota, gran impulso
registerExplosive({
  id: EXPLOSIVE_IDS.frag,
  name: 'Granada M67',
  type: 'throwable',
  triggerType: 'timer',
  fuseTime: 3.5,
  maxDamage: 110,
  damageRadius: 7,
  impulseForce: 13,
  noiseRadius: 60,
  attractZombiesWhileActive: false,
  fireDuration: 0,
  throwSpeed: 14,
  throwCooldown: 0.8,
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.045, 0.045, 0.09, 12], color: 0x4d5b2f, offset: [0, 0, 0] },
      { type: 'cylinder', dims: [0.046, 0.046, 0.02, 12], color: 0x3a4523, offset: [0, 0.05, 0] },
      { type: 'box', dims: [0.02, 0.03, 0.02], color: 0x9ca3af, offset: [0, 0.07, 0] },
      { type: 'cylinder', dims: [0.008, 0.008, 0.03, 8], color: 0xd1d5db, offset: [0.02, 0.07, 0], rot: [0, 0, Math.PI / 2] },
    ],
  },
});

// 2) Molotov: botella marrón + trapo, detona al impacto, fuego 8 s
registerExplosive({
  id: EXPLOSIVE_IDS.molotov,
  name: 'Cóctel Molotov',
  type: 'throwable',
  triggerType: 'impact',
  fuseTime: 0,
  maxDamage: 25,
  damageRadius: 2.5,
  impulseForce: 4,
  noiseRadius: 20,
  attractZombiesWhileActive: false,
  fireDuration: 8,
  throwSpeed: 13,
  throwCooldown: 0.8,
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.04, 0.045, 0.2, 10], color: 0x78350f, offset: [0, -0.02, 0] },
      { type: 'cylinder', dims: [0.015, 0.03, 0.06, 8], color: 0x92400e, offset: [0, 0.11, 0] },
      { type: 'box', dims: [0.03, 0.07, 0.012], color: 0xe7e5e4, offset: [0.01, 0.15, 0], rot: [0, 0, 0.25] },
    ],
  },
});

// 3) Bomba de tubo: plateada con luz roja, atrae 4 s y revienta
registerExplosive({
  id: EXPLOSIVE_IDS.pipeBomb,
  name: 'Bomba de Tubo',
  type: 'throwable',
  triggerType: 'timer',
  fuseTime: 4,
  maxDamage: 90,
  damageRadius: 6,
  impulseForce: 11,
  noiseRadius: 55,
  attractZombiesWhileActive: true,
  fireDuration: 0,
  throwSpeed: 14,
  throwCooldown: 0.8,
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.035, 0.035, 0.22, 10], color: 0x9ca3af, offset: [0, 0, 0], rot: [Math.PI / 2, 0, 0] },
      { type: 'cylinder', dims: [0.037, 0.037, 0.02, 10], color: 0x6b7280, offset: [0, 0, 0.11], rot: [Math.PI / 2, 0, 0] },
      { type: 'cylinder', dims: [0.037, 0.037, 0.02, 10], color: 0x6b7280, offset: [0, 0, -0.11], rot: [Math.PI / 2, 0, 0] },
      { type: 'box', dims: [0.02, 0.02, 0.02], color: 0xef4444, offset: [0, 0.045, 0] },
    ],
  },
});

// 4) Mina terrestre: disco gris + botón rojo, proximidad 1.2 m
registerExplosive({
  id: EXPLOSIVE_IDS.landmine,
  name: 'Mina Terrestre',
  type: 'deployable',
  triggerType: 'proximity',
  fuseTime: 0,
  maxDamage: 160,
  damageRadius: 3.5,
  impulseForce: 10,
  noiseRadius: 50,
  attractZombiesWhileActive: false,
  fireDuration: 0,
  throwSpeed: 0,
  throwCooldown: 0.8,
  proceduralModel: {
    parts: [
      { type: 'cylinder', dims: [0.16, 0.18, 0.05, 16], color: 0x374151, offset: [0, 0.025, 0] },
      { type: 'cylinder', dims: [0.05, 0.05, 0.02, 12], color: 0xef4444, offset: [0, 0.055, 0] },
    ],
  },
});

// 5) C4: bloque beige + antena, solo detonador remoto (T)
registerExplosive({
  id: EXPLOSIVE_IDS.c4,
  name: 'Carga C4',
  type: 'deployable',
  triggerType: 'remote',
  fuseTime: 0,
  maxDamage: 220,
  damageRadius: 9,
  impulseForce: 16,
  noiseRadius: 80,
  attractZombiesWhileActive: false,
  fireDuration: 0,
  throwSpeed: 0,
  throwCooldown: 0.8,
  proceduralModel: {
    parts: [
      { type: 'box', dims: [0.22, 0.12, 0.12], color: 0xd6c39a, offset: [0, 0.06, 0] },
      { type: 'box', dims: [0.05, 0.03, 0.04], color: 0x1f2937, offset: [0.05, 0.135, 0] },
      { type: 'cylinder', dims: [0.004, 0.004, 0.16, 6], color: 0x111827, offset: [-0.06, 0.18, 0] },
      { type: 'box', dims: [0.018, 0.018, 0.018], color: 0xef4444, offset: [0.05, 0.155, 0] },
    ],
  },
});
