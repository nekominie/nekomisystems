import * as THREE from 'three';
import type { RecoilForce } from './weaponTypes';

const MAX_OFFSET = 0.14; // rad
const RECOVERY = 9; // 1/s: mayor = vuelve antes

/**
 * Retroceso de cámara: cada disparo empuja (pitch, yaw) y el offset vuelve a 0 de forma suave con un
 * lerp independiente del framerate. El juego suma `pitch`/`yaw` a la orientación base de la cámara.
 */
export class RecoilController {
  pitch = 0;
  yaw = 0;

  kick(force: RecoilForce, rng: () => number = Math.random) {
    this.pitch = THREE.MathUtils.clamp(this.pitch + force.pitch, -MAX_OFFSET, MAX_OFFSET);
    this.yaw = THREE.MathUtils.clamp(this.yaw + (rng() * 2 - 1) * force.yawVariation, -MAX_OFFSET, MAX_OFFSET);
  }

  /** Recuperación suave; llamar cada frame con el delta en segundos. */
  update(dt: number) {
    const k = 1 - Math.exp(-RECOVERY * dt);
    this.pitch = THREE.MathUtils.lerp(this.pitch, 0, k);
    this.yaw = THREE.MathUtils.lerp(this.yaw, 0, k);
    if (Math.abs(this.pitch) < 1e-5) this.pitch = 0;
    if (Math.abs(this.yaw) < 1e-5) this.yaw = 0;
  }
}
