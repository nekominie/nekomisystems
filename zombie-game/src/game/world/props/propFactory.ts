import * as THREE from 'three';
import { circle, type Collider } from '../collision';
import { makeBoxCollider } from '../cabin';

/** Cubetas de instanciado por chunk (una InstancedMesh por cubeta y chunk). */
export type PropBucket = 'box' | 'cyl' | 'head' | 'flame' | 'stone' | 'paper';

export interface BucketItem {
  x: number;
  y: number;
  z: number;
  rot: number;
  sx: number;
  sy: number;
  sz: number;
  color: number;
  rx?: number;
  rz?: number;
}

/** Colector de piezas; devuelve el índice dentro de la cubeta (para ocultar destructibles). */
export interface BucketSink {
  add(bucket: PropBucket, item: BucketItem): number;
}

export type DestructibleKind = 'fence' | 'barrel' | 'redBarrel';

export interface PropPlacement {
  colliders: Collider[];
  lights: { x: number; y: number; z: number; kind: 'lamp' | 'fire' }[];
  destructible?: {
    x: number;
    z: number;
    r: number;
    breakSpeed: number;
    kind: DestructibleKind;
    /** Objetos bajos que se podrían saltar (faro para futuro sistema de salto). */
    climbable: boolean;
    /** Piezas instanciadas que hay que ocultar al romper. */
    parts: { bucket: PropBucket; index: number }[];
  };
}

// ---------- Activos compartidos (nunca se liberan: el dispose de chunks solo toca own*) ----------

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 8).translate(0, 0.5, 0),
  stone: new THREE.DodecahedronGeometry(0.5, 0),
  paper: new THREE.PlaneGeometry(0.42, 0.3).rotateX(-Math.PI / 2),
};

const MAT = {
  /** Lambert blanco para instanciado con color por instancia (el color final = material × instancia). */
  prop: new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
  /** Cabezas de lámpara: base blanca sin iluminar (brillan de noche solas); el tono lo da la instancia. */
  head: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  /** Brasas/llamas: base blanca sin iluminar; el tono lo da la instancia. */
  flame: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  /** Papel: base blanca a doble cara; el tono lo da la instancia. */
  paper: new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }),
};

export const PROP_GEO = GEO;
export const PROP_MAT = MAT;

/** Lambert con tinte, cacheado y compartido (para escombro de rotos; nunca se libera). */
const tintCache = new Map<number, THREE.MeshLambertMaterial>();
export function propTintedMat(hex: number): THREE.MeshLambertMaterial {
  let m = tintCache.get(hex);
  if (!m) tintCache.set(hex, (m = new THREE.MeshLambertMaterial({ color: hex, flatShading: true })));
  return m;
}

const _c = new THREE.Color();
export function propColor(hex: number, jitter = 0, rng: () => number = Math.random): THREE.Color {
  _c.setHex(hex);
  if (jitter > 0) {
    const k = 1 + (rng() - 0.5) * jitter;
    _c.r = THREE.MathUtils.clamp(_c.r * k, 0, 1);
    _c.g = THREE.MathUtils.clamp(_c.g * k, 0, 1);
    _c.b = THREE.MathUtils.clamp(_c.b * k, 0, 1);
  }
  return _c.clone();
}

function put(
  sink: BucketSink,
  bucket: PropBucket,
  x: number, y: number, z: number,
  rot: number, sx: number, sy: number, sz: number,
  color: number, rx = 0, rz = 0,
): number {
  return sink.add(bucket, { x, y, z, rot, sx, sy, sz, color, rx, rz });
}

/**
 * Factoría de mobiliario y props exteriores con primitivas Three.js.
 * Todos los métodos reciben el colector del chunk (`sink`), colocan sus piezas
 * (instanciadas por chunk en WorldScatterManager) y devuelven colisionadores,
 * luces y, si aplica, la ficha de destructible. Nada aquí guarda estado.
 */
export const EnvironmentPropsFactory = {
  /** Poste alto con foco cálido (la luz real la asigna el pool de LampLights). */
  streetLamp(sink: BucketSink, x: number, z: number, rot: number): PropPlacement {
    const dx = Math.cos(rot);
    const dz = -Math.sin(rot);
    put(sink, 'cyl', x, 0, z, 0, 0.18, 5.2, 0.18, 0x2f3336);
    put(sink, 'box', x + dx * 0.55, 5.05, z + dz * 0.55, rot, 1.2, 0.12, 0.12, 0x2f3336);
    put(sink, 'head', x + dx * 1.05, 4.92, z + dz * 1.05, rot, 0.5, 0.14, 0.26, 0xfff2cc);
    return {
      colliders: [circle(x, z, 0.18)],
      lights: [{ x: x + dx * 1.05, y: 4.9, z: z + dz * 1.05, kind: 'lamp' as const }],
    };
  },

  /** Contenedor industrial con tapa semiabierta (sólido; loot futuro). */
  dumpster(sink: BucketSink, x: number, z: number, rot: number, color: number): PropPlacement {
    const dx = Math.cos(rot);
    const dz = -Math.sin(rot);
    put(sink, 'box', x, 0, z, rot, 2.0, 1.15, 1.1, color);
    put(sink, 'box', x - dz * 0.25, 1.12, z + dx * 0.25, rot, 2.0, 0.07, 1.1, 0x1f2937, -0.5, 0);
    put(sink, 'box', x, 1.15, z, rot, 2.04, 0.06, 1.14, 0x111827);
    return {
      colliders: [makeBoxCollider(x, z, rot, 1.0, 0.55)],
      lights: [],
    };
  },

  /** Valla Jersey: base de concreto + cuerpo naranja con franja blanca. Sólida y baja (saltable). */
  trafficBarrier(sink: BucketSink, x: number, z: number, rot: number): PropPlacement {
    put(sink, 'box', x, 0, z, rot, 2.0, 0.25, 0.5, 0x9ca3af);
    put(sink, 'box', x, 0.25, z, rot, 2.0, 0.55, 0.24, 0xea580c);
    put(sink, 'box', x, 0.62, z, rot, 2.02, 0.1, 0.26, 0xf8fafc);
    return {
      colliders: [makeBoxCollider(x, z, rot, 1.0, 0.25)],
      lights: [],
    };
  },

  /** Hidrante rojo de banqueta. */
  fireHydrant(sink: BucketSink, x: number, z: number): PropPlacement {
    put(sink, 'cyl', x, 0, z, 0, 0.32, 0.62, 0.32, 0xb91c1c);
    put(sink, 'cyl', x, 0.62, z, 0, 0.4, 0.1, 0.4, 0x991b1b);
    put(sink, 'cyl', x, 0.72, z, 0, 0.12, 0.1, 0.12, 0x7f1d1d);
    put(sink, 'cyl', x + 0.2, 0.35, z, 0, 0.14, 0.14, 0.14, 0x991b1b, 0, Math.PI / 2);
    put(sink, 'cyl', x - 0.2, 0.35, z, 0, 0.14, 0.14, 0.14, 0x991b1b, 0, Math.PI / 2);
    return {
      colliders: [circle(x, z, 0.24)],
      lights: [],
    };
  },

  /**
   * Tramo de valla de madera de 2 m (2 postes + 2 tablones). Sólida, baja y
   * destructible: los vehículos la embisten a más de `breakSpeed` m/s.
   */
  woodenFence(sink: BucketSink, x: number, z: number, rot: number, color: number, breakSpeed = 5): PropPlacement {
    const dx = Math.cos(rot);
    const dz = -Math.sin(rot);
    const parts: { bucket: PropBucket; index: number }[] = [];
    const box = (px: number, py: number, pz: number, sx: number, sy: number, sz: number, c: number) =>
      parts.push({ bucket: 'box', index: put(sink, 'box', px, py, pz, rot, sx, sy, sz, c) });
    box(x - dx * 0.95, 0, z - dz * 0.95, 0.13, 1.0, 0.13, 0x4a3320);
    box(x + dx * 0.95, 0, z + dz * 0.95, 0.13, 1.0, 0.13, 0x4a3320);
    box(x, 0.5, z, 2.0, 0.14, 0.05, color);
    box(x, 0.8, z, 2.0, 0.14, 0.05, color);
    return {
      colliders: [makeBoxCollider(x, z, rot, 1.0, 0.12)],
      lights: [],
      destructible: { x, z, r: 1.1, breakSpeed, kind: 'fence', climbable: true, parts },
    };
  },

  /**
   * Barril metálico (r 0.3, h 0.9). Todos son destructibles (se abollan);
   * los rojos además explotan al romperse (los detona WorldGameplay).
   */
  barrelMetal(sink: BucketSink, x: number, z: number, color: number, flammable: boolean, rng: () => number = Math.random): PropPlacement {
    const parts: { bucket: PropBucket; index: number }[] = [];
    parts.push({ bucket: 'cyl', index: put(sink, 'cyl', x, 0, z, rng() * Math.PI, 0.6, 0.9, 0.6, color) });
    parts.push({ bucket: 'cyl', index: put(sink, 'cyl', x, 0.22, z, 0, 0.63, 0.05, 0.63, color) });
    parts.push({ bucket: 'cyl', index: put(sink, 'cyl', x, 0.62, z, 0, 0.63, 0.05, 0.63, color) });
    return {
      colliders: [circle(x, z, 0.33)],
      lights: [],
      destructible: {
        x, z, r: 0.45,
        breakSpeed: flammable ? 6 : 7,
        kind: flammable ? 'redBarrel' : 'barrel',
        climbable: false,
        parts,
      },
    };
  },

  /**
   * Fogata de campamento: anillo de piedras + leña cruzada. `lit` añade brasas
   * emisivas tenues y una fuente de luz 'fire' (parpadea en LampLights).
   */
  campBonfire(sink: BucketSink, x: number, z: number, lit: boolean, rng: () => number = Math.random): PropPlacement {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + rng() * 0.3;
      put(sink, 'stone', x + Math.cos(a) * 0.62, 0, z + Math.sin(a) * 0.62, a, 0.3, 0.22, 0.3, i % 2 ? 0x6b6b6b : 0x858585);
    }
    put(sink, 'box', x, 0.05, z, 0.5, 0.85, 0.13, 0.13, 0x3a2a1c);
    put(sink, 'box', x, 0.05, z, 1.9, 0.85, 0.13, 0.13, 0x33261a);
    const lights: PropPlacement['lights'] = [];
    if (lit) {
      put(sink, 'flame', x, 0.12, z, 0, 0.4, 0.5, 0.4, 0xff7a18);
      put(sink, 'flame', x, 0.12, z, 0, 0.22, 0.32, 0.22, 0xffd54a);
      lights.push({ x, y: 0.9, z, kind: 'fire' as const });
    }
    return { colliders: [circle(x, z, lit ? 0.75 : 0.6)], lights };
  },

  /** Carpa militar: cuerpo oliva + techo a dos aguas. Sólida. */
  tentMilitary(sink: BucketSink, x: number, z: number, rot: number, color: number): PropPlacement {
    put(sink, 'box', x, 0, z, rot, 3.0, 1.5, 2.4, color);
    put(sink, 'box', x, 1.5, z, rot, 3.2, 0.1, 2.6, 0x2f3519);
    const dx = Math.cos(rot);
    const dz = -Math.sin(rot);
    put(sink, 'box', x + dx * 0.75, 1.5, z + dz * 0.75, rot, 1.7, 0.75, 2.6, color, 0, 0.5);
    put(sink, 'box', x - dx * 0.75, 1.5, z - dz * 0.75, rot, 1.7, 0.75, 2.6, color, 0, -0.5);
    return {
      colliders: [makeBoxCollider(x, z, rot, 1.5, 1.2)],
      lights: [],
    };
  },

  /** Tocón de árbol talado. Sólido bajo. */
  treeStump(sink: BucketSink, x: number, z: number, s: number): PropPlacement {
    put(sink, 'cyl', x, 0, z, 0, 0.5 * s, 0.5 * s, 0.5 * s, 0x5a4128);
    put(sink, 'cyl', x, 0.42 * s, z, 0, 0.52 * s, 0.08 * s, 0.52 * s, 0x8a6a42);
    return { colliders: [circle(x, z, 0.3 * s)], lights: [] };
  },

  /** Pila de leña: 3 troncos apilados. Sin colisión (baja, se pisa por encima visualmente). */
  woodPile(sink: BucketSink, x: number, z: number, rot: number): PropPlacement {
    put(sink, 'cyl', x, 0.12, z, rot, 0.24, 0.24, 1.6, 0x4a3320, 0, Math.PI / 2);
    put(sink, 'cyl', x, 0.32, z, rot, 0.24, 0.24, 1.6, 0x3f2d1b, 0, Math.PI / 2);
    put(sink, 'cyl', x, 0.22, z, rot + 0.35, 0.22, 0.22, 1.4, 0x54391f, 0, Math.PI / 2);
    return { colliders: [], lights: [] };
  },
};

/** Estado roto de un destructible: tablones caídos (valla) o barril aplastado. */
export function brokenPropParts(
  kind: 'fence' | 'barrel' | 'redBarrel', x: number, z: number, rot: number, rng: () => number = Math.random,
): BucketItem[] {
  if (kind === 'fence') {
    return [
      { x: x + (rng() - 0.5), y: 0.02, z: z + (rng() - 0.5), rot: rot + 0.4, sx: 1.6, sy: 0.1, sz: 0.12, color: 0x4a3320, rx: 0, rz: 0.06 },
      { x: x + (rng() - 0.5), y: 0.02, z: z + (rng() - 0.5), rot: rot - 0.5, sx: 1.2, sy: 0.1, sz: 0.12, color: 0x5a4128, rx: 0, rz: -0.05 },
      { x, y: 0.02, z, rot: rot + 1.2, sx: 0.13, sy: 0.5, sz: 0.13, color: 0x4a3320, rx: 0, rz: 0.9 },
    ];
  }
  // Barril aplastado: disco bajo y oscuro (el rojo además explota al romperse).
  const c = kind === 'redBarrel' ? 0x3a1512 : 0x2b2f33;
  return [{ x, y: 0.02, z, rot, sx: 0.7, sy: 0.18, sz: 0.7, color: c, rx: 0, rz: 0 }];
}
