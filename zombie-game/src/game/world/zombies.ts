import * as THREE from 'three';
import { WORLD } from './worldConfig';
import { chunkRng } from './random';
import { disposeMikuInstance, instantiateMiku, loadMikuTemplate, type MikuInstance, type MikuTemplate } from './mikuAssets';
import type { WorldManager } from './worldManager';
import type { ShotResult } from '../weapons/weapon';
import { RagdollManager, type ZombieRagdoll } from './zombieRagdoll';
import type { DrivableCar } from './vehicles';
import { loadAnimation } from './animationAssets';

/** Hitbox invisible (cilindro) contra el que se lanzan los rayos de las armas. */
const HIT_GEO = new THREE.CylinderGeometry(0.4, 0.4, 1.9, 8).translate(0, 0.95, 0);
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });

/** Clasificación de tipos de zombi según su velocidad y animación de carrera */
export type ZombieTier = 'slow' | 'fast' | 'super_fast' | 'extreme';

export interface ZombieTierProfile {
  name: string;
  minWanderSpeed: number;
  maxWanderSpeed: number;
  alertSpeed: number;
  wanderRunChance: number;
  detectRadius: number;
  /** Alcance del campo de visión corto frontal (metros) */
  visionDist: number;
  /** Coseno del semi-ángulo del cono visual frontal */
  visionCosAngle: number;
  /** Radio de detección por sonido al caminar normal (metros) */
  normalHearingRadius: number;
  /** Radio de detección por sonido al correr ruidosamente (metros) */
  runHearingRadius: number;
}

/**
 * Perfiles de variación de movimiento:
 * - extreme (1%): Excepción especial. Mantiene la velocidad súper rápida previa (7.8 - 8.4 m/s).
 * - super_fast (29%): Reducido al máximo del 90% de la velocidad normal del jugador (5.0 - 5.4 m/s).
 * - fast (40%): Corredores constantes de ritmo medio (3.6 - 4.2 m/s).
 * - slow (30%): Más lentos, trote pesado / caminata (1.8 - 2.4 m/s).
 */
export const ZOMBIE_TIERS: Record<ZombieTier, ZombieTierProfile> = {
  slow: {
    name: 'Lento',
    minWanderSpeed: 0.7,
    maxWanderSpeed: 1.1,
    alertSpeed: 2.2, // ~36% vel. jugador
    wanderRunChance: 0.15,
    detectRadius: 10,
    visionDist: 8.5,
    visionCosAngle: 0.64, // ±50° cono frontal corto
    normalHearingRadius: 5.5,
    runHearingRadius: 13.0,
  },
  fast: {
    name: 'Rápido',
    minWanderSpeed: 1.4,
    maxWanderSpeed: 1.8,
    alertSpeed: 3.9, // ~65% vel. jugador
    wanderRunChance: 0.40,
    detectRadius: 14,
    visionDist: 10.5,
    visionCosAngle: 0.57, // ±55° cono frontal
    normalHearingRadius: 6.5,
    runHearingRadius: 15.0,
  },
  super_fast: {
    name: 'Súper Rápido',
    minWanderSpeed: 2.0,
    maxWanderSpeed: 2.4,
    alertSpeed: 5.3, // Tope estricto: máximo 90% de la velocidad base del jugador (6.0 * 0.90 = 5.4 m/s)
    wanderRunChance: 0.65,
    detectRadius: 17,
    visionDist: 12.5,
    visionCosAngle: 0.50, // ±60° cono frontal
    normalHearingRadius: 7.5,
    runHearingRadius: 17.0,
  },
  extreme: {
    name: 'Extremo',
    minWanderSpeed: 2.8,
    maxWanderSpeed: 3.5,
    alertSpeed: 8.0, // Velocidad súper rápida original que sobrepasa al jugador (solo el 1%)
    wanderRunChance: 0.90,
    detectRadius: 22,
    visionDist: 15.0,
    visionCosAngle: 0.42, // ±65° cono frontal
    normalHearingRadius: 9.0,
    runHearingRadius: 20.0,
  },
};

/** Parámetros ajustables del empuje e impacto de carro sobre los zombis. */
export interface CarPushConfig {
  /** Multiplicador de empuje horizontal en la dirección de marcha del carro */
  force: number;
  /** Impulso vertical hacia arriba en m/s (0 = ras de suelo sin elevarse) */
  lift: number;
  /** Dispersión lateral X/Z aleatoria en m/s (0 = línea recta pura) */
  scatter: number;
  /** Torsión / giros angulares en el aire */
  tumble: number;
}

export const DEFAULT_CAR_PUSH_CONFIG: CarPushConfig = {
  force: 0.05,
  lift: 0.1,
  scatter: 0.05,
  tumble: 0.5,
};

const ZOMBIE = {
  radius: 0.4,
  /** No aparecen a menos de esta distancia del jugador. */
  safeSpawnDist: 15,
  /** Velocidad (m/s) a la que el clip de caminar a timeScale 1 no patina los pies. */
  walkClipSpeed: 1.4,
  /** Velocidad (m/s) a la que el clip de correr a timeScale 1 no patina los pies. */
  runClipSpeed: 4.5,

  // --- Rendimiento (con cientos de zombis, cada uno son varias mallas con esqueleto) ---
  /** Tope de zombis vivos. */
  maxZombies: 450,
  /** Instancias creadas por frame (clonar un esqueleto cuesta): evita tirones al cargar un chunk. */
  spawnsPerFrame: 8,
  /** Solo se animan los más cercanos (y dentro de animDist); el resto queda congelado. */
  maxAnimated: 45,
  animDist: 48,
  shadowDist: 40,
  visibleDist: 95,

  // --- Combate ---
  health: 100,
  alertDuration: 10,
  /** Segundos que tarda en caer y que el cadáver permanece antes de desaparecer. */
  fallTime: 0.45,
  corpseTime: 14,
};

interface Assets {
  base: MikuTemplate;
  slowWalk: THREE.AnimationClip;
  run1: THREE.AnimationClip;
  run2: THREE.AnimationClip;
  walk: THREE.AnimationClip;
  run: THREE.AnimationClip;
  idle: THREE.AnimationClip;
  hit: THREE.AnimationClip;
  attack: THREE.AnimationClip;
}

let assetsPromise: Promise<Assets> | null = null;
function loadAssets(): Promise<Assets> {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      loadMikuTemplate('Running'),
      loadAnimation('zombie_lento'),
      loadAnimation('zombie_correr_1'),
      loadAnimation('zombie_correr_2'),
      loadAnimation('caminar'),
      loadAnimation('correr'),
      loadAnimation('idle'),
      loadAnimation('reaccion_golpe'),
      loadAnimation('bat_swing'),
    ]).then(([base, slowWalk, run1, run2, walk, run, idle, hit, attack]) => ({
      base,
      slowWalk,
      run1,
      run2,
      walk,
      run,
      idle,
      hit,
      attack,
    }));
  }
  return assetsPromise;
}

interface SpawnRequest {
  id: string;
  x: number;
  z: number;
  rot: number;
  tier: ZombieTier;
  wanderSpeed: number;
  alertSpeed: number;
  heightVar: number;
  phase: number;
}

export type ZombieAnimState = 'idle' | 'walk' | 'run';

interface Zombie {
  id: string;
  inst: MikuInstance;
  mixer: THREE.AnimationMixer;
  walkAction: THREE.AnimationAction;
  runAction: THREE.AnimationAction;
  idleAction: THREE.AnimationAction;
  hitAction: THREE.AnimationAction;
  attackAction: THREE.AnimationAction;
  attackCooldown: number;
  animState: ZombieAnimState;
  tier: ZombieTier;
  wanderSpeed: number;
  alertSpeed: number;
  currentSpeed: number;
  x: number;
  z: number;
  rot: number;
  targetRot: number;
  timer: number;
  moving: boolean;
  running: boolean;
  visible: boolean;
  shadows: boolean;
  d: number;
  // --- Combate ---
  health: number;
  dead: boolean;
  deadTime: number;
  /** Punto de ruido / jugador hacia el que va; null = deambula normal. */
  alert: { x: number; z: number; timer: number } | null;
  /** Aturdimiento tras un impacto (s). */
  stun: number;
  hit: THREE.Mesh;
  baseScale: number;
  ragdoll?: ZombieRagdoll | null;
  carAttackTimer?: number;
  carHitCooldown?: number;
}

export class ZombieManager {
  private zombies: Zombie[] = [];
  private zombiesById = new Map<string, Zombie>();
  private queue: SpawnRequest[] = [];
  private spawned = new Set<string>();
  private assets: Assets | null = null;
  private ragdolls = new RagdollManager();
  private disposed = false;
  carPushConfig: CarPushConfig = { ...DEFAULT_CAR_PUSH_CONFIG };
  public onZombieHit?: (z: Zombie, damage: number, killed: boolean, impulse: THREE.Vector3, isCar: boolean) => void;
  public onPlayerAttacked?: (z: Zombie, damage: number) => void;

  constructor(
    private scene: THREE.Scene,
    private world: WorldManager,
  ) {
    loadAssets()
      .then((a) => {
        if (!this.disposed) this.assets = a;
      })
      .catch((err) => console.error('[zombie-game] No se pudieron cargar los modelos de zombis:', err));
  }

  /** Zombis vivos. */
  get count() {
    let n = 0;
    for (const z of this.zombies) if (!z.dead) n++;
    return n;
  }

  /** Bajas totales de esta partida. */
  kills = 0;

  update(
    dt: number,
    px: number,
    pz: number,
    drv?: DrivableCar | null,
    otherPlayers?: { x: number; z: number; isStealth?: boolean; isRunning?: boolean }[],
    localPlayerStatus?: { isStealth: boolean; isRunning: boolean },
  ) {
    if (drv) this.checkCarCollisions(drv, dt);
    this.ragdolls.update(dt);
    if (!this.assets) return; // los zombis aparecen cuando el modelo ya está cargado

    const cs = WORLD.chunkSize;
    const R = WORLD.viewRadius;
    const pcx = Math.floor(px / cs);
    const pcz = Math.floor(pz / cs);
    const maxDist = (R + 2) * cs;

    // Planificar spawns por chunk (una sola vez, cuando el chunk ya está cargado)
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = `${cx},${cz}`;
        if (this.spawned.has(key) || !this.world.isChunkLoaded(cx, cz)) continue;
        this.spawned.add(key);
        this.planChunk(cx, cz, px, pz);
      }
    }
    // Olvidar chunks lejanos para que puedan volver a poblarse
    for (const key of this.spawned) {
      const [cx, cz] = key.split(',').map(Number);
      if (Math.hypot(cx - pcx, cz - pcz) > R + 2) this.spawned.delete(key);
    }

    // Instanciar unos pocos por frame
    for (let n = 0; n < ZOMBIE.spawnsPerFrame && this.queue.length && this.zombies.length < ZOMBIE.maxZombies; n++) {
      const req = this.queue.pop()!;
      if (Math.hypot(req.x - px, req.z - pz) > maxDist) continue; // el jugador ya se alejó
      this.spawn(req);
    }

    // Distancias, despawn y nivel de detalle
    const animatable: Zombie[] = [];
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const z = this.zombies[i];
      z.d = Math.hypot(z.x - px, z.z - pz);
      if (z.d > maxDist) {
        this.removeZombie(z);
        this.zombies.splice(i, 1);
        continue;
      }
      const vis = z.d <= ZOMBIE.visibleDist;
      if (vis !== z.visible) {
        z.visible = vis;
        z.inst.root.visible = vis;
      }
      if (!vis) continue; // fuera de la vista: congelado
      if (z.dead) {
        if (this.updateCorpse(z, dt)) {
          this.removeZombie(z);
          this.zombies.splice(i, 1);
        }
        continue;
      }
      this.wander(z, dt, px, pz, otherPlayers, localPlayerStatus);
      this.applyShadows(z);
      if (z.d <= ZOMBIE.animDist) animatable.push(z);
    }

    // Animar solo a los más cercanos
    if (animatable.length > ZOMBIE.maxAnimated) animatable.sort((a, b) => a.d - b.d).length = ZOMBIE.maxAnimated;
    for (const z of animatable) z.mixer.update(dt);
  }

  /** Decide cuántos zombis nacen en el chunk y sus características (velocidad, tipo, etc.) */
  private planChunk(cx: number, cz: number, px: number, pz: number) {
    const cs = WORLD.chunkSize;
    const rng = chunkRng(this.world.seed, cx, cz, 31);
    const ox = cx * cs;
    const oz = cz * cs;
    const centerX = ox + cs / 2;
    const centerZ = oz + cs / 2;

    const gen = this.world.generator;
    const urban = !!gen.cities.cityNear(centerX, centerZ, 0) || !!gen.towns.townNear(centerX, centerZ, cs / 2);
    const { fieldMax, townMin, townExtra } = WORLD.zombies;
    const n = urban ? townMin + Math.floor(rng() * townExtra) : Math.round(rng() * fieldMax);

    for (let i = 0; i < n; i++) {
      const x = ox + rng() * cs;
      const z = oz + rng() * cs;
      const rot = rng() * Math.PI * 2;

      // Distribución: 1% extremo ("solo 1% súper veloz"), 29% súper rápido (máx 90% jugador), 40% rápido, 30% lento
      const tierRoll = rng();
      const tier: ZombieTier = tierRoll < 0.01 ? 'extreme' : tierRoll < 0.30 ? 'super_fast' : tierRoll < 0.70 ? 'fast' : 'slow';
      const profile = ZOMBIE_TIERS[tier];

      const wanderSpeed = profile.minWanderSpeed + rng() * (profile.maxWanderSpeed - profile.minWanderSpeed);
      const alertSpeed = profile.alertSpeed * (0.94 + rng() * 0.12);

      // Ligera variación de altura según la complexión
      const heightVar = tier === 'extreme' ? 0.95 + rng() * 0.07 : tier === 'slow' ? 1.02 + rng() * 0.10 : 0.96 + rng() * 0.09;
      const phase = rng();
      if (Math.hypot(x - px, z - pz) < ZOMBIE.safeSpawnDist) continue;
      const id = `z_${cx}_${cz}_${i}`;
      this.queue.push({ id, x, z, rot, tier, wanderSpeed, alertSpeed, heightVar, phase });
    }
  }

  private spawn(req: SpawnRequest) {
    if (!this.assets) return;
    const pos = this.world.resolveCollision(req.x, req.z, ZOMBIE.radius + 0.1);
    const inst = instantiateMiku(this.assets.base, true, true); // tono verde, versión ligera
    inst.root.scale.setScalar(req.heightVar);
    inst.root.position.set(pos.x, 0, pos.z);
    inst.root.rotation.y = req.rot;
    this.scene.add(inst.root);

    const mixer = new THREE.AnimationMixer(inst.model);

    // Seleccionar clip de caminata y carrera según la categoría
    const walkClip = req.tier === 'slow' ? this.assets.slowWalk : (Math.random() < 0.6 ? this.assets.slowWalk : this.assets.walk);
    const runClip = req.tier === 'fast' ? this.assets.run1 : this.assets.run2;

    const walkAction = mixer.clipAction(walkClip);
    const runAction = mixer.clipAction(runClip);
    const idleAction = mixer.clipAction(this.assets.idle);
    const hitAction = mixer.clipAction(this.assets.hit);
    hitAction.setLoop(THREE.LoopOnce, 1);
    const attackAction = mixer.clipAction(this.assets.attack);
    attackAction.setLoop(THREE.LoopOnce, 1);

    // Desfasar las fases para que no se muevan de forma sincronizada
    walkAction.time = req.phase * walkAction.getClip().duration;
    runAction.time = req.phase * runAction.getClip().duration;
    idleAction.time = req.phase * idleAction.getClip().duration;

    // Inician en estado idle
    idleAction.play();

    const hit = new THREE.Mesh(HIT_GEO, HIT_MAT);
    inst.root.add(hit);

    const zombie: Zombie = {
      id: req.id,
      inst,
      mixer,
      walkAction,
      runAction,
      idleAction,
      hitAction,
      attackAction,
      attackCooldown: Math.random() * 0.5,
      animState: 'idle',
      tier: req.tier,
      wanderSpeed: req.wanderSpeed,
      alertSpeed: req.alertSpeed,
      currentSpeed: 0,
      x: pos.x,
      z: pos.z,
      rot: req.rot,
      targetRot: req.rot,
      timer: req.phase * 3,
      moving: false,
      running: false,
      visible: true,
      shadows: true,
      d: 0,
      health: ZOMBIE.health,
      dead: false,
      deadTime: 0,
      alert: null,
      stun: 0,
      hit,
      baseScale: req.heightVar,
    };
    hit.userData.owner = zombie; // los rayos de las armas devuelven este dueño
    this.zombiesById.set(req.id, zombie);
    this.zombies.push(zombie);
  }

  // --- Depuración ---------------------------------------------------------------------------------

  /** Hace aparecer `count` zombis repartidos en círculo a `dist` metros del punto (para probar armas y velocidades). */
  spawnTest(px: number, pz: number, count: number, dist: number): SpawnRequest[] {
    const list: SpawnRequest[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const tierRoll = Math.random();
      // Distribución: 1% extremo, 29% súper rápido, 40% rápido, 30% lento
      const tier: ZombieTier = tierRoll < 0.01 ? 'extreme' : tierRoll < 0.30 ? 'super_fast' : tierRoll < 0.70 ? 'fast' : 'slow';
      const profile = ZOMBIE_TIERS[tier];
      const wanderSpeed = profile.minWanderSpeed + Math.random() * (profile.maxWanderSpeed - profile.minWanderSpeed);
      const alertSpeed = profile.alertSpeed * (0.94 + Math.random() * 0.12);

      const req: SpawnRequest = {
        id: `dbg_${Date.now()}_${i}_${Math.floor(Math.random() * 1000)}`,
        x: px + Math.cos(a) * dist,
        z: pz + Math.sin(a) * dist,
        rot: Math.random() * Math.PI * 2,
        tier,
        wanderSpeed,
        alertSpeed,
        heightVar: tier === 'extreme' ? 0.95 : tier === 'slow' ? 1.05 : tier === 'super_fast' ? 0.97 : 1.0,
        phase: Math.random(),
      };
      this.queue.push(req);
      list.push(req);
    }
    return list;
  }

  /** Genera forzadamente 1 zombi de tipo Extremo (el 1% que corre más rápido que el jugador). */
  spawnExtreme(px: number, pz: number, dist = 14): SpawnRequest {
    const a = Math.random() * Math.PI * 2;
    const profile = ZOMBIE_TIERS.extreme;
    const req: SpawnRequest = {
      id: `extreme_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      x: px + Math.cos(a) * dist,
      z: pz + Math.sin(a) * dist,
      rot: Math.random() * Math.PI * 2,
      tier: 'extreme',
      wanderSpeed: profile.minWanderSpeed + Math.random() * (profile.maxWanderSpeed - profile.minWanderSpeed),
      alertSpeed: profile.alertSpeed * (0.95 + Math.random() * 0.1),
      heightVar: 0.95,
      phase: Math.random(),
    };
    this.queue.push(req);
    return req;
  }

  /** Spawnea un zombi remoto compartido recibido de otro jugador o evento */
  spawnFromNetwork(req: { id: string; x: number; z: number; rot?: number; tier?: string; heightVar?: number }) {
    if (this.findZombie(req.id)) return;
    const tier = (req.tier as ZombieTier) || 'fast';
    const profile = ZOMBIE_TIERS[tier] || ZOMBIE_TIERS.fast;
    this.queue.push({
      id: req.id,
      x: req.x,
      z: req.z,
      rot: req.rot ?? 0,
      tier,
      wanderSpeed: (profile.minWanderSpeed + profile.maxWanderSpeed) * 0.5,
      alertSpeed: profile.alertSpeed,
      heightVar: req.heightVar ?? 1.0,
      phase: 0,
    });
  }

  /** Elimina (sin contar como bajas) los zombis a menos de `radius` metros del punto. */
  removeNear(x: number, z: number, radius: number): number {
    let n = 0;
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zb = this.zombies[i];
      if (Math.hypot(zb.x - x, zb.z - z) > radius) continue;
      this.removeZombie(zb);
      this.zombies.splice(i, 1);
      n++;
    }
    // También los que aún esperan en la cola de aparición
    this.queue = this.queue.filter((r) => Math.hypot(r.x - x, r.z - z) > radius);
    return n;
  }

  // --- Combate --------------------------------------------------------------------------------

  /**
   * Hitboxes de los zombis vivos que pueden estar en la trayectoria (dentro del alcance y de un pasillo
   * alrededor del rayo, que se ensancha con la distancia para cubrir la dispersión).
   */
  getHitTargets(ox: number, oz: number, dx: number, dz: number, range: number): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    for (const z of this.zombies) {
      if (z.dead || !z.visible) continue;
      const rx = z.x - ox;
      const rz = z.z - oz;
      const along = rx * dx + rz * dz;
      if (along < -1.5 || along > range + 1) continue;
      const lateral = Math.abs(rx * dz - rz * dx);
      if (lateral > 2.5 + Math.max(0, along) * 0.18) continue;
      z.inst.root.updateMatrixWorld(false);
      z.hit.updateMatrixWorld(true);
      out.push(z.hit);
    }
    return out;
  }

  /** Aplica el daño de un disparo / golpe. Devuelve cuántos zombis recibieron daño, murieron o fueron en la cabeza. */
  applyShot(res: ShotResult): { hits: number; kills: number; headshots: number } {
    let hits = 0;
    let kills = 0;
    let headshots = 0;
    for (const od of res.damageByOwner.values()) {
      const z = od.owner as Zombie | undefined;
      if (!z || z.dead) continue;
      z.health -= od.damage;
      hits++;
      if (od.zone === 'head') headshots++;
      z.stun = res.melee ? 0.5 : 0.25;
      z.alert = { x: res.muzzle.x, z: res.muzzle.z, timer: ZOMBIE.alertDuration };
      const dir = res.direction.clone().normalize();
      const bulletImpulse = dir.multiplyScalar(res.melee ? 6.5 : 4.0);
      bulletImpulse.y += res.melee ? 2.5 : 1.2;

      if (z.health <= 0) {
        this.kill(z, bulletImpulse);
        kills++;
        this.onZombieHit?.(z, od.damage, true, bulletImpulse, false);
      } else {
        z.hitAction.reset().play();
        this.onZombieHit?.(z, od.damage, false, bulletImpulse, false);
      }
    }
    this.kills += kills;
    return { hits, kills, headshots };
  }

  /**
   * Detecta atropellos con el vehículo en movimiento.
   * Empuja y convierte en ragdoll a los zombis según los parámetros configurables.
   */
  private checkCarCollisions(drv: DrivableCar, dt: number) {
    const spd = Math.abs(drv.speed);

    const fx = Math.sin(drv.heading);
    const fz = Math.cos(drv.heading);
    const rx = Math.cos(drv.heading);
    const rz = -Math.sin(drv.heading);

    const halfL = drv.dims.L * 0.5 + 0.45;
    const halfW = drv.dims.W * 0.5 + 0.45;
    const maxReach = drv.dims.L + 2.0;

    const cfg = this.carPushConfig;

    for (const z of this.zombies) {
      // Disminuir enfriamiento de impacto de este zombi si está activo
      if (z.carHitCooldown !== undefined && z.carHitCooldown > 0) {
        z.carHitCooldown -= dt;
      }

      const dx = z.x - drv.x;
      const dz = z.z - drv.z;
      if (Math.hypot(dx, dz) > maxReach) continue;

      // Coordenadas locales respecto al carro
      const localForward = dx * fx + dz * fz;
      const localRight = dx * rx + dz * rz;

      if (Math.abs(localForward) < halfL && Math.abs(localRight) < halfW) {
        if (spd < 1.0) {
          // Si el vehículo está detenido o rodando muy despacio (< 1 m/s), los zombis vivos atacan
          if (!z.dead) {
            z.carAttackTimer = (z.carAttackTimer ?? (0.2 + Math.random() * 0.6)) - dt;
            if (z.carAttackTimer <= 0) {
              // Cada zombi ataca con un intervalo pausado (1.0 a 1.4s)
              z.carAttackTimer = 1.0 + Math.random() * 0.4;
              drv.onAttackedByZombie(1.2);
            }
          }
          continue;
        }

        // Si ya era un cadáver y el coche pasa por encima:
        if (z.dead) {
          // Proyectar ragdoll si aún se mueve, pero NUNCA desgastar el coche ni frenarlo bruscamente
          const corpseImpulse = new THREE.Vector3(
            fx * drv.speed * 0.25 * cfg.force + (Math.random() - 0.5) * cfg.scatter,
            cfg.lift * 0.35,
            fz * drv.speed * 0.25 * cfg.force + (Math.random() - 0.5) * cfg.scatter,
          );
          z.ragdoll?.applyImpulse(corpseImpulse, cfg.tumble);
          continue;
        }

        // Zombi VIVO atropellado a velocidad (spd >= 1.0):
        if ((z.carHitCooldown ?? 0) > 0) {
          continue;
        }
        z.carHitCooldown = 0.5; // Evita acumular impactos en múltiples frames continuos

        // Atropello cinético: calcula daño al zombi, desgaste moderado, abolladura y vector de empuje
        const hitResult = drv.onHitZombie(z, drv.speed, localRight);

        const impulse = new THREE.Vector3(
          hitResult.impulse.x * cfg.force + (Math.random() - 0.5) * cfg.scatter * 2,
          cfg.lift,
          hitResult.impulse.z * cfg.force + (Math.random() - 0.5) * cfg.scatter * 2,
        );

        // A velocidades normales de marcha (> 1.8 m/s), el impacto arrolla y elimina al zombi
        if (spd >= 1.8) {
          z.health = 0;
        } else {
          z.health = Math.max(0, z.health - hitResult.zombieDamage);
        }

        if (z.health <= 0) {
          this.kill(z, impulse, cfg.tumble);
          this.kills++;
          this.onZombieHit?.(z, hitResult.zombieDamage, true, impulse, true);
        } else {
          this.onZombieHit?.(z, hitResult.zombieDamage, false, impulse, true);
        }
      }
    }
  }

  /** El ruido atrae a los zombis dentro del radio hacia el punto del disparo. */
  alertNoise(x: number, z: number, radius: number) {
    for (const zb of this.zombies) {
      if (zb.dead) continue;
      if (Math.hypot(zb.x - x, zb.z - z) <= radius) zb.alert = { x, z, timer: ZOMBIE.alertDuration };
    }
  }

  private kill(z: Zombie, impulse?: THREE.Vector3, tumble?: number) {
    if (z.dead) return;
    z.dead = true;
    z.deadTime = 0;
    z.moving = false;
    z.running = false;
    z.alert = null;
    z.mixer.stopAllAction();
    z.mixer.uncacheRoot(z.inst.model);
    if (z.hit) {
      z.hit.visible = false;
      z.inst.root.remove(z.hit);
    }
    z.ragdoll = this.ragdolls.createRagdoll(z.inst.model, impulse, tumble);
  }

  /** Si tiene ragdoll las físicas de Cannon controlan el cuerpo; de lo contrario usa caída matemática de respaldo. */
  private updateCorpse(z: Zombie, dt: number): boolean {
    z.deadTime += dt;
    if (!z.ragdoll) {
      const fall = Math.min(1, z.deadTime / ZOMBIE.fallTime);
      z.inst.model.rotation.x = -fall * fall * (Math.PI / 2);
    }
    const fade = z.deadTime - (ZOMBIE.corpseTime - 1);
    if (fade > 0) z.inst.root.scale.setScalar(Math.max(0.001, z.baseScale * (1 - fade)));
    return z.deadTime >= ZOMBIE.corpseTime;
  }

  /**
   * Cambia el estado de animación (idle, walk, run) y sincroniza la cadencia
   * de los pies (timeScale) de acuerdo a la velocidad física para evitar que patinen.
   */
  private setMotion(z: Zombie, moving: boolean, running: boolean, speed: number) {
    z.currentSpeed = moving ? speed : 0;
    const targetState: ZombieAnimState = !moving ? 'idle' : running ? 'run' : 'walk';

    // Ajustar cadencia según la velocidad actual
    if (targetState === 'run') {
      z.runAction.timeScale = THREE.MathUtils.clamp(speed / ZOMBIE.runClipSpeed, 0.45, 2.5);
    } else if (targetState === 'walk') {
      z.walkAction.timeScale = THREE.MathUtils.clamp(speed / ZOMBIE.walkClipSpeed, 0.45, 2.0);
    }

    if (z.animState === targetState) {
      z.moving = moving;
      z.running = running;
      return;
    }

    const actions: Record<ZombieAnimState, THREE.AnimationAction> = {
      idle: z.idleAction,
      walk: z.walkAction,
      run: z.runAction,
    };

    const prev = actions[z.animState];
    const next = actions[targetState];

    next.enabled = true;
    next.reset().play();
    next.crossFadeFrom(prev, 0.25, false);

    z.animState = targetState;
    z.moving = moving;
    z.running = running;
  }

  /**
   * Evalúa si un zombi detecta a un objetivo según su campo de visión frontal corto,
   * proximidad física inmediata ("enseguida del zombi") y modo de movimiento (sigilo vs normal vs carrera).
   */
  private checkPlayerDetection(
    z: Zombie,
    tx: number,
    tz: number,
    profile: ZombieTierProfile,
    isStealth: boolean,
    isRunning: boolean
  ): boolean {
    const dx = tx - z.x;
    const dz = tz - z.z;
    const dist = Math.hypot(dx, dz);

    // 1. Proximidad física inmediata (menos de 1.8 metros: enseguida del zombi).
    // Si estás pegado a él, te detecta incondicionalmente aunque estés en sigilo.
    if (dist <= 1.8) {
      return true;
    }

    // 2. Campo de visión corto frontal
    if (dist <= profile.visionDist) {
      // Vector frontal del zombi (en Three.js con rotación Y: x = sin(rot), z = cos(rot))
      const fwdX = Math.sin(z.rot);
      const fwdZ = Math.cos(z.rot);
      const toTargetX = dx / dist;
      const toTargetZ = dz / dist;
      const dot = toTargetX * fwdX + toTargetZ * fwdZ;

      if (dot >= profile.visionCosAngle) {
        // Dentro del cono visual frontal: comprobar si obstáculos opacos (paredes, cabañas) bloquean la visión
        const obs = this.world.raycastObstacle(z.x, z.z, toTargetX, toTargetZ, dist);
        const hasLineOfSight = obs === null || obs >= dist - 0.2;
        if (hasLineOfSight) {
          // El zombi te ve directamente en su campo de visión corto (incluso si estás en sigilo)
          return true;
        }
      }
    }

    // 3. Detección por sonido / paso fuera del campo de visión:
    // Si camina en sigilo: los pasos no hacen ruido, NO lo detecta fuera de su campo de visión.
    if (isStealth) {
      return false;
    }

    // Caminata normal o carrera ruidosa: los pasos producen sonido radial
    const hearingRadius = isRunning ? profile.runHearingRadius : profile.normalHearingRadius;
    if (dist <= hearingRadius) {
      return true;
    }

    return false;
  }

  private wander(
    z: Zombie,
    dt: number,
    px: number,
    pz: number,
    otherPlayers?: { x: number; z: number; isStealth?: boolean; isRunning?: boolean }[],
    localPlayerStatus?: { isStealth: boolean; isRunning: boolean }
  ) {
    // Aturdido por un impacto: se queda quieto un instante
    if (z.stun > 0) {
      z.stun -= dt;
      this.setMotion(z, false, false, 0);
      return;
    }

    const profile = ZOMBIE_TIERS[z.tier];

    // Detección: 1. Jugador local con sigilo/visión
    const localDetected = this.checkPlayerDetection(
      z,
      px,
      pz,
      profile,
      localPlayerStatus?.isStealth ?? false,
      localPlayerStatus?.isRunning ?? false
    );

    let alertTarget: { x: number; z: number } | null = null;
    if (localDetected) {
      alertTarget = { x: px, z: pz };
    } else if (otherPlayers && otherPlayers.length > 0) {
      // 2. Supervivientes remotos en multijugador
      for (const op of otherPlayers) {
        const detected = this.checkPlayerDetection(
          z,
          op.x,
          op.z,
          profile,
          op.isStealth ?? false,
          op.isRunning ?? false
        );
        if (detected) {
          alertTarget = { x: op.x, z: op.z };
          break;
        }
      }
    }

    if (alertTarget) {
      z.alert = { x: alertTarget.x, z: alertTarget.z, timer: ZOMBIE.alertDuration };
    }

    // Alertado por un ruido o jugador: va hacia allí a su velocidad de carrera/alerta
    if (z.alert) {
      z.alert.timer -= dt;
      if (z.attackCooldown > 0) {
        z.attackCooldown -= dt;
      }
      const ax = z.alert.x - z.x;
      const az = z.alert.z - z.z;
      const distToAlert = Math.hypot(ax, az);

      if (z.alert.timer <= 0) {
        z.alert = null;
        z.timer = 0;
      } else if (distToAlert < 1.35) {
        // Al estar a distancia de contacto, reduce velocidad y ataca al jugador
        z.targetRot = Math.atan2(ax, az);
        this.setMotion(z, true, false, z.wanderSpeed * 0.35);
        if (z.attackCooldown <= 0) {
          z.attackAction.reset().play();
          z.attackCooldown = 1.25;
          this.onPlayerAttacked?.(z, 10);
        }
      } else {
        z.targetRot = Math.atan2(ax, az);
        // Al perseguir, se activa la animación de correr con la velocidad de su tier
        this.setMotion(z, true, true, z.alertSpeed);
      }
    }

    // Modo deambular pacífico si no está alertado
    z.timer -= dt;
    if (!z.alert && z.timer <= 0) {
      const willMove = Math.random() < 0.70;
      if (!willMove) {
        this.setMotion(z, false, false, 0);
        z.timer = 1.2 + Math.random() * 3.0;
      } else {
        // Decide si corre o camina al deambular según el perfil del tipo de zombi
        const willRun = Math.random() < profile.wanderRunChance;
        const spd = willRun ? z.wanderSpeed * 1.35 : z.wanderSpeed;
        this.setMotion(z, true, willRun, spd);
        z.targetRot = Math.random() * Math.PI * 2;
        z.timer = 2.0 + Math.random() * 4.5;
      }
    }

    // Girar suavemente hacia el rumbo objetivo (más rápido si corre tras una presa o es súper rápido)
    const turnRate = z.alert ? (z.tier === 'super_fast' ? 7.5 : 5.5) : 2.5;
    const diff = Math.atan2(Math.sin(z.targetRot - z.rot), Math.cos(z.targetRot - z.rot));
    z.rot += diff * Math.min(1, dt * turnRate);

    if (z.moving && z.currentSpeed > 0) {
      const nx = z.x + Math.sin(z.rot) * z.currentSpeed * dt;
      const nz = z.z + Math.cos(z.rot) * z.currentSpeed * dt;
      const fixed = this.world.resolveCollision(nx, nz, ZOMBIE.radius);
      // Si una pared lo frenó, elegir otro rumbo enseguida
      if (Math.hypot(fixed.x - nx, fixed.z - nz) > 0.005) {
        z.timer = 0;
      }
      z.x = fixed.x;
      z.z = fixed.z;
    }

    z.inst.root.position.set(z.x, 0, z.z);
    z.inst.root.rotation.y = z.rot;
  }

  /** Solo los cercanos proyectan sombra (el mapa de sombras apenas cubre ~50 m). */
  private applyShadows(z: Zombie) {
    const want = z.d < ZOMBIE.shadowDist;
    if (want === z.shadows) return;
    z.shadows = want;
    z.inst.model.traverse((o: any) => {
      if (o.isMesh && o.userData.canCast) o.castShadow = want;
    });
  }

  private removeZombie(z: Zombie) {
    this.zombiesById.delete(z.id);
    if (z.ragdoll) {
      this.ragdolls.removeRagdoll(z.ragdoll);
      z.ragdoll = null;
    }
    z.mixer.stopAllAction();
    z.mixer.uncacheRoot(z.inst.model);
    disposeMikuInstance(z.inst);
  }

  /** Encuentra un zombi por ID o el más cercano a las coordenadas */
  findZombie(id: string, x?: number, z?: number): Zombie | undefined {
    let zb = this.zombiesById.get(id);
    if (!zb && x !== undefined && z !== undefined) {
      let bestDist = 3.5;
      for (const candidate of this.zombies) {
        const d = Math.hypot(candidate.x - x, candidate.z - z);
        if (d < bestDist) {
          bestDist = d;
          zb = candidate;
        }
      }
    }
    return zb;
  }

  /** Aplica un impacto recibido por la red desde otro jugador */
  applyRemoteHit(hit: { zombieId: string; damage: number; impulseX: number; impulseY: number; impulseZ: number; isKilled: boolean; zombieX?: number; zombieZ?: number }) {
    const z = this.findZombie(hit.zombieId, hit.zombieX, hit.zombieZ);
    if (!z || z.dead) return;

    z.health = Math.max(0, z.health - hit.damage);
    z.stun = 0.3;
    const impulse = new THREE.Vector3(hit.impulseX, hit.impulseY, hit.impulseZ);

    if (hit.isKilled || z.health <= 0) {
      this.kill(z, impulse, 0.5);
      this.kills++;
    }
  }

  /** Alerta un zombi a una posición dada recibida por la red */
  applyRemoteAlert(zombieId: string, x: number, z: number) {
    const zb = this.findZombie(zombieId, x, z);
    if (!zb || zb.dead) return;
    zb.alert = { x, z, timer: ZOMBIE.alertDuration };
  }

  /** Sincroniza las posiciones de los zombis recibidas por la red */
  applyRemoteSync(states: { id: string; x: number; z: number; rot: number; speed: number; animState: string; health: number; dead: boolean }[]) {
    for (const s of states) {
      const z = this.findZombie(s.id, s.x, s.z);
      if (!z) continue;

      if (s.dead && !z.dead) {
        this.kill(z);
        continue;
      }
      if (z.dead) continue;

      // Suavizar posición hacia la transmitida
      z.x += (s.x - z.x) * 0.35;
      z.z += (s.z - z.z) * 0.35;
      z.rot = s.rot;
      z.health = s.health;
      z.inst.root.position.set(z.x, 0, z.z);
      z.inst.root.rotation.y = z.rot;
      this.setMotion(z, s.speed > 0.1, s.animState === 'run', s.speed);
    }
  }

  /** Devuelve los zombis activos cercanos para enviar paquete de sincronización */
  getActiveZombiesSync(maxCount = 20, maxDist = 35): any[] {
    const result: any[] = [];
    for (const z of this.zombies) {
      if (z.visible && !z.dead && z.d < maxDist) {
        result.push({
          id: z.id,
          x: z.x,
          z: z.z,
          rot: z.rot,
          speed: z.currentSpeed,
          animState: z.animState,
          health: z.health,
          dead: z.dead,
        });
        if (result.length >= maxCount) break;
      }
    }
    return result;
  }

  /** Limpia todos los zombis actuales (al cambiar de semilla / sala) */
  clearAllZombies() {
    for (const z of this.zombies) this.removeZombie(z);
    this.zombies = [];
    this.zombiesById.clear();
    this.queue = [];
    this.spawned.clear();
  }

  dispose() {
    this.disposed = true;
    this.ragdolls.dispose();
    for (const z of this.zombies) this.removeZombie(z);
    this.zombies = [];
    this.zombiesById.clear();
    this.queue = [];
    this.spawned.clear();
  }
}
