import { BACKYARD_PROPS_CATALOG, type BackyardPropConfig } from './props/backyardCatalog';
import type { Backyard, BackyardPropPlacement, Rect, Structure } from './types';

/**
 * Patios residenciales: barda en 3 lados y la pared de la casa como cuarto lado.
 *
 * El diseño se calcula UNA vez en los generadores de ciudad/pueblo (determinista a
 * partir de su rng) y viaja pegado a la `Structure` (ver `types.Backyard`); el chunk
 * solo lo renderiza, así que no hay estado extra ni desincronización con la semilla.
 *
 * Tamaños: el área del patio es el 25% / 50% / 90% / 200% del área de la casa.
 * Como el patio se pega a un lado, la profundidad que produce esa área es
 * `factor × (la otra dimensión de la casa)`.
 */

export const BACKYARD = {
  /** Probabilidad de que una casa tenga patio (en el 5% restante no se genera). */
  patioChance: 0.95,
  /** Área del patio como fracción del área de la casa (footprint): 25% / 50% / 90% / 200%. */
  sizeFactor: { small: 0.25, medium: 0.5, large: 0.9, huge: 2.0 } as const,
  /** Peso relativo de cada tamaño. */
  sizeWeights: { small: 0.32, medium: 0.34, large: 0.24, huge: 0.1 } as const,
  /** Tope de props por tamaño (además del tope por área: ~1 por cada 7 m²). */
  maxProps: { small: 2, medium: 4, large: 6, huge: 8 } as const,
  /** Profundidad mínima utilizable (deja sitio a los props y al paso). */
  minDepth: 1.7,
  /** Último recurso en solares muy apretados (rincones estrechos pero usables). */
  minDepthBare: 1.1,
  /** Ancho del patio como fracción del lado de la casa (se estrecha si no cabe). */
  spanScales: [1, 0.8, 0.6, 0.45] as const,
  /** Separación de los props a la barda/pared. */
  clearance: 0.24,
  /**
   * Márgenes de validación del patio: contra otras casas (barda a media cuadra),
   * contra calles (barda al límite del predio, pegada a la banqueta) y entre patios.
   */
  margin: { structure: 0.4, road: 0.35, patio: 0.8 },
} as const;

export type PatioSide = Backyard['side'];

export interface PatioFrame {
  side: PatioSide;
  /** Largo del lado de la casa al que se pega. */
  span: number;
  depth: number;
  /** Ejes en coordenadas locales de la casa: u = a lo largo de la pared, v = hacia afuera. */
  ux: number;
  uz: number;
  vx: number;
  vz: number;
  /** Centro de la pared de la casa (u=0, v=0), local a la casa. */
  baseX: number;
  baseZ: number;
}

/** Marco del patio (ejes u/v) para un lado y profundidad dados. */
export function patioFrame(house: Structure, side: PatioSide, depth: number, spanScale = 1): PatioFrame {
  const span = (side === 'back' ? house.w : house.d) * spanScale;
  if (side === 'back') {
    return { side, span, depth, ux: 1, uz: 0, vx: 0, vz: -1, baseX: 0, baseZ: -house.d / 2 };
  }
  if (side === 'left') {
    return { side, span, depth, ux: 0, uz: 1, vx: -1, vz: 0, baseX: -house.w / 2, baseZ: 0 };
  }
  return { side, span, depth, ux: 0, uz: 1, vx: 1, vz: 0, baseX: house.w / 2, baseZ: 0 };
}

export function backyardFrame(house: Structure): PatioFrame | null {
  const b = house.backyard;
  if (!b) return null;
  const baseSpan = b.side === 'back' ? house.w : house.d;
  return patioFrame(house, b.side, b.depth, b.width / baseSpan);
}

/** Punto del patio (u, v) -> coordenadas locales de la casa. */
export function patioToLocal(f: PatioFrame, u: number, v: number) {
  return {
    lx: f.baseX + f.ux * u + f.vx * v,
    lz: f.baseZ + f.uz * u + f.vz * v,
  };
}

/** Rectángulo del patio en coordenadas locales de la casa (min/max). */
export function backyardLocalRect(house: Structure): { lx0: number; lx1: number; lz0: number; lz1: number } | null {
  const f = backyardFrame(house);
  if (!f) return null;
  const a = patioToLocal(f, -f.span / 2, 0);
  const b = patioToLocal(f, f.span / 2, f.depth);
  return { lx0: Math.min(a.lx, b.lx), lx1: Math.max(a.lx, b.lx), lz0: Math.min(a.lz, b.lz), lz1: Math.max(a.lz, b.lz) };
}

/** AABB en el mundo de una casa (con su giro). */
export function structureAABB(s: Structure): Rect {
  const c = Math.abs(Math.cos(s.rot));
  const sn = Math.abs(Math.sin(s.rot));
  const hx = (s.w / 2) * c + (s.d / 2) * sn;
  const hz = (s.w / 2) * sn + (s.d / 2) * c;
  return { minX: s.x - hx, maxX: s.x + hx, minZ: s.z - hz, maxZ: s.z + hz };
}

/** AABB en el mundo del patio de una casa. */
export function backyardWorldRect(house: Structure): Rect {
  const r = backyardLocalRect(house)!;
  const c = Math.cos(house.rot);
  const sn = Math.sin(house.rot);
  const corners: [number, number][] = [
    [r.lx0, r.lz0],
    [r.lx1, r.lz0],
    [r.lx0, r.lz1],
    [r.lx1, r.lz1],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [lx, lz] of corners) {
    const x = house.x + lx * c + lz * sn;
    const z = house.z - lx * sn + lz * c;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ };
}

export function overlapRect(a: Rect, b: Rect, margin = 0): boolean {
  return a.maxX + margin >= b.minX && a.minX - margin <= b.maxX && a.maxZ + margin >= b.minZ && a.minZ - margin <= b.maxZ;
}

function rollSize(rng: () => number): Backyard['size'] {
  const w = BACKYARD.sizeWeights;
  let r = rng();
  if ((r -= w.small) < 0) return 'small';
  if ((r -= w.medium) < 0) return 'medium';
  if ((r -= w.large) < 0) return 'large';
  return 'huge';
}

/** Lado preferido y respaldo: el trasero (opuesto a la puerta) es el más común. */
function rollSides(rng: () => number): PatioSide[] {
  const r = rng();
  if (r < 0.5) return ['back', 'left', 'right'];
  if (r < 0.75) return ['left', 'right', 'back'];
  return ['right', 'back', 'left'];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Extensiones (u, v) que ocupa un prop girado `rot` dentro del marco del patio. */
function patioExtents(cfg: BackyardPropConfig, rot: number, f: PatioFrame) {
  const frontX = Math.sin(rot);
  const frontZ = Math.cos(rot);
  const rightX = Math.cos(rot);
  const rightZ = -Math.sin(rot);
  const fu = frontX * f.ux + frontZ * f.uz;
  const fv = frontX * f.vx + frontZ * f.vz;
  const ru = rightX * f.ux + rightZ * f.uz;
  const rv = rightX * f.vx + rightZ * f.vz;
  const eu = (Math.abs(ru) * cfg.footprint.width + Math.abs(fu) * cfg.footprint.depth) / 2;
  const ev = (Math.abs(rv) * cfg.footprint.width + Math.abs(fv) * cfg.footprint.depth) / 2;
  return { eu, ev };
}

interface PlacementRect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

interface Candidate {
  u: number;
  v: number;
  rot: number;
  rect: PlacementRect;
}

/**
 * Intenta colocar un prop según su regla de la manera "lógica" del diseño:
 * - wall_attached: pegado a la pared de la casa, a la barda del fondo o a una barda lateral (dando la cara al patio).
 * - corner: en una de las 4 esquinas del patio, orientado en diagonal hacia adentro.
 * - open_ground: en zona abierta con holgura (los muebles grandes piden más espacio).
 * - anywhere: en cualquier punto libre.
 */
function tryPlace(
  cfg: BackyardPropConfig,
  f: PatioFrame,
  rng: () => number,
  placed: PlacementRect[],
  yawAway: number,
  yawHome: number,
  yawU: number,
  yawMinusU: number,
): Candidate | null {
  const c = BACKYARD.clearance;
  const W = f.span;
  const D = f.depth;
  for (let attempt = 0; attempt < 12; attempt++) {
    let u = 0;
    let v = 0;
    let rot = yawAway;
    switch (cfg.placementRule) {
      case 'wall_attached': {
        const r = rng();
        if (r < 0.45) {
          rot = yawAway; // pared de la casa
          const e = patioExtents(cfg, rot, f);
          const uSpan = spanRand(rng, -(W / 2 - e.eu / 2 - c), W / 2 - e.eu / 2 - c);
          if (uSpan === null) continue;
          u = uSpan;
          v = c + e.ev / 2;
        } else if (r < 0.8) {
          rot = yawHome; // barda del fondo
          const e = patioExtents(cfg, rot, f);
          const uSpan = spanRand(rng, -(W / 2 - e.eu / 2 - c), W / 2 - e.eu / 2 - c);
          if (uSpan === null) continue;
          u = uSpan;
          v = D - c - e.ev / 2;
        } else {
          const su = rng() < 0.5 ? -1 : 1;
          rot = su > 0 ? yawMinusU : yawU; // bardas laterales, mirando hacia el patio
          const e = patioExtents(cfg, rot, f);
          const vSpan = spanRand(rng, c + e.ev / 2, D - c - e.ev / 2);
          if (vSpan === null) continue;
          u = su * (W / 2 - c - e.eu / 2);
          v = vSpan;
        }
        break;
      }
      case 'corner': {
        const su = rng() < 0.5 ? -1 : 1;
        const sv = rng() < 0.5 ? 0 : 1;
        const dx = f.ux * su + f.vx * (sv ? 1 : -1);
        const dz = f.uz * su + f.vz * (sv ? 1 : -1);
        rot = Math.atan2(dx, dz);
        const e = patioExtents(cfg, rot, f);
        u = su * (W / 2 - c - e.eu / 2);
        v = sv ? D - c - e.ev / 2 : c + e.ev / 2;
        break;
      }
      case 'open_ground': {
        rot = pickYaw(rng, yawAway, yawHome, yawU, yawMinusU);
        const e = patioExtents(cfg, rot, f);
        const m = c + 0.55;
        const uSpan = spanRand(rng, -(W / 2 - e.eu / 2 - m), W / 2 - e.eu / 2 - m);
        const vSpan = spanRand(rng, m + e.ev / 2, D - m - e.ev / 2);
        if (uSpan === null || vSpan === null) continue;
        u = uSpan;
        v = vSpan;
        break;
      }
      default: {
        rot = pickYaw(rng, yawAway, yawHome, yawU, yawMinusU);
        rot += (rng() - 0.5) * 0.16;
        const e = patioExtents(cfg, rot, f);
        const m = c + 0.1;
        const uSpan = spanRand(rng, -(W / 2 - e.eu / 2 - m), W / 2 - e.eu / 2 - m);
        const vSpan = spanRand(rng, m + e.ev / 2, D - m - e.ev / 2);
        if (uSpan === null || vSpan === null) continue;
        u = uSpan;
        v = vSpan;
        break;
      }
    }
    const e = patioExtents(cfg, rot, f);
    const rect: PlacementRect = { u0: u - e.eu / 2, u1: u + e.eu / 2, v0: v - e.ev / 2, v1: v + e.ev / 2 };
    if (rect.u0 < -W / 2 + c - 0.01 || rect.u1 > W / 2 - c + 0.01) continue;
    if (rect.v0 < c - 0.01 || rect.v1 > D - c + 0.01) continue;
    let clash = false;
    for (const q of placed) {
      if (rect.u0 < q.u1 + 0.2 && rect.u1 > q.u0 - 0.2 && rect.v0 < q.v1 + 0.2 && rect.v1 > q.v0 - 0.2) {
        clash = true;
        break;
      }
    }
    if (clash) continue;
    return { u, v, rot, rect };
  }
  return null;
}

function spanRand(rng: () => number, a: number, b: number): number | null {
  if (b <= a) return null;
  return a + rng() * (b - a);
}

function pickYaw(rng: () => number, a: number, b: number, c: number, d: number): number {
  const r = rng();
  if (r < 0.25) return a;
  if (r < 0.5) return b;
  if (r < 0.75) return c;
  return d;
}

function placeBackyardProps(house: Structure, f: PatioFrame, rng: () => number): void {
  const b = house.backyard!;
  const area = f.span * f.depth;
  const maxProps = Math.max(1, Math.min(BACKYARD.maxProps[b.size], Math.floor(area / 7)));
  const placed: PlacementRect[] = [];
  const yawAway = Math.atan2(f.vx, f.vz);
  const yawHome = Math.atan2(-f.vx, -f.vz);
  const yawU = Math.atan2(f.ux, f.uz);
  const yawMinusU = Math.atan2(-f.ux, -f.uz);
  const catalog = shuffle([...BACKYARD_PROPS_CATALOG], rng);
  for (const cfg of catalog) {
    if (b.props.length >= maxProps) break;
    if (rng() > cfg.spawnWeight / 10) continue;
    const p = tryPlace(cfg, f, rng, placed, yawAway, yawHome, yawU, yawMinusU);
    if (!p) continue;
    placed.push(p.rect);
    const loc = patioToLocal(f, p.u, p.v);
    const prop: BackyardPropPlacement = { id: cfg.id, lx: loc.lx, lz: loc.lz, rot: p.rot, blocks: cfg.blocksMovement };
    b.props.push(prop);
  }
}

/**
 * Genera (o no) el patio de una casa y coloca sus props. `isFree` valida el
 * rectángulo del patio en el mundo contra el resto del poblado/calles.
 *
 * Estrategia para llegar a ~95% de casas con patio incluso en manzanas densas:
 * primero se intenta el ancho completo del lado; si no cabe (margen contra las
 * casas vecinas), el patio se estrecha (75% / 60% / 45%) quedando siempre pegado
 * a la pared de la casa, y en última instancia se reduce la profundidad.
 */
export function layoutBackyard(house: Structure, rng: () => number, isFree: (rect: Rect) => boolean): void {
  if (house.kind !== 'house') return;
  if (rng() > BACKYARD.patioChance) return;
  const size = rollSize(rng);
  const factor = BACKYARD.sizeFactor[size];
  const sides = rollSides(rng);
  for (const spanScale of BACKYARD.spanScales) {
    for (const side of sides) {
      const base = factor * (side === 'back' ? house.d : house.w);
      const depths: number[] = [];
      const attempts = [base, base * 0.65, base * 0.45].map((d) => Math.max(BACKYARD.minDepth, d));
      attempts.push(BACKYARD.minDepthBare);
      for (const depth of attempts) {
        if (!depths.some((k) => Math.abs(k - depth) < 0.01)) depths.push(depth);
      }
      for (const depth of depths) {
        const f = patioFrame(house, side, depth, spanScale);
        house.backyard = { side, size, depth, width: f.span, props: [] };
        if (isFree(backyardWorldRect(house))) {
          placeBackyardProps(house, f, rng);
          return;
        }
        house.backyard = undefined;
      }
    }
  }
}
