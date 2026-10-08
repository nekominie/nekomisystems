import { WORLD } from './worldConfig';
import { CityMap, rectContains } from './cityGenerator';
import { TownMap } from './townGenerator';
import { HighwayNet } from './roadNetwork';
import { CampMap, TrailNet } from './campsAndTrails';
import { chunkRng, fbm, lerp, smoothstep } from './random';
import { forestDensity, naturalDirt } from './terrainFields';
import { distToSeg, rectQuad, type Seg } from './curves';
import { makeCar } from './cars';
import { CABIN } from './cabin';
import { lootManager } from '../weapons/lootManager';
import type { Camp, Car, ChunkData, Crate, GasStation, GroundDrop, Plant, Quad, Rect, Structure, TollBooth, Tower, WorldCrate } from './types';

type RGB = [number, number, number];
const hex = (c: number): RGB => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const GRASS_DARK = hex(0x2f4a24);
const GRASS_LIGHT = hex(0x4d6b32);
const DIRT_DARK = hex(0x4a3826);
const DIRT_LIGHT = hex(0x6b5237);
const CONCRETE = hex(0x4b4e52);

const CABIN_WALLS = [0x6b4a2f, 0x7a5636, 0x5a3e28];
const CABIN_ROOFS = [0x3b2a20, 0x4a2c25, 0x2f2f2a];

/** Cabaña con su radio de claro (sin árboles) alrededor. */
interface Cabin extends Structure {
  clear: number;
}

/** Zona circular libre de vegetación; `dirt` además pinta el suelo de tierra. */
interface Clearing {
  x: number;
  z: number;
  r: number;
  dirt: boolean;
}

const inChunk = (x: number, z: number, r: Rect) => x >= r.minX && x < r.maxX && z >= r.minZ && z < r.maxZ;

/** Recorta un rectángulo al chunk; devuelve null si queda vacío. */
function clipRect(r: Rect, c: Rect): Rect | null {
  const out = {
    minX: Math.max(r.minX, c.minX),
    maxX: Math.min(r.maxX, c.maxX),
    minZ: Math.max(r.minZ, c.minZ),
    maxZ: Math.min(r.maxZ, c.maxZ),
  };
  return out.maxX > out.minX && out.maxZ > out.minZ ? out : null;
}

/**
 * Genera, de forma determinista, el contenido de un chunk a partir de (seed, cx, cz).
 * Solo produce datos (sin three.js); el render lo hace chunkMesher.
 *
 * Biomas / elementos: ciudades (calles + carros), pueblos (calles de tierra + cabañas/casas +
 * camionetas), carreteras curvas entre ciudades (casetas de cobro + carros abandonados),
 * campamentos (tiendas, fogatas, cajas) con torres de guardabosques, senderos de tierra entre
 * ellos, cabañas sueltas y carros destruidos en el campo.
 */
export class WorldGenerator {
  readonly cities: CityMap;
  readonly towns: TownMap;
  readonly highways: HighwayNet;
  readonly camps: CampMap;
  readonly trails: TrailNet;

  constructor(readonly seed: number) {
    this.cities = new CityMap(seed);
    this.towns = new TownMap(seed, this.cities);
    this.highways = new HighwayNet(seed, this.cities);
    this.camps = new CampMap(seed, this.cities, this.towns, this.highways);
    this.trails = new TrailNet(seed, this.camps);
  }

  private cabinsOfChunk(cx: number, cz: number): Cabin[] {
    const cs = WORLD.chunkSize;
    const rng = chunkRng(this.seed, cx, cz, 11);
    if (rng() > WORLD.cabinChance) return [];

    const x = cx * cs + 10 + rng() * (cs - 20);
    const z = cz * cs + 10 + rng() * (cs - 20);
    const w = 5 + rng() * 2.5;
    const d = 4.5 + rng() * 2;
    const rot = Math.floor(rng() * 4) * (Math.PI / 2) + (rng() - 0.5) * 0.3;
    const wall = CABIN_WALLS[Math.floor(rng() * CABIN_WALLS.length)];
    const roof = CABIN_ROOFS[Math.floor(rng() * CABIN_ROOFS.length)];

    // A veces hay una caja de botín en una esquina trasera (lejos de la puerta, que está en +Z local).
    let crate: Crate | undefined;
    const crateRoll = rng();
    const crateSide = rng() < 0.5 ? -1 : 1;
    const loot = lootManager.roll('cabin_rural', rng);
    if (crateRoll < WORLD.cabinCrateChance) {
      const m = CABIN.wallT / 2 + CABIN.crateSize / 2 + 0.25;
      crate = {
        id: `crate:${cx},${cz}`,
        lx: crateSide * (w / 2 - m),
        lz: -(d / 2 - m),
        loot,
      };
    }

    // Las cabañas sueltas viven en el campo: lejos de ciudades, pueblos, carreteras y del spawn.
    if (this.cities.cityNear(x, z, 16)) return [];
    if (this.towns.townNear(x, z, 20)) return [];
    if (this.highways.near(x, z, 14)) return [];
    if (Math.hypot(x, z) < WORLD.spawnClearRadius + 8) return [];

    return [
      {
        kind: 'cabin',
        x,
        z,
        w,
        d,
        h: 2.8,
        roofH: 1.9,
        rot,
        wallColor: wall,
        roofColor: roof,
        crate,
        clear: Math.max(w, d) * 0.5 + 3,
      },
    ];
  }

  /** Carros destruidos en el campo: muy poco frecuentes. */
  private wrecksOfChunk(cx: number, cz: number): Car[] {
    const cs = WORLD.chunkSize;
    const rng = chunkRng(this.seed, cx, cz, 41);
    if (rng() > WORLD.cars.fieldWreckChance) return [];
    const x = cx * cs + 8 + rng() * (cs - 16);
    const z = cz * cs + 8 + rng() * (cs - 16);
    const rot = rng() * Math.PI * 2;
    const car = makeCar('wreck', x, z, rot, rng);
    if (Math.hypot(x, z) < 25) return [];
    if (this.cities.cityNear(x, z, 20)) return [];
    if (this.towns.townNear(x, z, 20)) return [];
    if (this.highways.near(x, z, 10)) return [];
    return [car];
  }

  generateChunk(cx: number, cz: number): ChunkData {
    const cs = WORLD.chunkSize;
    const ox = cx * cs;
    const oz = cz * cs;
    const seed = this.seed;
    const chunkRect: Rect = { minX: ox, maxX: ox + cs, minZ: oz, maxZ: oz + cs };

    // Un chunk está contenido en una sola región => a lo sumo una ciudad.
    const city = this.cities.getRegionCity(this.cities.regionOf(ox), this.cities.regionOf(oz));
    const towns = this.towns.townsOverlapping(chunkRect, 14);

    // Elementos propios + vecinos (para que los claros crucen bordes de chunk)
    const nearbyCabins: Cabin[] = [];
    const nearbyCamps: Camp[] = [];
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        nearbyCabins.push(...this.cabinsOfChunk(cx + dx, cz + dz));
        const camp = this.camps.campOfChunk(cx + dx, cz + dz);
        if (camp) nearbyCamps.push(camp);
      }
    }
    const wrecks = this.wrecksOfChunk(cx, cz);

    const clearings: Clearing[] = [];
    for (const c of nearbyCabins) clearings.push({ x: c.x, z: c.z, r: c.clear, dirt: true });
    for (const camp of nearbyCamps) {
      clearings.push({ x: camp.x, z: camp.z, r: 9, dirt: true });
      if (camp.tower) clearings.push({ x: camp.tower.x, z: camp.tower.z, r: 4.5, dirt: true });
    }
    for (const w of wrecks) clearings.push({ x: w.x, z: w.z, r: 2.8, dirt: false });

    // Carreteras y senderos que pasan cerca (para no plantar árboles encima)
    const roadSegs: Seg[] = [...this.highways.segmentsNear(chunkRect, 10), ...this.trails.segmentsNear(chunkRect, 10)];

    // --- Campos de ruido ---
    const dirtAt = (x: number, z: number): number => {
      let d = naturalDirt(seed, x, z);
      for (const c of clearings) {
        if (!c.dirt) continue;
        const dist = Math.hypot(x - c.x, z - c.z);
        d = Math.max(d, 1 - smoothstep(c.r - 1, c.r + 4, dist));
      }
      // Los pueblos tienen el suelo mayormente de tierra
      for (const t of towns) {
        const ddx = Math.max(t.rect.minX - x, 0, x - t.rect.maxX);
        const ddz = Math.max(t.rect.minZ - z, 0, z - t.rect.maxZ);
        d = Math.max(d, 0.55 * (1 - smoothstep(0, 8, Math.hypot(ddx, ddz))));
      }
      return d;
    };
    const forestAt = (x: number, z: number) => forestDensity(seed, x, z);

    /** Bloquea vegetación: ciudad/pueblo (+margen), claros, caminos y el spawn. */
    const blocked = (x: number, z: number, margin: number): boolean => {
      if (city && rectContains(city, x, z, margin)) return true;
      if (Math.hypot(x, z) < WORLD.spawnClearRadius) return true;
      for (const t of towns) if (rectContains(t.rect, x, z, margin)) return true;
      for (const c of clearings) if (Math.hypot(x - c.x, z - c.z) < c.r + margin) return true;
      for (const s of roadSegs) {
        if (distToSeg(x, z, s.ax, s.az, s.bx, s.bz) < s.hw + margin + 0.8) return true;
      }
      return false;
    };

    // --- Suelo: color por vértice (tierra / pasto / concreto en ciudad) ---
    const gc = WORLD.groundCell;
    const vn = cs / gc + 1;
    const groundColors = new Float32Array(vn * vn * 3);
    let k = 0;
    for (let iz = 0; iz < vn; iz++) {
      for (let ix = 0; ix < vn; ix++) {
        const x = ox + ix * gc;
        const z = oz + iz * gc;
        const tone = fbm(seed + 1, x / 12, z / 12, 2);
        const grass = mix(GRASS_DARK, GRASS_LIGHT, tone);
        const dirt = mix(DIRT_DARK, DIRT_LIGHT, fbm(seed + 5, x / 6, z / 6, 2));
        let col = mix(grass, dirt, dirtAt(x, z));
        if (city && rectContains(city, x, z)) col = CONCRETE;
        groundColors[k++] = col[0];
        groundColors[k++] = col[1];
        groundColors[k++] = col[2];
      }
    }

    // --- Vegetación: rejilla con jitter + aceptación por densidad ---
    const scatter = (
      cell: number,
      salt: number,
      accept: (x: number, z: number) => number,
      margin: number,
      make: (rng: () => number) => Omit<Plant, 'x' | 'z'>,
    ): Plant[] => {
      const rng = chunkRng(seed, cx, cz, salt);
      const n = Math.floor(cs / cell);
      const out: Plant[] = [];
      for (let gz = 0; gz < n; gz++) {
        for (let gx = 0; gx < n; gx++) {
          const x = ox + (gx + rng()) * cell;
          const z = oz + (gz + rng()) * cell;
          const roll = rng();
          const props = make(rng);
          if (roll < accept(x, z) && !blocked(x, z, margin)) out.push({ x, z, ...props });
        }
      }
      return out;
    };

    const trees = scatter(
      WORLD.treeCell,
      21,
      (x, z) => (0.04 + 0.85 * forestAt(x, z)) * (1 - dirtAt(x, z) * 0.8),
      4,
      (rng) => ({
        scale: 0.8 + rng() * 0.8,
        rot: rng() * Math.PI * 2,
        tone: rng(),
        kind: rng() < 0.6 ? 'pine' : 'oak',
      }),
    );

    const bushes = scatter(
      WORLD.bushCell,
      22,
      (x, z) => (0.15 + 0.4 * forestAt(x, z)) * (1 - dirtAt(x, z) * 0.6),
      2,
      (rng) => ({ scale: 0.6 + rng() * 0.7, rot: rng() * Math.PI * 2, tone: rng() }),
    );

    const grass = scatter(
      WORLD.grassCell,
      23,
      (x, z) => 0.55 * (1 - dirtAt(x, z)) * (0.4 + 0.6 * fbm(seed + 4, x / 15, z / 15, 2)),
      0,
      (rng) => ({ scale: 0.5 + rng() * 0.8, rot: rng() * Math.PI * 2, tone: rng() }),
    );

    // --- Estructuras: las que tienen su centro en este chunk ---
    const structures: Structure[] = nearbyCabins.filter((c) => inChunk(c.x, c.z, chunkRect));
    const roadQuads: Quad[] = [];
    const dirtQuads: Quad[] = [];
    const cars: Car[] = [];
    const stations: GasStation[] = [];

    if (city) {
      const station = this.cities.getStation(city);
      if (inChunk(station.x, station.z, chunkRect)) stations.push(station);
      for (const s of this.cities.getStructures(city)) if (inChunk(s.x, s.z, chunkRect)) structures.push(s);
      for (const r of this.cities.getRoads(city)) {
        const c = clipRect(r, chunkRect);
        if (c) roadQuads.push(rectQuad(c));
      }
      for (const car of this.cities.getCars(city)) if (inChunk(car.x, car.z, chunkRect)) cars.push(car);
    }

    for (const t of towns) {
      for (const s of t.structures) if (inChunk(s.x, s.z, chunkRect)) structures.push(s);
      for (const r of t.streets) {
        const c = clipRect(r, chunkRect);
        if (c) dirtQuads.push(rectQuad(c));
      }
      for (const car of t.cars) if (inChunk(car.x, car.z, chunkRect)) cars.push(car);
    }

    // Carreteras: asfalto, casetas de cobro y carros abandonados
    roadQuads.push(...this.highways.ownedQuads(chunkRect));
    const tolls: TollBooth[] = [];
    for (const p of this.highways.pathsNear(chunkRect, 20)) {
      for (const t of p.tolls) if (inChunk(t.x, t.z, chunkRect)) tolls.push(t);
      for (const car of p.cars) if (inChunk(car.x, car.z, chunkRect)) cars.push(car);
    }

    // Senderos de tierra
    dirtQuads.push(...this.trails.ownedQuads(chunkRect, this.cities));

    // Carros destruidos en el campo
    cars.push(...wrecks);

    // Armas en el suelo de zonas residenciales: algunas casas (de ciudad o pueblo) dejan un arma
    // delante de su puerta (+Z local). La tabla de botín es 'residential_ground'.
    const drops: GroundDrop[] = [];
    const dropRng = chunkRng(seed, cx, cz, 61);
    structures.forEach((s, i) => {
      if (s.kind !== 'house') return;
      if (dropRng() > WORLD.drops.houseChance) return;
      const front = s.d / 2 + 1.4;
      drops.push({
        id: `drop:${cx},${cz}:${i}`,
        x: s.x + Math.sin(s.rot) * front,
        z: s.z + Math.cos(s.rot) * front,
        weapon: lootManager.roll('residential_ground', dropRng),
      });
    });

    // Campamento propio del chunk (tiendas, fogatas, cajas y torre)
    const camp = this.camps.campOfChunk(cx, cz);
    const towers: Tower[] = camp?.tower ? [camp.tower] : [];
    const crates: WorldCrate[] = camp ? camp.crates : [];

    return {
      cx,
      cz,
      originX: ox,
      originZ: oz,
      groundColors,
      roadQuads,
      dirtQuads,
      trees,
      bushes,
      grass,
      structures,
      cars,
      tents: camp ? camp.tents : [],
      fires: camp ? camp.fires : [],
      crates,
      towers,
      tolls,
      stations,
      drops,
    };
  }
}
