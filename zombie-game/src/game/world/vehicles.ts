import * as THREE from 'three';
import { carId, carInitialFuel, carStatus, FUEL_CAP, type CarStatus } from './carData';
import type { Car } from './types';
import type { WorldManager } from './worldManager';
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
      // Creado directamente con VehicleConfig
      super(source, pos ?? { x: 0, z: 0, heading: 0 }, options);
      this.kind = (source.archetype === 'offroad' ? 'farm' : 'modern') as any;
    } else {
      // Creado desde un Car estático heredado del mapa procedural
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
  /** Distancia del jugador al centro del carro. */
  d: number;
  /** Ya reclamado (objeto dinámico) o estático (aún del chunk). */
  owned?: DrivableCar;
  data?: Car;
}

const NEAR_CAR = 3.8;

/**
 * Gestiona los carros conducibles: reclama carros estáticos del mundo al subirse, mantiene los
 * carros ya movidos (persisten estacionados donde se dejaron), conduce el actual y sus faros.
 */
export class VehicleManager {
  private cars = new Map<string, DrivableCar>();
  driven: DrivableCar | null = null;
  private headlight: THREE.SpotLight;
  /** Callback para cuando el conductor sufre daño por colisión fuerte */
  onPlayerDamaged?: (damage: number) => void;

  constructor(
    private scene: THREE.Scene,
    private world: WorldManager,
  ) {
    // Una sola luz de faros, siempre presente
    this.headlight = new THREE.SpotLight(0xfff1c9, 0, 48, 0.52, 0.55, 1.4);
    scene.add(this.headlight, this.headlight.target);
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
   * Puede recibir un ID de modelo o arquetipo del catálogo base y un ID personalizado.
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
    this.headlight.intensity = 0;
    return dc;
  }

  /** Paso de actualización para los vehículos, humo continuo y faros. */
  update(dt: number, input: DriveInput, night: number): { playerDamage: number; noiseRadius: number } {
    const dc = this.driven;
    let res = { playerDamage: 0, noiseRadius: 0 };
    if (dc) {
      res = dc.drive(dt, input, this.world);
      if (res.playerDamage > 0 && this.onPlayerDamaged) {
        this.onPlayerDamaged(res.playerDamage);
      }

      // Faros: apuntan hacia delante desde el frente del carro
      const front = dc.worldPoint(0, dc.dims.L / 2);
      const ahead = dc.worldPoint(0, dc.dims.L / 2 + 15);
      this.headlight.position.set(front.x, 0.9, front.z);
      this.headlight.target.position.set(ahead.x, 0, ahead.z);
      this.headlight.target.updateMatrixWorld();
      this.headlight.intensity = 160 * THREE.MathUtils.smoothstep(night, 0.15, 0.7);
    } else {
      this.headlight.intensity = 0;
    }

    // Actualizar humo de motor y efectos continuos en todos los vehículos no conducidos
    for (const car of this.cars.values()) {
      if (car !== dc) {
        car.updateEffects(dt);
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
    this.scene.remove(this.headlight, this.headlight.target);
  }
}
