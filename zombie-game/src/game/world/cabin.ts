import type { Structure } from './types';

/**
 * Layout de la cabaña en coordenadas locales (origen en el centro, +Z = frente con puerta).
 * Es la única fuente de verdad: la usan tanto el render como la colisión.
 */
export const CABIN = {
  wallT: 0.3,
  doorW: 1.7,
  doorH: 2.1,
  floorH: 0.05,
  crateSize: 0.9,
  crateH: 0.6,
};

export type WallSide = 'back' | 'left' | 'right' | 'front';

export interface LocalBox {
  cx: number;
  cz: number;
  /** Semi-extensiones en X/Z locales. */
  hw: number;
  hd: number;
  side: WallSide | 'crate';
}

/** Cajas de las paredes (la pared frontal tiene un hueco de puerta). */
export function cabinWallBoxes(s: Structure): LocalBox[] {
  const t = CABIN.wallT;
  const hw = s.w / 2;
  const hd = s.d / 2;
  const dw = CABIN.doorW / 2;
  const segHalf = (hw - dw) / 2;
  const segCx = (hw + dw) / 2;
  return [
    { cx: 0, cz: -hd, hw, hd: t / 2, side: 'back' },
    { cx: -hw, cz: 0, hw: t / 2, hd, side: 'left' },
    { cx: hw, cz: 0, hw: t / 2, hd, side: 'right' },
    { cx: -segCx, cz: hd, hw: segHalf, hd: t / 2, side: 'front' },
    { cx: segCx, cz: hd, hw: segHalf, hd: t / 2, side: 'front' },
  ];
}

export function crateBox(s: Structure): LocalBox | null {
  if (!s.crate) return null;
  const h = CABIN.crateSize / 2;
  return { cx: s.crate.lx, cz: s.crate.lz, hw: h, hd: h, side: 'crate' };
}

export interface CabinCollider {
  /** Caja orientada (frente a los colisionadores circulares de collision.ts). */
  kind: 'obb';
  /** Solo se usa la posición (x, z) del origen local. */
  s: { x: number; z: number };
  boxes: LocalBox[];
  cos: number;
  sin: number;
  /** Distancia máxima al centro a la que puede haber contacto. */
  reach: number;
}

export function makeCabinCollider(s: Structure): CabinCollider {
  const boxes = cabinWallBoxes(s);
  const crate = crateBox(s);
  if (crate) boxes.push(crate);
  return {
    kind: 'obb',
    s,
    boxes,
    cos: Math.cos(s.rot),
    sin: Math.sin(s.rot),
    reach: Math.hypot(s.w, s.d) / 2 + 2,
  };
}

/** Colisionador de una sola caja (cajas, casas, carros, tiendas...), centrada en (x, z) y girada `rot`. */
export function makeBoxCollider(x: number, z: number, rot: number, hw: number, hd: number): CabinCollider {
  return {
    kind: 'obb',
    s: { x, z },
    boxes: [{ cx: 0, cz: 0, hw, hd, side: 'crate' }],
    cos: Math.cos(rot),
    sin: Math.sin(rot),
    reach: Math.hypot(hw, hd) + 2,
  };
}

/** Rotación Y de three: local (lx,lz) -> mundo. */
export function cabinLocalToWorld(s: Structure, lx: number, lz: number) {
  const c = Math.cos(s.rot);
  const sn = Math.sin(s.rot);
  return { x: s.x + lx * c + lz * sn, z: s.z - lx * sn + lz * c };
}

export function worldToCabinLocal(s: Structure, x: number, z: number) {
  const c = Math.cos(s.rot);
  const sn = Math.sin(s.rot);
  const dx = x - s.x;
  const dz = z - s.z;
  return { lx: dx * c - dz * sn, lz: dx * sn + dz * c };
}

export function isInsideCabin(s: Structure, x: number, z: number, margin = 0.1): boolean {
  const { lx, lz } = worldToCabinLocal(s, x, z);
  return Math.abs(lx) < s.w / 2 + margin && Math.abs(lz) < s.d / 2 + margin;
}

/** Empuja un círculo (x, z, r) fuera de las cajas de la cabaña. Devuelve la nueva posición. */
export function resolveCircleVsCabin(col: CabinCollider, x: number, z: number, r: number) {
  const { s, cos, sin } = col;
  const dx = x - s.x;
  const dz = z - s.z;
  if (dx * dx + dz * dz > col.reach * col.reach) return { x, z };

  let lx = dx * cos - dz * sin;
  let lz = dx * sin + dz * cos;

  for (let pass = 0; pass < 2; pass++) {
    for (const b of col.boxes) {
      const qx = Math.min(b.cx + b.hw, Math.max(b.cx - b.hw, lx));
      const qz = Math.min(b.cz + b.hd, Math.max(b.cz - b.hd, lz));
      const ddx = lx - qx;
      const ddz = lz - qz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = r - d;
        lx += (ddx / d) * push;
        lz += (ddz / d) * push;
      } else {
        // Centro dentro de la caja: salir por la cara más cercana.
        const oL = lx - (b.cx - b.hw);
        const oR = b.cx + b.hw - lx;
        const oB = lz - (b.cz - b.hd);
        const oF = b.cz + b.hd - lz;
        const m = Math.min(oL, oR, oB, oF);
        if (m === oL) lx = b.cx - b.hw - r;
        else if (m === oR) lx = b.cx + b.hw + r;
        else if (m === oB) lz = b.cz - b.hd - r;
        else lz = b.cz + b.hd + r;
      }
    }
  }
  return { x: s.x + lx * cos + lz * sin, z: s.z - lx * sin + lz * cos };
}
