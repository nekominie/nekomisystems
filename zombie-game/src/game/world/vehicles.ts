import * as THREE from 'three';
import { carId, carInitialFuel, carStatus, FUEL_CAP, type CarStatus } from './carData';
import type { Car } from './types';
import type { WorldManager } from './worldManager';
import { sound } from '../../audio/soundEngine';
import {
  VehicleInstance,
  type DriveInput,
  type TerrainType,
  type VehicleBiome,
  type VehicleConfig,
  type VehicleLockState,
} from '../vehicles';
import {
  CLASSIC_SEDAN,
  PICKUP_4X4,
  CARGO_TRUCK,
  getVehicleConfig,
} from '../vehicles/vehicleCatalog';
import { spawnVehicle } from '../vehicles/vehicleSpawner';

export { DriveInput, VehicleConfig, VehicleInstance };

/**
 * Carro conducible que extiende VehicleInstance para compatibilidad total
 * con el sistema existente y las nuevas especificaciones de Project Zomboid.
 */
export class DrivableCar extends VehicleInstance {
  readonly kind: Car['kind'];

  constructor(
    source: Car | VehicleConfig,
    pos?: { x: number; z: number; heading?: number },
    options?: {
      id?: string;
      durability?: number;
      fuel?: number;
      lockState?: VehicleLockState;
      color?: number;
    },
  ) {
    if ('archetype' in source) {
      super(source, pos ?? { x: 0, z: 0, heading: 0 }, options);
      this.kind = (source.archetype === 'offroad' ? 'farm' : 'modern') as any;
    } else {
      const car = source;
      const cfg = car.kind === 'farm' ? PICKUP_4X4 : car.kind === 'wreck' ? CARGO_TRUCK : CLASSIC_SEDAN;
      const s = carStatus(car);
      const lockState: VehicleLockState = (s === 'broken' || s === 'wrecked') ? 'broken' : s === 'locked' ? 'locked' : 'unlocked';
      super(
        cfg,
        { x: car.x, z: car.z, heading: car.rot },
        {
          id: carId(car),
          durability: lockState === 'broken' ? 0 : cfg.maxDurability,
          fuel: carInitialFuel(car),
          lockState,
          color: car.color,
        },
      );
      this.kind = car.kind;
    }
  }

  get status(): CarStatus {
    if (this.lockState === 'broken') return 'broken';
    if (this.lockState === 'locked') return 'locked';
    return 'open';
  }

  get speed(): number {
    return this.currentSpeed;
  }

  set speed(val: number) {
    this.currentSpeed = val;
  }

  get fuel(): number {
    return this.currentFuel;
  }

  set fuel(val: number) {
    this.currentFuel = val;
  }

  /**
   * Ejecuta la simulación física con muestreo dinámico del terreno del mundo.
   */
  drive(dt: number, input: DriveInput, world: WorldManager) {
    const terrain = world.getTerrainType(this.x, this.z);
    return this.update(dt, input, terrain, world);
  }
}

/** Resultado de buscar un carro junto al jugador. */
export interface VehicleTarget {
  id: string;
  status: CarStatus;
  d: number;
  owned?: DrivableCar;
  data?: Car;
}

const NEAR_CAR = 3.8;

interface VehicleLightUnit {
  spot: THREE.SpotLight;
  point: THREE.PointLight;
}

/**
 * Prueba de colisión OBB (Oriented Bounding Box) entre dos vehículos usando el
 * Teorema de Ejes Separadores (SAT en 2D).
 */
export function testCarToCarCollision(
  carA: DrivableCar,
  carB: DrivableCar,
): { colliding: boolean; pushX: number; pushZ: number; depth: number } {
  const dx = carA.x - carB.x;
  const dz = carA.z - carB.z;
  const distSq = dx * dx + dz * dz;

  const halfLA = carA.config.dims.L * 0.5;
  const halfWA = carA.config.dims.W * 0.5;
  const halfLB = carB.config.dims.L * 0.5;
  const halfWB = carB.config.dims.W * 0.5;

  const maxReach = Math.hypot(halfLA, halfWA) + Math.hypot(halfLB, halfWB);
  if (distSq > maxReach * maxReach) {
    return { colliding: false, pushX: 0, pushZ: 0, depth: 0 };
  }

  // Ejes unitarios del coche A: derecha (cos, -sin) y adelante (sin, cos)
  const sinA = Math.sin(carA.heading);
  const cosA = Math.cos(carA.heading);
  const axA = [
    { x: cosA, z: -sinA },
    { x: sinA, z: cosA },
  ];

  // Ejes unitarios del coche B
  const sinB = Math.sin(carB.heading);
  const cosB = Math.cos(carB.heading);
  const axB = [
    { x: cosB, z: -sinB },
    { x: sinB, z: cosB },
  ];

  const axes = [axA[0], axA[1], axB[0], axB[1]];
  let minOverlap = Infinity;
  let bestAxis = { x: 0, z: 0 };

  for (let i = 0; i < 4; i++) {
    const axis = axes[i];
    const projD = dx * axis.x + dz * axis.z;

    const radA =
      halfWA * Math.abs(axA[0].x * axis.x + axA[0].z * axis.z) +
      halfLA * Math.abs(axA[1].x * axis.x + axA[1].z * axis.z);

    const radB =
      halfWB * Math.abs(axB[0].x * axis.x + axB[0].z * axis.z) +
      halfLB * Math.abs(axB[1].x * axis.x + axB[1].z * axis.z);

    const overlap = radA + radB - Math.abs(projD);
    if (overlap <= 0) {
      return { colliding: false, pushX: 0, pushZ: 0, depth: 0 };
    }

    if (overlap < minOverlap) {
      minOverlap = overlap;
      const sign = projD >= 0 ? 1 : -1;
      bestAxis = { x: axis.x * sign, z: axis.z * sign };
    }
  }

  return {
    colliding: true,
    pushX: bestAxis.x * minOverlap,
    pushZ: bestAxis.z * minOverlap,
    depth: minOverlap,
  };
}

/**
 * Gestiona los carros conducibles: reclama carros estáticos del mundo al subirse, mantiene los
 * carros ya movidos (persisten estacionados donde se dejaron), gestiona colisiones entre coches
 * y coordina los faros de todos los vehículos tripulados en el mapa.
 */
export class VehicleManager {
  private cars = new Map<string, DrivableCar>();
  driven: DrivableCar | null = null;
  private headlightPool: VehicleLightUnit[] = [];

  /** Callback para cuando el conductor sufre daño por colisión fuerte */
  onPlayerDamaged?: (damage: number) => void;
  /** Callback para notificar que un carro fue movido por colisión (para sync multijugador) */
  onVehicleMoved?: (car: DrivableCar) => void;

  constructor(
    private scene: THREE.Scene,
    private world: WorldManager,
  ) {
    // Pool de faros para soportar múltiples vehículos de jugadores simultáneamente
    const POOL_SIZE = 8;
    for (let i = 0; i < POOL_SIZE; i++) {
      const spot = new THREE.SpotLight(0xfff5d0, 0, 52, 0.58, 0.6, 1.4);
      const point = new THREE.PointLight(0xffe290, 0, 10, 1.8);
      scene.add(spot, spot.target);
      scene.add(point);
      this.headlightPool.push({ spot, point });
    }
  }

  /** Carro (estático o ya reclamado) junto al punto, el más cercano. */
  findNear(px: number, pz: number): VehicleTarget | null {
    let best: VehicleTarget | null = null;
    for (const dc of this.cars.values()) {
      if (dc === this.driven) continue;
      const d = Math.hypot(dc.x - px, dc.z - pz);
      if (d <= NEAR_CAR && (!best || d < best.d)) {
        best = { id: dc.id, status: dc.status, d, owned: dc };
      }
    }
    const st = this.world.nearbyStaticCar(px, pz, NEAR_CAR);
    if (st && (!best || st.d < best.d)) {
      best = { id: carId(st.car), status: carStatus(st.car), d: st.d, data: st.car };
    }
    return best;
  }

  /** Carros reclamados y estacionados (no el que se conduce). */
  parkedCars(): DrivableCar[] {
    return [...this.cars.values()].filter((c) => c !== this.driven);
  }

  /** Obtiene un carro por su ID. */
  getCar(id: string): DrivableCar | undefined {
    return this.cars.get(id);
  }

  /**
   * Genera un carro conducible en la posición indicada (abierto y con tanque lleno).
   */
  spawnCar(px: number, pz: number, heading = 0, configIdOrArchetype?: string, customId?: string): DrivableCar {
    if (customId && this.cars.has(customId)) {
      return this.cars.get(customId)!;
    }
    const cfg = configIdOrArchetype ? getVehicleConfig(configIdOrArchetype) : CLASSIC_SEDAN;
    const dc = new DrivableCar(cfg, { x: px, z: pz, heading }, {
      id: customId,
      lockState: 'unlocked',
      durability: cfg.maxDurability,
      fuel: cfg.fuelCapacity,
    });
    this.cars.set(dc.id, dc);
    this.scene.add(dc.root);
    this.world.setDynamicCollider(dc.id, dc.collider());
    return dc;
  }

  /**
   * Genera un vehículo procedural con probabilidades ponderadas del bioma especificado.
   */
  spawnProcedural(biome: VehicleBiome, px: number, pz: number, heading = 0): DrivableCar {
    const inst = spawnVehicle(biome, { x: px, z: pz, heading });
    const dc = new DrivableCar(inst.config, { x: px, z: pz, heading }, {
      id: inst.id,
      durability: inst.currentDurability,
      fuel: inst.currentFuel,
      lockState: inst.lockState,
    });
    this.cars.set(dc.id, dc);
    this.scene.add(dc.root);
    this.world.setDynamicCollider(dc.id, dc.collider());
    return dc;
  }

  /** Sube al carro (solo si está abierto y operable). Reclama el carro estático si hace falta. */
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
    if (dc.lockState === 'broken' || dc.currentDurability <= 0) return null;

    this.driven = dc;
    this.world.setDynamicCollider(dc.id, null); // Mientras se conduce no choca consigo mismo
    dc.startEngine();
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
    return dc;
  }

  /**
   * Aplica física de impacto al carro local cuando choca con otro coche.
   */
  private handleLocalCarImpact(
    localCar: DrivableCar,
    otherCar: DrivableCar,
    impactSpeed: number,
    pushX: number,
    pushZ: number,
  ) {
    localCar.currentSpeed *= Math.max(0, 1 - Math.min(0.85, impactSpeed * 0.08 + 0.3));

    if (impactSpeed > 1.0) {
      const dmg = localCar.onCollideWithEnvironment(impactSpeed, 'car');
      if (dmg > 0 && this.onPlayerDamaged) {
        this.onPlayerDamaged(dmg);
      }

      sound.playCarCrash(impactSpeed);

      // Calcular abolladura local en el coche que impacta
      const fx = Math.sin(localCar.heading);
      const fz = Math.cos(localCar.heading);
      const rx = Math.cos(localCar.heading);
      const rz = -Math.sin(localCar.heading);
      const localForward = (otherCar.x - localCar.x) * fx + (otherCar.z - localCar.z) * fz;
      const localRight = (otherCar.x - localCar.x) * rx + (otherCar.z - localCar.z) * rz;

      const impactLocal = new THREE.Vector3(
        THREE.MathUtils.clamp(localRight, -localCar.config.dims.W * 0.45, localCar.config.dims.W * 0.45),
        localCar.config.dims.bodyY + localCar.config.dims.bodyH * 0.45,
        localForward >= 0 ? localCar.config.dims.L * 0.45 : -localCar.config.dims.L * 0.45,
      );
      localCar.applyDent(impactLocal, Math.min(1.0, impactSpeed / 16), impactSpeed);

      // También abollar el coche impactado
      const fxO = Math.sin(otherCar.heading);
      const fzO = Math.cos(otherCar.heading);
      const rxO = Math.cos(otherCar.heading);
      const rzO = -Math.sin(otherCar.heading);
      const localForwardO = (localCar.x - otherCar.x) * fxO + (localCar.z - otherCar.z) * fzO;
      const localRightO = (localCar.x - otherCar.x) * rxO + (localCar.z - otherCar.z) * rzO;

      const impactLocalO = new THREE.Vector3(
        THREE.MathUtils.clamp(localRightO, -otherCar.config.dims.W * 0.45, otherCar.config.dims.W * 0.45),
        otherCar.config.dims.bodyY + otherCar.config.dims.bodyH * 0.45,
        localForwardO >= 0 ? otherCar.config.dims.L * 0.45 : -otherCar.config.dims.L * 0.45,
      );
      otherCar.applyDent(impactLocalO, Math.min(1.0, impactSpeed / 20), impactSpeed);
    }
  }

  /**
   * Resuelve colisiones coche contra coche (tanto conducidos como estacionados).
   */
  resolveCarCollisions(dt: number, occupiedCarIds?: Set<string>): void {
    const allCars = [...this.cars.values()];
    const count = allCars.length;
    if (count < 2) return;

    for (let i = 0; i < count; i++) {
      const carA = allCars[i];
      for (let j = i + 1; j < count; j++) {
        const carB = allCars[j];

        const res = testCarToCarCollision(carA, carB);
        if (!res.colliding) continue;

        const isADriven = carA === this.driven || occupiedCarIds?.has(carA.id);
        const isBDriven = carB === this.driven || occupiedCarIds?.has(carB.id);

        const isLocalA = carA === this.driven;
        const isLocalB = carB === this.driven;

        // Velocidad de impacto relativa
        const vxA = Math.sin(carA.heading) * carA.currentSpeed;
        const vzA = Math.cos(carA.heading) * carA.currentSpeed;
        const vxB = Math.sin(carB.heading) * carB.currentSpeed;
        const vzB = Math.cos(carB.heading) * carB.currentSpeed;
        const relSpeed = Math.hypot(vxA - vxB, vzA - vzB);
        const impactSpeed = Math.max(relSpeed, Math.abs(carA.currentSpeed), Math.abs(carB.currentSpeed));

        if (isADriven && !isBDriven) {
          // Carro A conducido embiste a Carro B estacionado
          carA.x += res.pushX * 0.6;
          carA.z += res.pushZ * 0.6;
          carB.x -= res.pushX * 0.4;
          carB.z -= res.pushZ * 0.4;

          if (impactSpeed > 0.4) {
            const pushMag = Math.min(impactSpeed * 0.35, 3.2);
            const nx = res.depth > 1e-4 ? res.pushX / res.depth : 0;
            const nz = res.depth > 1e-4 ? res.pushZ / res.depth : 0;
            carB.x -= nx * pushMag * dt * 7;
            carB.z -= nz * pushMag * dt * 7;
            const offset = (carA.x - carB.x) * Math.cos(carB.heading) - (carA.z - carB.z) * Math.sin(carB.heading);
            carB.heading += THREE.MathUtils.clamp(offset * 0.05, -0.2, 0.2);
            carB.syncMesh();
            this.world.setDynamicCollider(carB.id, carB.collider());
            this.onVehicleMoved?.(carB);
          }

          if (isLocalA) {
            this.handleLocalCarImpact(carA, carB, impactSpeed, res.pushX, res.pushZ);
          }
        } else if (!isADriven && isBDriven) {
          // Carro B conducido embiste a Carro A estacionado
          carA.x += res.pushX * 0.4;
          carA.z += res.pushZ * 0.4;
          carB.x -= res.pushX * 0.6;
          carB.z -= res.pushZ * 0.6;

          if (impactSpeed > 0.4) {
            const pushMag = Math.min(impactSpeed * 0.35, 3.2);
            const nx = res.depth > 1e-4 ? res.pushX / res.depth : 0;
            const nz = res.depth > 1e-4 ? res.pushZ / res.depth : 0;
            carA.x += nx * pushMag * dt * 7;
            carA.z += nz * pushMag * dt * 7;
            const offset = (carB.x - carA.x) * Math.cos(carA.heading) - (carB.z - carA.z) * Math.sin(carA.heading);
            carA.heading += THREE.MathUtils.clamp(offset * 0.05, -0.2, 0.2);
            carA.syncMesh();
            this.world.setDynamicCollider(carA.id, carA.collider());
            this.onVehicleMoved?.(carA);
          }

          if (isLocalB) {
            this.handleLocalCarImpact(carB, carA, impactSpeed, -res.pushX, -res.pushZ);
          }
        } else {
          // Ambos conducidos (choque de varios jugadores) o ambos estacionados
          carA.x += res.pushX * 0.5;
          carA.z += res.pushZ * 0.5;
          carB.x -= res.pushX * 0.5;
          carB.z -= res.pushZ * 0.5;

          carA.syncMesh();
          carB.syncMesh();

          if (carA !== this.driven) this.world.setDynamicCollider(carA.id, carA.collider());
          if (carB !== this.driven) this.world.setDynamicCollider(carB.id, carB.collider());

          if (isLocalA) {
            this.handleLocalCarImpact(carA, carB, impactSpeed, res.pushX, res.pushZ);
          } else if (isLocalB) {
            this.handleLocalCarImpact(carB, carA, impactSpeed, -res.pushX, -res.pushZ);
          }
        }
      }
    }
  }

  /**
   * Paso de actualización para los vehículos, humo continuo, colisiones y faros.
   * Se ejecuta siempre (tanto si el jugador va a pie como en carro).
   */
  update(
    dt: number,
    input: DriveInput,
    night: number,
    occupiedCarIds?: Set<string>,
  ): { playerDamage: number; noiseRadius: number } {
    const dc = this.driven;
    let res = { playerDamage: 0, noiseRadius: 0 };

    // 1. Simulación del carro conducido por el jugador local
    if (dc) {
      res = dc.drive(dt, input, this.world);
      if (res.playerDamage > 0 && this.onPlayerDamaged) {
        this.onPlayerDamaged(res.playerDamage);
      }
    }

    // 2. Colisión física entre todos los carros (conducidos y estacionados)
    this.resolveCarCollisions(dt, occupiedCarIds);

    // 3. Mantener colisionadores dinámicos actualizados en la rejilla espacial del mundo
    for (const car of this.cars.values()) {
      if (car !== dc) {
        this.world.setDynamicCollider(car.id, car.collider());
        car.updateEffects(dt);
      }
    }

    // 4. Identificar todos los vehículos que tienen conductor (local o remoto)
    const activeCars: DrivableCar[] = [];
    if (dc && (dc.isEngineRunning || dc.isOperable)) {
      activeCars.push(dc);
    }
    for (const car of this.cars.values()) {
      if (car === dc) continue;
      if (car.isEngineRunning || occupiedCarIds?.has(car.id)) {
        activeCars.push(car);
      }
    }

    // 5. Faros y luces proyectadas de TODOS los coches con conductor
    const nightFactor = THREE.MathUtils.smoothstep(night, 0.12, 0.75);

    for (let i = 0; i < this.headlightPool.length; i++) {
      const unit = this.headlightPool[i];
      const car = activeCars[i];
      if (car) {
        const front = car.worldPoint(0, car.dims.L * 0.5);
        const ahead = car.worldPoint(0, car.dims.L * 0.5 + 18);

        unit.spot.position.set(front.x, 0.95, front.z);
        unit.spot.target.position.set(ahead.x, 0.1, ahead.z);
        unit.spot.target.updateMatrixWorld();

        unit.point.position.set(front.x, 0.85, front.z);

        // Intensidad visible tanto de día como de noche
        unit.spot.intensity = 60 + 140 * nightFactor;
        unit.point.intensity = 6 + 16 * nightFactor;

        car.setHeadlightsActive(true);
      } else {
        unit.spot.intensity = 0;
        unit.point.intensity = 0;
      }
    }

    // Apagar faros de los coches que no estén activos/tripulados
    for (const car of this.cars.values()) {
      if (!activeCars.includes(car)) {
        car.setHeadlightsActive(false);
      }
    }

    return res;
  }

  dispose() {
    for (const dc of this.cars.values()) {
      dc.dispose();
    }
    this.cars.clear();
    this.driven = null;
    for (const unit of this.headlightPool) {
      this.scene.remove(unit.spot, unit.spot.target);
      this.scene.remove(unit.point);
      unit.spot.dispose?.();
      unit.point.dispose?.();
    }
    this.headlightPool = [];
  }
}
