import type { Car, CarKind } from './types';

const PALETTES: Record<CarKind, number[]> = {
  // Carros modernos de ciudad
  modern: [0xb91c1c, 0x1d4ed8, 0xe5e7eb, 0x111827, 0x9ca3af, 0xf59e0b, 0x047857],
  // Camionetas de campo: colores apagados/oxidados
  farm: [0x6b7a3a, 0x7c5a3a, 0x8a8f93, 0x7a3030, 0x5a6a4a],
  // Abandonados en carretera: pintura polvorienta
  abandoned: [0x6e6a5f, 0x5f6b6e, 0x7a6a58, 0x585858, 0x6a5f4a],
  // Destruidos: quemados / oxidados
  wreck: [0x2b2522, 0x3a2a22, 0x4a3a30, 0x35302c],
};

export function makeCar(kind: CarKind, x: number, z: number, rot: number, rng: () => number): Car {
  const pal = PALETTES[kind];
  return {
    kind,
    x,
    z,
    rot,
    color: pal[Math.floor(rng() * pal.length)],
    j: [rng(), rng(), rng(), rng()],
  };
}
