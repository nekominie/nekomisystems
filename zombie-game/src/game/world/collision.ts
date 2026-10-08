import { resolveCircleVsCabin, type CabinCollider } from './cabin';

/** Colisionador circular (troncos de árboles, postes, patas de torres, fogatas...). */
export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
}

/** Círculo o caja orientada (cabañas, casas, edificios, carros, tiendas...). */
export type Collider = CircleCollider | CabinCollider;

export const circle = (x: number, z: number, r: number): CircleCollider => ({ kind: 'circle', x, z, r });

function resolveVsCircle(c: CircleCollider, x: number, z: number, r: number): { x: number; z: number } | null {
  const dx = x - c.x;
  const dz = z - c.z;
  const min = c.r + r;
  const d2 = dx * dx + dz * dz;
  if (d2 >= min * min) return null;
  if (d2 < 1e-8) return { x: c.x + min, z };
  const k = min / Math.sqrt(d2);
  return { x: c.x + dx * k, z: c.z + dz * k };
}

/** Caja envolvente [minX, maxX, minZ, maxZ] de un colisionador. */
function bounds(c: Collider): [number, number, number, number] {
  if (c.kind === 'circle') return [c.x - c.r, c.x + c.r, c.z - c.r, c.z + c.r];
  return [c.s.x - c.reach, c.s.x + c.reach, c.s.z - c.reach, c.s.z + c.reach];
}

/** ¿El punto (x, z) está dentro del colisionador? */
function contains(c: Collider, x: number, z: number): boolean {
  if (c.kind === 'circle') {
    const dx = x - c.x;
    const dz = z - c.z;
    return dx * dx + dz * dz <= c.r * c.r;
  }
  const dx = x - c.s.x;
  const dz = z - c.s.z;
  const lx = dx * c.cos - dz * c.sin;
  const lz = dx * c.sin + dz * c.cos;
  for (const b of c.boxes) {
    if (Math.abs(lx - b.cx) <= b.hw && Math.abs(lz - b.cz) <= b.hd) return true;
  }
  return false;
}

interface Entry {
  c: Collider;
  owner: string;
}

/**
 * Rejilla espacial uniforme con los colisionadores de todos los chunks cargados. Cada colisionador se
 * registra en las celdas que toca; una consulta solo mira las 1-4 celdas bajo el círculo, así que el
 * coste no depende de cuántos árboles/edificios haya cargados (clave con miles de árboles y cientos
 * de zombis moviéndose cada frame).
 */
export class CollisionGrid {
  private static readonly CELL = 6;
  private cells = new Map<number, Entry[]>();
  private owned = new Map<string, number[]>();

  private key(ix: number, iz: number) {
    return (ix + 32768) * 65536 + (iz + 32768);
  }

  /** Registra los colisionadores de un chunk (`owner` = clave del chunk). */
  add(owner: string, list: Collider[]) {
    const CELL = CollisionGrid.CELL;
    const keys = new Set<number>();
    for (const c of list) {
      const [x0, x1, z0, z1] = bounds(c);
      const entry: Entry = { c, owner };
      for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
        for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++) {
          const k = this.key(ix, iz);
          const arr = this.cells.get(k);
          if (arr) arr.push(entry);
          else this.cells.set(k, [entry]);
          keys.add(k);
        }
      }
    }
    this.owned.set(owner, [...keys]);
  }

  /** Quita los colisionadores de un chunk al descargarlo. */
  remove(owner: string) {
    const keys = this.owned.get(owner);
    if (!keys) return;
    for (const k of keys) {
      const arr = this.cells.get(k);
      if (!arr) continue;
      const rest = arr.filter((e) => e.owner !== owner);
      if (rest.length) this.cells.set(k, rest);
      else this.cells.delete(k);
    }
    this.owned.delete(owner);
  }

  clear() {
    this.cells.clear();
    this.owned.clear();
  }

  /**
   * Distancia (m) hasta el primer sólido que corta el rayo horizontal (dx, dz unitario) o null.
   * Avanza a pasos de 0.25 m consultando solo la celda actual; ignora el primer metro para que un
   * arma pegada a una pared no se bloquee a sí misma.
   */
  raycast(ox: number, oz: number, dx: number, dz: number, maxDist: number, step = 0.25, skip = 0.4): number | null {
    const CELL = CollisionGrid.CELL;
    for (let t = skip; t <= maxDist; t += step) {
      const x = ox + dx * t;
      const z = oz + dz * t;
      const arr = this.cells.get(this.key(Math.floor(x / CELL), Math.floor(z / CELL)));
      if (!arr) continue;
      for (const e of arr) if (contains(e.c, x, z)) return t;
    }
    return null;
  }

  /** Empuja el círculo (x, z, r) fuera de todo lo sólido cercano. */
  resolve(x: number, z: number, r: number): { x: number; z: number } {
    const CELL = CollisionGrid.CELL;
    let px = x;
    let pz = z;
    // Dos pasadas: salir de un obstáculo puede meterte en otro (esquinas, árboles juntos)
    for (let pass = 0; pass < 2; pass++) {
      const ix0 = Math.floor((px - r) / CELL);
      const ix1 = Math.floor((px + r) / CELL);
      const iz0 = Math.floor((pz - r) / CELL);
      const iz1 = Math.floor((pz + r) / CELL);
      for (let iz = iz0; iz <= iz1; iz++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const arr = this.cells.get(this.key(ix, iz));
          if (!arr) continue;
          for (const e of arr) {
            const c = e.c;
            if (c.kind === 'circle') {
              const p = resolveVsCircle(c, px, pz, r);
              if (p) {
                px = p.x;
                pz = p.z;
              }
            } else {
              const p = resolveCircleVsCabin(c, px, pz, r);
              px = p.x;
              pz = p.z;
            }
          }
        }
      }
    }
    return { x: px, z: pz };
  }
}
