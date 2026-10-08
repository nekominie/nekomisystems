import type { GasStation } from './types';

/**
 * Gasolinera: ocupa una manzana de la ciudad (la tienda al fondo, marquesina con dos islas de bombas
 * y un letrero en la esquina). Coordenadas locales respecto al centro de la manzana, ejes del mundo.
 */
export const STATION = {
  /** Dos islas (x = ±5) con dos bombas cada una (z = 2.5 y 6.5): los carros se estacionan a los lados. */
  pumps: [
    [-5, 2.5],
    [-5, 6.5],
    [5, 2.5],
    [5, 6.5],
  ] as [number, number][],
  islandZ: 4.5,
  islandX: [-5, 5],
  canopy: { cx: 0, cz: 4.5, w: 18.4, d: 9, y: 4.8 },
  pillars: [
    [-8.2, 1.2],
    [8.2, 1.2],
    [-8.2, 7.8],
    [8.2, 7.8],
  ] as [number, number][],
  store: { cx: 0, cz: -9.5, w: 12, d: 6, h: 4 },
  sign: { x: -13.5, z: 13 },
};

export function makeGasStation(id: string, x: number, z: number, capacity: number): GasStation {
  return {
    id,
    x,
    z,
    capacity,
    pumps: STATION.pumps.map(([lx, lz]) => ({ x: x + lx, z: z + lz })),
  };
}
