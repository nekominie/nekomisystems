import { WORLD } from './worldConfig';
import { chunkRng, hash2, mulberry32 } from './random';
import { forestDensity } from './terrainFields';
import { lootManager } from '../weapons/lootManager';
import {
  buildRibbon,
  makeCurve,
  ribbonIntersects,
  ribbonQuad,
  ribbonSegmentsNear,
  segMid,
  type Ribbon,
  type Seg,
} from './curves';
import type { CityMap } from './cityGenerator';
import type { TownMap } from './townGenerator';
import type { HighwayNet } from './roadNetwork';
import type { Camp, Quad, Rect, Tent, Tower } from './types';

const TENT_COLORS = [0xd97706, 0x4d7c0f, 0x2563eb, 0xb91c1c, 0x7c3aed, 0x0f766e];

/**
 * Campamentos: poco frecuentes y mucho más probables dentro de bosques densos. Son sencillos:
 * tiendas de campaña alrededor de una fogata, más una o dos cajas de botín. Cerca de algunos
 * campamentos hay una torre de guardabosques. Se decide por chunk (a lo sumo uno por chunk).
 */
export class CampMap {
  private cache = new Map<string, Camp | null>();

  constructor(
    readonly seed: number,
    private cities: CityMap,
    private towns: TownMap,
    private highways: HighwayNet,
  ) {}

  campOfChunk(cx: number, cz: number): Camp | null {
    const key = `${cx},${cz}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const camp = this.generate(cx, cz);
    this.cache.set(key, camp);
    return camp;
  }

  private generate(cx: number, cz: number): Camp | null {
    const cs = WORLD.chunkSize;
    const rng = chunkRng(this.seed, cx, cz, 52);
    const x = cx * cs + 16 + rng() * (cs - 32);
    const z = cz * cs + 16 + rng() * (cs - 32);

    // Probabilidad baja, mucho mayor donde hay árboles densos
    const forest = forestDensity(this.seed, x, z);
    const p = WORLD.camp.baseChance + WORLD.camp.forestChance * Math.pow(forest, 1.5);
    if (rng() > p) return null;

    if (Math.hypot(x, z) < 40) return null;
    if (this.cities.cityNear(x, z, 40)) return null;
    if (this.towns.townNear(x, z, 40)) return null;
    if (this.highways.near(x, z, 22)) return null;

    // Tiendas de campaña en anillo alrededor de la fogata
    const tents: Tent[] = [];
    const nTents = 2 + Math.floor(rng() * 3);
    const a0 = rng() * Math.PI * 2;
    for (let i = 0; i < nTents; i++) {
      const a = a0 + (i / nTents) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const r = 4.2 + rng() * 1.4;
      tents.push({
        x: x + Math.cos(a) * r,
        z: z + Math.sin(a) * r,
        rot: a + Math.PI / 2 + (rng() - 0.5) * 0.4,
        size: 2.3 + rng() * 0.7,
        height: 1.5 + rng() * 0.5,
        color: TENT_COLORS[Math.floor(rng() * TENT_COLORS.length)],
      });
    }

    // Fogata principal (y a veces una pequeña auxiliar)
    const fires = [{ x, z }];
    if (rng() < 0.25) fires.push({ x: x + (rng() - 0.5) * 3 + 2, z: z + (rng() - 0.5) * 3 - 2 });

    // 1-2 cajas con botín, entre las tiendas y la fogata
    const crates = [];
    const nCrates = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < nCrates; i++) {
      const a = rng() * Math.PI * 2;
      const r = 2.6 + rng() * 1.2;
      crates.push({
        id: `crate:camp:${cx},${cz}:${i}`,
        x: x + Math.cos(a) * r,
        z: z + Math.sin(a) * r,
        rot: rng() * Math.PI,
        loot: lootManager.roll('military_crate', rng),
      });
    }

    // Torre de guardabosques cerca del campamento
    let tower: Tower | undefined;
    if (rng() < WORLD.camp.towerChance) {
      const a = rng() * Math.PI * 2;
      const d = 14 + rng() * 10;
      const tx = x + Math.cos(a) * d;
      const tz = z + Math.sin(a) * d;
      if (!this.highways.near(tx, tz, 12) && !this.cities.cityNear(tx, tz, 20)) {
        tower = { x: tx, z: tz, rot: rng() * Math.PI * 2, height: 8.5 + rng() * 2 };
      }
    }

    return { id: `camp:${cx},${cz}`, x, z, tents, fires, crates, tower };
  }
}

interface TrailNode {
  id: string;
  x: number;
  z: number;
}

const hashStr = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * Senderos de tierra, muy irregulares, que unen campamentos y torres de guardabosques. Cada nodo
 * se conecta con el nodo más cercano (y a veces con el segundo más cercano) dentro de `trail.range`.
 * Todo se deriva de la posición de los campamentos, así que no hace falta estado global.
 */
export class TrailNet {
  private nodeCache = new Map<string, TrailNode[]>();
  private neighborCache = new Map<string, TrailNode[]>();
  private ribbonCache = new Map<string, Ribbon>();
  private readonly rangeChunks = Math.ceil(WORLD.trail.range / WORLD.chunkSize);

  constructor(
    readonly seed: number,
    private camps: CampMap,
  ) {}

  private nodesOfChunk(cx: number, cz: number): TrailNode[] {
    const key = `${cx},${cz}`;
    const cached = this.nodeCache.get(key);
    if (cached) return cached;
    const out: TrailNode[] = [];
    const camp = this.camps.campOfChunk(cx, cz);
    if (camp) {
      out.push({ id: camp.id, x: camp.x, z: camp.z });
      if (camp.tower) out.push({ id: `tower:${cx},${cz}`, x: camp.tower.x, z: camp.tower.z });
    }
    this.nodeCache.set(key, out);
    return out;
  }

  private nodesAround(cx: number, cz: number, r: number): TrailNode[] {
    const out: TrailNode[] = [];
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) out.push(...this.nodesOfChunk(cx + dx, cz + dz));
    return out;
  }

  private neighborsOf(n: TrailNode): TrailNode[] {
    const cached = this.neighborCache.get(n.id);
    if (cached) return cached;
    const cs = WORLD.chunkSize;
    const range = WORLD.trail.range;
    const others = this.nodesAround(Math.floor(n.x / cs), Math.floor(n.z / cs), this.rangeChunks)
      .filter((o) => o.id !== n.id)
      .map((o) => ({ o, d: Math.hypot(o.x - n.x, o.z - n.z) }))
      .filter((e) => e.d <= range)
      .sort((a, b) => a.d - b.d);
    const res: TrailNode[] = [];
    if (others[0]) res.push(others[0].o);
    if (others[1] && mulberry32(hashStr(n.id) ^ this.seed)() < 0.5) res.push(others[1].o);
    this.neighborCache.set(n.id, res);
    return res;
  }

  private ribbonBetween(a: TrailNode, b: TrailNode): Ribbon {
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    const cached = this.ribbonCache.get(key);
    if (cached) return cached;
    // Orden canónico para que el sendero sea el mismo desde ambos extremos
    const [p, q] = a.id < b.id ? [a, b] : [b, a];
    const rng = mulberry32(hash2(this.seed + 606, hashStr(key), 1));
    const pts = makeCurve({ x: p.x, z: p.z }, { x: q.x, z: q.z }, rng, 'trail', WORLD.trail.step);
    const ph1 = rng() * 6.28;
    const ph2 = rng() * 6.28;
    // Ancho muy irregular: 0.9 – 2.6 m
    const ribbon = buildRibbon(pts, (i) => {
      const w = 1.7 + 0.5 * Math.sin(i * 0.37 + ph1) + 0.4 * Math.sin(i * 1.13 + ph2);
      return Math.max(0.45, w / 2 + 0.2) ;
    });
    this.ribbonCache.set(key, ribbon);
    return ribbon;
  }

  /** Senderos cuya caja envolvente toca `rect` (+margen). */
  trailsNear(rect: Rect, margin = 0): Ribbon[] {
    const cs = WORLD.chunkSize;
    const c0x = Math.floor(rect.minX / cs);
    const c1x = Math.floor(rect.maxX / cs);
    const c0z = Math.floor(rect.minZ / cs);
    const c1z = Math.floor(rect.maxZ / cs);
    const seen = new Set<string>();
    const out: Ribbon[] = [];
    for (let cz = c0z - this.rangeChunks; cz <= c1z + this.rangeChunks; cz++) {
      for (let cx = c0x - this.rangeChunks; cx <= c1x + this.rangeChunks; cx++) {
        for (const n of this.nodesOfChunk(cx, cz)) {
          for (const m of this.neighborsOf(n)) {
            const key = n.id < m.id ? `${n.id}|${m.id}` : `${m.id}|${n.id}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const r = this.ribbonBetween(n, m);
            if (ribbonIntersects(r, rect, margin)) out.push(r);
          }
        }
      }
    }
    return out;
  }

  segmentsNear(rect: Rect, margin: number): Seg[] {
    const out: Seg[] = [];
    for (const r of this.trailsNear(rect, margin)) ribbonSegmentsNear(r, rect, margin, out);
    return out;
  }

  /** Cuadriláteros de tierra del sendero cuyo punto medio cae dentro del chunk. */
  ownedQuads(rect: Rect, cities: CityMap): Quad[] {
    const out: Quad[] = [];
    for (const r of this.trailsNear(rect, 6)) {
      for (let i = 0; i < r.pts.length - 1; i++) {
        const m = segMid(r, i);
        if (m.x < rect.minX || m.x >= rect.maxX || m.z < rect.minZ || m.z >= rect.maxZ) continue;
        if (cities.cityNear(m.x, m.z, 2)) continue;
        out.push(ribbonQuad(r, i));
      }
    }
    return out;
  }
}
