import * as THREE from 'three';

const _u = new THREE.Vector3();
const _v = new THREE.Vector3();
const _helper = new THREE.Vector3();

/**
 * Dirección aleatoria uniformemente distribuida dentro de un cono de semi-ángulo `halfAngle` alrededor
 * de `dir` (que debe estar normalizada). `verticalScale` < 1 aplasta la componente vertical: en un
 * juego cenital el jugador no controla la altura, así que no se castiga tanto el desvío vertical.
 */
export function randomInCone(
  dir: THREE.Vector3,
  halfAngle: number,
  out = new THREE.Vector3(),
  verticalScale = 0.5,
  rng: () => number = Math.random,
): THREE.Vector3 {
  if (halfAngle <= 0) return out.copy(dir);
  // Base ortonormal (u, v) perpendicular a dir
  _helper.set(0, Math.abs(dir.y) < 0.99 ? 1 : 0, Math.abs(dir.y) < 0.99 ? 0 : 1);
  _u.crossVectors(dir, _helper).normalize();
  _v.crossVectors(dir, _u).normalize();
  // Disco uniforme: radio sqrt(rand)
  const theta = halfAngle * Math.sqrt(rng());
  const phi = rng() * Math.PI * 2;
  const s = Math.sin(theta);
  out
    .copy(dir)
    .multiplyScalar(Math.cos(theta))
    .addScaledVector(_u, Math.cos(phi) * s)
    .addScaledVector(_v, Math.sin(phi) * s * verticalScale);
  return out.normalize();
}

/** Factor de daño por distancia: 1 dentro del alcance efectivo; luego cae hasta 0.35 al doble de alcance. */
export function damageFalloff(distance: number, effectiveRange: number): number {
  if (distance <= effectiveRange) return 1;
  return Math.max(0.35, 1 - ((distance - effectiveRange) / effectiveRange) * 0.65);
}

/**
 * Probabilidad de que un impacto sea en la cabeza. La cámara cenital no permite apuntar en altura,
 * así que depende de la precisión: cuanto menor la dispersión actual, más probable es la cabeza.
 */
export function headshotChance(currentSpread: number): number {
  return THREE.MathUtils.clamp(0.36 - currentSpread * 3, 0.07, 0.36);
}
