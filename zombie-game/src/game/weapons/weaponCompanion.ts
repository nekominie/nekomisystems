import * as THREE from 'three';
import { createWeaponModel } from './weaponModels';
import type { WeaponId } from './weaponTypes';

/** Desplazamiento lateral (derecha del personaje) y altura del arma flotante (respaldo sin mano). */
const SIDE_OFFSET = 0.8;
const FORWARD_OFFSET = 0.25;
const HEIGHT = 1.15;

/** El centro del arma de fuego va este tramo por delante de la palma, sobre el rumbo de apuntado. */
const HAND_FORWARD = 0.28;

const _tmpHand = new THREE.Vector3();

/**
 * Arma equipada del jugador.
 * - Cuerpo a cuerpo (bate): anclada a la mano derecha (sigue swings y poses).
 * - Armas de fuego: siguen cada frame la mano derecha animada (apuntar, recarga,
 *   carrera) y se orientan al rumbo de apuntado; la bala sale de la punta del
 *   cañón, no de un punto flotante al costado.
 */
export class WeaponCompanion {
  readonly group = new THREE.Group();
  private model: THREE.Group | null = null;
  private currentId: WeaponId | null = null;
  private length = 0.5;
  private heading = 0;

  private handBone: THREE.Object3D | null = null;
  private isMelee = false;

  constructor(private scene: THREE.Scene) {
    scene.add(this.group);
    this.group.visible = false;
  }

  setWeapon(id: WeaponId | null, isMelee = false) {
    if (id === this.currentId) return;
    this.currentId = id;
    this.isMelee = isMelee;
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

    this.applyAnchor();
  }

  setHandBone(bone: THREE.Object3D | null) {
    if (this.handBone === bone) return;
    this.handBone = bone;
    this.applyAnchor();
  }

  private applyAnchor() {
    if (this.handBone && this.isMelee) {
      this.handBone.add(this.group);
      // Ajustes específicos para que el bate o arma cuerpo a cuerpo encaje en la mano de Mixamo
      this.group.position.set(0.1, 0.05, 0.02);
      //this.group.position.set((Math.PI / 2) + 1, (Math.PI / 2) + 1, (Math.PI / 2) + 1);
      //this.group.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
      this.group.rotation.set((Math.PI / 2) + 1.5, (Math.PI / 2) + 1, (Math.PI / 2) + 1.5);
    } else {
      this.scene.add(this.group);
    }
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

    // Si está anclado a la mano (bate), la sigue sin más cálculo
    if (this.handBone && this.isMelee) return;

    // Arma de fuego con mano disponible: nace de la mano animada (apunta,
    // recarga y corre con los brazos) y mira al rumbo de apuntado.
    if (this.handBone && !this.isMelee) {
      this.handBone.getWorldPosition(_tmpHand);
      const fx = Math.sin(this.heading);
      const fz = Math.cos(this.heading);
      this.group.position.set(_tmpHand.x + fx * HAND_FORWARD, _tmpHand.y, _tmpHand.z + fz * HAND_FORWARD);
      this.group.rotation.set(0, this.heading, 0);
      return;
    }

    // Sin mano (avatar aún cargando): flotador provisional junto al jugador
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
    this.group.getWorldPosition(out);
    
    // Si está anclado (como el bate), el extremo del arma se calcula usando la rotación global de `this.model` o `this.group`
    if (this.handBone && this.isMelee) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.getWorldQuaternion(new THREE.Quaternion()));
      return out.add(fwd.multiplyScalar(this.length * 0.5));
    }

    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    return out.set(
      out.x + fx * this.length * 0.5,
      out.y,
      out.z + fz * this.length * 0.5,
    );
  }

  dispose() {
    this.group.removeFromParent();
  }
}
