/**
 * Utilidades deterministas: hash entero, RNG con semilla y ruido de valor (fbm).
 * Todo el mundo se deriva de (seed, coordenadas), así cualquier chunk se puede
 * regenerar de forma idéntica sin guardar estado.
 */

export function hash2(seed: number, x: number, y: number): number {
  let h =
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x165667b1) ^
    Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function chunkRng(seed: number, cx: number, cz: number, salt = 0): () => number {
  return mulberry32(hash2(seed + salt * 7919, cx, cz));
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash2(seed, xi, yi) / 4294967296;
  const n10 = hash2(seed, xi + 1, yi) / 4294967296;
  const n01 = hash2(seed, xi, yi + 1) / 4294967296;
  const n11 = hash2(seed, xi + 1, yi + 1) / 4294967296;
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

/** Ruido fractal normalizado a [0, 1]. */
export function fbm(seed: number, x: number, y: number, octaves = 4): number {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(seed + i * 1013, x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}
