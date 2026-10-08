import * as THREE from 'three';
import { FUEL_CAP } from './carData';
import type { DrivableCar } from './vehicles';
import type { GasStation } from './types';
import type { WorldManager } from './worldManager';

/** Litros por segundo que entrega la bomba. */
const REFUEL_RATE = 6;
/** El jugador debe quedarse junto a la bomba; si se aleja más, se corta. */
const MAX_PLAYER_DIST = 5.5;
/** Un carro debe estar a menos de esto (centro del carro a la bomba) para poder recargar. */
export const PUMP_CAR_RANGE = 4.2;

const DROPS = 18;
const DROP_GEO = new THREE.SphereGeometry(0.075, 8, 6);
const FX_COLOR = 0xffd84a;

/**
 * Animación de recarga: un chorro de gotas luminosas que viaja en arco desde la boquilla de la
 * bomba hasta el tanque del carro, un anillo pulsante en el suelo alrededor del carro y un
 * resplandor en la boquilla.
 */
class RefuelFx {
  readonly group = new THREE.Group();
  private drops: THREE.Mesh[] = [];
  private ring: THREE.Mesh;
  private glow: THREE.Sprite;
  private dropMat = new THREE.MeshBasicMaterial({ color: FX_COLOR, transparent: true, depthWrite: false, fog: false });
  private ringMat = new THREE.MeshBasicMaterial({
    color: FX_COLOR,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
  private glowMat: THREE.SpriteMaterial;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private mid = new THREE.Vector3();
  private t = 0;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < DROPS; i++) {
      const m = new THREE.Mesh(DROP_GEO, this.dropMat);
      this.drops.push(m);
      this.group.add(m);
    }
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 40).rotateX(-Math.PI / 2), this.ringMat);
    this.ring.position.y = 0.09;
    this.group.add(this.ring);

    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,230,120,1)');
    grad.addColorStop(0.4, 'rgba(255,200,60,0.4)');
    grad.addColorStop(1, 'rgba(255,180,40,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    this.glowMat = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.glow = new THREE.Sprite(this.glowMat);
    this.glow.scale.set(2.2, 2.2, 1);
    this.group.add(this.glow);

    scene.add(this.group);
    this.group.visible = false;
  }

  start(from: THREE.Vector3, to: THREE.Vector3, ringCenter: THREE.Vector3, ringRadius: number) {
    this.from.copy(from);
    this.to.copy(to);
    this.mid.addVectors(from, to).multiplyScalar(0.5);
    this.mid.y += 1.1; // el chorro hace un arco hacia arriba
    this.ring.position.set(ringCenter.x, 0.09, ringCenter.z);
    this.ring.scale.setScalar(ringRadius);
    this.glow.position.copy(from);
    this.group.visible = true;
  }

  stop() {
    this.group.visible = false;
  }

  update(dt: number) {
    this.t += dt;
    for (let i = 0; i < DROPS; i++) {
      const u = (this.t * 1.7 + i / DROPS) % 1; // posición a lo largo del arco
      const a = 1 - u;
      // Bézier cuadrática boquilla -> punto alto -> tanque
      this.drops[i].position
        .set(0, 0, 0)
        .addScaledVector(this.from, a * a)
        .addScaledVector(this.mid, 2 * a * u)
        .addScaledVector(this.to, u * u);
      this.drops[i].scale.setScalar(0.7 + 0.6 * Math.sin(u * Math.PI));
    }
    const pulse = 0.5 + 0.5 * Math.sin(this.t * 7);
    this.ringMat.opacity = 0.25 + 0.4 * pulse;
    this.glowMat.opacity = 0.6 + 0.4 * pulse;
    this.glow.scale.setScalar(1.8 + 0.8 * pulse);
  }

  dispose() {
    this.group.removeFromParent();
    this.ring.geometry.dispose();
    this.ringMat.dispose();
    this.dropMat.dispose();
    this.glowMat.map?.dispose();
    this.glowMat.dispose();
  }
}

export type RefuelEnd = 'full' | 'empty' | 'away' | 'cancel' | 'moved';

export interface RefuelState {
  active: boolean;
  /** Litros cargados en esta sesión. */
  added: number;
  /** Gasolina actual del carro (0..1) y litros restantes de la estación. */
  fuelFraction: number;
  stationLeft: number;
}

/**
 * Sesión de recarga: el jugador (a pie, junto a una bomba) llena el tanque de un carro estacionado
 * cerca. Consume la gasolina limitada de la estación y se corta al llenarse el tanque, quedarse sin
 * gasolina la estación, alejarse el jugador, moverse el carro o cancelarla.
 */
export class RefuelSession {
  private fx: RefuelFx;
  private active: { station: GasStation; pump: { x: number; z: number }; car: DrivableCar; added: number } | null = null;
  /** Motivo del último corte (para mostrar un mensaje). */
  lastEnd: RefuelEnd | null = null;

  constructor(
    scene: THREE.Scene,
    private world: WorldManager,
  ) {
    this.fx = new RefuelFx(scene);
  }

  get isActive() {
    return !!this.active;
  }

  start(station: GasStation, pump: { x: number; z: number }, car: DrivableCar) {
    this.active = { station, pump, car, added: 0 };
    this.lastEnd = null;
    // Boquilla de la bomba -> tanque (trasera izquierda del carro)
    const filler = car.worldPoint(-(car.dims.W / 2), car.dims.bodyY + car.dims.bodyH * 0.85, -car.dims.L * 0.28);
    this.fx.start(
      new THREE.Vector3(pump.x, 1.25, pump.z),
      new THREE.Vector3(filler.x, car.dims.bodyY + car.dims.bodyH * 0.85, filler.z),
      new THREE.Vector3(car.x, 0, car.z),
      Math.max(car.dims.L, car.dims.W) * 0.62,
    );
  }

  stop(reason: RefuelEnd) {
    this.active = null;
    this.lastEnd = reason;
    this.fx.stop();
  }

  /** Avanza la recarga. Devuelve el estado para la interfaz. */
  update(dt: number, px: number, pz: number): RefuelState {
    const a = this.active;
    if (!a) return { active: false, added: 0, fuelFraction: 0, stationLeft: 0 };

    if (Math.hypot(a.pump.x - px, a.pump.z - pz) > MAX_PLAYER_DIST) {
      this.stop('away');
      return { active: false, added: a.added, fuelFraction: a.car.fuelFraction, stationLeft: this.world.stationRemaining(a.station) };
    }
    if (Math.abs(a.car.speed) > 0.05) {
      this.stop('moved');
      return { active: false, added: a.added, fuelFraction: a.car.fuelFraction, stationLeft: this.world.stationRemaining(a.station) };
    }

    const need = FUEL_CAP - a.car.fuel;
    const given = this.world.drawFromStation(a.station, Math.min(REFUEL_RATE * dt, need));
    a.car.fuel += given;
    a.added += given;
    this.fx.update(dt);

    const left = this.world.stationRemaining(a.station);
    const state: RefuelState = { active: true, added: a.added, fuelFraction: a.car.fuelFraction, stationLeft: left };
    if (FUEL_CAP - a.car.fuel < 0.01) {
      a.car.fuel = FUEL_CAP;
      this.stop('full');
      state.active = false;
    } else if (left < 0.01) {
      this.stop('empty');
      state.active = false;
    }
    return state;
  }

  dispose() {
    this.fx.dispose();
    this.active = null;
  }
}
