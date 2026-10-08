import type { Quad, Rect } from './types';

export interface Pt {
  x: number;
  z: number;
}

/** Segmento de una cinta, para consultas de distancia (exclusión de vegetación). */
export interface Seg {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  hw: number;
}

/**
 * Cinta (carretera/sendero): polilínea con semi-ancho por punto y bordes izquierdo/derecho
 * precalculados con unión en inglete, de modo que segmentos vecinos comparten esquinas exactas
 * (sin huecos aunque cada chunk dibuje solo sus segmentos).
 */
export interface Ribbon {
  pts: Pt[];
  left: Pt[];
  right: Pt[];
  hw: number[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

type Style = 'highway' | 'trail';

/**
 * Curva de `a` a `b` con ondulación lateral determinista (suma de senos con fases aleatorias).
 * Las carreteras hacen curvas amplias y suaves; los senderos añaden armónicos de alta frecuencia
 * para ser mucho más irregulares. Los extremos quedan fijos (envolvente).
 */
export function makeCurve(a: Pt, b: Pt, rng: () => number, style: Style, step: number): Pt[] {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = (b.x - a.x) / len;
  const dz = (b.z - a.z) / len;
  const px = -dz;
  const pz = dx;

  const base = style === 'highway' ? Math.min(80, Math.max(25, len * 0.16)) : Math.min(45, Math.max(8, len * 0.2));
  const harmonics =
    style === 'highway'
      ? [
          { c: 0.8 + rng() * 0.9, a: 1 },
          { c: 1.8 + rng() * 1.8, a: 0.55 },
          { c: 3.5 + rng() * 3, a: 0.22 },
        ]
      : [
          { c: 0.9 + rng() * 0.8, a: 1 },
          { c: 2.5 + rng() * 2, a: 0.6 },
          { c: (len / 45) * (0.8 + rng() * 0.4), a: 0.18 },
          { c: (len / 18) * (0.8 + rng() * 0.4), a: 0.07 },
        ];
  const phases = harmonics.map(() => rng() * Math.PI * 2);

  const n = Math.max(2, Math.ceil(len / step));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const env = Math.min(1, t * 6, (1 - t) * 6);
    let off = 0;
    harmonics.forEach((h, k) => {
      off += h.a * base * Math.sin(Math.PI * 2 * h.c * t + phases[k]);
    });
    off *= env;
    pts.push({ x: a.x + dx * len * t + px * off, z: a.z + dz * len * t + pz * off });
  }
  return pts;
}

/** Construye la cinta con ancho variable: `halfWidth(i)` da el semi-ancho en el punto i. */
export function buildRibbon(pts: Pt[], halfWidth: (i: number) => number): Ribbon {
  const n = pts.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const hw: number[] = [];

  const segNormal = (i: number) => {
    const dx = pts[i + 1].x - pts[i].x;
    const dz = pts[i + 1].z - pts[i].z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: -dz / l, z: dx / l };
  };

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    const prev = segNormal(Math.max(0, i - 1));
    const next = segNormal(Math.min(n - 2, i));
    let nx = prev.x + next.x;
    let nz = prev.z + next.z;
    const l = Math.hypot(nx, nz) || 1;
    nx /= l;
    nz /= l;
    const cos = Math.max(0.6, nx * next.x + nz * next.z); // limita el inglete en curvas cerradas
    const h = halfWidth(i);
    const m = h / cos;
    hw.push(h);
    const L = { x: pts[i].x + nx * m, z: pts[i].z + nz * m };
    const R = { x: pts[i].x - nx * m, z: pts[i].z - nz * m };
    left.push(L);
    right.push(R);
    for (const p of [L, R]) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.z);
      maxZ = Math.max(maxZ, p.z);
    }
  }
  return { pts, left, right, hw, minX, maxX, minZ, maxZ };
}

export function ribbonQuad(r: Ribbon, i: number): Quad {
  return [r.left[i].x, r.left[i].z, r.right[i].x, r.right[i].z, r.right[i + 1].x, r.right[i + 1].z, r.left[i + 1].x, r.left[i + 1].z];
}

export function segMid(r: Ribbon, i: number): Pt {
  return { x: (r.pts[i].x + r.pts[i + 1].x) / 2, z: (r.pts[i].z + r.pts[i + 1].z) / 2 };
}

export function ribbonIntersects(r: Ribbon, rect: Rect, margin = 0): boolean {
  return r.maxX >= rect.minX - margin && r.minX <= rect.maxX + margin && r.maxZ >= rect.minZ - margin && r.minZ <= rect.maxZ + margin;
}

export function distToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const l2 = abx * abx + abz * abz;
  let t = l2 > 0 ? ((px - ax) * abx + (pz - az) * abz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

/** Segmentos de la cinta cuyo bounding box toca `rect` (+margen). */
export function ribbonSegmentsNear(r: Ribbon, rect: Rect, margin: number, out: Seg[]) {
  for (let i = 0; i < r.pts.length - 1; i++) {
    const a = r.pts[i];
    const b = r.pts[i + 1];
    const hw = Math.max(r.hw[i], r.hw[i + 1]);
    const m = margin + hw;
    if (
      Math.max(a.x, b.x) < rect.minX - m ||
      Math.min(a.x, b.x) > rect.maxX + m ||
      Math.max(a.z, b.z) < rect.minZ - m ||
      Math.min(a.z, b.z) > rect.maxZ + m
    )
      continue;
    out.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, hw });
  }
}

/** Rectángulo -> cuadrilátero. */
export function rectQuad(r: Rect): Quad {
  return [r.minX, r.minZ, r.minX, r.maxZ, r.maxX, r.maxZ, r.maxX, r.minZ];
}
