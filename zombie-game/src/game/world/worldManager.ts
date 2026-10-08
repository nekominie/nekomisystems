import * as THREE from 'three';
import { WORLD } from './worldConfig';
import { WorldGenerator } from './chunkGenerator';
import { buildChunkObject, disposeChunkObject, setWorldCrateOpened, type ChunkObject } from './chunkMesher';
import { cabinLocalToWorld } from './cabin';
import { CollisionGrid, type Collider } from './collision';
import { setCrateOpened } from './cabinMesh';
import { carId } from './carData';
import { GroundDropManager } from '../weapons/groundDrops';
import type { WeaponId } from '../weapons/weaponTypes';
import type { Car, GasStation } from './types';

export type LightKind = 'lamp' | 'fire';
export interface LightSource {
  x: number;
  y: number;
  z: number;
  kind: LightKind;
}

/**
 * Mantiene cargados los chunks alrededor del jugador (mundo infinito):
 * genera los que faltan (pocos por frame, ordenados por cercanía) y descarta los lejanos.
 * También expone colisiones, luces (lámparas de cabañas y fogatas) y botín de cajas.
 */
export class WorldManager {
  readonly generator: WorldGenerator;
  private chunks = new Map<string, ChunkObject>();
  /** Ids de cajas ya saqueadas (persiste aunque el chunk se descargue). */
  private looted = new Set<string>();
  /** Colisionadores de todos los chunks cargados (rejilla espacial). */
  private grid = new CollisionGrid();
  /** Carros estáticos que el jugador ya reclamó (pasan a ser objetos dinámicos: ver vehicles.ts). */
  private claimedCars = new Set<string>();
  /** Gasolina que le queda a cada gasolinera (litros); persiste aunque el chunk se descargue. */
  private stationFuel = new Map<string, number>();
  /** Armas tiradas en el suelo (las de residencias nacen con su chunk; las que suelta el jugador persisten). */
  readonly drops: GroundDropManager;

  constructor(
    private scene: THREE.Scene,
    readonly seed: number,
  ) {
    this.generator = new WorldGenerator(seed);
    this.drops = new GroundDropManager(scene);
  }

  get loadedCount() {
    return this.chunks.size;
  }

  isChunkLoaded(cx: number, cz: number) {
    return this.chunks.has(`${cx},${cz}`);
  }

  update(px: number, pz: number, maxBuildPerFrame = 2) {
    const cs = WORLD.chunkSize;
    const R = WORLD.viewRadius;
    const pcx = Math.floor(px / cs);
    const pcz = Math.floor(pz / cs);

    const wanted: { cx: number; cz: number; d: number }[] = [];
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx, dz);
        if (d <= R + 0.5) wanted.push({ cx: pcx + dx, cz: pcz + dz, d });
      }
    }
    wanted.sort((a, b) => a.d - b.d);

    let built = 0;
    for (const w of wanted) {
      if (built >= maxBuildPerFrame) break;
      if (this.chunks.has(`${w.cx},${w.cz}`)) continue;
      this.loadChunk(w.cx, w.cz);
      built++;
    }

    // Descarga con histéresis (R + 2) para no regenerar al ir y venir por un borde.
    for (const key of [...this.chunks.keys()]) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.hypot(cx - pcx, cz - pcz) > R + 2) this.unloadChunk(key);
    }
  }

  private loadChunk(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const data = this.generator.generateChunk(cx, cz);
    const obj = buildChunkObject(data, this.claimedCars);
    this.drops.addChunk(key, data.drops);
    for (const cabin of obj.cabins) {
      if (cabin.data.crate && this.looted.has(cabin.data.crate.id)) setCrateOpened(cabin);
    }
    for (const c of obj.crates) if (this.looted.has(c.data.id)) setWorldCrateOpened(c);
    this.scene.add(obj.group);
    this.chunks.set(key, obj);
    this.grid.add(key, obj.colliders);
  }

  private unloadChunk(key: string) {
    const obj = this.chunks.get(key);
    if (!obj) return;
    this.scene.remove(obj.group);
    disposeChunkObject(obj.group);
    this.grid.remove(key);
    this.drops.removeChunk(key);
    this.chunks.delete(key);
  }

  /** Distancia horizontal hasta el primer sólido (pared, árbol, carro...) en el rayo, o null. */
  raycastObstacle(ox: number, oz: number, dx: number, dz: number, maxDist: number): number | null {
    return this.grid.raycast(ox, oz, dx, dz, maxDist);
  }

  // --- Carros ---------------------------------------------------------------------------------

  /** Carro estático más cercano (dentro de `range` m de su centro), aún no reclamado. */
  nearbyStaticCar(px: number, pz: number, range = 3.6): { car: Car; d: number } | null {
    let best: { car: Car; d: number } | null = null;
    for (const chunk of this.chunks.values()) {
      for (const car of chunk.cars) {
        const d = Math.hypot(car.x - px, car.z - pz);
        if (d <= range && (!best || d < best.d)) best = { car, d };
      }
    }
    return best;
  }

  /**
   * El jugador reclama un carro estático: se reconstruye su chunk sin él (el carro pasa a ser un objeto
   * dinámico, ver vehicles.ts) y deja de existir su hitbox estático.
   */
  claimCar(car: Car) {
    this.claimedCars.add(carId(car));
    const cs = WORLD.chunkSize;
    const cx = Math.floor(car.x / cs);
    const cz = Math.floor(car.z / cs);
    if (this.chunks.has(`${cx},${cz}`)) {
      this.unloadChunk(`${cx},${cz}`);
      this.loadChunk(cx, cz);
    }
  }

  /** Hitbox de un carro dinámico estacionado (null = quitarlo, p. ej. mientras se conduce). */
  setDynamicCollider(owner: string, collider: Collider | null) {
    this.grid.remove(owner);
    if (collider) this.grid.add(owner, [collider]);
  }

  // --- Gasolineras ----------------------------------------------------------------------------

  /** Bomba a menos de `range` metros del punto, con la gasolina que le queda a su estación. */
  nearbyPump(px: number, pz: number, range = 2.4) {
    let best: { station: GasStation; pump: { x: number; z: number }; d: number } | null = null;
    for (const chunk of this.chunks.values()) {
      for (const st of chunk.stations) {
        for (const p of st.pumps) {
          const d = Math.hypot(p.x - px, p.z - pz);
          if (d <= range && (!best || d < best.d)) best = { station: st, pump: p, d };
        }
      }
    }
    return best ? { ...best, remaining: this.stationRemaining(best.station) } : null;
  }

  stationRemaining(st: GasStation): number {
    let v = this.stationFuel.get(st.id);
    if (v === undefined) {
      v = st.capacity;
      this.stationFuel.set(st.id, v);
    }
    return v;
  }

  /** Descuenta gasolina de la estación; devuelve cuánta se entregó realmente. */
  drawFromStation(st: GasStation, liters: number): number {
    const left = this.stationRemaining(st);
    const given = Math.max(0, Math.min(liters, left));
    this.stationFuel.set(st.id, left - given);
    return given;
  }

  /**
   * Colisiones con todo lo sólido (todo menos arbustos y pasto): empuja al círculo (x, z, radius) fuera
   * de árboles, cabañas, casas, edificios, carros, torres, tiendas, casetas, fogatas y cajas.
   * Usa una rejilla espacial, así que es barato aunque se mueva a cientos de zombis.
   */
  resolveCollision(x: number, z: number, radius: number) {
    return this.grid.resolve(x, z, radius);
  }

  /** Las `n` fuentes de luz (lámparas de cabañas y fogatas) más cercanas al punto. */
  nearestLights(px: number, pz: number, n: number, includeLamps = true, maxDist = 60): (LightSource & { d: number })[] {
    const found: (LightSource & { d: number })[] = [];
    for (const chunk of this.chunks.values()) {
      if (includeLamps) {
        for (const cabin of chunk.cabins) {
          for (const l of cabin.lamps) {
            const d = Math.hypot(l.x - px, l.z - pz);
            if (d <= maxDist) found.push({ x: l.x, y: l.y, z: l.z, kind: 'lamp', d });
          }
        }
      }
      for (const f of chunk.fires) {
        const d = Math.hypot(f.x - px, f.z - pz);
        if (d <= maxDist) found.push({ x: f.x, y: f.y, z: f.z, kind: 'fire', d });
      }
    }
    found.sort((a, b) => a.d - b.d);
    return found.slice(0, n);
  }

  /** Caja sin saquear a menos de `range` metros (en cabañas o campamentos), si la hay. */
  nearbyCrate(px: number, pz: number, range = 1.8): { id: string; loot: WeaponId } | null {
    for (const chunk of this.chunks.values()) {
      for (const cabin of chunk.cabins) {
        const crate = cabin.data.crate;
        if (!crate || this.looted.has(crate.id)) continue;
        const p = cabinLocalToWorld(cabin.data, crate.lx, crate.lz);
        if (Math.hypot(p.x - px, p.z - pz) <= range) return { id: crate.id, loot: crate.loot };
      }
      for (const c of chunk.crates) {
        if (this.looted.has(c.data.id)) continue;
        if (Math.hypot(c.data.x - px, c.data.z - pz) <= range) return { id: c.data.id, loot: c.data.loot };
      }
    }
    return null;
  }

  lootCrate(id: string) {
    this.looted.add(id);
    for (const chunk of this.chunks.values()) {
      for (const cabin of chunk.cabins) if (cabin.data.crate?.id === id) setCrateOpened(cabin);
      for (const c of chunk.crates) if (c.data.id === id) setWorldCrateOpened(c);
    }
  }

  nearestCity(px: number, pz: number) {
    return this.generator.cities.nearestCity(px, pz);
  }

  /**
   * Tipo de terreno en el punto (x, z) para físicas de adherencia vehicular.
   */
  getTerrainType(x: number, z: number): 'asphalt' | 'dirt' | 'grass' {
    if (this.generator.cities.cityNear(x, z, 1) || this.generator.highways.near(x, z, 4.5)) {
      return 'asphalt';
    }
    if (this.generator.towns.townNear(x, z, 2.5)) {
      return 'dirt';
    }
    return 'grass';
  }

  /**
   * Bioma procedural aproximado en (x, z) para generación de vehículos y ambiente.
   */
  getBiomeAt(x: number, z: number): 'city' | 'town' | 'countryside' | 'camp' | 'cabin' {
    if (this.generator.cities.cityNear(x, z, 8)) return 'city';
    if (this.generator.towns.townNear(x, z, 12)) return 'town';
    const cx = Math.floor(x / WORLD.chunkSize);
    const cz = Math.floor(z / WORLD.chunkSize);
    if (this.generator.camps.campOfChunk(cx, cz)) return 'camp';
    return 'countryside';
  }

  dispose() {
    for (const obj of this.chunks.values()) {
      this.scene.remove(obj.group);
      disposeChunkObject(obj.group);
    }
    this.chunks.clear();
    this.grid.clear();
    this.drops.dispose();
    this.claimedCars.clear();
    this.stationFuel.clear();
  }
}
