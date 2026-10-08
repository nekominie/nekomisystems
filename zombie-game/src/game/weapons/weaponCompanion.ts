import * as THREE from 'three';
import { createWeaponModel } from './weaponModels';
import type { WeaponId } from './weaponTypes';

/** Desplazamiento lateral (derecha del personaje) y altura del arma flotante. */
const SIDE_OFFSET = 0.8;
const FORWARD_OFFSET = 0.25;
const HEIGHT = 1.15;

/**
 * Arma equipada flotando a un lado del personaje, apuntando hacia donde apunta el jugador. Es un
 * marcador provisional: cuando existan animaciones de agarrar/disparar se sustituye por el arma en
 * la mano sin tocar el resto del sistema (solo expone `muzzle()` para saber de dónde sale la bala).
 */
export class WeaponCompanion {
  readonly group = new THREE.Group();
  private model: THREE.Group | null = null;
  private currentId: WeaponId | null = null;
  private length = 0.5;
  private heading = 0;

  constructor(private scene: THREE.Scene) {
    scene.add(this.group);
    this.group.visible = false;
  }

  setWeapon(id: WeaponId | null) {
    if (id === this.currentId) return;
    this.currentId = id;
    if (this.model) this.group.remove(this.model);
    this.model = null;
    if (!id) {
      this.group.visible = false;
      return;
    }
    this.model = createWeaponModel(id);
    this.group.add(this.model);
    const size = new THREE.Box3().setFromObject(this.model).getSize(new THREE.Vector3());
    this.length = size.z;
    this.group.visible = true;
  }

  /**
   * @param heading ángulo Y hacia donde apunta el jugador: dirección (sin h, cos h).
   * @param visible false cuando el jugador va en carro.
   */
  update(timeSec: number, px: number, pz: number, heading: number, visible: boolean) {
    this.group.visible = visible && !!this.model;
    if (!this.group.visible) return;
    // Giro suave hacia el rumbo de apuntado (por el camino corto)
    const diff = Math.atan2(Math.sin(heading - this.heading), Math.cos(heading - this.heading));
    this.heading += diff * 0.35;

    // Derecha del personaje (visto desde arriba, mirando a (sin h, cos h)) = (-cos h, sin h)
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const rx = -fz;
    const rz = fx;
    const bob = Math.sin(timeSec * 2.2) * 0.06;
    this.group.position.set(px + rx * SIDE_OFFSET + fx * FORWARD_OFFSET, HEIGHT + bob, pz + rz * SIDE_OFFSET + fz * FORWARD_OFFSET);
    this.group.rotation.set(Math.sin(timeSec * 1.7) * 0.03, this.heading, 0);
  }

  /** Punta del cañón en coordenadas del mundo (origen de las balas). */
  muzzle(out = new THREE.Vector3()): THREE.Vector3 {
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    return out.set(
      this.group.position.x + fx * this.length * 0.5,
      this.group.position.y,
      this.group.position.z + fz * this.length * 0.5,
    );
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
