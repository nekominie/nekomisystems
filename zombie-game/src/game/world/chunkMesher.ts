import * as THREE from 'three';
import { WORLD } from './worldConfig';
import type { Car, ChunkData, GasStation, Plant, Quad, Structure, Tower, TollBooth, WorldCrate } from './types';
import { carDims, carId } from './carData';
import { STATION } from './gasStation';
import { buildCabin, type CabinRuntime } from './cabinMesh';
import { CABIN, makeBoxCollider } from './cabin';
import { circle, type Collider } from './collision';
import { createFadeMaterial } from './fadeMaterial';

/** Geometrías unitarias con la base en y=0, compartidas por todos los chunks. */
const GEO = {
  trunk: new THREE.CylinderGeometry(0.15, 0.22, 1, 6).translate(0, 0.5, 0),
  pine: new THREE.ConeGeometry(1, 1, 7).translate(0, 0.5, 0),
  oak: new THREE.IcosahedronGeometry(1, 0),
  bush: new THREE.IcosahedronGeometry(1, 0),
  grass: new THREE.ConeGeometry(0.12, 1, 4).translate(0, 0.5, 0),
  box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
  // Pirámide de base cuadrada de lado 1 alineada a los ejes.
  roof: new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
  // Rueda: cilindro con el eje a lo largo de X, centrado en el origen.
  wheel: new THREE.CylinderGeometry(0.35, 0.35, 0.26, 10).rotateZ(Math.PI / 2),
  flame: new THREE.ConeGeometry(0.5, 1, 7).translate(0, 0.5, 0),
};

const MAT_PROP = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
/** Árboles: se vuelven semitransparentes cuando quedan entre la cámara y el jugador (ver fadeMaterial.ts). */
const MAT_TREE = createFadeMaterial({ color: 0xffffff, flatShading: true, inner: 1.8, outer: 4.4, min: 0.12 });
/** Llamas de fogata: sin iluminación; el parpadeo se anima desde updateFireFx(). */
const MAT_FLAME = new THREE.MeshBasicMaterial({ color: 0xffffff });

const MAT_GROUND = new THREE.MeshLambertMaterial({ vertexColors: true });
const roadMat = (color: number) =>
  new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const MAT_ASPHALT = roadMat(0x24262b);
const MAT_DIRT_ROAD = roadMat(0x6a5236);

const C = {
  trunk: new THREE.Color(0x4a3320),
  pineA: new THREE.Color(0x1d3a22),
  pineB: new THREE.Color(0x2d5233),
  oakA: new THREE.Color(0x3c5a26),
  oakB: new THREE.Color(0x5b7a30),
  bushA: new THREE.Color(0x34501f),
  bushB: new THREE.Color(0x56702a),
  grassA: new THREE.Color(0x4f7030),
  grassB: new THREE.Color(0x7a8f3c),
};

const colorCache = new Map<number, THREE.Color>();
const col = (hex: number) => {
  let c = colorCache.get(hex);
  if (!c) colorCache.set(hex, (c = new THREE.Color(hex)));
  return c;
};

interface Inst {
  x: number;
  y: number;
  z: number;
  /** Giro Y (yaw). */
  rot: number;
  sx: number;
  sy: number;
  sz: number;
  color: THREE.Color;
  /** Inclinaciones opcionales (orden de Euler YXZ). */
  rx?: number;
  rz?: number;
  /** Orientación completa (vigas diagonales); si está, tiene prioridad sobre rot/rx/rz. */
  quat?: THREE.Quaternion;
}

const dummy = new THREE.Object3D();
dummy.rotation.order = 'YXZ';

function addInstanced(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  items: Inst[],
  castShadow = true,
  material: THREE.Material = MAT_PROP,
) {
  if (!items.length) return;
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    dummy.position.set(it.x, it.y, it.z);
    if (it.quat) dummy.quaternion.copy(it.quat);
    else dummy.rotation.set(it.rx ?? 0, it.rot, it.rz ?? 0);
    dummy.scale.set(it.sx, it.sy, it.sz);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, it.color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  group.add(mesh);
}

const lerpColor = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);

function buildGround(data: ChunkData): THREE.Mesh {
  const gc = WORLD.groundCell;
  const n = WORLD.chunkSize / gc;
  const vn = n + 1;
  const positions = new Float32Array(vn * vn * 3);
  const normals = new Float32Array(vn * vn * 3);
  let k = 0;
  for (let iz = 0; iz < vn; iz++) {
    for (let ix = 0; ix < vn; ix++) {
      positions[k] = data.originX + ix * gc;
      positions[k + 1] = 0;
      positions[k + 2] = data.originZ + iz * gc;
      normals[k + 1] = 1;
      k += 3;
    }
  }
  const indices = new Uint16Array(n * n * 6);
  let t = 0;
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const a = iz * vn + ix;
      const b = (iz + 1) * vn + ix;
      const c = a + 1;
      const d = b + 1;
      indices.set([a, b, c, b, d, c], t);
      t += 6;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(data.groundColors, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, MAT_GROUND);
  mesh.receiveShadow = true;
  mesh.userData.ownGeometry = true;
  return mesh;
}

/** Malla de cuadriláteros planos (calles, carreteras, senderos). Corrige el sentido de cada triángulo. */
function buildQuads(quads: Quad[], material: THREE.Material, y: number): THREE.Mesh | null {
  if (!quads.length) return null;
  const positions = new Float32Array(quads.length * 4 * 3);
  const normals = new Float32Array(quads.length * 4 * 3);
  const indices = new Uint32Array(quads.length * 6);

  const tri = (o: number, a: number, b: number, c: number, at: number) => {
    // Normal Y del triángulo: debe ser > 0 (cara hacia arriba)
    const xa = positions[(o + a) * 3];
    const za = positions[(o + a) * 3 + 2];
    const ny =
      (positions[(o + b) * 3 + 2] - za) * (positions[(o + c) * 3] - xa) -
      (positions[(o + b) * 3] - xa) * (positions[(o + c) * 3 + 2] - za);
    if (ny >= 0) indices.set([o + a, o + b, o + c], at);
    else indices.set([o + a, o + c, o + b], at);
  };

  quads.forEach((q, i) => {
    const o = i * 4;
    for (let v = 0; v < 4; v++) {
      positions[(o + v) * 3] = q[v * 2];
      positions[(o + v) * 3 + 1] = y;
      positions[(o + v) * 3 + 2] = q[v * 2 + 1];
      normals[(o + v) * 3 + 1] = 1;
    }
    tri(o, 0, 1, 2, i * 6);
    tri(o, 0, 2, 3, i * 6 + 3);
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.userData.ownGeometry = true;
  return mesh;
}

function plantInst(p: Plant, y: number, sx: number, sy: number, sz: number, color: THREE.Color): Inst {
  return { x: p.x, y, z: p.z, rot: p.rot, sx, sy, sz, color };
}

// ---------------------------------------------------------------------------------------------
// Utilidades para componer objetos con varias piezas (coches, torres, casetas...)
// ---------------------------------------------------------------------------------------------
interface Frame {
  x: number;
  z: number;
  rot: number;
}

/** Punto local (lx, lz) del marco -> mundo (misma rotación Y que three). */
function toWorld(f: Frame, lx: number, lz: number) {
  const c = Math.cos(f.rot);
  const s = Math.sin(f.rot);
  return { x: f.x + lx * c + lz * s, z: f.z - lx * s + lz * c };
}

/** Caja alineada con el marco; (lx, ly, lz) es el centro de su cara inferior. */
function part(
  list: Inst[],
  f: Frame,
  lx: number,
  ly: number,
  lz: number,
  sx: number,
  sy: number,
  sz: number,
  color: number,
  extra: { rx?: number; rz?: number; yaw?: number } = {},
) {
  const w = toWorld(f, lx, lz);
  list.push({ x: w.x, y: ly, z: w.z, rot: f.rot + (extra.yaw ?? 0), sx, sy, sz, color: col(color), rx: extra.rx, rz: extra.rz });
}

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
/** Viga entre dos puntos del mundo (caja delgada de lado `t`). */
function beam(list: Inst[], a: THREE.Vector3, b: THREE.Vector3, t: number, color: number) {
  _dir.subVectors(b, a);
  const len = _dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, _dir.normalize());
  list.push({ x: a.x, y: a.y, z: a.z, rot: 0, sx: t, sy: len, sz: t, color: col(color), quat: q });
}

// ---------------------------------------------------------------------------------------------
// Carros
// ---------------------------------------------------------------------------------------------
const GLASS = 0x1c2833;
const TIRE = 0x151515;

function buildCar(car: Car, boxes: Inst[], wheels: Inst[]) {
  const wreck = car.kind === 'wreck';
  const { L, W, bodyH, bodyY, cabL, cabW, cabH, cabZ } = carDims(car.kind);
  const j = car.j;

  if (wreck) {
    // Chasis dañado: carrocería ladeada y cabina aplastada/desplazada
    part(boxes, car, 0, bodyY, 0, W, bodyH, L, car.color, { rz: (j[0] - 0.5) * 0.3, rx: (j[1] - 0.5) * 0.12 });
    part(boxes, car, (j[2] - 0.5) * 0.4, bodyY + bodyH * 0.9, cabZ + (j[3] - 0.5) * 0.5, cabW, cabH * 0.55, cabL * 0.9, 0x15181c, {
      rz: (j[3] - 0.5) * 0.7,
      yaw: (j[2] - 0.5) * 0.3,
    });
    part(boxes, car, 0, bodyY + bodyH * 0.9 + cabH * 0.45, cabZ, cabW + 0.04, 0.06, cabL * 0.9, car.color, { rz: (j[3] - 0.5) * 0.7 });
    // Solo conserva algunas ruedas
    const slots: [number, number][] = [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ];
    slots.forEach(([sx, sz], i) => {
      if ((j[i] ?? 0.5) < 0.45) return;
      const w = toWorld(car, sx * (W / 2), sz * L * 0.31);
      wheels.push({ x: w.x, y: 0.35, z: w.z, rot: car.rot, sx: 1, sy: 1, sz: 1, color: col(TIRE) });
    });
    return;
  }

  part(boxes, car, 0, bodyY, 0, W, bodyH, L, car.color);
  part(boxes, car, 0, bodyY + bodyH, cabZ, cabW, cabH, cabL, GLASS);
  part(boxes, car, 0, bodyY + bodyH + cabH, cabZ, cabW + 0.04, 0.06, cabL + 0.04, car.color);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const w = toWorld(car, sx * (W / 2 - 0.02), sz * L * 0.31);
      wheels.push({ x: w.x, y: 0.35, z: w.z, rot: car.rot, sx: 1, sy: 1, sz: 1, color: col(TIRE) });
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Gasolineras
// ---------------------------------------------------------------------------------------------
function buildStation(st: GasStation, boxes: Inst[], colliders: Collider[]) {
  const f: Frame = { x: st.x, z: st.z, rot: 0 };
  const S = STATION;

  // Tienda de conveniencia con techo plano, banda roja y ventanal
  const sc = S.store;
  part(boxes, f, sc.cx, 0, sc.cz, sc.w, sc.h, sc.d, 0xe5e7eb);
  part(boxes, f, sc.cx, sc.h, sc.cz, sc.w + 1, 0.35, sc.d + 1, 0x9b1c1c);
  part(boxes, f, sc.cx, 2.9, sc.cz + sc.d / 2 + 0.02, sc.w + 0.04, 0.5, 0.06, 0xc0262d);
  part(boxes, f, sc.cx - 2, 0.8, sc.cz + sc.d / 2 + 0.02, 6, 1.5, 0.06, GLASS);
  part(boxes, f, sc.cx + 3.5, 0, sc.cz + sc.d / 2 + 0.02, 1.8, 2.2, 0.06, 0x2a2d31);
  colliders.push(makeBoxCollider(st.x + sc.cx, st.z + sc.cz, 0, sc.w / 2, sc.d / 2));

  // Marquesina sobre las islas, con sus pilares
  const cp = S.canopy;
  for (const [px, pz] of S.pillars) {
    part(boxes, f, px, 0, pz, 0.5, cp.y, 0.5, 0xdddddd);
    colliders.push(circle(st.x + px, st.z + pz, 0.32));
  }
  part(boxes, f, cp.cx, cp.y, cp.cz, cp.w, 0.5, cp.d, 0xf3f4f6);
  part(boxes, f, cp.cx, cp.y + 0.5, cp.cz, cp.w + 0.02, 0.15, cp.d + 0.02, 0xc0262d);

  // Islas y bombas (pantalla a ambos lados)
  for (const ix of S.islandX) part(boxes, f, ix, 0, S.islandZ, 1.4, 0.2, 6.6, 0x9a9a9a);
  for (const [lx, lz] of S.pumps) {
    part(boxes, f, lx, 0.2, lz, 0.7, 1.5, 0.5, 0xc0262d);
    part(boxes, f, lx, 1.7, lz, 0.74, 0.2, 0.54, 0xf1f1f1);
    for (const s of [-1, 1]) part(boxes, f, lx + s * 0.36, 1.0, lz, 0.05, 0.35, 0.4, GLASS);
    colliders.push(makeBoxCollider(st.x + lx, st.z + lz, 0, 0.4, 0.3));
  }

  // Letrero alto en la esquina de la manzana
  part(boxes, f, S.sign.x, 0, S.sign.z, 0.4, 8, 0.4, 0x888888);
  part(boxes, f, S.sign.x, 8, S.sign.z, 3.2, 1.8, 0.3, 0xfacc15);
  part(boxes, f, S.sign.x, 9.8, S.sign.z, 3.2, 0.35, 0.3, 0xc0262d);
  colliders.push(circle(st.x + S.sign.x, st.z + S.sign.z, 0.3));
}

// ---------------------------------------------------------------------------------------------
// Casetas de cobro
// ---------------------------------------------------------------------------------------------
function buildToll(t: TollBooth, boxes: Inst[]) {
  // Marco local: +Z a lo largo de la carretera, X cruza la calzada (calzada de 7 m, 2 carriles)
  part(boxes, t, 0, 0, 0, 1.6, 2.5, 2.4, 0xb0b4b8); // cabina central
  part(boxes, t, 0, 1.0, 1.21, 1.2, 0.9, 0.05, GLASS); // ventanilla frontal
  part(boxes, t, 0, 1.0, -1.21, 1.2, 0.9, 0.05, GLASS);
  part(boxes, t, 0, 2.5, 0, 2.2, 0.2, 3.0, 0x6b6e72); // techo de la cabina
  // Pilares y marquesina sobre toda la calzada
  for (const sx of [-1, 1]) part(boxes, t, sx * 4.4, 0, 0, 0.5, 4.6, 0.5, 0x9a9a9a);
  part(boxes, t, 0, 4.6, 0, 9.8, 0.5, 3.4, 0xd0d0d0);
  part(boxes, t, 0, 5.1, 0, 9.8, 0.12, 3.4, 0xb91c1c);
  // Barreras a rayas rojas y blancas hacia cada carril
  for (const side of [-1, 1]) {
    part(boxes, t, side * 1.0, 0, 1.0, 0.16, 1.1, 0.16, 0x444444);
    for (let k = 0; k < 5; k++) {
      part(boxes, t, side * (1.1 + (k + 0.5) * 0.46), 1.05, 1.0, 0.46, 0.1, 0.1, k % 2 ? 0xf1f1f1 : 0xc0262d);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Torres de guardabosques
// ---------------------------------------------------------------------------------------------
function buildTower(t: Tower, boxes: Inst[], roofs: Inst[]) {
  const H = t.height;
  const WOOD = 0x6b4a2f;
  const DARK = 0x4a3322;
  const base = 2.1;
  const top = 1.35;
  const half = (y: number) => base + (top - base) * (y / H);
  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];
  /** Punto del mundo sobre el cuadrado de la torre a altura y (esquina c, desplazamiento opcional). */
  const P = (c: [number, number], y: number) => {
    const w = toWorld(t, c[0] * half(y), c[1] * half(y));
    return new THREE.Vector3(w.x, y, w.z);
  };
  const L = (lx: number, y: number, lz: number) => {
    const w = toWorld(t, lx, lz);
    return new THREE.Vector3(w.x, y, w.z);
  };

  // Patas, anillos horizontales y diagonales en cruz
  for (const c of corners) beam(boxes, P(c, 0), P(c, H), 0.3, WOOD);
  const levels = [0, H * 0.36, H * 0.68, H];
  for (let b = 1; b < levels.length; b++) {
    for (let i = 0; i < 4; i++) {
      const a = corners[i];
      const c = corners[(i + 1) % 4];
      if (b < 3) beam(boxes, P(a, levels[b]), P(c, levels[b]), 0.16, DARK);
      beam(boxes, P(a, levels[b - 1]), P(c, levels[b]), 0.12, DARK);
      beam(boxes, P(c, levels[b - 1]), P(a, levels[b]), 0.12, DARK);
    }
  }

  // Plataforma, barandas y caseta con techo
  part(boxes, t, 0, H, 0, 3.4, 0.25, 3.4, 0x7a5a3a);
  const deck = H + 0.25;
  part(boxes, t, 0, deck, 0, 2.2, 1.9, 2.2, 0x4a5d3a);
  roofs.push({ x: t.x, y: deck + 1.9, z: t.z, rot: t.rot, sx: 3.1, sy: 1.2, sz: 3.1, color: col(0x2f2f2a) });
  for (const [px, pz] of [
    [-1.6, -1.6],
    [1.6, -1.6],
    [1.6, 1.6],
    [-1.6, 1.6],
  ])
    part(boxes, t, px, deck, pz, 0.1, 0.95, 0.1, WOOD);
  for (const s of [-1, 1]) {
    part(boxes, t, 0, deck + 0.9, s * 1.6, 3.2, 0.07, 0.07, WOOD);
    part(boxes, t, s * 1.6, deck + 0.9, 0, 0.07, 0.07, 3.2, WOOD);
  }

  // Escalera en la cara +Z
  for (const lx of [-0.4, 0.4]) beam(boxes, L(lx, 0, half(0) + 0.15), L(lx, H, half(H) + 0.15), 0.08, WOOD);
  for (let y = 0.6; y < H - 0.3; y += 0.55) part(boxes, t, 0, y, half(y) + 0.15, 0.8, 0.06, 0.06, WOOD);
}

// ---------------------------------------------------------------------------------------------
// Efectos de fuego (llamas y halos) compartidos
// ---------------------------------------------------------------------------------------------
let fireHalo: THREE.SpriteMaterial | null = null;
function fireHaloMaterial(): THREE.SpriteMaterial {
  if (!fireHalo) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,170,70,1)');
    grad.addColorStop(0.4, 'rgba(255,120,40,0.3)');
    grad.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    fireHalo = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
      opacity: 0.4,
    });
  }
  return fireHalo;
}

/** Parpadeo de las llamas y halo de las fogatas (más intenso de noche). Llamar cada frame. */
export function updateFireFx(timeSec: number, night: number) {
  const flicker = 0.82 + 0.12 * Math.sin(timeSec * 17) + 0.06 * Math.sin(timeSec * 31 + 1.7);
  MAT_FLAME.color.setScalar(flicker);
  fireHaloMaterial().opacity = (0.22 + 0.5 * night) * flicker;
}

// ---------------------------------------------------------------------------------------------
// Cajas de campamento
// ---------------------------------------------------------------------------------------------
const CRATE_CLOSED = 0x8a6a3b;
const CRATE_OPEN = 0x4a3a22;

export interface CrateRuntime {
  data: WorldCrate;
  mat: THREE.MeshLambertMaterial;
}

export function setWorldCrateOpened(c: CrateRuntime) {
  c.mat.color.setHex(CRATE_OPEN);
}

// ---------------------------------------------------------------------------------------------

export interface ChunkObject {
  group: THREE.Group;
  cabins: CabinRuntime[];
  crates: CrateRuntime[];
  /** Fogatas (posición mundial de la llama), para asignarles luces. */
  fires: { x: number; y: number; z: number }[];
  /** Carros estáticos que siguen en su sitio (los que alguien ya reclamó se dibujan aparte). */
  cars: Car[];
  /** Gasolineras cuyo centro cae en este chunk. */
  stations: GasStation[];
  /**
   * Hitboxes de todo lo sólido (todo menos arbustos y pasto): árboles, cabañas, casas, edificios, carros,
   * torres, tiendas, casetas, fogatas, postes de lámpara y cajas.
   */
  colliders: Collider[];
}

/** Convierte los datos puros de un chunk en un THREE.Group listo para añadir a la escena. */
export function buildChunkObject(data: ChunkData, claimedCars: ReadonlySet<string> = new Set()): ChunkObject {
  const group = new THREE.Group();
  const cabins: CabinRuntime[] = [];
  const crates: CrateRuntime[] = [];
  const colliders: Collider[] = [];
  const fires: ChunkObject['fires'] = [];

  group.add(buildGround(data));
  const asphalt = buildQuads(data.roadQuads, MAT_ASPHALT, 0.05);
  if (asphalt) group.add(asphalt);
  const dirtRoads = buildQuads(data.dirtQuads, MAT_DIRT_ROAD, 0.045);
  if (dirtRoads) group.add(dirtRoads);

  // Árboles: tronco + copa (pino = cono, roble = icosaedro)
  const trunks: Inst[] = [];
  const pines: Inst[] = [];
  const oaks: Inst[] = [];
  for (const t of data.trees) {
    const s = t.scale;
    colliders.push(circle(t.x, t.z, 0.28 * s)); // el tronco es sólido; las copas no
    trunks.push(plantInst(t, 0, s, 2.6 * s, s, C.trunk));
    if (t.kind === 'pine') {
      pines.push(plantInst(t, 1.4 * s, 1.7 * s, 5.2 * s, 1.7 * s, lerpColor(C.pineA, C.pineB, t.tone)));
    } else {
      oaks.push(plantInst(t, 3.3 * s, 1.9 * s, 1.6 * s, 1.9 * s, lerpColor(C.oakA, C.oakB, t.tone)));
    }
  }
  addInstanced(group, GEO.trunk, trunks, true, MAT_TREE);
  addInstanced(group, GEO.pine, pines, true, MAT_TREE);
  addInstanced(group, GEO.oak, oaks, true, MAT_TREE);

  const stones: Inst[] = data.bushes.map((b) =>
    plantInst(b, 0.35 * b.scale, b.scale, 0.7 * b.scale, b.scale, lerpColor(C.bushA, C.bushB, b.tone)),
  );
  addInstanced(
    group,
    GEO.grass,
    data.grass.map((g) => plantInst(g, 0, g.scale, 0.55 * g.scale, g.scale, lerpColor(C.grassA, C.grassB, g.tone))),
    false, // el pasto no proyecta sombra (costo/beneficio)
  );

  // Piezas de caja (edificios, casas, carros, torres, casetas...) y techos piramidales
  const bodies: Inst[] = [];
  const roofs: Inst[] = [];
  const wheels: Inst[] = [];
  const flames: Inst[] = [];

  for (const s of data.structures as Structure[]) {
    if (s.kind === 'cabin') {
      // Las cabañas son huecas, con puerta y se desvanecen frente a la cámara (ver cabinMesh.ts)
      const rt = buildCabin(s, GEO.box, GEO.roof);
      group.add(rt.group);
      cabins.push(rt);
      colliders.push(rt.collider);
      for (const l of rt.lamps) colliders.push(circle(l.x, l.z, 0.12)); // postes de las lámparas
      continue;
    }
    // Casas y edificios: bloques sólidos (sin interior)
    colliders.push(makeBoxCollider(s.x, s.z, s.rot, s.w / 2, s.d / 2));
    bodies.push({ x: s.x, y: 0, z: s.z, rot: s.rot, sx: s.w, sy: s.h, sz: s.d, color: col(s.wallColor) });
    if (s.roofH > 0) {
      roofs.push({ x: s.x, y: s.h, z: s.z, rot: s.rot, sx: s.w + 0.8, sy: s.roofH, sz: s.d + 0.8, color: col(s.roofColor) });
    }
  }

  // Carros estáticos (los ya reclamados por el jugador son objetos dinámicos aparte: ver vehicles.ts)
  const cars = data.cars.filter((c) => !claimedCars.has(carId(c)));
  for (const car of cars) {
    buildCar(car, bodies, wheels);
    const d = carDims(car.kind);
    colliders.push(makeBoxCollider(car.x, car.z, car.rot, d.W / 2, d.L / 2));
  }
  for (const st of data.stations) buildStation(st, bodies, colliders);
  for (const t of data.tolls) {
    buildToll(t, bodies);
    // Cabina central y pilares de la marquesina (las barreras no bloquean, para no cortar la carretera a pie)
    colliders.push(makeBoxCollider(t.x, t.z, t.rot, 0.8, 1.2));
    for (const sx of [-1, 1]) {
      const p = toWorld(t, sx * 4.4, 0);
      colliders.push(circle(p.x, p.z, 0.3));
    }
  }
  for (const tw of data.towers) {
    buildTower(tw, bodies, roofs);
    // Cuatro patas (la base mide ~4.2 m de lado)
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      const p = toWorld(tw, sx * 2.1, sz * 2.1);
      colliders.push(circle(p.x, p.z, 0.3));
    }
  }

  // Campamento: tiendas de campaña (base cuadrada sólida)
  for (const t of data.tents) {
    colliders.push(makeBoxCollider(t.x, t.z, t.rot, t.size * 0.42, t.size * 0.42));
    roofs.push({ x: t.x, y: 0, z: t.z, rot: t.rot, sx: t.size, sy: t.height, sz: t.size, color: col(t.color) });
  }

  // Campamento: fogatas (piedras en anillo, troncos, llamas y halo)
  const halo = fireHaloMaterial();
  for (const f of data.fires) {
    colliders.push(circle(f.x, f.z, 0.75)); // anillo de piedras y llamas
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      stones.push({
        x: f.x + Math.cos(a) * 0.68,
        y: 0.05,
        z: f.z + Math.sin(a) * 0.68,
        rot: a,
        sx: 0.17,
        sy: 0.13,
        sz: 0.17,
        color: col(i % 2 ? 0x6b6b6b : 0x858585),
      });
    }
    const fr: Frame = { x: f.x, z: f.z, rot: 0 };
    part(bodies, fr, 0, 0.05, 0, 0.95, 0.13, 0.15, 0x3a2a1c, { yaw: 0.5 });
    part(bodies, fr, 0, 0.05, 0, 0.95, 0.13, 0.15, 0x33261a, { yaw: 1.9 });
    flames.push({ x: f.x, y: 0.12, z: f.z, rot: 0, sx: 0.55, sy: 1.2, sz: 0.55, color: col(0xff7a18) });
    flames.push({ x: f.x, y: 0.12, z: f.z, rot: 0, sx: 0.3, sy: 0.8, sz: 0.3, color: col(0xffd54a) });

    const sprite = new THREE.Sprite(halo);
    sprite.position.set(f.x, 0.8, f.z);
    sprite.scale.set(7, 7, 1);
    group.add(sprite);
    fires.push({ x: f.x, y: 0.9, z: f.z });
  }

  // Cajas de botín sueltas (campamentos): malla propia para marcarlas como abiertas + hitbox
  for (const c of data.crates) {
    const mat = new THREE.MeshLambertMaterial({ color: CRATE_CLOSED });
    const mesh = new THREE.Mesh(GEO.box, mat);
    mesh.position.set(c.x, 0, c.z);
    mesh.rotation.y = c.rot;
    mesh.scale.set(CABIN.crateSize, CABIN.crateH, CABIN.crateSize);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.ownMaterial = true;
    group.add(mesh);
    crates.push({ data: c, mat });
    colliders.push(makeBoxCollider(c.x, c.z, c.rot, CABIN.crateSize / 2, CABIN.crateSize / 2));
  }

  addInstanced(group, GEO.bush, stones);
  addInstanced(group, GEO.box, bodies);
  addInstanced(group, GEO.roof, roofs);
  addInstanced(group, GEO.wheel, wheels);
  addInstanced(group, GEO.flame, flames, false, MAT_FLAME);

  return { group, cabins, crates, fires, cars, stations: data.stations, colliders };
}

export function disposeChunkObject(group: THREE.Group) {
  group.traverse((o) => {
    if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    else if ((o as THREE.Mesh).isMesh) {
      const mesh = o as THREE.Mesh;
      if (o.userData.ownGeometry) mesh.geometry.dispose();
      if (o.userData.ownMaterial) (mesh.material as THREE.Material).dispose();
    }
  });
}
