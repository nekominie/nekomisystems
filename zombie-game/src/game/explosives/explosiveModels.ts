import * as THREE from 'three';
import type { ExplosiveConfig } from './explosiveTypes';

/** Color reservado para luces parpadeantes (mecha, botón, detonador): material propio emisivo. */
export const BLINK_COLOR = 0xef4444;

const mats = new Map<number, THREE.MeshStandardMaterial>();
function mat(color: number): THREE.MeshStandardMaterial {
  let m = mats.get(color);
  if (!m) mats.set(color, (m = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 })));
  return m;
}

const geos = new Map<string, THREE.BufferGeometry>();
function boxGeo(w: number, h: number, l: number): THREE.BufferGeometry {
  const key = `eb${w},${h},${l}`;
  let g = geos.get(key);
  if (!g) geos.set(key, (g = new THREE.BoxGeometry(w, h, l)));
  return g;
}
function cylGeo(rTop: number, rBottom: number, len: number, seg = 12): THREE.BufferGeometry {
  const key = `ec${rTop},${rBottom},${len},${seg}`;
  let g = geos.get(key);
  if (!g) geos.set(key, (g = new THREE.CylinderGeometry(rTop, rBottom, len, seg)));
  return g;
}

export interface ExplosiveMesh {
  group: THREE.Group;
  /** Materiales emisivos propios para parpadear (mecha, botón, detonador). */
  blinkMats: THREE.MeshStandardMaterial[];
}

/**
 * Construye la malla 3D de un explosivo desde su `proceduralModel` declarativo:
 * recorre `parts`, crea Box/Cylinder según `type`, aplica color, posición y
 * rotación. Las piezas de color BLINK_COLOR reciben material emisivo propio
 * para parpadear mientras la mecha corre. Convención: +Z hacia adelante,
 * origen al centro (los desplegables apoyan en y=0 por sus offsets).
 */
export function buildExplosiveMesh(def: ExplosiveConfig): ExplosiveMesh {
  const group = new THREE.Group();
  const blinkMats: THREE.MeshStandardMaterial[] = [];
  for (const part of def.proceduralModel?.parts ?? []) {
    let mesh: THREE.Mesh;
    if (part.type === 'box') {
      const [w, h, l] = part.dims;
      mesh = new THREE.Mesh(boxGeo(w, h, l), mat(part.color));
    } else {
      const [rTop, rBottom, len, seg] = part.dims;
      mesh = new THREE.Mesh(cylGeo(rTop, rBottom, len, seg ?? 12), mat(part.color));
    }
    if (part.offset) mesh.position.set(part.offset[0], part.offset[1], part.offset[2]);
    if (part.rot) mesh.rotation.set(part.rot[0], part.rot[1], part.rot[2]);
    mesh.castShadow = true;
    // Luz parpadeante: material propio (no compartido) con emisivo animable.
    if (part.color === BLINK_COLOR) {
      const own = new THREE.MeshStandardMaterial({
        color: part.color,
        emissive: part.color,
        emissiveIntensity: 1,
        roughness: 0.4,
        metalness: 0.2,
      });
      mesh.material = own;
      blinkMats.push(own);
    }
    group.add(mesh);
  }
  return { group, blinkMats };
}
