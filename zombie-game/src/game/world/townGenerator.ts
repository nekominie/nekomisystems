import { WORLD } from './worldConfig';
import { hash2, mulberry32 } from './random';
import { makeCar } from './cars';
import { lootManager } from '../weapons/lootManager';
import { CABIN } from './cabin';
import type { CityMap } from './cityGenerator';
import type { Car, Rect, Structure } from './types';

const HOUSE_WALLS = [0xb9a58a, 0x9c8f7a, 0xc7b8a0, 0x8d7b68, 0xa6a39a, 0x7f8a8c, 0xa8765a, 0x8a9a7a];
const HOUSE_ROOFS = [0x5a2f27, 0x3f3f46, 0x4a3b2e, 0x2f3a3f, 0x6a3a2a];
const CABIN_WALLS = [0x6b4a2f, 0x7a5636, 0x5a3e28, 0x6e5a3a];
const CABIN_ROOFS = [0x3b2a20, 0x4a2c25, 0x2f2f2a];

const pick = <T>(arr: readonly T[], r: number): T => arr[Math.floor(r * arr.length) % arr.length];

export interface Town {
  id: string;
  /** Caja que contiene calles y casas (+margen). */
  rect: Rect;
  centerX: number;
  centerZ: number;
  /** Calles de tierra (rectángulos). */
  streets: Rect[];
  /** Cabañas (huecas, con puerta) y casas (macizas), orientadas hacia la calle. */
  structures: Structure[];
  /** Camionetas de campo estacionadas. */
  cars: Car[];
}

interface Street {
  /** 'x': recorre el eje X (z fijo); 'z': recorre el eje Z (x fijo). */
  axis: 'x' | 'z';
  line: number;
  from: number;
  to: number;
  halfW: number;
}

/**
 * Pueblos: pequeños grupos de cabañas y casas de variados tamaños y colores a ambos lados de una
 * calle principal de tierra (más 1-2 calles laterales). Se generan por celdas de `towns.cell`
 * metros, a lo sumo uno por celda; el rectángulo del pueblo siempre queda dentro de su celda.
 */
export class TownMap {
  private cache = new Map<string, Town | null>();

  constructor(
    readonly seed: number,
    private cities: CityMap,
  ) {}

  getCellTown(tx: number, tz: number): Town | null {
    const key = `${tx},${tz}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const town = this.generate(tx, tz);
    this.cache.set(key, town);
    return town;
  }

  private generate(tx: number, tz: number): Town | null {
    const cell = WORLD.towns.cell;
    const rng = mulberry32(hash2(this.seed + 404, tx, tz));
    if (rng() > WORLD.towns.chance) return null;

    const cx = tx * cell + 72 + rng() * (cell - 144);
    const cz = tz * cell + 72 + rng() * (cell - 144);
    const halfL = 36 + rng() * 22;
    const mainHalfW = 3;
    const sideHalfW = 2.5;

    // Calles
    const streets: Street[] = [{ axis: 'x', line: cz, from: cx - halfL, to: cx + halfL, halfW: mainHalfW }];
    const sideCount = 1 + Math.floor(rng() * 2);
    const sideXs: number[] = [];
    for (let k = 0; k < sideCount; k++) {
      const sign = k === 0 ? (rng() < 0.5 ? -1 : 1) : -Math.sign(sideXs[0] - cx);
      const sx = cx + sign * (12 + rng() * (halfL - 26));
      if (sideXs.some((o) => Math.abs(o - sx) < 20)) continue;
      sideXs.push(sx);
      const hl = 28 + rng() * 14;
      streets.push({ axis: 'z', line: sx, from: cz - hl, to: cz + hl, halfW: sideHalfW });
    }

    const structures: Structure[] = [];
    const cars: Car[] = [];
    let idx = 0;

    /** `place(w, d)` devuelve el centro del edificio pegado a la calle según su profundidad real. */
    const addBuilding = (place: (w: number, d: number) => { x: number; z: number }, rot: number) => {
      const isCabin = rng() < 0.5;
      const big = !isCabin && rng() < 0.12; // algún edificio grande (tienda / iglesia)
      let w: number;
      let d: number;
      if (isCabin) {
        w = 5 + rng() * 2.5;
        d = 4.5 + rng() * 2;
      } else if (big) {
        w = 11 + rng() * 2;
        d = 8 + rng() * 2;
      } else {
        w = 7 + rng() * 4;
        d = 6 + rng() * 3;
      }
      const { x, z } = place(w, d);
      const id = idx++;
      const s: Structure = {
        kind: isCabin ? 'cabin' : 'house',
        x,
        z,
        w,
        d,
        h: isCabin ? 2.8 : big ? 5 + rng() * 1.5 : 3.2 + rng() * 1.3,
        roofH: isCabin ? 1.9 : 1.8 + rng() * 1.1,
        rot,
        wallColor: isCabin ? pick(CABIN_WALLS, rng()) : pick(HOUSE_WALLS, rng()),
        roofColor: isCabin ? pick(CABIN_ROOFS, rng()) : pick(HOUSE_ROOFS, rng()),
      };
      if (isCabin && rng() < WORLD.towns.cabinCrateChance) {
        const m = CABIN.wallT / 2 + CABIN.crateSize / 2 + 0.25;
        s.crate = {
          id: `crate:town:${tx},${tz}:${id}`,
          lx: (rng() < 0.5 ? -1 : 1) * (w / 2 - m),
          lz: -(d / 2 - m),
          loot: lootManager.roll('cabin_rural', rng),
        };
      }
      structures.push(s);
    };

    // Casas a ambos lados de la calle principal (puerta hacia la calle)
    const sideStreets = streets.filter((s) => s.axis === 'z');
    for (let x = cx - halfL + 8; x < cx + halfL - 7; x += 15 + rng() * 4) {
      for (const side of [-1, 1]) {
        if (rng() < 0.12) continue; // hueco entre casas
        if (sideStreets.some((s) => Math.abs(x - s.line) < sideHalfW + 9)) continue;
        // side<0: al norte (z menor) => puerta hacia +Z (rot 0); side>0: al sur => rot PI
        addBuilding((_w, d) => ({ x, z: cz + side * (mainHalfW + 2.2 + d / 2) }), side < 0 ? 0 : Math.PI);
      }
    }
    // Casas a lo largo de las calles laterales (puerta hacia la calle)
    for (const st of sideStreets) {
      for (let z = st.from + 7; z < st.to - 5; z += 15 + rng() * 4) {
        if (Math.abs(z - cz) < mainHalfW + 2.2 + 9 + 7) continue; // no sobre las casas de la calle principal
        for (const side of [-1, 1]) {
          if (rng() < 0.15) continue;
          // lado este (side>0): puerta hacia -X => rot -PI/2; lado oeste: +PI/2
          addBuilding(
            (_w, d) => ({ x: st.line + side * (sideHalfW + 2.2 + d / 2), z }),
            side > 0 ? -Math.PI / 2 : Math.PI / 2,
          );
        }
      }
    }

    // Camionetas de campo estacionadas junto a las calles
    for (const st of streets) {
      const stepC = 18;
      for (let v = st.from + 8; v < st.to - 6; v += stepC) {
        if (rng() > WORLD.cars.townChance) continue;
        const side = rng() < 0.5 ? -1 : 1;
        const off = side * (st.halfW - 1.4);
        if (st.axis === 'x') {
          cars.push(makeCar('farm', v, st.line + off, side > 0 ? Math.PI / 2 : -Math.PI / 2, rng));
        } else {
          cars.push(makeCar('farm', st.line + off, v, side > 0 ? 0 : Math.PI, rng));
        }
      }
    }

    // Rectángulo total
    let minX = cx - halfL;
    let maxX = cx + halfL;
    let minZ = cz - mainHalfW;
    let maxZ = cz + mainHalfW;
    for (const st of streets) {
      if (st.axis === 'z') {
        minX = Math.min(minX, st.line - st.halfW);
        maxX = Math.max(maxX, st.line + st.halfW);
        minZ = Math.min(minZ, st.from);
        maxZ = Math.max(maxZ, st.to);
      }
    }
    for (const s of structures) {
      const r = Math.hypot(s.w, s.d) / 2;
      minX = Math.min(minX, s.x - r);
      maxX = Math.max(maxX, s.x + r);
      minZ = Math.min(minZ, s.z - r);
      maxZ = Math.max(maxZ, s.z + r);
    }
    const rect: Rect = { minX: minX - 6, maxX: maxX + 6, minZ: minZ - 6, maxZ: maxZ + 6 };

    // Nunca sobre una ciudad ni sobre el punto de aparición del jugador
    if (this.cities.cityOverlapping(rect, 30)) return null;
    if (rect.minX < 55 && rect.maxX > -55 && rect.minZ < 55 && rect.maxZ > -55) return null;

    const streetRects: Rect[] = streets.map((s) =>
      s.axis === 'x'
        ? { minX: s.from, maxX: s.to, minZ: s.line - s.halfW, maxZ: s.line + s.halfW }
        : { minX: s.line - s.halfW, maxX: s.line + s.halfW, minZ: s.from, maxZ: s.to },
    );

    return { id: `${tx},${tz}`, rect, centerX: cx, centerZ: cz, streets: streetRects, structures, cars };
  }

  /** Pueblos cuyo rectángulo (expandido por margin) se solapa con `rect`. */
  townsOverlapping(rect: Rect, margin = 0): Town[] {
    const cell = WORLD.towns.cell;
    const out: Town[] = [];
    const t0x = Math.floor((rect.minX - margin) / cell);
    const t1x = Math.floor((rect.maxX + margin) / cell);
    const t0z = Math.floor((rect.minZ - margin) / cell);
    const t1z = Math.floor((rect.maxZ + margin) / cell);
    for (let tz = t0z; tz <= t1z; tz++) {
      for (let tx = t0x; tx <= t1x; tx++) {
        const t = this.getCellTown(tx, tz);
        if (
          t &&
          t.rect.maxX + margin >= rect.minX &&
          t.rect.minX - margin <= rect.maxX &&
          t.rect.maxZ + margin >= rect.minZ &&
          t.rect.minZ - margin <= rect.maxZ
        )
          out.push(t);
      }
    }
    return out;
  }

  /** Pueblo que contiene el punto (con margen), si lo hay. */
  townNear(x: number, z: number, margin = 0): Town | null {
    return this.townsOverlapping({ minX: x, maxX: x, minZ: z, maxZ: z }, margin)[0] ?? null;
  }
}
