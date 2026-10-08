import * as THREE from 'three';

/**
 * Materiales que se vuelven semitransparentes en los fragmentos que quedan entre la cámara y el
 * jugador (cilindro alrededor del rayo cámara -> jugador), para poder ver al personaje.
 *
 * - La posición del jugador (en espacio de vista) es un uniform compartido por todos los materiales.
 * - `transparent` es true desde el inicio: si no, three compila el material con alfa forzado a 1.
 */
const PLAYER_VIEW = { value: new THREE.Vector3(0, 0, -1) };
const _v = new THREE.Vector3();

export interface FadeOptions {
  color: number;
  flatShading?: boolean;
  /** Dentro de este radio al rayo: opacidad mínima. */
  inner: number;
  /** Fuera de este radio: opaco. */
  outer: number;
  /** Opacidad mínima (0..1). */
  min: number;
}

export function createFadeMaterial(opts: FadeOptions): THREE.MeshLambertMaterial {
  const mat = new THREE.MeshLambertMaterial({
    color: opts.color,
    flatShading: opts.flatShading ?? false,
    transparent: true,
  });
  const uniforms = {
    uFadePlayer: PLAYER_VIEW,
    uFadeInner: { value: opts.inner },
    uFadeOuter: { value: opts.outer },
    uFadeMin: { value: opts.min },
  };

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeViewPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvFadeViewPos = mvPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vFadeViewPos;
        uniform vec3 uFadePlayer;
        uniform float uFadeInner;
        uniform float uFadeOuter;
        uniform float uFadeMin;`,
      )
      .replace(
        '#include <alphatest_fragment>',
        `#include <alphatest_fragment>
        {
          // La cámara está en el origen del espacio de vista: rayo = origen -> uFadePlayer
          float tFade = dot(vFadeViewPos, uFadePlayer) / dot(uFadePlayer, uFadePlayer);
          float inFront = 1.0 - smoothstep(0.93, 1.0, tFade); // solo lo que está delante del jugador
          float dFade = length(vFadeViewPos - uFadePlayer * tFade);
          float amount = (1.0 - smoothstep(uFadeInner, uFadeOuter, dFade)) * inFront;
          diffuseColor.a *= mix(1.0, uFadeMin, amount);
        }`,
      );
  };
  // El código del shader es idéntico para todos; solo cambian los valores de los uniforms.
  mat.customProgramCacheKey = () => 'ray-fade';
  return mat;
}

/** Llamar cada frame (después de colocar la cámara) con la posición del jugador. */
export function updateFadeTarget(camera: THREE.Camera, x: number, y: number, z: number) {
  camera.updateMatrixWorld();
  _v.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
  PLAYER_VIEW.value.copy(_v);
}
