import type { WeaponId } from '../weapons/weaponTypes';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface City extends Rect {
  /** Semilla propia de la ciudad (para manzanas/edificios). */
  seed: number;
  /** Centro del eje de la primera calle en X / Z. */
  ox: number;
  oz: number;
  /** Número de manzanas en cada eje. */
  nx: number;
  nz: number;
  pitch: number;
  streetW: number;
  centerX: number;
  centerZ: number;
}

export type StructureKind = 'cabin' | 'house' | 'building';

/** Caja de botín dentro de una cabaña (posición local a la cabaña). */
export interface Crate {
  /** Id único y estable (para recordar si ya fue saqueada). */
  id: string;
  lx: number;
  lz: number;
  loot: WeaponId;
}

/** Caja con techo piramidal opcional (roofH = 0 => techo plano). */
export interface Structure {
  crate?: Crate;
  kind: StructureKind;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  roofH: number;
  rot: number;
  wallColor: number;
  roofColor: number;
}

export interface Plant {
  x: number;
  z: number;
  scale: number;
  rot: number;
  /** Variación de tono 0..1. */
  tone: number;
  kind?: 'pine' | 'oak';
}

/** Cuadrilátero plano en XZ: x0,z0, x1,z1, x2,z2, x3,z3 (en orden alrededor del perímetro). */
export type Quad = [number, number, number, number, number, number, number, number];

export type CarKind = 'modern' | 'farm' | 'abandoned' | 'wreck';

/** Automóvil estático. `rot` es la orientación Y (el frente apunta a +Z local). */
export interface Car {
  kind: CarKind;
  x: number;
  z: number;
  rot: number;
  color: number;
  /** Valores aleatorios (0..1) para variaciones del modelo (daños, inclinación). */
  j: number[];
}

export interface Tent {
  x: number;
  z: number;
  rot: number;
  size: number;
  height: number;
  color: number;
}

export interface Fire {
  x: number;
  z: number;
}

/** Caja de botín suelta (campamentos). Las de cabañas van dentro de `Structure.crate`. */
export interface WorldCrate {
  id: string;
  x: number;
  z: number;
  rot: number;
  loot: WeaponId;
}

export interface Tower {
  x: number;
  z: number;
  rot: number;
  height: number;
}

/** Caseta de cobro: cabina central y barreras; `rot` apunta en el sentido de la carretera. */
export interface TollBooth {
  x: number;
  z: number;
  rot: number;
}

/** Gasolinera de una ciudad: bombas en coordenadas del mundo y gasolina total disponible (litros). */
export interface GasStation {
  id: string;
  /** Centro de la manzana. */
  x: number;
  z: number;
  capacity: number;
  pumps: { x: number; z: number }[];
}

/** Arma tirada en el suelo (zonas residenciales); se instancia al cargar el chunk. */
export interface GroundDrop {
  id: string;
  x: number;
  z: number;
  weapon: WeaponId;
}

export interface Camp {
  id: string;
  x: number;
  z: number;
  tents: Tent[];
  fires: Fire[];
  crates: WorldCrate[];
  tower?: Tower;
}

export interface ChunkData {
  cx: number;
  cz: number;
  originX: number;
  originZ: number;
  /** Colores RGB (0..1) por vértice del suelo, orden fila-mayor (z, luego x). */
  groundColors: Float32Array;
  /** Asfalto (calles de ciudad y carreteras). */
  roadQuads: Quad[];
  /** Tierra (calles de pueblo y senderos). */
  dirtQuads: Quad[];
  trees: Plant[];
  bushes: Plant[];
  grass: Plant[];
  structures: Structure[];
  cars: Car[];
  tents: Tent[];
  fires: Fire[];
  crates: WorldCrate[];
  towers: Tower[];
  tolls: TollBooth[];
  stations: GasStation[];
  drops: GroundDrop[];
}
