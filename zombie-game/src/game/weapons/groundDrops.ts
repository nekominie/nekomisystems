import * as THREE from 'three';
import { createWeaponModel } from './weaponModels';
import type { WeaponId } from './weaponTypes';
import type { WeaponItem } from './arsenal';

/** Un arma en el suelo (datos): posición, tipo y, si la soltó el jugador, su munición. */
export interface DropSpawn extends WeaponItem {
  id: string;
  x: number;
  z: number;
}

interface DropEntity {
  spawn: DropSpawn;
  group: THREE.Group;
  model: THREE.Group;
  /** Caja de proximidad en coordenadas del mundo (se compara con la posición del jugador). */
  box: THREE.Box3;
  phase: number;
}

const FLOAT_HEIGHT = 0.6;
const BOB_AMPLITUDE = 0.09;
const SPIN_SPEED = 1.1;
/** Distancia máxima (m) del jugador a la caja del arma para poder recogerla. */
export const PICKUP_RANGE = 1.5;

const RING_GEO = new THREE.RingGeometry(0.42, 0.55, 28).rotateX(-Math.PI / 2);
const RING_MAT = new THREE.MeshBasicMaterial({
  color: 0xffd84a,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  fog: false,
});

/**
 * Armas tiradas en el suelo: modelo visible que flota y gira suavemente sobre un aro luminoso, con
 * una `Box3` de proximidad para detectar al jugador. Las de un chunk nacen/mueren con él; las que
 * suelta el jugador son "dinámicas" y persisten. Lo ya recogido no reaparece al recargar el chunk.
 */
export class GroundDropManager {
  private byChunk = new Map<string, DropEntity[]>();
  private dynamic: DropEntity[] = [];
  private taken = new Set<string>();
  private counter = 0;

  constructor(private scene: THREE.Scene) {}

  private create(spawn: DropSpawn): DropEntity {
    const group = new THREE.Group();
    group.position.set(spawn.x, 0, spawn.z);

    const model = createWeaponModel(spawn.weapon);
    model.scale.setScalar(1.25);
    model.position.y = FLOAT_HEIGHT;
    // Tumbada: el modelo apunta a +Z; se inclina un poco para que se vea desde arriba
    model.rotation.x = -0.25;
    group.add(model);

    const ring = new THREE.Mesh(RING_GEO, RING_MAT);
    ring.position.y = 0.06;
    group.add(ring);

    this.scene.add(group);
    group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model).expandByScalar(0.35);
    box.min.y = 0;
    return { spawn, group, model, box, phase: Math.random() * Math.PI * 2 };
  }

  private destroy(e: DropEntity) {
    this.scene.remove(e.group);
  }

  addChunk(key: string, spawns: DropSpawn[]) {
    if (this.byChunk.has(key)) return;
    const list: DropEntity[] = [];
    for (const s of spawns) if (!this.taken.has(s.id)) list.push(this.create(s));
    this.byChunk.set(key, list);
  }

  removeChunk(key: string) {
    const list = this.byChunk.get(key);
    if (!list) return;
    for (const e of list) this.destroy(e);
    this.byChunk.delete(key);
  }

  /** Suelta un arma (con su munición) en el suelo; devuelve el id del drop. */
  dropAt(item: WeaponItem, x: number, z: number): string {
    const spawn: DropSpawn = { ...item, id: `dyn:${this.counter++}`, x, z };
    this.dynamic.push(this.create(spawn));
    return spawn.id;
  }

  /** Animación de flotación y giro. Llamar cada frame. */
  update(timeSec: number) {
    const animate = (e: DropEntity) => {
      e.model.position.y = FLOAT_HEIGHT + Math.sin(timeSec * 2 + e.phase) * BOB_AMPLITUDE;
      e.model.rotation.y = timeSec * SPIN_SPEED + e.phase;
    };
    for (const list of this.byChunk.values()) list.forEach(animate);
    this.dynamic.forEach(animate);
    RING_MAT.opacity = 0.35 + 0.25 * Math.sin(timeSec * 3);
  }

  /** Arma recogible más cercana (por distancia a su caja de proximidad). */
  nearest(px: number, pz: number, range = PICKUP_RANGE): { drop: DropSpawn; d: number } | null {
    const p = new THREE.Vector3(px, 0.8, pz);
    let best: { drop: DropSpawn; d: number } | null = null;
    const test = (e: DropEntity) => {
      const d = e.box.distanceToPoint(p);
      if (d <= range && (!best || d < best.d)) best = { drop: e.spawn, d };
    };
    for (const list of this.byChunk.values()) list.forEach(test);
    this.dynamic.forEach(test);
    return best;
  }

  /** Retira el drop del mundo (recogido) y lo devuelve. */
  take(id: string): DropSpawn | null {
    for (const list of this.byChunk.values()) {
      const i = list.findIndex((e) => e.spawn.id === id);
      if (i >= 0) {
        const [e] = list.splice(i, 1);
        this.taken.add(id);
        this.destroy(e);
        return e.spawn;
      }
    }
    const j = this.dynamic.findIndex((e) => e.spawn.id === id);
    if (j >= 0) {
      const [e] = this.dynamic.splice(j, 1);
      this.destroy(e);
      return e.spawn;
    }
    return null;
  }

  dispose() {
    for (const list of this.byChunk.values()) list.forEach((e) => this.destroy(e));
    this.dynamic.forEach((e) => this.destroy(e));
    this.byChunk.clear();
    this.dynamic = [];
    this.taken.clear();
  }
}

export type { WeaponId };
