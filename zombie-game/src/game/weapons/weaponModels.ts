import * as THREE from 'three';
import type { WeaponDef, WeaponId } from './weaponTypes';
import { getWeaponDef, WEAPON_IDS } from './weaponDefs';

/**
 * Modelos de armas hechos con primitivas (sin assets). Convención: el cañón / la punta apunta a +Z,
 * el origen está en el centro del arma y las unidades son metros (tamaño real aproximado).
 * Los materiales se comparten entre todas las instancias.
 */
const mats = new Map<number, THREE.MeshLambertMaterial>();
const mat = (c: number) => {
  let m = mats.get(c);
  if (!m) mats.set(c, (m = new THREE.MeshLambertMaterial({ color: c, flatShading: true })));
  return m;
};

const METAL = 0x2b2f35;
const DARK = 0x1a1c20;
const WOOD = 0x7a5230;
const WOOD_LIGHT = 0xb08a5a;

/** Geometrías compartidas por dimensiones: crear/destruir drops no deja geometría huérfana en la GPU. */
const geos = new Map<string, THREE.BufferGeometry>();
const shared = (key: string, make: () => THREE.BufferGeometry) => {
  let g = geos.get(key);
  if (!g) geos.set(key, (g = make()));
  return g;
};

function box(g: THREE.Group, w: number, h: number, l: number, x: number, y: number, z: number, color: number, rotX = 0) {
  const m = new THREE.Mesh(shared(`b${w},${h},${l}`, () => new THREE.BoxGeometry(w, h, l)), mat(color));
  m.position.set(x, y, z);
  m.rotation.x = rotX;
  m.castShadow = true;
  g.add(m);
}

/** Cilindro a lo largo de Z (rTop hacia +Z). */
function cyl(g: THREE.Group, rTop: number, rBottom: number, len: number, x: number, y: number, z: number, color: number) {
  const geo = shared(`c${rTop},${rBottom},${len}`, () => new THREE.CylinderGeometry(rTop, rBottom, len, 10).rotateX(Math.PI / 2));
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
}

const builders: Record<string, (g: THREE.Group) => void> = {
  [WEAPON_IDS.bat]: (g) => {
    cyl(g, 0.05, 0.02, 0.9, 0, 0, 0, WOOD_LIGHT); // cabeza gruesa hacia delante
    cyl(g, 0.024, 0.024, 0.22, 0, 0, -0.34, DARK); // empuñadura
  },
  [WEAPON_IDS.pistol]: (g) => {
    box(g, 0.05, 0.06, 0.22, 0, 0.02, 0.02, METAL); // corredera
    box(g, 0.04, 0.045, 0.1, 0, -0.012, 0.0, DARK); // armazón
    box(g, 0.045, 0.11, 0.055, 0, -0.07, -0.07, DARK, -0.2); // empuñadura
    cyl(g, 0.012, 0.012, 0.05, 0, 0.02, 0.15, DARK); // boca
  },
  [WEAPON_IDS.shotgun]: (g) => {
    cyl(g, 0.02, 0.02, 0.75, 0, 0.035, 0.28, METAL); // cañón
    cyl(g, 0.017, 0.017, 0.6, 0, -0.012, 0.22, DARK); // tubo del cargador
    box(g, 0.06, 0.075, 0.18, 0, 0.0, 0.22, WOOD, 0); // guardamano (bomba)
    box(g, 0.055, 0.09, 0.26, 0, 0.0, -0.05, METAL); // receptor
    box(g, 0.05, 0.1, 0.34, 0, -0.01, -0.35, WOOD, 0.08); // culata
  },
  [WEAPON_IDS.assaultRifle]: (g) => {
    box(g, 0.06, 0.09, 0.4, 0, 0.0, 0.0, METAL); // receptor
    cyl(g, 0.014, 0.014, 0.34, 0, 0.02, 0.36, DARK); // cañón
    box(g, 0.05, 0.06, 0.2, 0, 0.0, 0.26, DARK); // guardamano
    box(g, 0.04, 0.17, 0.07, 0, -0.12, 0.04, DARK, 0.18); // cargador curvo
    box(g, 0.045, 0.1, 0.1, 0, -0.08, -0.1, DARK, -0.25); // empuñadura
    box(g, 0.05, 0.09, 0.28, 0, -0.01, -0.32, DARK, 0.06); // culata
    box(g, 0.02, 0.03, 0.04, 0, 0.065, 0.12, DARK); // mira
  },
  [WEAPON_IDS.huntingRifle]: (g) => {
    cyl(g, 0.014, 0.017, 0.7, 0, 0.03, 0.4, METAL); // cañón largo
    box(g, 0.055, 0.085, 0.3, 0, 0.0, -0.02, METAL); // receptor
    box(g, 0.05, 0.1, 0.5, 0, -0.025, -0.34, WOOD, 0.05); // culata de madera
    box(g, 0.05, 0.06, 0.3, 0, -0.03, 0.2, WOOD); // guardamano de madera
    cyl(g, 0.024, 0.024, 0.26, 0, 0.1, 0.0, DARK); // mira telescópica
    cyl(g, 0.03, 0.026, 0.05, 0, 0.1, 0.15, DARK); // lente frontal
    box(g, 0.03, 0.03, 0.03, 0.05, 0.03, -0.02, METAL); // palanca del cerrojo
  },
};

/** Fallback visual para armas registradas que aún no tienen modelo propio. */
const generic = (g: THREE.Group) => {
  box(g, 0.05, 0.07, 0.4, 0, 0, 0, METAL);
  box(g, 0.04, 0.09, 0.07, 0, -0.07, -0.1, DARK);
};

// ---------- Modelos data-driven (buildWeaponMesh) ----------

/** Materiales estándar compartidos por color (evita cientos de materiales huérfanos en la GPU). */
const stdMats = new Map<number, THREE.MeshStandardMaterial>();
function stdMat(color: number): THREE.MeshStandardMaterial {
  let m = stdMats.get(color);
  if (!m) stdMats.set(color, (m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 })));
  return m;
}

/** Geometrías compartidas por dimensiones (crear/destruir drops no deja geometría huérfana). */
const stdGeos = new Map<string, THREE.BufferGeometry>();
function stdBoxGeo(w: number, h: number, l: number): THREE.BufferGeometry {
  const key = `pb${w},${h},${l}`;
  let g = stdGeos.get(key);
  if (!g) stdGeos.set(key, (g = new THREE.BoxGeometry(w, h, l)));
  return g;
}
function stdCylGeo(rTop: number, rBottom: number, len: number, seg = 12): THREE.BufferGeometry {
  const key = `pc${rTop},${rBottom},${len},${seg}`;
  let g = stdGeos.get(key);
  if (!g) stdGeos.set(key, (g = new THREE.CylinderGeometry(rTop, rBottom, len, seg)));
  return g;
}

/**
 * Construye la malla 3D de un arma desde su `proceduralModel` declarativo:
 * recorre `parts`, crea Box/Cylinder según `type`, aplica color, posición y
 * rotación, y devuelve el grupo con sombras activas, listo para anclarse a la
 * mano del jugador o colocarse en el suelo como loot. Convención heredada del
 * motor: el cañón / la punta apunta a +Z con el origen al centro del arma.
 */
export function buildWeaponMesh(def: WeaponDef): THREE.Group {
  const root = new THREE.Group();
  // Las armas cuerpo a cuerpo del dataset vienen modeladas en vertical (+Y,
  // mango abajo y filo arriba); se rotan a la convención +Z del motor para
  // que el ancla de la mano (ajustada con el bate) las oriente igual.
  const inner = new THREE.Group();
  root.add(inner);
  if (def.category === 'melee') inner.rotation.x = Math.PI / 2;

  for (const part of def.proceduralModel?.parts ?? []) {
    let mesh: THREE.Mesh;
    if (part.type === 'box') {
      const [w, h, l] = part.dims;
      mesh = new THREE.Mesh(stdBoxGeo(w, h, l), stdMat(part.color));
    } else {
      const [rTop, rBottom, len, seg] = part.dims;
      mesh = new THREE.Mesh(stdCylGeo(rTop, rBottom, len, seg ?? 12), stdMat(part.color));
    }
    if (part.offset) mesh.position.set(part.offset[0], part.offset[1], part.offset[2]);
    if (part.rot) mesh.rotation.set(part.rot[0], part.rot[1], part.rot[2]);
    mesh.castShadow = true;
    inner.add(mesh);
  }
  return root;
}

export function createWeaponModel(id: WeaponId): THREE.Group {
  const def = getWeaponDef(id);
  // Las armas con modelo declarativo se generan por datos; el resto conserva
  // sus constructores heredados (las 5 originales) o el genérico.
  if (def?.proceduralModel) return buildWeaponMesh(def);
  const g = new THREE.Group();
  (builders[id] ?? generic)(g);
  return g;
}
