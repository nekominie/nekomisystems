import * as THREE from 'three';
import { smoothstep } from './random';

/**
 * Ciclo día/noche automático. Una sola luz direccional (con sombras) hace de sol de día y de
 * luna de noche, así que solo hay un shadow map. Duraciones en segundos reales.
 */
export const CYCLE = {
  dayDuration: 8 * 60,
  nightDuration: 8 * 60,
  /** Arranca a media mañana. */
  startTime: 2 * 60,
};

const C = {
  hemiSkyDay: new THREE.Color(0xaab8c8),
  hemiSkyNight: new THREE.Color(0x5a6c99),
  hemiGroundDay: new THREE.Color(0x2a3320),
  hemiGroundNight: new THREE.Color(0x1a2236),
  skyDay: new THREE.Color(0x8fa3b0),
  skyNight: new THREE.Color(0x0d1426),
  skyDusk: new THREE.Color(0xb86a45),
  sunLow: new THREE.Color(0xff9a55),
  sunHigh: new THREE.Color(0xfff0d0),
  moon: new THREE.Color(0x9db4ff),
};

const SUN_MAX = 1.7;
const MOON_MAX = 0.65; // la noche es azulada pero se sigue viendo
const HEMI_DAY = 0.75;
const HEMI_NIGHT = 0.6;

export class DayNightCycle {
  time = CYCLE.startTime;
  /** Dirección unitaria hacia la luz activa (sol o luna), con elevación mínima para sombras. */
  readonly lightDir = new THREE.Vector3(0, 1, 0);
  /** 0 = lámparas apagadas (día), 1 = encendidas (noche). */
  lampFactor = 0;
  isNight = false;
  /** Hora ficticia "HH:MM" (06:00 amanecer, 18:00 anochecer). */
  clock = '06:00';

  private _sky = new THREE.Color();

  constructor(
    private bg: THREE.Color,
    private fog: THREE.Fog,
    private hemi: THREE.HemisphereLight,
    private light: THREE.DirectionalLight,
  ) {
    this.update(0);
  }

  get total() {
    return CYCLE.dayDuration + CYCLE.nightDuration;
  }

  /** Salta al inicio de la siguiente fase (día <-> noche). Útil para probar. */
  skipPhase() {
    this.time = this.time < CYCLE.dayDuration ? CYCLE.dayDuration : 0;
  }

  update(dt: number) {
    this.time = (this.time + dt) % this.total;
    const t = this.time;
    const day = t < CYCLE.dayDuration;
    this.isNight = !day;

    // Ángulo celeste continuo: el sol sube de 0 a π durante el día; durante la noche la luna hace lo propio.
    const theta = day
      ? Math.PI * (t / CYCLE.dayDuration)
      : Math.PI + Math.PI * ((t - CYCLE.dayDuration) / CYCLE.nightDuration);
    const s = Math.sin(theta); // >0 sol sobre el horizonte, <0 luna

    // Hora ficticia
    const hours = day
      ? 6 + 12 * (t / CYCLE.dayDuration)
      : (18 + 12 * ((t - CYCLE.dayDuration) / CYCLE.nightDuration)) % 24;
    const hh = Math.floor(hours);
    const mm = Math.floor((hours - hh) * 60);
    this.clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    // Luz activa
    if (s >= 0) {
      this.lightDir.set(Math.cos(theta), s, 0.35);
      this.light.color.copy(C.sunLow).lerp(C.sunHigh, smoothstep(0, 0.5, s));
      this.light.intensity = SUN_MAX * smoothstep(0, 0.25, s);
    } else {
      this.lightDir.set(-Math.cos(theta), -s, 0.35);
      this.light.color.copy(C.moon);
      this.light.intensity = MOON_MAX * smoothstep(0, 0.25, -s);
    }
    this.lightDir.y = Math.max(this.lightDir.y, 0.28); // evita sombras rasantes enormes
    this.lightDir.normalize();

    // Ambiente
    const dayF = smoothstep(-0.12, 0.25, s);
    this.hemi.color.copy(C.hemiSkyNight).lerp(C.hemiSkyDay, dayF);
    this.hemi.groundColor.copy(C.hemiGroundNight).lerp(C.hemiGroundDay, dayF);
    this.hemi.intensity = HEMI_NIGHT + (HEMI_DAY - HEMI_NIGHT) * dayF;

    // Cielo / niebla: azul noche -> gris día, con tinte naranja en amanecer y atardecer
    this._sky.copy(C.skyNight).lerp(C.skyDay, dayF);
    const dusk = 1 - smoothstep(0, 0.35, Math.abs(s));
    this._sky.lerp(C.skyDusk, dusk * 0.55);
    this.bg.copy(this._sky);
    this.fog.color.copy(this._sky);

    // Lámparas: se encienden al caer el sol y se apagan al amanecer
    this.lampFactor = 1 - smoothstep(0.0, 0.22, s);
  }
}
