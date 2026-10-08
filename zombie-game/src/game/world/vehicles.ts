import * as THREE from 'three';
import { carDims, carId, carInitialFuel, carStatus, FUEL_CAP, type CarDims, type CarStatus } from './carData';
import { makeBoxCollider } from './cabin';
import type { Car } from './types';
import type { WorldManager } from './worldManager';

/** Parámetros de conducción arcade (metros, segundos). */
const DRIVE = {
  maxForward: 24, // ~86 km/h
  maxReverse: 7,
  accel: 11,
  brake: 18,
  reverseAccel: 5,
  rolling: 0.35, // resistencia proporcional a la velocidad
  coast: 1.2, // desaceleración constante al soltar el acelerador
  handbrake: 30,
  maxSteer: 0.55, // rad
  wheelBase: 2.7,
  /** Litros por metro recorrido + consumo en ralentí (L/s). */
  fuelPerMeter: 0.012,
  idleFuel: 0.004,
  /** Si el motor se queda sin gasolina, frena con esta fuerza extra. */
  deadDrag: 3.5,
};

export interface DriveInput {
  /** +1 acelerar (W), -1 frenar / reversa (S). */
  throttle: number;
  /** +1 izquierda (A), -1 derecha (D). */
  steer: number;
  handbrake: boolean;
}

// --- Geometría y materiales compartidos ---
const BOX = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const WHEEL = new THREE.CylinderGeometry(0.35, 0.35, 0.26, 12).rotateZ(Math.PI / 2);
const bodyMats = new Map<number, THREE.MeshLambertMaterial>();
const bodyMat = (c: number) => {
  let m = bodyMats.get(c);
  if (!m) bodyMats.set(c, (m = new THREE.MeshLambertMaterial({ color: c, flatShading: true })));
  return m;
};
const MAT_GLASS = new THREE.MeshLambertMaterial({ color: 0x1c2833 });
const MAT_TIRE = new THREE.MeshLambertMaterial({ color: 0x151515 });
const MAT_HEADLIGHT = new THREE.MeshBasicMaterial({ color: 0xfff4c2 });
const MAT_TAILLIGHT = new THREE.MeshBasicMaterial({ color: 0x8a1018 });

/** Carro conducible (objeto dinámico con malla propia). Nace de un carro estático ya reclamado. */
export class DrivableCar {
  readonly id: string;
  readonly kind: Car['kind'];
  readonly status: CarStatus;
  readonly dims: CarDims;
  readonly root = new THREE.Group();

  x: number;
  z: number;
  /** Orientación Y: el frente apunta a (sin h, cos h). */
  heading: number;
  speed = 0;
  steer = 0;
  /** Gasolina actual (litros). */
  fuel: number;

  private frontPivots: THREE.Group[] = [];
  private wheelMeshes: THREE.Mesh[] = [];
  private wheelSpin = 0;

  constructor(car: Car) {
    this.id = carId(car);
    this.kind = car.kind;
    this.status = carStatus(car);
    this.dims = carDims(car.kind);
    this.x = car.x;
    this.z = car.z;
    this.heading = car.rot;
    this.fuel = carInitialFuel(car);
    this.buildMesh(car.color);
    this.syncMesh();
  }

  private buildMesh(color: number) {
    const { L, W, bodyH, bodyY, cabL, cabW, cabH, cabZ } = this.dims;
    const mat = bodyMat(color);
    const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      return mesh;
    };
    add(BOX, mat, 0, bodyY, 0, W, bodyH, L);
    add(BOX, MAT_GLASS, 0, bodyY + bodyH, cabZ, cabW, cabH, cabL);
    add(BOX, mat, 0, bodyY + bodyH + cabH, cabZ, cabW + 0.04, 0.06, cabL + 0.04);
    // Faros delanteros y luces traseras
    for (const sx of [-1, 1]) {
      add(BOX, MAT_HEADLIGHT, sx * (W / 2 - 0.3), bodyY + bodyH * 0.45, L / 2 + 0.01, 0.34, 0.16, 0.05).castShadow = false;
      add(BOX, MAT_TAILLIGHT, sx * (W / 2 - 0.3), bodyY + bodyH * 0.45, -L / 2 - 0.01, 0.34, 0.14, 0.05).castShadow = false;
    }
    // Ruedas: las delanteras (+Z) giran con el volante
    for (const sz of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(sx * (W / 2 - 0.02), 0.35, sz * L * 0.31);
        const wheel = new THREE.Mesh(WHEEL, MAT_TIRE);
        wheel.castShadow = true;
        pivot.add(wheel);
        this.root.add(pivot);
        this.wheelMeshes.push(wheel);
        if (sz > 0) this.frontPivots.push(pivot);
      }
    }
  }

  syncMesh() {
    this.root.position.set(this.x, 0, this.z);
    this.root.rotation.y = this.heading;
    for (const p of this.frontPivots) p.rotation.y = this.steer;
    for (const w of this.wheelMeshes) w.rotation.x = this.wheelSpin;
  }

  /** Punto local (lx, lz) -> mundo. */
  worldPoint(lx: number, lz: number) {
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    return { x: this.x + lx * c + lz * s, z: this.z - lx * s + lz * c };
  }

  get fuelFraction() {
    return this.fuel / FUEL_CAP;
  }

  /** Hitbox estacionado (caja orientada). */
  collider() {
    return makeBoxCollider(this.x, this.z, this.heading, this.dims.W / 2, this.dims.L / 2);
  }

  /** Un paso de conducción arcade (modelo de bicicleta) con colisiones contra el mundo. */
  drive(dt: number, input: DriveInput, world: WorldManager) {
    const hasFuel = this.fuel > 0;

    // --- Velocidad longitudinal ---
    if (input.throttle > 0 && hasFuel) {
      this.speed += DRIVE.accel * input.throttle * dt * (1 - Math.max(0, this.speed) / DRIVE.maxForward);
    } else if (input.throttle < 0) {
      if (this.speed > 0.4) this.speed -= DRIVE.brake * dt;
      else if (hasFuel) this.speed -= DRIVE.reverseAccel * dt;
    } else if (this.speed !== 0) {
      // Sin acelerar: el carro se frena solo
      const dec = Math.min(Math.abs(this.speed), DRIVE.coast * dt);
      this.speed -= Math.sign(this.speed) * dec;
    }
    if (input.handbrake && this.speed !== 0) {
      const dec = Math.min(Math.abs(this.speed), DRIVE.handbrake * dt);
      this.speed -= Math.sign(this.speed) * dec;
    }
    this.speed -= this.speed * DRIVE.rolling * dt;
    if (!hasFuel && this.speed !== 0) {
      const dec = Math.min(Math.abs(this.speed), DRIVE.deadDrag * dt);
      this.speed -= Math.sign(this.speed) * dec;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, -DRIVE.maxReverse, DRIVE.maxForward);
    if (Math.abs(this.speed) < 0.02 && input.throttle === 0) this.speed = 0;

    // --- Dirección: menos giro a más velocidad ---
    const target = (input.steer * DRIVE.maxSteer) / (1 + Math.abs(this.speed) / 12);
    this.steer += (target - this.steer) * Math.min(1, dt * 8);
    this.heading += (this.speed * Math.tan(this.steer)) / DRIVE.wheelBase * dt;

    // --- Movimiento ---
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;

    // --- Colisiones: tres círculos a lo largo del carro contra todo lo sólido ---
    const r = this.dims.W / 2 + 0.15;
    let dx = 0;
    let dz = 0;
    for (const lz of [-this.dims.L * 0.3, 0, this.dims.L * 0.3]) {
      const p = this.worldPoint(0, lz);
      const q = world.resolveCollision(p.x, p.z, r);
      dx += q.x - p.x;
      dz += q.z - p.z;
    }
    const push = Math.hypot(dx, dz);
    if (push > 1e-4) {
      const k = Math.min(1, 1.2 / push); // limita el empujón por frame
      this.x += dx * k;
      this.z += dz * k;
      this.speed *= 1 - Math.min(0.6, push * 2.5); // el choque frena
    }

    // --- Gasolina ---
    if (hasFuel) {
      this.fuel = Math.max(0, this.fuel - (Math.abs(this.speed) * DRIVE.fuelPerMeter + DRIVE.idleFuel) * dt);
    }

    this.wheelSpin += (this.speed * dt) / 0.35;
    this.syncMesh();
  }
}

/** Resultado de buscar un carro junto al jugador. */
export interface VehicleTarget {
  id: string;
  status: CarStatus;
  /** Distancia del jugador al centro del carro. */
  d: number;
  /** Ya reclamado (objeto dinámico) o estático (aún del chunk). */
  owned?: DrivableCar;
  data?: Car;
}

const NEAR_CAR = 3.6;

/**
 * Gestiona los carros conducibles: reclama carros estáticos del mundo al subirse, mantiene los
 * carros ya movidos (persisten estacionados donde se dejaron), conduce el actual y sus faros.
 */
export class VehicleManager {
  private cars = new Map<string, DrivableCar>();
  driven: DrivableCar | null = null;
  private headlight: THREE.SpotLight;

  constructor(
    private scene: THREE.Scene,
    private world: WorldManager,
  ) {
    // Una sola luz de faros, siempre presente (cambiar el número de luces recompilaría los shaders)
    this.headlight = new THREE.SpotLight(0xfff1c9, 0, 45, 0.5, 0.55, 1.4);
    scene.add(this.headlight, this.headlight.target);
  }

  /** Carro (estático o ya reclamado) junto al punto, el más cercano. */
  findNear(px: number, pz: number): VehicleTarget | null {
    let best: VehicleTarget | null = null;
    for (const dc of this.cars.values()) {
      if (dc === this.driven) continue;
      const d = Math.hypot(dc.x - px, dc.z - pz);
      if (d <= NEAR_CAR && (!best || d < best.d)) best = { id: dc.id, status: dc.status, d, owned: dc };
    }
    const st = this.world.nearbyStaticCar(px, pz, NEAR_CAR);
    if (st && (!best || st.d < best.d)) best = { id: carId(st.car), status: carStatus(st.car), d: st.d, data: st.car };
    return best;
  }

  /** Carros reclamados y estacionados (no el que se conduce). */
  parkedCars(): DrivableCar[] {
    return [...this.cars.values()].filter((c) => c !== this.driven);
  }

  /** Genera un carro conducible en la posición indicada (abierto y con tanque lleno). */
  spawnCar(px: number, pz: number, heading = 0): DrivableCar {
    const id = `debug-car-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const car: Car = {
      kind: 'modern',
      x: px,
      z: pz,
      rot: heading,
      color: 0x1f5fbf,
      j: [0.95, 1.0, 0, 0], // status = 'open', tanque lleno al 100%
    };
    const dc = new DrivableCar(car);
    (dc as any).id = id;
    this.cars.set(dc.id, dc);
    this.scene.add(dc.root);
    this.world.setDynamicCollider(dc.id, dc.collider());
    return dc;
  }

  /** Sube al carro (solo si está abierto). Reclama el carro estático si hace falta. */
  enter(target: VehicleTarget): DrivableCar | null {
    if (target.status !== 'open') return null;
    let dc = target.owned;
    if (!dc && target.data) {
      dc = new DrivableCar(target.data);
      this.cars.set(dc.id, dc);
      this.scene.add(dc.root);
      this.world.claimCar(target.data);
    }
    if (!dc) return null;
    this.driven = dc;
    this.world.setDynamicCollider(dc.id, null); // mientras se conduce no choca consigo mismo
    return dc;
  }

  /** Baja del carro: queda estacionado y vuelve a tener hitbox. */
  exit(): DrivableCar | null {
    const dc = this.driven;
    if (!dc) return null;
    dc.speed = 0;
    dc.steer = 0;
    dc.syncMesh();
    this.world.setDynamicCollider(dc.id, dc.collider());
    this.driven = null;
    this.headlight.intensity = 0;
    return dc;
  }

  /** `night` (0..1) enciende los faros del carro conducido. */
  update(dt: number, input: DriveInput, night: number) {
    const dc = this.driven;
    if (!dc) {
      this.headlight.intensity = 0;
      return;
    }
    dc.drive(dt, input, this.world);

    // Faros: apuntan hacia delante desde el frente del carro
    const front = dc.worldPoint(0, dc.dims.L / 2);
    const ahead = dc.worldPoint(0, dc.dims.L / 2 + 14);
    this.headlight.position.set(front.x, 0.9, front.z);
    this.headlight.target.position.set(ahead.x, 0, ahead.z);
    this.headlight.target.updateMatrixWorld();
    this.headlight.intensity = 160 * THREE.MathUtils.smoothstep(night, 0.15, 0.7);
  }

  dispose() {
    for (const dc of this.cars.values()) dc.root.removeFromParent();
    this.cars.clear();
    this.driven = null;
    this.scene.remove(this.headlight, this.headlight.target);
  }
}
