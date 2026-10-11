import * as THREE from 'three';
import type { BucketItem, BucketSink } from './propFactory';

/**
 * Decals y micro-detalles pegados al suelo (Y +0.02 con polygonOffset para
 * evitar Z-fighting): sangre seca, aceite, periódicos y escombro.
 */

// ---------- Geometrías y materiales compartidos (nunca se liberan) ----------

function blobGeometry(points: [number, number][]): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  return new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2);
}

/** 3 manchas irregulares reutilizables (sangre seca). */
const BLOOD_BLOBS = [
  blobGeometry([[0, 0.5], [0.35, 0.3], [0.42, -0.1], [0.2, -0.4], [-0.15, -0.35], [-0.4, -0.05], [-0.3, 0.35]]),
  blobGeometry([[0, 0.45], [0.3, 0.35], [0.5, 0], [0.25, -0.3], [0.05, -0.5], [-0.25, -0.25], [-0.45, 0.05], [-0.2, 0.4]]),
  blobGeometry([[0.1, 0.4], [0.4, 0.15], [0.3, -0.25], [-0.05, -0.4], [-0.35, -0.15], [-0.3, 0.25]]),
];

const OIL_GEO = new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2);

const MAT_BLOOD = new THREE.MeshBasicMaterial({
  color: 0x5a0d0d, transparent: true, opacity: 0.85,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
});
const MAT_OIL = new THREE.MeshBasicMaterial({
  color: 0x0b0b0e, transparent: true, opacity: 0.8,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
});

export const DECAL_Y = 0.02;

export const GroundDecals = {
  /** Mancha de sangre seca irregular (malla individual, 1 de 3 formas). */
  bloodStain(group: THREE.Group, x: number, z: number, rot: number, s: number, variant: number) {
    const mesh = new THREE.Mesh(BLOOD_BLOBS[variant % BLOOD_BLOBS.length], MAT_BLOOD);
    mesh.position.set(x, DECAL_Y, z);
    mesh.rotation.y = rot;
    mesh.scale.setScalar(s);
    mesh.receiveShadow = true;
    group.add(mesh);
  },

  /** Charco de aceite/agua sucia (malla individual). */
  oilStain(group: THREE.Group, x: number, z: number, rot: number, s: number) {
    const mesh = new THREE.Mesh(OIL_GEO, MAT_OIL);
    mesh.position.set(x, DECAL_Y, z);
    mesh.rotation.y = rot;
    mesh.scale.set(s, 1, s * 0.75);
    mesh.receiveShadow = true;
    group.add(mesh);
  },

  /** Periódico/basura en banqueta (instanciado: plano a doble cara). */
  newspaper(sink: BucketSink, x: number, z: number, rot: number, color: number) {
    sink.add('paper', { x, y: DECAL_Y + 0.005, z, rot, sx: 1, sy: 1, sz: 1, color });
  },

  /** Escombro o piedra (instanciado). Escala ~diámetro en metros. */
  rubble(sink: BucketSink, x: number, z: number, rot: number, s: number, color: number) {
    sink.add('stone', { x, y: 0, z, rot, sx: s, sy: s * 0.7, sz: s, color });
  },
};

export type DecalBucketItem = BucketItem;
