import { WORLD } from './worldConfig';
import { hash2, mulberry32 } from './random';
import { makeCar } from './cars';
import { makeGasStation } from './gasStation';
import type { Car, City, GasStation, Rect, Structure } from './types';

const WALL_HOUSE = [0xb9a58a, 0x9c8f7a, 0xc7b8a0, 0x8d7b68, 0xa6a39a, 0x7f8a8c];
const ROOF_HOUSE = [0x5a2f27, 0x3f3f46, 0x4a3b2e, 0x2f3a3f];
const WALL_BUILDING = [0x6b7078, 0x7b6a5e, 0x575d66, 0x8a8478, 0x4e555e];

const pick = <T>(arr: readonly T[], r: number): T => arr[Math.floor(r * arr.length) % arr.length];

export function rectContains(r: Rect, x: number, z: number, margin = 0): boolean {
  return x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin;
}

/**
 * Las ciudades se colocan por "regiones" de regionSize x regionSize.
 * Cada región tiene (con cierta probabilidad) una ciudad que cabe completamente
 * dentro de ella, así que nunca se solapan y se pueden consultar sin estado global.
 *
 * Cada ciudad es una cuadrícula de nx*nz manzanas separadas por calles.
 */
export class CityMap {
  private cities = new Map<string, City | null>();
  private structures = new Map<string, Structure[]>();
  private cars = new Map<string, Car[]>();
  private stations = new Map<string, GasStation>();

  constructor(readonly seed: number) {}

  regionOf(v: number): number {
    return Math.floor(v / WORLD.regionSize);
  }

  getRegionCity(rx: number, rz: number): City | null {
    const key = `${rx},${rz}`;
    if (this.cities.has(key)) return this.cities.get(key)!;

    const R = WORLD.regionSize;
    const { pitch, streetW, minBlocks, maxBlocks } = WORLD.city;
    const rng = mulberry32(hash2(this.seed + 101, rx, rz));
    let city: City | null = null;

    // La región (0,0) se deja libre para que el spawn sea campo abierto.
    if (!(rx === 0 && rz === 0) && rng() < WORLD.cityChance) {
      const span = maxBlocks - minBlocks + 1;
      const nx = minBlocks + Math.floor(rng() * span);
      const nz = minBlocks + Math.floor(rng() * span);
      const w = nx * pitch + streetW;
      const d = nz * pitch + streetW;
      const snap = (v: number) => Math.round(v / 2) * 2;
      const minX = rx * R + 8 + snap(rng() * (R - w - 16));
      const minZ = rz * R + 8 + snap(rng() * (R - d - 16));
      city = {
        seed: hash2(this.seed + 202, rx, rz),
        ox: minX + streetW / 2,
        oz: minZ + streetW / 2,
        nx,
        nz,
        pitch,
        streetW,
        minX,
        maxX: minX + w,
        minZ,
        maxZ: minZ + d,
        centerX: minX + w / 2,
        centerZ: minZ + d / 2,
      };
    }
    this.cities.set(key, city);
    return city;
  }

  /** Ciudad cuyo rectángulo (expandido por margin) contiene el punto. */
  cityNear(x: number, z: number, margin = 0): City | null {
    const xs = [x - margin, x + margin];
    const zs = [z - margin, z + margin];
    for (const px of xs) {
      for (const pz of zs) {
        const c = this.getRegionCity(this.regionOf(px), this.regionOf(pz));
        if (c && rectContains(c, x, z, margin)) return c;
      }
    }
    return null;
  }

  /** Alguna ciudad cuyo rectángulo (expandido por margin) se solapa con `rect`. */
  cityOverlapping(rect: Rect, margin = 0): City | null {
    const R = WORLD.regionSize;
    const r0x = Math.floor((rect.minX - margin) / R);
    const r1x = Math.floor((rect.maxX + margin) / R);
    const r0z = Math.floor((rect.minZ - margin) / R);
    const r1z = Math.floor((rect.maxZ + margin) / R);
    for (let rz = r0z; rz <= r1z; rz++) {
      for (let rx = r0x; rx <= r1x; rx++) {
        const c = this.getRegionCity(rx, rz);
        if (
          c &&
          c.maxX + margin >= rect.minX &&
          c.minX - margin <= rect.maxX &&
          c.maxZ + margin >= rect.minZ &&
          c.minZ - margin <= rect.maxZ
        )
          return c;
      }
    }
    return null;
  }

  /** Ciudad más cercana al punto (busca en las regiones vecinas). */
  nearestCity(x: number, z: number): { city: City; dist: number } | null {
    const rx = this.regionOf(x);
    const rz = this.regionOf(z);
    let best: { city: City; dist: number } | null = null;
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const c = this.getRegionCity(rx + dx, rz + dz);
        if (!c) continue;
        const dist = Math.hypot(c.centerX - x, c.centerZ - z);
        if (!best || dist < best.dist) best = { city: c, dist };
      }
    }
    return best;
  }

  /** Tiras de calle (asfalto) de la ciudad. */
  getRoads(city: City): Rect[] {
    const roads: Rect[] = [];
    const hw = city.streetW / 2;
    for (let i = 0; i <= city.nx; i++) {
      const x = city.ox + i * city.pitch;
      roads.push({ minX: x - hw, maxX: x + hw, minZ: city.minZ, maxZ: city.maxZ });
    }
    for (let j = 0; j <= city.nz; j++) {
      const z = city.oz + j * city.pitch;
      roads.push({ minX: city.minX, maxX: city.maxX, minZ: z - hw, maxZ: z + hw });
    }
    return roads;
  }

  /** Manzana (i, j) que ocupa la gasolinera: una de las no céntricas (la región central es de edificios). */
  private stationBlock(city: City): { i: number; j: number } {
    const halfW = (city.maxX - city.minX) / 2;
    const halfD = (city.maxZ - city.minZ) / 2;
    const block = city.pitch - city.streetW;
    const outer: { i: number; j: number }[] = [];
    const all: { i: number; j: number }[] = [];
    for (let i = 0; i < city.nx; i++) {
      for (let j = 0; j < city.nz; j++) {
        all.push({ i, j });
        const bcx = city.ox + i * city.pitch + city.streetW / 2 + block / 2;
        const bcz = city.oz + j * city.pitch + city.streetW / 2 + block / 2;
        const dn = Math.max(Math.abs(bcx - city.centerX) / halfW, Math.abs(bcz - city.centerZ) / halfD);
        if (dn >= 0.3) outer.push({ i, j });
      }
    }
    const pool = outer.length ? outer : all;
    const rng = mulberry32(hash2(city.seed, 555, 777));
    return pool[Math.floor(rng() * pool.length)];
  }

  /** Gasolinera de la ciudad (una por ciudad), con una cantidad limitada de gasolina. */
  getStation(city: City): GasStation {
    const key = `${city.minX},${city.minZ}`;
    const cached = this.stations.get(key);
    if (cached) return cached;
    const { i, j } = this.stationBlock(city);
    const block = city.pitch - city.streetW;
    const x = city.ox + i * city.pitch + city.streetW / 2 + block / 2;
    const z = city.oz + j * city.pitch + city.streetW / 2 + block / 2;
    const rng = mulberry32(hash2(city.seed, 556, 778));
    const station = makeGasStation(`station:${key}`, x, z, 400 + Math.floor(rng() * 400));
    this.stations.set(key, station);
    return station;
  }

  /**
   * Carros modernos estacionados a ambos lados de las calles (cacheado).
   * Se saltan las intersecciones y se orientan en el sentido de la calle.
   */
  getCars(city: City): Car[] {
    const key = `${city.minX},${city.minZ}`;
    const cached = this.cars.get(key);
    if (cached) return cached;

    const out: Car[] = [];
    const rng = mulberry32(hash2(city.seed, 77, 91));
    const lane = city.streetW / 4; // centro del carril de estacionamiento
    const step = 13;
    const clear = city.streetW / 2 + 3; // no estacionar dentro de las intersecciones
    /** Distancia al eje de calle perpendicular más cercano. */
    const distToCross = (v: number, origin: number, n: number) => {
      const k = Math.min(n, Math.max(0, Math.round((v - origin) / city.pitch)));
      return Math.abs(v - (origin + k * city.pitch));
    };

    // Calles verticales (a lo largo de Z)
    for (let i = 0; i <= city.nx; i++) {
      const x = city.ox + i * city.pitch;
      for (let z = city.minZ + 10; z < city.maxZ - 8; z += step) {
        if (distToCross(z, city.oz, city.nz) < clear) continue;
        for (const side of [-1, 1]) {
          if (rng() > WORLD.cars.cityChance) continue;
          const rot = (side > 0 ? 0 : Math.PI) + (rng() - 0.5) * 0.06;
          out.push(makeCar('modern', x + side * lane, z + (rng() - 0.5) * 3, rot, rng));
        }
      }
    }
    // Calles horizontales (a lo largo de X)
    for (let j = 0; j <= city.nz; j++) {
      const z = city.oz + j * city.pitch;
      for (let x = city.minX + 10; x < city.maxX - 8; x += step) {
        if (distToCross(x, city.ox, city.nx) < clear) continue;
        for (const side of [-1, 1]) {
          if (rng() > WORLD.cars.cityChance) continue;
          const rot = (side > 0 ? Math.PI / 2 : -Math.PI / 2) + (rng() - 0.5) * 0.06;
          out.push(makeCar('modern', x + (rng() - 0.5) * 3, z + side * lane, rot, rng));
        }
      }
    }
    this.cars.set(key, out);
    return out;
  }

  /**
   * Edificios y casas de toda la ciudad (cacheado).
   * - Centro: manzanas con un edificio grande/alto.
   * - Periferia: 2x2 casas por manzana.
   * - Algunas manzanas quedan vacías (solares).
   */
  getStructures(city: City): Structure[] {
    const key = `${city.minX},${city.minZ}`;
    const cached = this.structures.get(key);
    if (cached) return cached;

    const out: Structure[] = [];
    const block = city.pitch - city.streetW;
    const halfW = (city.maxX - city.minX) / 2;
    const halfD = (city.maxZ - city.minZ) / 2;

    const sb = this.stationBlock(city);
    for (let i = 0; i < city.nx; i++) {
      for (let j = 0; j < city.nz; j++) {
        if (i === sb.i && j === sb.j) continue; // aquí va la gasolinera
        const rng = mulberry32(hash2(city.seed, i * 131 + 7, j * 197 + 3));
        const bMinX = city.ox + i * city.pitch + city.streetW / 2;
        const bMinZ = city.oz + j * city.pitch + city.streetW / 2;
        const bcx = bMinX + block / 2;
        const bcz = bMinZ + block / 2;
        const dn = Math.max(Math.abs(bcx - city.centerX) / halfW, Math.abs(bcz - city.centerZ) / halfD);

        const roll = rng();
        if (roll < 0.1) continue; // solar vacío

        if (dn < 0.65 && roll < 0.75) {
          const w = 16 + rng() * (block - 20);
          const d = 16 + rng() * (block - 20);
          const h = 10 + rng() * 32 * (1 - dn);
          out.push({
            kind: 'building',
            x: bcx,
            z: bcz,
            w,
            d,
            h,
            roofH: 0,
            rot: 0,
            wallColor: pick(WALL_BUILDING, rng()),
            roofColor: 0x2a2d32,
          });
          continue;
        }

        const lot = block / 2;
        for (let a = 0; a < 2; a++) {
          for (let b = 0; b < 2; b++) {
            const present = rng() < 0.88;
            const w = 7 + rng() * 3.5;
            const d = 7 + rng() * 3;
            const h = 3.2 + rng() * 1.2;
            const roofH = 1.8 + rng() * 0.8;
            const jx = (rng() - 0.5) * (lot - w - 1);
            const jz = (rng() - 0.5) * (lot - d - 1);
            const wall = pick(WALL_HOUSE, rng());
            const roof = pick(ROOF_HOUSE, rng());
            if (!present) continue;
            out.push({
              kind: 'house',
              x: bMinX + lot * (a + 0.5) + jx,
              z: bMinZ + lot * (b + 0.5) + jz,
              w,
              d,
              h,
              roofH,
              rot: 0,
              wallColor: wall,
              roofColor: roof,
            });
          }
        }
      }
    }
    this.structures.set(key, out);
    return out;
  }
}
