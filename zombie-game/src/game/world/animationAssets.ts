import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * URLs de las animaciones GLB proporcionadas por el usuario en src/animations.
 * Vite resuelve y empaqueta automáticamente los archivos con new URL(..., import.meta.url).href.
 */
export const ANIMATION_URLS = {
  // Locomoción del personaje
  idle: new URL('../../animations/character/movement/idle.glb', import.meta.url).href,
  caminar: new URL('../../animations/character/movement/caminar.glb', import.meta.url).href,
  correr: new URL('../../animations/character/movement/correr.glb', import.meta.url).href,
  sigilo: new URL('../../animations/character/movement/sigilo_lento.glb', import.meta.url).href,
  turn_left: new URL('../../animations/character/movement/idle_girar_izquierda.glb', import.meta.url).href,

  // Armas y movimiento direccional (reacción a cámara y orientación)
  apuntar_espaldas: new URL('../../animations/character/guns/apuntar_rifle_caminando_espaldas.glb', import.meta.url).href,
  agachado_atras: new URL('../../animations/character/guns/caminar_agachado_con_arma_atras.glb', import.meta.url).href,
  agachado_derecha: new URL('../../animations/character/guns/caminar_agachado_con_arma_derecha.glb', import.meta.url).href,
  agachado_izquierda: new URL('../../animations/character/guns/caminar_agachado_con_arma_izquierda.glb', import.meta.url).href,
  caminar_recarga: new URL('../../animations/character/guns/caminar_mientras_recarga.glb', import.meta.url).href,
  correr_recarga: new URL('../../animations/character/guns/correr_mientras_recarga.glb', import.meta.url).href,
  correr_rifle_abajo: new URL('../../animations/character/guns/correr_rifle_abajo.glb', import.meta.url).href,

  // Combate y acciones del personaje
  bat_swing: new URL('../../animations/character/combat/bat_swing.glb', import.meta.url).href,
  bloquear_1: new URL('../../animations/character/combat/bloquear_ataque_1.glb', import.meta.url).href,
  bloquear_2: new URL('../../animations/character/combat/bloquear_ataque_2.glb', import.meta.url).href,
  golpes_codo: new URL('../../animations/character/combat/golpes_codo.glb', import.meta.url).href,
  muerte: new URL('../../animations/character/combat/muerte.glb', import.meta.url).href,
  patada_derecha: new URL('../../animations/character/combat/patada_derecha.glb', import.meta.url).href,
  punetazo: new URL('../../animations/character/combat/preparar_y_tirar_puñetazo_1.glb', import.meta.url).href,
  reaccion_golpe: new URL('../../animations/character/combat/reaccion_recibir_golpe.glb', import.meta.url).href,
  reaccion_golpe_2: new URL('../../animations/character/combat/reaccion_recibir_golpe_2.glb', import.meta.url).href,

  // Zombis
  zombie_lento: new URL('../../animations/zombies/caminata_lentisima.glb', import.meta.url).href,
  zombie_correr_1: new URL('../../animations/zombies/run/zombie_correr_1.glb', import.meta.url).href,
  zombie_correr_2: new URL('../../animations/zombies/run/zombie_correr_2.glb', import.meta.url).href,
};

export type AnimationKey = keyof typeof ANIMATION_URLS;

const clipCache = new Map<string, Promise<THREE.AnimationClip>>();
const loader = new GLTFLoader();

/**
 * Espeja una animación de Mixamo invirtiendo el eje X y ajustando rotaciones.
 * También intercambia los huesos 'Left' y 'Right' en los nombres de los tracks.
 */
export function mirrorAnimation(clip: THREE.AnimationClip): THREE.AnimationClip {
  const mirrored = clip.clone();
  mirrored.name += '_mirrored';
  
  for (const track of mirrored.tracks) {
    // Intercambiar Left y Right en los nombres de huesos
    track.name = track.name
      .replace('Left', 'Right_TMP')
      .replace('Right', 'Left')
      .replace('Right_TMP', 'Right')
      .replace('left', 'right_tmp')
      .replace('right', 'left')
      .replace('right_tmp', 'right');

    if (track.name.endsWith('.position')) {
      const v = track.values as unknown as Float32Array;
      for (let i = 0; i < v.length; i += 3) {
        v[i] = -v[i]; // Invertir X
      }
    } else if (track.name.endsWith('.quaternion')) {
      const v = track.values as unknown as Float32Array;
      for (let i = 0; i < v.length; i += 4) {
        // Al espejar sobre X en cuaterniones, se invierten Y y Z
        v[i + 1] = -v[i + 1]; // y
        v[i + 2] = -v[i + 2]; // z
      }
    }
  }
  return mirrored;
}

/**
 * Centra el desplazamiento horizontal (X/Z) de la cadera para evitar saltos o deslizamientos
 * no deseados durante transiciones entre animaciones en el mismo sitio.
 */
export function removeHipsDrift(clip: THREE.AnimationClip): THREE.AnimationClip {
  for (const track of clip.tracks) {
    if (!track.name.endsWith('Hips.position') && !track.name.endsWith('mixamorigHips.position')) continue;
    const v = track.values as unknown as Float32Array;
    const times = track.times as unknown as Float32Array;
    const n = times.length;
    
    if (n > 1) {
      const duration = times[n - 1] - times[0];
      if (duration <= 0) continue;
      
      const startX = v[0];
      const startZ = v[2];
      const endX = v[(n - 1) * 3];
      const endZ = v[(n - 1) * 3 + 2];
      
      const dx = endX - startX;
      const dz = endZ - startZ;
      
      for (let i = 0; i < n; i++) {
        const fraction = (times[i] - times[0]) / duration;
        
        // Remove progressive linear drift (root motion)
        v[i * 3] -= dx * fraction;
        v[i * 3 + 2] -= dz * fraction;
        
        // Anchor to X=0, Z=0 (preserving original Y height)
        v[i * 3] -= startX;
        v[i * 3 + 2] -= startZ;
      }
    } else if (n === 1) {
      v[0] = 0;
      v[2] = 0;
    }
  }
  return clip;
}

/**
 * Carga un clip de animación desde su URL o clave conocida, cacheándolo en memoria.
 */
export async function loadAnimation(urlOrKey: AnimationKey | string): Promise<THREE.AnimationClip> {
  const url = (ANIMATION_URLS as Record<string, string>)[urlOrKey] || urlOrKey;
  let p = clipCache.get(url);
  if (!p) {
    p = loader.loadAsync(url).then((gltf) => {
      const clip = gltf.animations[0];
      if (!clip) {
        throw new Error(`[animationAssets] No se encontró clip en ${url}`);
      }
      clip.name = String(urlOrKey);
      removeHipsDrift(clip);
      return clip;
    });
    clipCache.set(url, p);
  }
  return p;
}
