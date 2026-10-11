import * as THREE from 'three';
import { chunkRng } from '../random';
import type { ChunkData, Quad } from '../types';
import type { ChunkObject } from '../chunkMesher';
import type { Collider } from '../collision';
import { distToSeg } from '../curves';
import type { WorldGenerator } from '../chunkGenerator';
import {
  EnvironmentPropsFactory,
  PROP_GEO,
  PROP_MAT,
  brokenPropParts,
  propTintedMat,
  type BucketItem,
  type BucketSink,
  type PropBucket,
} from './propFactory';
import { GroundDecals } from './groundDecals';

export interface PropLight {
  x: number;
  y: number;
  z: number;
  kind: 'lamp' | 'fire';
}

interface Destructible {
  x: number;
  z: number;
  r: number;
  breakSpeed: number;
  kind: DestructibleKind;
  climbable: boolean;
  broken: boolean;
  parts: { bucket: PropBucket; index: number }[];
  colliders: Collider[];
  rot: number;
}

interface ChunkScatter {
  group: THREE.Group;
  lights: PropLight[];
  destructibles: Destructible[];
  colliders: Collider[];
  bucketMeshes: Map<PropBucket, THREE.InstancedMesh>;
}

const dummy = new THREE.Object3D();
dummy.rotation.order = 'YXZ';
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
const _tmpColor = new THREE.Color();

function ptInQuad(q: Quad, x: number, z: number): boolean {
  // Cuadrilátero convexo en orden perimetral: mismo signo en las 4 aristas.
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const ax = q[i * 2];
    const az = q[i * 2 + 1];
    const bx = q[((i + 1) % 4) * 2];
    const bz = q[((i + 1) % 4) * 2 + 1];
    const cross = (bx - ax) * (z - az) - (bz - az) * (x - ax);
    const s = cross > 0 ? 1 : cross < 0 ? -1 : 0;
    if (s !== 0) {
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

function distToQuad(q: Quad, x: number, z: number): number {
  if (ptInQuad(q, x, z)) return 0;
  let d = Infinity;
  for (let i = 0; i < 4; i++) {
    d = Math.min(d, distToSeg(x, z, q[i * 2], q[i * 2 + 1], q[((i + 1) % 4) * 2], q[((i + 1) % 4) * 2 + 1]));
  }
  return d;
}

/**
 * Esparcido procedural de props por chunk y bioma. Determinista (misma semilla
 * = mismo mapa): no guarda nada entre cargas salvo los índices de
 * destructibles ya rotos (para que no resuciten al reconstruir un chunk).
 *
 * Rendimiento: una InstancedMesh por cubeta y chunk (caja, cilindro, cabezas,
 * brasas, piedras, papel) + mallas individuales solo para manchas y estados
 * rotos (raros). Los destructibles se ocultan con matriz a escala 0.
 */
export class WorldScatterManager {
  private states = new Map<string, ChunkScatter>();
  /** Índices de destructibles rotos por chunk (persisten tras descargas). */
  private broken = new Map<string, Set<number>>();

  constructor(
    private seed: number,
    private generator: WorldGenerator,
  ) {}

  /** Construye los props del chunk y los integra en `obj`. Devuelve sus luces. */
  attachChunk(key: string, cx: number, cz: number, obj: ChunkObject, data: ChunkData): PropLight[] {
    const group = new THREE.Group();
    const state: ChunkScatter = { group, lights: [], destructibles: [], colliders: [], bucketMeshes: new Map() };
    const buckets = new Map<PropBucket, BucketItem[]>();
    const sink: BucketSink = {
      add: (bucket, item) => {
        let arr = buckets.get(bucket);
        if (!arr) buckets.set(bucket, (arr = []));
        arr.push(item);
        return arr.length - 1;
      },
    };

    const rng = chunkRng(this.seed, cx, cz, 77);
    const ox = data.originX;
    const oz = data.originZ;
    const CS = 64;
    const inChunk = (x: number, z: number, m = 1) => x >= ox + m && x <= ox + CS - m && z >= oz + m && z <= oz + CS - m;

    // Ocupación previa (estructuras, carros, tiendas, fogatas, bombas, props puestos)
    const solids: { x: number; z: number; r: number }[] = [];
    for (const s of data.structures) solids.push({ x: s.x, z: s.z, r: Math.hypot(s.w, s.d) / 2 });
    for (const c of data.cars) solids.push({ x: c.x, z: c.z, r: 2.6 });
    for (const t of data.tents) solids.push({ x: t.x, z: t.z, r: t.size * 0.5 + 1 });
    for (const f of data.fires) solids.push({ x: f.x, z: f.z, r: 1.6 });
    for (const st of data.stations) for (const p of st.pumps) solids.push({ x: p.x, z: p.z, r: 1.6 });
    const roads = [...data.roadQuads, ...data.dirtQuads];
    const blocked = (x: number, z: number, r: number, roadMargin = 0.3) => {
      if (!inChunk(x, z, 0.5)) return true;
      for (const q of roads) if (distToQuad(q, x, z) <= roadMargin) return true;
      for (const s of solids) if (Math.hypot(x - s.x, z - s.z) < r + s.r) return true;
      return false;
    };
    const claim = (x: number, z: number, r: number) => solids.push({ x, z, r });

    const centerX = ox + CS / 2;
    const centerZ = oz + CS / 2;
    const isCity = !!this.generator.cities.cityNear(centerX, centerZ, 0);
    const isTown = !isCity && !!this.generator.towns.townNear(centerX, centerZ, CS / 2);
    const isUrban = isCity || isTown;
    const hasCamp = this.generator.camps.campOfChunk(cx, cz) !== undefined || data.tents.length > 0;

    if (isUrban) this.scatterUrban(state, sink, group, data, rng, inChunk, blocked, claim, solids, roads);
    this.scatterWrecks(state, sink, group, data, rng, inChunk);
    this.scatterDirt(sink, data, rng, inChunk);
    if (!isUrban) this.scatterFields(state, sink, group, data, rng, inChunk, blocked, claim);
    if (hasCamp) this.scatterCamp(state, sink, data, rng, blocked, claim);
    this.scatterStations(state, sink, data, rng, blocked, claim);

    // Finalizar cubetas instanciadas
    for (const [bucket, items] of buckets) {
      if (!items.length) continue;
      const mesh = this.buildInstanced(bucket, items);
      if (mesh) {
        group.add(mesh);
        state.bucketMeshes.set(bucket, mesh);
      }
    }

    // Reaplicar rotos persistentes (el chunk se pudo reconstruir, p. ej. al reclamar un carro):
    // visual roto + SIN colisionadores (si no, colisión fantasma).
    const brokenSet = this.broken.get(key);
    if (brokenSet) {
      const gone: Collider[] = [];
      for (const idx of brokenSet) {
        const d = state.destructibles[idx];
        if (d && !d.broken) {
          this.applyBreakVisual(state, d);
          gone.push(...d.colliders);
        }
      }
      if (gone.length) state.colliders = state.colliders.filter((c) => !gone.includes(c));
    }

    obj.group.add(group);
    obj.colliders.push(...state.colliders);
    this.states.set(key, state);
    return state.lights;
  }

  detachChunk(key: string) {
    this.states.delete(key);
  }

  // --- Bioma urbano ---

  private scatterUrban(
    state: { lights: PropLight[]; colliders: Collider[] },
    sink: BucketSink, group: THREE.Group, data: ChunkData,
    rng: () => number,
    inChunk: (x: number, z: number, m?: number) => boolean,
    blocked: (x: number, z: number, r: number, roadMargin?: number) => boolean,
    claim: (x: number, z: number, r: number) => void,
    solids: { x: number; z: number; r: number }[],
    roads: Quad[],
  ) {
    // Farolas a intervalos regulares a lo largo de las banquetas
    let lampCount = 0;
    let side = rng() < 0.5 ? 1 : -1;
    for (const q of data.roadQuads) {
      if (lampCount >= 8) break;
      const px = [q[0], q[2], q[4], q[6]];
      const pz = [q[1], q[3], q[5], q[7]];
      const e1 = Math.hypot(px[1] - px[0], pz[1] - pz[0]);
      const e2 = Math.hypot(px[2] - px[1], pz[2] - pz[1]);
      if (Math.max(e1, e2) < 10) continue;
      const longAxis = e2 >= e1;
      const ax = longAxis ? px[1] : px[0];
      const az = longAxis ? pz[1] : pz[0];
      const bx = longAxis ? px[2] : px[1];
      const bz = longAxis ? pz[2] : pz[1];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const halfW = (longAxis ? e1 : e2) / 2;
      const steps = Math.max(1, Math.floor(len / 14));
      for (let s = 0; s <= steps && lampCount < 8; s++) {
        const t = (s + 0.5) / (steps + 1);
        const nx = -(bz - az) / len;
        const nz = (bx - ax) / len;
        side = -side;
        const lx = ax + (bx - ax) * t + nx * side * (halfW + 1.3);
        const lz = az + (bz - az) * t + nz * side * (halfW + 1.3);
        if (!inChunk(lx, lz, 0.5)) continue;
        let clash = false;
        for (const qq of roads) {
          if (distToQuad(qq, lx, lz) <= 0.2) {
            clash = true;
            break;
          }
        }
        if (!clash) {
          for (const st of solids) {
            if (Math.hypot(lx - st.x, lz - st.z) < 0.6 + st.r) {
              clash = true;
              break;
            }
          }
        }
        if (clash) continue;
        const rot = Math.atan2(nx * side, nz * side);
        const pl = EnvironmentPropsFactory.streetLamp(sink, lx, lz, rot);
        state.colliders.push(...pl.colliders);
        state.lights.push(...pl.lights);
        claim(lx, lz, 0.5);
        lampCount++;
      }
    }

    // Hidrantes en esquinas (25% por quad, tope 3)
    let hyd = 0;
    for (const q of data.roadQuads) {
      if (hyd >= 3 || rng() > 0.25) continue;
      const ci = Math.floor(rng() * 4);
      const hx = q[ci * 2];
      const hz = q[ci * 2 + 1];
      if (blocked(hx, hz, 0.4, 0.3)) continue;
      const pl = EnvironmentPropsFactory.fireHydrant(sink, hx, hz);
      state.colliders.push(...pl.colliders);
      claim(hx, hz, 0.4);
      hyd++;
    }

    // Periódicos y basura en banquetas
    if (data.roadQuads.length > 0) {
      const papers = 4 + Math.floor(rng() * 7);
      for (let i = 0; i < papers; i++) {
        const q = data.roadQuads[Math.floor(rng() * data.roadQuads.length)];
        const t = rng();
        const ex = q[0] + (q[4] - q[0]) * t + (rng() - 0.5) * 6;
        const ez = q[1] + (q[5] - q[1]) * t + (rng() - 0.5) * 6;
        if (blocked(ex, ez, 0.2, 0.3)) continue;
        GroundDecals.newspaper(sink, ex, ez, rng() * Math.PI * 2, [0xe7e5e4, 0xd6d3d1, 0xf5f0dc][Math.floor(rng() * 3)]);
      }
    }

    // Contenedores en callejones (cerca de edificios, fuera de la calzada)
    if (rng() < 0.65 && solids.length > 0) {
      const n = 1 + (rng() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const s = solids[Math.floor(rng() * solids.length)];
        const a = rng() * Math.PI * 2;
        const d = 4 + rng() * 7;
        const x = s.x + Math.cos(a) * d;
        const z = s.z + Math.sin(a) * d;
        if (blocked(x, z, 1.6)) continue;
        const pl = EnvironmentPropsFactory.dumpster(sink, x, z, rng() * Math.PI, rng() < 0.5 ? 0x1f5c3d : 0x1e4d8f);
        state.colliders.push(...pl.colliders);
        claim(x, z, 1.6);
      }
    }
  }

  // --- Siniestros: barreras, sangre y aceite junto a autos varados ---

  private scatterWrecks(
    state: { colliders: Collider[] },
    sink: BucketSink, group: THREE.Group, data: ChunkData,
    rng: () => number,
    inChunk: (x: number, z: number, m?: number) => boolean,
  ) {
    for (const c of data.cars) {
      const wrecked = c.kind === 'wreck' || c.kind === 'abandoned';
      if (wrecked && rng() < 0.45) {
        const n = 1 + (rng() < 0.5 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const side = rng() < 0.5 ? 1 : -1;
          const bx = c.x + Math.cos(c.rot) * side * 2.4 + (rng() - 0.5);
          const bz = c.z - Math.sin(c.rot) * side * 2.4 + (rng() - 0.5);
          if (!inChunk(bx, bz, 1)) continue;
          const pl = EnvironmentPropsFactory.trafficBarrier(sink, bx, bz, c.rot + (rng() - 0.5) * 0.4);
          state.colliders.push(...pl.colliders);
        }
      }
      if (wrecked && rng() < 0.65) {
        const n = 1 + (rng() < 0.4 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          GroundDecals.bloodStain(group, c.x + (rng() - 0.5) * 5, c.z + (rng() - 0.5) * 5, rng() * Math.PI * 2, 0.8 + rng() * 0.9, Math.floor(rng() * 3));
        }
      }
      if (c.kind === 'wreck' && rng() < 0.3) {
        GroundDecals.oilStain(group, c.x + (rng() - 0.5) * 3, c.z + (rng() - 0.5) * 3, rng() * Math.PI, 0.8 + rng());
      }
    }
  }

  // --- Escombro en bordes de caminos de tierra ---

  private scatterDirt(
    sink: BucketSink, data: ChunkData,
    rng: () => number,
    inChunk: (x: number, z: number, m?: number) => boolean,
  ) {
    for (const q of data.dirtQuads) {
      const n = 2 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const t = rng();
        const ex = q[0] + (q[4] - q[0]) * t + (rng() - 0.5) * 5;
        const ez = q[1] + (q[5] - q[1]) * t + (rng() - 0.5) * 5;
        if (!inChunk(ex, ez, 0.3)) continue;
        GroundDecals.rubble(sink, ex, ez, rng() * Math.PI, 0.15 + rng() * 0.3, rng() < 0.5 ? 0x78716c : 0x57534e);
      }
    }
  }

  // --- Campo: parcelas valladas, tocones y piedras ---

  private scatterFields(
    state: { colliders: Collider[]; destructibles: Destructible[] },
    sink: BucketSink, group: THREE.Group, data: ChunkData,
    rng: () => number,
    inChunk: (x: number, z: number, m?: number) => boolean,
    blocked: (x: number, z: number, r: number, roadMargin?: number) => boolean,
    claim: (x: number, z: number, r: number) => void,
  ) {
    if (rng() < 0.55) {
      const parcels = 1 + (rng() < 0.35 ? 1 : 0);
      for (let p = 0; p < parcels; p++) {
        const ox = data.originX;
        const oz = data.originZ;
        const px = ox + 10 + rng() * 44;
        const pz = oz + 10 + rng() * 44;
        const w = 6 + rng() * 4;
        const rot = rng() * Math.PI;
        if (blocked(px, pz, w * 0.7, 1.5)) continue;
        const dx = Math.cos(rot);
        const dz = -Math.sin(rot);
        const fx = Math.sin(rot);
        const fz = Math.cos(rot);
        // 4 lados: 40% hueco, ~18% caído, resto en pie (destructible)
        for (let s2 = 0; s2 < 4; s2++) {
          const su = s2 === 0 ? 1 : s2 === 1 ? -1 : 0;
          const sv = s2 === 2 ? 1 : s2 === 3 ? -1 : 0;
          const r = rng();
          if (r < 0.4) continue;
          const fallen = r > 0.82;
          // Base del lado (centro) y dirección a lo largo
          const bx = px + dx * su * (w / 2) + fx * sv * (w / 2);
          const bz = pz + dz * su * (w / 2) + fz * sv * (w / 2);
          const segRot = su !== 0 ? rot + Math.PI / 2 : rot;
          const segs = Math.max(1, Math.round(w / 2));
          for (let s3 = 0; s3 < segs; s3++) {
            const t = (s3 + 0.5) / segs - 0.5;
            // A lo largo del lado: si el lado es "vertical" (su) se avanza en fx; si no, en dx
            const qx = su !== 0 ? bx + fx * t * w : bx + dx * t * w;
            const qz = su !== 0 ? bz + fz * t * w : bz + dz * t * w;
            if (blocked(qx, qz, 0.4, 0.2)) continue;
            if (fallen) {
              for (const b of brokenPropParts('fence', qx, qz, segRot, rng)) {
                const m = new THREE.Mesh(PROP_GEO.box, propTintedMat(b.color));
                m.position.set(b.x, b.y, b.z);
                m.rotation.set(b.rx ?? 0, b.rot, b.rz ?? 0);
                m.scale.set(b.sx, b.sy, b.sz);
                m.castShadow = true;
                m.receiveShadow = true;
                group.add(m);
              }
              continue;
            }
            const col = 0x6b4a2a;
            const pl = EnvironmentPropsFactory.woodenFence(sink, qx, qz, segRot, col);
            state.colliders.push(...pl.colliders);
            if (pl.destructible) {
              state.destructibles.push({
                x: pl.destructible.x, z: pl.destructible.z, r: pl.destructible.r,
                breakSpeed: pl.destructible.breakSpeed, kind: pl.destructible.kind,
                climbable: pl.destructible.climbable, broken: false,
                parts: pl.destructible.parts, colliders: [...pl.colliders], rot: segRot,
              });
            }
            claim(qx, qz, 1.2);
          }
        }
      }
    }

    const stumps = Math.floor(rng() * 4);
    for (let i = 0; i < stumps; i++) {
      const x = data.originX + 3 + rng() * 58;
      const z = data.originZ + 3 + rng() * 58;
      if (blocked(x, z, 0.5)) continue;
      const pl = EnvironmentPropsFactory.treeStump(sink, x, z, 0.8 + rng() * 0.7);
      state.colliders.push(...pl.colliders);
      claim(x, z, 0.5);
    }
    const stones = 4 + Math.floor(rng() * 7);
    for (let i = 0; i < stones; i++) {
      const x = data.originX + 2 + rng() * 60;
      const z = data.originZ + 2 + rng() * 60;
      if (!inChunk(x, z, 0.3)) continue;
      GroundDecals.rubble(sink, x, z, rng() * Math.PI, 0.25 + rng() * 0.45, rng() < 0.5 ? 0x78716c : 0xa8a29e);
    }
  }

  // --- Campamentos: barriles, leña, carpa militar, fogata extra ---

  private scatterCamp(
    state: { lights: PropLight[]; colliders: Collider[]; destructibles: Destructible[] },
    sink: BucketSink, data: ChunkData,
    rng: () => number,
    blocked: (x: number, z: number, r: number, roadMargin?: number) => boolean,
    claim: (x: number, z: number, r: number) => void,
  ) {
    const anchor = data.fires[0] ?? data.tents[0];
    if (!anchor) return;
    const pushDestructible = (pl: { colliders: Collider[]; destructible?: { x: number; z: number; r: number; breakSpeed: number; kind: 'fence' | 'barrel' | 'redBarrel'; climbable: boolean; parts: { bucket: PropBucket; index: number }[] } }, rot: number) => {
      state.colliders.push(...pl.colliders);
      if (pl.destructible) {
        state.destructibles.push({
          x: pl.destructible.x, z: pl.destructible.z, r: pl.destructible.r,
          breakSpeed: pl.destructible.breakSpeed, kind: pl.destructible.kind,
          climbable: pl.destructible.climbable, broken: false,
          parts: pl.destructible.parts, colliders: [...pl.colliders], rot,
        });
      }
    };

    const nBar = 1 + Math.floor(rng() * 3);
    let redPlaced = false;
    for (let i = 0; i < nBar; i++) {
      const a = rng() * Math.PI * 2;
      const d = 2.5 + rng() * 3;
      const x = anchor.x + Math.cos(a) * d;
      const z = anchor.z + Math.sin(a) * d;
      if (blocked(x, z, 0.6)) continue;
      const red = !redPlaced && rng() < 0.35;
      if (red) redPlaced = true;
      pushDestructible(EnvironmentPropsFactory.barrelMetal(sink, x, z, red ? 0xb91c1c : [0x8a4a2a, 0x6b7280][Math.floor(rng() * 2)], red, rng), 0);
      claim(x, z, 0.6);
    }
    if (rng() < 0.6) {
      const a = rng() * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * (4 + rng() * 3);
      const z = anchor.z + Math.sin(a) * (4 + rng() * 3);
      if (!blocked(x, z, 1.2)) {
        const pl = EnvironmentPropsFactory.woodPile(sink, x, z, rng() * Math.PI);
        state.colliders.push(...pl.colliders);
        claim(x, z, 1.2);
      }
    }
    if (rng() < 0.5) {
      const a = rng() * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * (6 + rng() * 4);
      const z = anchor.z + Math.sin(a) * (6 + rng() * 4);
      if (!blocked(x, z, 2.2)) {
        const pl = EnvironmentPropsFactory.tentMilitary(sink, x, z, rng() * Math.PI, rng() < 0.5 ? 0x4a5228 : 0x5a4a33);
        state.colliders.push(...pl.colliders);
        claim(x, z, 2.2);
      }
    }
    if (rng() < 0.45) {
      const a = rng() * Math.PI * 2;
      const x = anchor.x + Math.cos(a) * (5 + rng() * 4);
      const z = anchor.z + Math.sin(a) * (5 + rng() * 4);
      if (!blocked(x, z, 1.0)) {
        const lit = rng() < 0.3;
        const pl = EnvironmentPropsFactory.campBonfire(sink, x, z, lit, rng);
        state.colliders.push(...pl.colliders);
        state.lights.push(...pl.lights);
        claim(x, z, 1.0);
      }
    }
  }

  // --- Gasolineras y callejones: barriles (30% / 15% rojos) ---

  private scatterStations(
    state: { colliders: Collider[]; destructibles: Destructible[] },
    sink: BucketSink, data: ChunkData,
    rng: () => number,
    blocked: (x: number, z: number, r: number, roadMargin?: number) => boolean,
    claim: (x: number, z: number, r: number) => void,
  ) {
    for (const st of data.stations) {
      const n = 1 + (rng() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const x = st.x + (rng() - 0.5) * 10;
        const z = st.z + (rng() - 0.5) * 10;
        if (blocked(x, z, 0.6)) continue;
        const red = rng() < 0.3;
        const pl = EnvironmentPropsFactory.barrelMetal(sink, x, z, red ? 0xb91c1c : 0x6b7280, red, rng);
        state.colliders.push(...pl.colliders);
        if (pl.destructible) {
          state.destructibles.push({
            x: pl.destructible.x, z: pl.destructible.z, r: pl.destructible.r,
            breakSpeed: pl.destructible.breakSpeed, kind: pl.destructible.kind,
            climbable: pl.destructible.climbable, broken: false,
            parts: pl.destructible.parts, colliders: [...pl.colliders], rot: 0,
          });
        }
        claim(x, z, 0.6);
      }
    }
  }

  private buildInstanced(bucket: PropBucket, items: BucketItem[]): THREE.InstancedMesh | null {
    if (!items.length) return null;
    const geo = bucket === 'box' || bucket === 'head' || bucket === 'flame'
      ? PROP_GEO.box
      : bucket === 'cyl'
        ? PROP_GEO.cyl
        : bucket === 'stone'
          ? PROP_GEO.stone
          : PROP_GEO.paper;
    const mat = bucket === 'box' || bucket === 'cyl' || bucket === 'stone' ? PROP_MAT.prop : PROP_MAT[bucket];
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    mesh.castShadow = bucket !== 'paper';
    mesh.receiveShadow = true;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      dummy.position.set(it.x, it.y, it.z);
      dummy.rotation.set(it.rx ?? 0, it.rot, it.rz ?? 0);
      dummy.scale.set(it.sx, it.sy, it.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, _tmpColor.setHex(it.color));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  /** Visual de roto: oculta piezas instanciadas y tira escombro compartido. */
  private applyBreakVisual(state: ChunkScatter, d: Destructible) {
    d.broken = true;
    for (const p of d.parts) {
      const mesh = state.bucketMeshes.get(p.bucket);
      if (mesh) {
        mesh.setMatrixAt(p.index, ZERO_M);
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    for (const b of brokenPropParts(d.kind, d.x, d.z, d.rot)) {
      const m = new THREE.Mesh(PROP_GEO.box, propTintedMat(b.color));
      m.position.set(b.x, b.y, b.z);
      m.rotation.set(b.rx ?? 0, b.rot, b.rz ?? 0);
      m.scale.set(b.sx, b.sy, b.sz);
      m.castShadow = true;
      m.receiveShadow = true;
      state.group.add(m);
    }
  }

  /**
   * Intenta romper destructibles cerca del punto con un vehículo a `speed` m/s.
   * Devuelve colisionadores a retirar (por chunk) y barriles rojos a detonar.
   */
  tryBreak(
    x: number, z: number, r: number, speed: number,
  ): { removals: Map<string, Collider[]>; blasts: { x: number; z: number }[] } {
    const removals = new Map<string, Collider[]>();
    const blasts: { x: number; z: number }[] = [];
    if (speed < 3) return { removals, blasts };
    for (const [key, state] of this.states) {
      for (let i = 0; i < state.destructibles.length; i++) {
        const d = state.destructibles[i];
        if (d.broken || speed < d.breakSpeed) continue;
        if (Math.hypot(d.x - x, d.z - z) > r + d.r) continue;
        this.applyBreakVisual(state, d);
        let arr = removals.get(key);
        if (!arr) removals.set(key, (arr = []));
        arr.push(...d.colliders);
        let set = this.broken.get(key);
        if (!set) this.broken.set(key, (set = new Set()));
        set.add(i);
        if (this.broken.size > 500) this.broken.clear();
        if (d.kind === 'redBarrel') blasts.push({ x: d.x, z: d.z });
      }
    }
    return { removals, blasts };
  }
}
