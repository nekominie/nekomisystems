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

/** Inventario de armas del jugador: 6 ranuras (teclas 1-6) y una arma equipada. */
export class Arsenal {
  static readonly SLOTS = 6;
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

  /**
   * Suelta o quita el arma de una ranura específica y la devuelve (o null si estaba vacía).
   * Si era la ranura actualmente equipada, se intenta equipar otra ranura con arma disponible.
   */
  dropSlot(i: number): Weapon | null {
    if (i < 0 || i >= Arsenal.SLOTS) return null;
    const w = this.slots[i];
    if (!w) return null;
    w.cancelReload();
    this.slots[i] = null;
    if (this.equipped === i) {
      const nextIdx = this.slots.findIndex((s) => s !== null);
      this.equipped = nextIdx >= 0 ? nextIdx : 0;
    }
    return w;
  }

  /**
   * Reacomoda o intercambia armas entre dos ranuras del inventario.
   * Si una de las ranuras era la actualmente equipada, el índice equipado sigue al arma activa.
   */
  swapSlots(from: number, to: number): boolean {
    if (from < 0 || from >= Arsenal.SLOTS || to < 0 || to >= Arsenal.SLOTS || from === to) {
      return false;
    }
    const a = this.slots[from];
    const b = this.slots[to];
    if (!a && !b) return false;

    // Si una de las ranuras estaba equipada, el cursor de equipado acompaña al arma
    if (this.equipped === from) {
      this.equipped = to;
    } else if (this.equipped === to) {
      this.equipped = from;
    }

    this.slots[from] = b;
    this.slots[to] = a;
    return true;
  }

  update(dt: number) {
    this.current?.update(dt);
  }
}
