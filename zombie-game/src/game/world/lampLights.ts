import * as THREE from 'three';
import type { WorldManager } from './worldManager';

const LAMP = { color: 0xffc070, intensity: 14, range: 14 };
const FIRE = { color: 0xff8a3c, intensity: 22, range: 20 };

/**
 * Hay muchas fuentes de luz (lámparas de cabañas, fogatas) pero pocas PointLight reales (son caras):
 * un pool de tamaño fijo que se reasigna cada frame a las fuentes más cercanas al jugador. El número
 * de luces nunca cambia (cambiarlo obligaría a recompilar shaders); las que no se usan quedan con
 * intensidad 0. El resplandor de las fuentes lejanas lo dan sus bombillas/llamas y halos.
 *
 * - Lámparas: encendidas solo de noche (`lampFactor`).
 * - Fogatas: siempre encendidas, con parpadeo.
 */
export class LampLights {
  private lights: THREE.PointLight[] = [];

  constructor(
    private scene: THREE.Scene,
    count = 12,
  ) {
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(LAMP.color, 0, LAMP.range, 2);
      scene.add(l);
      this.lights.push(l);
    }
  }

  update(world: WorldManager, px: number, pz: number, lampFactor: number, timeSec: number) {
    // De día las lámparas están apagadas: que no ocupen plazas del pool
    const near = world.nearestLights(px, pz, this.lights.length, lampFactor > 0.01);
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const s = near[i];
      if (!s) {
        l.intensity = 0;
        continue;
      }
      l.position.set(s.x, s.y, s.z);
      if (s.kind === 'fire') {
        const flicker = 0.85 + 0.1 * Math.sin(timeSec * 13 + i) + 0.05 * Math.sin(timeSec * 29 + i * 2);
        l.color.setHex(FIRE.color);
        l.distance = FIRE.range;
        l.intensity = FIRE.intensity * flicker;
      } else {
        l.color.setHex(LAMP.color);
        l.distance = LAMP.range;
        l.intensity = LAMP.intensity * lampFactor;
      }
    }
  }

  dispose() {
    for (const l of this.lights) this.scene.remove(l);
    this.lights = [];
  }
}
