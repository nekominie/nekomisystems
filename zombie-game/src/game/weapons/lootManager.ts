import { allWeaponDefs, hasWeapon, WEAPON_IDS } from './weaponDefs';
import type { WeaponId } from './weaponTypes';

/** Tipo de contenedor / zona que determina qué armas pueden aparecer. */
export type ContainerType = 'residential_ground' | 'cabin_rural' | 'military_crate';

export interface LootEntry {
  /** Peso relativo (no hace falta que sumen 100). */
  weight: number;
  /** Arma deseada. */
  weapon: WeaponId;
  /** Si `weapon` aún no existe en el registro (p. ej. hacha, SMG), se usa esta equivalente. */
  fallback?: WeaponId;
}

/**
 * Tablas de botín. Referencian armas por id; las que todavía no están implementadas
 * caen a la equivalente existente (`fallback`), y pasan a usarse solas en cuanto se
 * registre el arma con ese id.
 */
export const DEFAULT_LOOT_TABLES: Record<ContainerType, LootEntry[]> = {
  // Suelo residencial: inicio (melee común, pistolas básicas, alguna escopeta)
  residential_ground: [
    { weight: 40, weapon: WEAPON_IDS.bat },
    { weight: 22, weapon: WEAPON_IDS.combatKnife },
    { weight: 12, weapon: WEAPON_IDS.pipeWrench },
    { weight: 22, weapon: WEAPON_IDS.pistol },
    { weight: 6, weapon: WEAPON_IDS.pistolSuppressed },
    { weight: 6, weapon: WEAPON_IDS.revolver357 },
    { weight: 8, weapon: WEAPON_IDS.shotgun },
    { weight: 4, weapon: WEAPON_IDS.shotgunSawed },
  ],
  // Cabañas rurales: melee pesado, caza y escopetas clásicas
  cabin_rural: [
    { weight: 30, weapon: WEAPON_IDS.fireAxe },
    { weight: 8, weapon: WEAPON_IDS.katana },
    { weight: 6, weapon: WEAPON_IDS.combatKnife },
    { weight: 24, weapon: WEAPON_IDS.huntingRifle },
    { weight: 14, weapon: WEAPON_IDS.shotgun },
    { weight: 12, weapon: WEAPON_IDS.shotgunDouble },
    { weight: 8, weapon: WEAPON_IDS.rifleCarbine },
  ],
  // Cajas militares: automáticas, SMG, tácticas y rarezas (.50, Desert)
  military_crate: [
    { weight: 26, weapon: WEAPON_IDS.assaultRifle },
    { weight: 16, weapon: WEAPON_IDS.rifleScar },
    { weight: 12, weapon: WEAPON_IDS.rifleBurst },
    { weight: 12, weapon: WEAPON_IDS.smgMac10 },
    { weight: 10, weapon: WEAPON_IDS.smgTommy },
    { weight: 10, weapon: WEAPON_IDS.smgP90 },
    { weight: 8, weapon: WEAPON_IDS.shotgunSpas },
    { weight: 8, weapon: WEAPON_IDS.sniperMarksman },
    { weight: 6, weapon: WEAPON_IDS.pistolDesert },
    { weight: 4, weapon: WEAPON_IDS.revolver357 },
    { weight: 3, weapon: WEAPON_IDS.sniperHeavy50 },
  ],
};

export class LootManager {
  constructor(private tables: Record<ContainerType, LootEntry[]> = DEFAULT_LOOT_TABLES) {}

  /** Id de arma realmente disponible para una entrada (con fallback). */
  private resolve(entry: LootEntry): WeaponId {
    if (hasWeapon(entry.weapon)) return entry.weapon;
    if (entry.fallback && hasWeapon(entry.fallback)) return entry.fallback;
    return allWeaponDefs()[0].id; // último recurso: nunca devolver un id inexistente
  }

  /**
   * Tira los dados en la tabla del contenedor. Consume exactamente UN número de `rng`, así que con un
   * rng con semilla el resultado es determinista (útil para la generación procedural por chunk).
   */
  roll(container: ContainerType, rng: () => number = Math.random): WeaponId {
    const table = this.tables[container];
    const total = table.reduce((s, e) => s + e.weight, 0);
    let r = rng() * total;
    for (const e of table) {
      r -= e.weight;
      if (r <= 0) return this.resolve(e);
    }
    return this.resolve(table[table.length - 1]);
  }

  /** Probabilidades efectivas (por arma resuelta) de un contenedor; útil para depurar el balance. */
  probabilities(container: ContainerType): Record<WeaponId, number> {
    const table = this.tables[container];
    const total = table.reduce((s, e) => s + e.weight, 0);
    const out: Record<WeaponId, number> = {};
    for (const e of table) {
      const id = this.resolve(e);
      out[id] = (out[id] ?? 0) + e.weight / total;
    }
    return out;
  }
}

/** Instancia compartida por el generador de mundo y el juego. */
export const lootManager = new LootManager();
