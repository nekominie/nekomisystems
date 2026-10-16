import { makeBoxCollider } from '../cabin';
import { circle, type Collider } from '../collision';
import { backyardFrame, patioToLocal, type PatioFrame } from '../backyard';
import { cabinLocalToWorld } from '../cabin';
import { BACKYARD_PROPS_CATALOG, type BackyardPropConfig } from './backyardCatalog';
import type { BucketSink, PropBucket } from './propFactory';
import type { Structure } from '../types';

/**
 * Geometría procedural de los patios: la barda (3 lados + pilastras) y los 16
 * artículos del catálogo. Todo se compone con las primitivas instanciadas del
 * scatter (box / cyl / cone / stone) y devuelve los colisionadores a registrar.
 */

const CFG = new Map(BACKYARD_PROPS_CATALOG.map((c) => [c.id, c]));

interface PFrame {
  x: number;
  z: number;
  rot: number;
  cos: number;
  sin: number;
}

const frameAt = (x: number, z: number, rot: number): PFrame => ({
  x,
  z,
  rot,
  cos: Math.cos(rot),
  sin: Math.sin(rot),
});

function pPiece(
  sink: BucketSink,
  f: PFrame,
  bucket: PropBucket,
  lx: number,
  ly: number,
  lz: number,
  sx: number,
  sy: number,
  sz: number,
  color: number,
  extra: { yaw?: number; rx?: number; rz?: number } = {},
) {
  const wx = f.x + lx * f.cos + lz * f.sin;
  const wz = f.z - lx * f.sin + lz * f.cos;
  sink.add(bucket, {
    x: wx,
    y: ly,
    z: wz,
    rot: f.rot + (extra.yaw ?? 0),
    sx,
    sy,
    sz,
    color,
    rx: extra.rx ?? 0,
    rz: extra.rz ?? 0,
  });
}

/** Cilindro horizontal a lo largo del eje X local, centrado en (lx, ly, lz). */
function pieceX(sink: BucketSink, f: PFrame, lx: number, ly: number, lz: number, r: number, len: number, color: number) {
  pPiece(sink, f, 'cyl', lx + len / 2, ly, lz, 2 * r, len, 2 * r, color, { rz: Math.PI / 2 });
}

/** Cilindro horizontal a lo largo del eje Z local, centrado en (lx, ly, lz). */
function pieceZ(sink: BucketSink, f: PFrame, lx: number, ly: number, lz: number, r: number, len: number, color: number) {
  pPiece(sink, f, 'cyl', lx, ly, lz + len / 2, 2 * r, len, 2 * r, color, { rx: Math.PI / 2 });
}

/** Bola (dodecaedro) centrada en (lx, ly, lz). */
function ball(sink: BucketSink, f: PFrame, lx: number, ly: number, lz: number, r: number, color: number) {
  pPiece(sink, f, 'stone', lx, ly, lz, 2 * r, 2 * r, 2 * r, color);
}

function jhex(hex: number, rng: () => number, amt = 0.1): number {
  const k = 1 + (rng() - 0.5) * 2 * amt;
  const r = Math.min(255, Math.max(0, Math.round(((hex >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((hex >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((hex & 255) * k)));
  return (r << 16) | (g << 8) | b;
}

const pick = <T>(arr: readonly T[], r: number): T => arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];

// ---------------------------------------------------------------------------------------------
// Barda del patio
// ---------------------------------------------------------------------------------------------

const FENCE = {
  /** Alturas/espesores (m). */
  plinthH: 0.32,
  plinthT: 0.34,
  wallH: 1.58,
  wallT: 0.26,
  capH: 0.07,
  capT: 0.4,
  postW: 0.4,
  postH: 2.02,
  /** Largo objetivo de cada tramo de muro. */
  seg: 2.4,
  walls: [0x9c9689, 0x948d80, 0xa59e90, 0x8b8477],
  post: 0x7c766b,
  plinth: 0x6d675d,
  cap: 0xa9a294,
};

/** Yaw (local a la casa) que alinea el eje X de una caja con la dirección (dx, dz). */
const yawAlong = (dx: number, dz: number) => Math.atan2(-dz, dx);

function fenceMast(sink: BucketSink, house: Structure, lx: number, lz: number, rng: () => number) {
  const w = cabinLocalToWorld(house, lx, lz);
  const f = frameAt(w.x, w.z, house.rot);
  pPiece(sink, f, 'box', 0, 0, 0, FENCE.postW, FENCE.postH, FENCE.postW, jhex(FENCE.post, rng, 0.06));
  pPiece(sink, f, 'box', 0, FENCE.postH, 0, FENCE.postW + 0.1, 0.06, FENCE.postW + 0.1, jhex(FENCE.cap, rng, 0.05));
}

/**
 * Barda del patio: muro de concreto con zócalo, remate y pilastras, en los 3 lados
 * (el cuarto es la pared de la casa). Devuelve un OBB de colisión por lado.
 */
export function buildBackyardFence(sink: BucketSink, house: Structure, rng: () => number): Collider[] {
  const patio = house.backyard;
  if (!patio) return [];
  const f = backyardFrame(house)!;
  const colliders: Collider[] = [];
  const yawU = house.rot + yawAlong(f.ux, f.uz);
  const yawV = house.rot + yawAlong(f.vx, f.vz);

  const sides: { u0: number; v0: number; u1: number; v1: number; yaw: number; extra: number }[] = [
    // Fondo (barda opuesta a la casa)
    { u0: -f.span / 2, v0: f.depth, u1: f.span / 2, v1: f.depth, yaw: yawU, extra: 0.5 },
    // Laterales (de la pared de la casa a la barda de fondo)
    { u0: -f.span / 2, v0: 0, u1: -f.span / 2, v1: f.depth, yaw: yawV, extra: 0.1 },
    { u0: f.span / 2, v0: 0, u1: f.span / 2, v1: f.depth, yaw: yawV, extra: 0.1 },
  ];

  for (const s of sides) {
    const len = Math.hypot(s.u1 - s.u0, s.v1 - s.v0) + s.extra;
    const n = Math.max(2, Math.round(len / FENCE.seg));
    const segLen = len / n;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const p = patioToLocal(f, s.u0 + (s.u1 - s.u0) * t, s.v0 + (s.v1 - s.v0) * t);
      const w = cabinLocalToWorld(house, p.lx, p.lz);
      const fr = frameAt(w.x, w.z, s.yaw);
      const wall = jhex(pick(FENCE.walls, rng()), rng, 0.06);
      pPiece(sink, fr, 'box', 0, 0, 0, segLen * 0.97, FENCE.plinthH, FENCE.plinthT, FENCE.plinth);
      pPiece(sink, fr, 'box', 0, FENCE.plinthH, 0, segLen * 0.97, FENCE.wallH, FENCE.wallT, wall);
      pPiece(sink, fr, 'box', 0, FENCE.plinthH + FENCE.wallH, 0, segLen * 0.97 + 0.02, FENCE.capH, FENCE.capT, jhex(FENCE.cap, rng, 0.05));
    }
    // Pilastras intermedias entre tramos
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const p = patioToLocal(f, s.u0 + (s.u1 - s.u0) * t, s.v0 + (s.v1 - s.v0) * t);
      fenceMast(sink, house, p.lx, p.lz, rng);
    }
    // Colisión: un OBB por lado (el yaw alinea su eje X con el tramo)
    const c = patioToLocal(f, (s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2);
    const cw = cabinLocalToWorld(house, c.lx, c.lz);
    colliders.push(makeBoxCollider(cw.x, cw.z, s.yaw, len / 2, FENCE.wallT / 2 + 0.08));
  }

  // Pilastras de esquina (esquina con la casa y esquinera del fondo)
  for (const [su, sv] of [
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ]) {
    const p = patioToLocal(f, (su * f.span) / 2, sv ? f.depth : 0);
    fenceMast(sink, house, p.lx, p.lz, rng);
  }
  return colliders;
}

// ---------------------------------------------------------------------------------------------
// Artículos del patio (geometría procedural por id)
// ---------------------------------------------------------------------------------------------

function buildLawnmower(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const red = jhex(0xa8321c, rng, 0.1);
  pPiece(sink, f, 'box', 0, 0.14, 0, 0.66, 0.22, 0.96, red);
  pPiece(sink, f, 'box', 0.02, 0.36, 0.04, 0.3, 0.24, 0.36, jhex(0x3d3d42, rng, 0.08));
  pPiece(sink, f, 'cyl', 0.1, 0.6, 0.02, 0.08, 0.12, 0.08, 0x2a2a2e);
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'box', sx * 0.26, 0.24, -0.52, 0.05, 0.72, 0.05, 0x2f2f33, { rx: -0.6 });
  }
  pPiece(sink, f, 'box', 0, 0.83, -0.82, 0.54, 0.05, 0.05, 0x2f2f33);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pieceX(sink, f, sx * 0.37, 0.12, sz * 0.38, 0.12, 0.07, 0x1a1a1c);
    }
  }
  void cfg;
}

function buildWheelbarrow(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const metal = jhex(0x707a83, rng, 0.1);
  pPiece(sink, f, 'box', 0, 0.42, 0, 0.6, 0.3, 0.78, jhex(0x4e5860, rng, 0.1), { rx: 0.1 });
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'box', sx * 0.22, 0.06, -0.42, 0.05, 0.5, 0.05, metal, { rx: 0.3 });
    pPiece(sink, f, 'box', sx * 0.22, 0.55, -0.72, 0.05, 0.05, 0.62, metal, { rx: -0.35 });
  }
  pieceX(sink, f, 0, 0.17, 0.46, 0.17, 0.09, 0x1a1a1c);
  void cfg;
}

function buildHoseWall(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  pPiece(sink, f, 'box', 0, 0.32, 0.05, 0.34, 0.34, 0.08, jhex(0x5b6670, rng, 0.08));
  pieceZ(sink, f, 0, 0.49, 0.1, 0.21, 0.16, jhex(0x2f6f4f, rng, 0.15));
  pPiece(sink, f, 'cyl', 0, 0.72, 0.1, 0.06, 0.1, 0.06, 0x88929b);
  pPiece(sink, f, 'cyl', 0.16, 0.12, 0.2, 0.05, 0.32, 0.05, 0x1f4f38);
  void cfg;
}

function buildFlowerpots(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const clay = jhex(0xa05a34, rng, 0.12);
  const clay2 = jhex(0x94522f, rng, 0.12);
  pPiece(sink, f, 'cone', 0, 0, 0, 0.42, 0.32, 0.42, clay);
  pPiece(sink, f, 'cyl', 0, 0.3, 0, 0.46, 0.06, 0.46, clay2);
  pPiece(sink, f, 'cyl', 0, 0.3, 0, 0.36, 0.045, 0.36, 0x3d2b1c);
  pPiece(sink, f, 'cone', 0, 0.34, 0, 0.3, 0.26, 0.3, clay);
  pPiece(sink, f, 'cyl', 0, 0.34, 0, 0.24, 0.04, 0.24, 0x3d2b1c);
  ball(sink, f, 0, 0.5, 0, 0.12, jhex(0x4a7030, rng, 0.15));
  // Maceta chica volcada al pie de la pila
  pPiece(sink, f, 'cone', 0.3, 0.02, 0.18, 0.22, 0.22, 0.22, clay2, { rz: 1.35, yaw: 0.6 });
  void cfg;
}

function buildGrill(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const body = jhex(0x26262a, rng, 0.06);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    pPiece(sink, f, 'cyl', Math.sin(a) * 0.24, 0, Math.cos(a) * 0.24, 0.05, 0.64, 0.05, 0x3b3b40, {
      rx: Math.cos(a) * 0.18,
      rz: -Math.sin(a) * 0.18,
    });
  }
  pPiece(sink, f, 'cyl', 0, 0.6, 0, 0.66, 0.3, 0.66, body);
  pPiece(sink, f, 'cyl', 0, 0.82, 0, 0.56, 0.06, 0.56, jhex(0x5a2d18, rng, 0.2));
  pPiece(sink, f, 'cyl', 0, 0.88, 0, 0.5, 0.04, 0.5, 0x3a3a3f);
  pPiece(sink, f, 'cyl', 0, 0.92, 0, 0.68, 0.16, 0.68, body);
  pPiece(sink, f, 'box', 0, 1.08, 0, 0.26, 0.05, 0.05, 0x141416);
  pPiece(sink, f, 'box', 0.52, 0.72, 0, 0.36, 0.04, 0.46, jhex(0x6b7078, rng, 0.08));
  pPiece(sink, f, 'cyl', 0.52, 0, 0, 0.05, 0.7, 0.05, 0x3b3b40);
  void cfg;
}

function buildPicnicTable(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const wood = jhex(0x8a6438, rng, 0.1);
  const wood2 = jhex(0x7a5830, rng, 0.1);
  for (const sz of [-1, 1]) {
    pPiece(sink, f, 'box', 0, 0.76, sz * 0.19, 1.76, 0.06, 0.34, wood);
  }
  pPiece(sink, f, 'box', 0, 0.66, 0, 1.6, 0.08, 0.12, wood2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      pPiece(sink, f, 'box', sx * 0.56, 0.06, sz * 0.28, 0.09, 0.98, 0.14, wood, { rx: -sz * 0.55 });
    }
  }
  for (const sz of [-1, 1]) {
    pPiece(sink, f, 'box', 0, 0.44, sz * 0.72, 1.76, 0.05, 0.3, wood2);
    for (const sx of [-1, 1]) {
      pPiece(sink, f, 'box', sx * 0.58, 0.05, sz * 0.52, 0.08, 0.62, 0.12, wood, { rx: -sz * 0.62 });
    }
  }
  void cfg;
}

function buildFoldingChair(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const plastic = jhex(pick([0xd8d4cc, 0x3f7f8f, 0xa8473c, 0x5a7a48], rng()), rng, 0.1);
  pPiece(sink, f, 'box', 0, 0.42, 0.02, 0.44, 0.05, 0.42, plastic);
  pPiece(sink, f, 'box', 0, 0.52, -0.2, 0.44, 0.5, 0.05, plastic, { rx: -0.2 });
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'box', sx * 0.18, 0.02, 0.16, 0.05, 0.46, 0.05, 0xc9c5bd, { rx: 0.18 });
    pPiece(sink, f, 'box', sx * 0.18, 0.02, -0.14, 0.05, 0.46, 0.05, 0xc9c5bd, { rx: -0.28 });
    pPiece(sink, f, 'box', sx * 0.23, 0.6, 0, 0.05, 0.04, 0.42, plastic);
  }
  void cfg;
}

function buildUmbrella(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const fabric = jhex(pick([0xc2503c, 0x2f6f4f, 0x345a8a, 0xd0c49a], rng()), rng, 0.08);
  pPiece(sink, f, 'cyl', 0, 0, 0, 0.5, 0.1, 0.5, 0x55585c);
  pPiece(sink, f, 'cyl', 0, 0.1, 0, 0.09, 2.2, 0.09, 0x8a8f95);
  pPiece(sink, f, 'cyl', 0, 0.85, 0, 0.07, 0.1, 0.07, 0x6b7076);
  pPiece(sink, f, 'cone', 0, 1.72, 0, 2.3, 0.62, 2.3, fabric);
  pPiece(sink, f, 'cyl', 0, 2.32, 0, 0.06, 0.14, 0.06, 0x8a8f95);
  void cfg;
}

function buildShed(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const sheet = jhex(pick([0x7d8892, 0x6f7a84], rng()), rng, 0.07);
  pPiece(sink, f, 'box', 0, 0.02, 0, 2.2, 1.9, 1.8, sheet);
  pPiece(sink, f, 'box', 0, 1.92, -0.45, 2.5, 0.07, 1.18, jhex(0x5d666e, rng, 0.06), { rx: -0.42 });
  pPiece(sink, f, 'box', 0, 1.92, 0.45, 2.5, 0.07, 1.18, jhex(0x5d666e, rng, 0.06), { rx: 0.42 });
  pPiece(sink, f, 'box', 0, 2.36, 0, 2.5, 0.07, 0.2, 0x4e575e);
  pPiece(sink, f, 'box', 0, 0.04, 0.94, 0.95, 1.78, 0.06, jhex(0x4e5a66, rng, 0.08));
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'box', sx * 0.5, 0.02, 0.93, 0.07, 1.85, 0.09, 0x3f4952);
  }
  void cfg;
}

function buildWheelieBin(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const body = jhex(pick([0x2e5339, 0x245c3f, 0x33383e], rng()), rng, 0.1);
  pPiece(sink, f, 'box', 0, 0.14, 0, 0.56, 0.9, 0.6, body);
  pPiece(sink, f, 'box', 0, 1.02, -0.08, 0.6, 0.07, 0.64, jhex(0x1f3326, rng, 0.1), { rx: -0.5 });
  pPiece(sink, f, 'box', 0, 1.06, -0.32, 0.56, 0.05, 0.06, 0x22262b);
  for (const sx of [-1, 1]) {
    pieceX(sink, f, sx * 0.24, 0.1, -0.2, 0.1, 0.06, 0x141414);
  }
  void cfg;
}

function buildFirewood(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const bark = [0x5a4128, 0x4e3722, 0x66492c];
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'box', sx * 0.74, 0, 0, 0.08, 0.98, 0.6, jhex(0x54402a, rng, 0.08));
  }
  const rows: { y: number; lz: number[] }[] = [
    { y: 0.1, lz: [-0.18, 0, 0.18] },
    { y: 0.27, lz: [-0.18, 0, 0.18] },
    { y: 0.44, lz: [-0.09, 0.09] },
    { y: 0.61, lz: [-0.09, 0.09] },
    { y: 0.78, lz: [0] },
  ];
  for (const row of rows) {
    for (const lz of row.lz) {
      const len = 1.34 + rng() * 0.18;
      pieceX(sink, f, 0, row.y, lz, 0.085 + rng() * 0.015, len, jhex(pick(bark, rng()), rng, 0.08));
    }
  }
  void cfg;
}

function buildAcUnit(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const body = jhex(pick([0x8b9299, 0x7d858c], rng()), rng, 0.08);
  pPiece(sink, f, 'box', 0, 0.04, 0, 0.86, 0.7, 0.36, body);
  pPiece(sink, f, 'box', 0, 0.72, 0, 0.86, 0.06, 0.4, jhex(0x6b7078, rng, 0.06), { rx: 0.14 });
  pieceZ(sink, f, 0, 0.4, 0.18, 0.2, 0.05, 0x5d646b);
  pieceZ(sink, f, 0, 0.4, 0.23, 0.13, 0.02, 0x3d434a);
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'cyl', sx * 0.3, 0.7, -0.06, 0.05, 0.3, 0.05, 0x9aa1a8, { rx: 0.12 });
  }
  void cfg;
}

function buildTrampoline(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  pPiece(sink, f, 'cyl', 0, 0.64, 0, 2.6, 0.03, 2.6, jhex(0x2f5a7d, rng, 0.08));
  pPiece(sink, f, 'cyl', 0, 0.7, 0, 2.9, 0.1, 2.9, jhex(0x39404a, rng, 0.06));
  pPiece(sink, f, 'cyl', 0, 0.73, 0, 2.48, 0.06, 2.48, jhex(0x24344f, rng, 0.05));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pPiece(sink, f, 'cyl', Math.sin(a) * 1.28, 0, Math.cos(a) * 1.28, 0.08, 0.72, 0.08, 0x555d66);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pPiece(sink, f, 'cyl', Math.sin(a) * 1.42, 0.8, Math.cos(a) * 1.42, 0.05, 1.15, 0.05, 0x9aa2ad);
  }
  for (let i = 0; i < 4; i++) {
    pPiece(sink, f, 'box', 0, 1.93, 0, 2.84, 0.035, 0.035, 0x9aa2ad, { yaw: (i * Math.PI) / 4 });
  }
  void cfg;
}

function buildDogHouse(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const wood = jhex(0x7a5230, rng, 0.1);
  pPiece(sink, f, 'box', 0, 0, 0, 0.92, 0.07, 1.0, jhex(0x5e3f24, rng, 0.08));
  pPiece(sink, f, 'box', 0, 0.07, 0, 0.84, 0.62, 0.96, wood);
  pPiece(sink, f, 'box', 0, 0.62, -0.24, 1.02, 0.06, 0.62, jhex(0x52381f, rng, 0.08), { rx: -0.5 });
  pPiece(sink, f, 'box', 0, 0.62, 0.24, 1.02, 0.06, 0.62, jhex(0x52381f, rng, 0.08), { rx: 0.5 });
  pPiece(sink, f, 'box', 0, 0.84, 0, 1.0, 0.05, 0.14, 0x46311c);
  pPiece(sink, f, 'box', 0, 0.1, 0.49, 0.4, 0.46, 0.05, 0x1d1915);
  void cfg;
}

function buildKiddiePool(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  const blue = jhex(0x2f7fc1, rng, 0.08);
  pPiece(sink, f, 'cyl', 0, 0, 0, 1.7, 0.36, 1.7, blue);
  pPiece(sink, f, 'cyl', 0, 0.2, 0, 1.76, 0.1, 1.76, jhex(0x63a8dd, rng, 0.08));
  pPiece(sink, f, 'cyl', 0, 0.32, 0, 1.4, 0.05, 1.4, jhex(0x14507d, rng, 0.06));
  void cfg;
}

function buildScarecrow(sink: BucketSink, f: PFrame, rng: () => number, cfg: BackyardPropConfig) {
  pPiece(sink, f, 'box', 0, 0, 0, 0.12, 1.5, 0.12, jhex(0x6b4a2f, rng, 0.08));
  pPiece(sink, f, 'box', 0, 1.12, 0, 0.85, 0.1, 0.1, 0x5e4128);
  for (const sx of [-1, 1]) {
    pPiece(sink, f, 'box', sx * 0.52, 1.12, 0, 0.2, 0.09, 0.09, jhex(0xd8b95c, rng, 0.12));
  }
  pPiece(sink, f, 'box', 0, 0.55, 0, 0.46, 0.6, 0.28, jhex(0x8a3b2a, rng, 0.1), { rz: 0.05 });
  ball(sink, f, 0, 1.5, 0, 0.17, jhex(0xd9b44a, rng, 0.1));
  pPiece(sink, f, 'cone', 0, 1.6, 0, 0.42, 0.22, 0.42, jhex(0x5f4626, rng, 0.08));
  pPiece(sink, f, 'cyl', 0, 1.6, 0, 0.54, 0.03, 0.54, 0x4e3920);
  pieceZ(sink, f, 0, 0.62, 0.13, 0.15, 0.03, 0xe8e4da);
  pieceZ(sink, f, 0, 0.62, 0.16, 0.075, 0.02, 0xb03030);
  void cfg;
}

/** Construye un artículo de patio por id y devuelve sus colisionadores. */
export function buildBackyardProp(sink: BucketSink, id: string, x: number, z: number, rot: number, rng: () => number): Collider[] {
  const cfg = CFG.get(id);
  if (!cfg) return [];
  const f = frameAt(x, z, rot);
  switch (id) {
    case 'prop_lawnmower':
      buildLawnmower(sink, f, rng, cfg);
      break;
    case 'prop_wheelbarrow':
      buildWheelbarrow(sink, f, rng, cfg);
      break;
    case 'prop_garden_hose_wall':
      buildHoseWall(sink, f, rng, cfg);
      break;
    case 'prop_stacked_flowerpots':
      buildFlowerpots(sink, f, rng, cfg);
      break;
    case 'prop_bbq_grill':
      buildGrill(sink, f, rng, cfg);
      break;
    case 'prop_picnic_table':
      buildPicnicTable(sink, f, rng, cfg);
      break;
    case 'prop_folding_chair':
      buildFoldingChair(sink, f, rng, cfg);
      break;
    case 'prop_patio_umbrella':
      buildUmbrella(sink, f, rng, cfg);
      break;
    case 'prop_garden_shed':
      buildShed(sink, f, rng, cfg);
      break;
    case 'prop_trash_bin_wheelie':
      buildWheelieBin(sink, f, rng, cfg);
      break;
    case 'prop_firewood_stack':
      buildFirewood(sink, f, rng, cfg);
      break;
    case 'prop_ac_compressor_unit':
      buildAcUnit(sink, f, rng, cfg);
      break;
    case 'prop_backyard_trampoline':
      buildTrampoline(sink, f, rng, cfg);
      break;
    case 'prop_dog_house':
      buildDogHouse(sink, f, rng, cfg);
      break;
    case 'prop_inflatable_kiddie_pool':
      buildKiddiePool(sink, f, rng, cfg);
      break;
    case 'prop_target_dummy_scarecrow':
      buildScarecrow(sink, f, rng, cfg);
      break;
    default:
      return [];
  }
  if (!cfg.blocksMovement) return [];
  if (id === 'prop_backyard_trampoline') return [circle(x, z, 1.45)];
  return [makeBoxCollider(x, z, rot, cfg.footprint.width / 2, cfg.footprint.depth / 2)];
}
