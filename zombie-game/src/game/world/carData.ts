import type { Car, CarKind } from './types';

/** Capacidad del tanque en litros. */
export const FUEL_CAP = 50;

export type CarStatus = 'open' | 'locked' | 'broken' | 'wrecked';

export interface CarDims {
  L: number;
  W: number;
  bodyH: number;
  bodyY: number;
  cabL: number;
  cabW: number;
  cabH: number;
  /** Desplazamiento de la cabina a lo largo del carro (+Z = frente). */
  cabZ: number;
}

/** Medidas por tipo de carro (las comparten el render estático, el dinámico y las colisiones). */
export function carDims(kind: CarKind): CarDims {
  if (kind === 'farm') return { L: 4.9, W: 1.95, bodyH: 0.8, bodyY: 0.42, cabL: 1.7, cabW: 1.8, cabH: 0.85, cabZ: 1.0 };
  return { L: 4.3, W: 1.8, bodyH: 0.72, bodyY: kind === 'abandoned' ? 0.27 : 0.32, cabL: 2.1, cabW: 1.62, cabH: 0.62, cabZ: -0.15 };
}

/** Id estable de un carro (su posición original es determinista). */
export const carId = (c: Car) => `car:${c.x.toFixed(1)},${c.z.toFixed(1)}`;

/**
 * Estado de conducción, determinista por carro. Los destruidos nunca arrancan. Del resto:
 * 10% averiados (no se pueden manejar), 70% cerrados con llave y 20% abiertos y utilizables.
 */
export function carStatus(c: Car): CarStatus {
  if (c.kind === 'wreck') return 'wrecked';
  const r = c.j[0];
  if (r < 0.1) return 'broken';
  if (r < 0.8) return 'locked';
  return 'open';
}

/** Gasolina inicial aleatoria (litros), entre ~5% y 100% del tanque. */
export const carInitialFuel = (c: Car) => FUEL_CAP * (0.05 + 0.95 * c.j[1]);

export const STATUS_LABEL: Record<CarStatus, string> = {
  open: 'ABIERTO',
  locked: 'CERRADO CON LLAVE',
  broken: 'AVERIADO',
  wrecked: 'DESTRUIDO',
};
