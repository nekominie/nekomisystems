import * as THREE from 'three';
import { CABIN, cabinLocalToWorld, cabinWallBoxes, makeCabinCollider, type CabinCollider } from './cabin';
import { createFadeMaterial } from './fadeMaterial';
import type { Structure } from './types';

const MAT_FLOOR = new THREE.MeshLambertMaterial({ color: 0x5b4630 });
const CRATE_CLOSED = 0x8a6a3b;
const CRATE_OPEN = 0x4a3a22;

// Paredes y techo se desvanecen cuando quedan entre la cámara y el jugador (radio mayor que los
// árboles porque la cabaña es grande). Se comparten por color entre todas las cabañas.
const FADE = { inner: 3.5, outer: 6.5, min: 0.15 };
const wallMats = new Map<number, THREE.MeshLambertMaterial>();
const roofMats = new Map<number, THREE.MeshLambertMaterial>();

function wallMaterial(color: number) {
  let m = wallMats.get(color);
  if (!m) wallMats.set(color, (m = createFadeMaterial({ color, ...FADE })));
  return m;
}
function roofMaterial(color: number) {
  let m = roofMats.get(color);
  if (!m) roofMats.set(color, (m = createFadeMaterial({ color, flatShading: true, ...FADE })));
  return m;
}

// --- Lámparas de la entrada: 2 a cada lado de la puerta ---
// Geometría y materiales compartidos por todas las lámparas; el brillo se controla con setLampLevel().
const LAMP = {
  postGeo: new THREE.CylinderGeometry(0.05, 0.07, 1.7, 6).translate(0, 0.85, 0),
  bulbGeo: new THREE.SphereGeometry(0.13, 10, 8),
  postMat: new THREE.MeshLambertMaterial({ color: 0x2a2a2e }),
  bulbMat: new THREE.MeshBasicMaterial({ color: 0x4a4436 }),
  height: 1.75,
  /** Distancias laterales al eje de la puerta (primera y segunda lámpara de cada lado). */
  offsets: [CABIN.doorW / 2 + 0.55, CABIN.doorW / 2 + 1.7],
  frontGap: 0.55,
  bulbOff: new THREE.Color(0x4a4436),
  bulbOn: new THREE.Color(0xffe2a0),
  haloMat: null as THREE.SpriteMaterial | null,
};

function haloMaterial(): THREE.SpriteMaterial {
  if (!LAMP.haloMat) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,214,140,1)');
    grad.addColorStop(0.35, 'rgba(255,190,100,0.35)');
    grad.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    LAMP.haloMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
      opacity: 0,
    });
    LAMP.haloMat.visible = false;
  }
  return LAMP.haloMat;
}

/** 0 = apagadas (día), 1 = encendidas (noche). Afecta a todas las lámparas a la vez. */
export function setLampLevel(f: number) {
  LAMP.bulbMat.color.copy(LAMP.bulbOff).lerp(LAMP.bulbOn, f);
  const halo = haloMaterial();
  halo.opacity = 0.85 * f;
  halo.visible = f > 0.01;
}

export interface CabinRuntime {
  data: Structure;
  group: THREE.Group;
  collider: CabinCollider;
  crateMat?: THREE.MeshLambertMaterial;
  /** Posición mundial de cada bombilla (para asignar las PointLight cercanas). */
  lamps: { x: number; y: number; z: number }[];
}

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, castShadow = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

/**
 * Cabaña con paredes huecas, hueco de puerta en el frente (+Z local), piso, techo y
 * (opcional) caja de botín.
 */
export function buildCabin(s: Structure, boxGeo: THREE.BufferGeometry, roofGeo: THREE.BufferGeometry): CabinRuntime {
  const group = new THREE.Group();
  group.position.set(s.x, 0, s.z);
  group.rotation.y = s.rot;

  const wallMat = wallMaterial(s.wallColor);
  for (const b of cabinWallBoxes(s)) {
    const m = mesh(boxGeo, wallMat);
    m.position.set(b.cx, 0, b.cz);
    m.scale.set(b.hw * 2, s.h, b.hd * 2);
    group.add(m);
  }
  // Dintel sobre la puerta
  const lintel = mesh(boxGeo, wallMat);
  lintel.position.set(0, CABIN.doorH, s.d / 2);
  lintel.scale.set(CABIN.doorW, s.h - CABIN.doorH, CABIN.wallT);
  group.add(lintel);

  // Piso interior
  const floor = mesh(boxGeo, MAT_FLOOR, false);
  floor.scale.set(s.w, CABIN.floorH, s.d);
  group.add(floor);

  // Techo
  const roof = mesh(roofGeo, roofMaterial(s.roofColor));
  roof.position.set(0, s.h, 0);
  roof.scale.set(s.w + 0.8, s.roofH, s.d + 0.8);
  group.add(roof);

  // Caja de botín (material propio para poder marcarla como abierta)
  let crateMat: THREE.MeshLambertMaterial | undefined;
  if (s.crate) {
    crateMat = new THREE.MeshLambertMaterial({ color: CRATE_CLOSED });
    const crate = mesh(boxGeo, crateMat);
    crate.userData.ownMaterial = true;
    crate.position.set(s.crate.lx, CABIN.floorH, s.crate.lz);
    crate.scale.set(CABIN.crateSize, CABIN.crateH, CABIN.crateSize);
    group.add(crate);
  }

  // Lámparas: 2 a cada lado de la puerta, frente a la fachada (+Z local)
  const lamps: CabinRuntime['lamps'] = [];
  const halo = haloMaterial();
  for (const side of [-1, 1]) {
    for (const off of LAMP.offsets) {
      const lx = side * off;
      const lz = s.d / 2 + LAMP.frontGap;
      const post = new THREE.Mesh(LAMP.postGeo, LAMP.postMat);
      post.position.set(lx, 0, lz);
      const bulb = new THREE.Mesh(LAMP.bulbGeo, LAMP.bulbMat);
      bulb.position.set(lx, LAMP.height, lz);
      const sprite = new THREE.Sprite(halo);
      sprite.position.set(lx, LAMP.height, lz);
      sprite.scale.set(2.4, 2.4, 1);
      group.add(post, bulb, sprite);
      const w = cabinLocalToWorld(s, lx, lz);
      lamps.push({ x: w.x, y: LAMP.height, z: w.z });
    }
  }

  return { data: s, group, collider: makeCabinCollider(s), crateMat, lamps };
}

export function setCrateOpened(rt: CabinRuntime) {
  rt.crateMat?.color.setHex(CRATE_OPEN);
}
