import { fbm, smoothstep } from './random';

/** Densidad de bosque 0..1 en un punto del mundo (función pura de semilla y coordenadas). */
export function forestDensity(seed: number, x: number, z: number): number {
  return smoothstep(0.5, 0.68, fbm(seed + 3, x / 70, z / 70, 4));
}

/** Parches de tierra naturales 0..1. */
export function naturalDirt(seed: number, x: number, z: number): number {
  return smoothstep(0.58, 0.68, fbm(seed + 2, x / 45, z / 45, 3));
}
