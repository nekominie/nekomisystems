import type { ProceduralModel } from '../weapons/weaponTypes';

export type ExplosiveType = 'throwable' | 'deployable';
export type ExplosiveTrigger = 'timer' | 'impact' | 'proximity' | 'remote';

/** Identificador de explosivo (clave del catálogo en explosiveDefs.ts). */
export type ExplosiveId = string;

/**
 * Configuración estática (datos puros) de un explosivo o arrojadizo.
 * El estado en partida (posición, mecha, etc.) vive en ExplosivesManager.
 */
export interface ExplosiveConfig {
  id: ExplosiveId;
  name: string;
  type: ExplosiveType;
  triggerType: ExplosiveTrigger;
  /** Segundos de mecha hasta detonar (solo trigger 'timer'). */
  fuseTime: number;
  /** Daño en el epicentro (cae linealmente hasta 0 en el borde). */
  maxDamage: number;
  /** Radio esférico de la explosión (metros). */
  damageRadius: number;
  /** Fuerza base del empujón físico radial (m/s en el epicentro). */
  impulseForce: number;
  /** Radio de alerta acústica que atrae a la horda al detonar. */
  noiseRadius: number;
  /** Emite alertas periódicas mientras la mecha corre (bomba de tubo). */
  attractZombiesWhileActive: boolean;
  /** Si > 0 deja una zona de fuego circular con daño por segundo durante estos segundos. */
  fireDuration: number;
  /** Velocidad inicial de lanzamiento (m/s, solo arrojadizos). */
  throwSpeed: number;
  /** Malla 3D declarativa (ver buildExplosiveMesh en explosiveModels.ts). */
  proceduralModel?: ProceduralModel;
  /** Segundos entre lanzamientos del mismo explosivo. */
  throwCooldown?: number;
}
