import { Weapon } from './weapon';
import { getWeaponDef } from './weaponDefs';
import type { WeaponId } from './weaponTypes';

/** Lo que hay en el suelo / en un contenedor: el arma y, opcionalmente, su munición actual. */
export interface WeaponItem {
  weapon: WeaponId;
  ammo?: number;
  reserve?: number;
}

export type PickupResult =
  | { kind: 'new'; weapon: Weapon }
  | { kind: 'ammo'; weapon: Weapon; added: number }
  | { kind: 'swap'; weapon: Weapon; dropped: Weapon }
  | { kind: 'duplicate'; weapon: Weapon };

/** Inventario de armas del jugador: 5 ranuras (teclas 1-5) y una arma equipada. */
export class Arsenal {
  static readonly SLOTS = 5;
  readonly slots: (Weapon | null)[] = Array.from({ length: Arsenal.SLOTS }, () => null);
  equipped = 0;

  get current(): Weapon | null {
    return this.slots[this.equipped];
  }

  /**
   * Recoge un arma:
   *  - si ya tienes esa arma, solo se aprovecha su munición (cuerpo a cuerpo: no hace nada);
   *  - si hay ranura libre, se añade y se equipa;
   *  - si no, reemplaza a la equipada y devuelve la anterior para dejarla en el suelo.
   */
  pickup(item: WeaponItem): PickupResult | null {
    const def = getWeaponDef(item.weapon);
    if (!def) return null;

    const owned = this.slots.find((w) => w?.def.id === def.id);
    if (owned) {
      if (def.magSize <= 0) return { kind: 'duplicate', weapon: owned };
      const added = item.ammo !== undefined || item.reserve !== undefined ? (item.ammo ?? 0) + (item.reserve ?? 0) : def.magSize;
      owned.reserve += added;
      return { kind: 'ammo', weapon: owned, added };
    }

    const weapon = new Weapon(def, { ammo: item.ammo, reserve: item.reserve });
    const free = this.slots.findIndex((w) => w === null);
    if (free >= 0) {
      this.slots[free] = weapon;
      this.select(free);
      return { kind: 'new', weapon };
    }
    const dropped = this.slots[this.equipped]!;
    dropped.cancelReload();
    this.slots[this.equipped] = weapon;
    return { kind: 'swap', weapon, dropped };
  }

  select(i: number) {
    if (i < 0 || i >= Arsenal.SLOTS || !this.slots[i] || i === this.equipped) return;
    this.current?.cancelReload(); // cambiar de arma cancela la recarga
    this.equipped = i;
  }

  update(dt: number) {
    this.current?.update(dt);
  }
}
