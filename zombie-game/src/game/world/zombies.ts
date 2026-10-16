import * as THREE from 'three';
import { WORLD } from './worldConfig';
import { chunkRng } from './random';
import { disposeMikuInstance, instantiateMiku, loadMikuTemplate, type MikuInstance, type MikuTemplate } from './mikuAssets';
import type { WorldManager } from './worldManager';
import type { ShotResult } from '../weapons/weapon';
import { RagdollManager, type ZombieRagdoll } from './zombieRagdoll';
import type { DrivableCar } from './vehicles';
import { loadAnimation } from './animationAssets';
import type { ZombieHitNetworkEvent, ZombieSyncDto } from '../network/networkTypes';
import { ZombieReplicaBook } from '../network/zombieReplication';

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

/**
 * Configuración general de comportamiento de todos los zombis.
 * Puedes modificar estos valores para ajustar la experiencia global.
 * Para restaurar los valores por defecto, copia los de los comentarios.
 */
export const ZOMBIE_BEHAVIOR = {
  // --- Deambular (cuando no detectan al jugador) ---
  wander: {
    // Probabilidad (0 a 1) de elegir la caminata súper lenta. Por defecto: 0.70
    superSlowProb: 0.70,
    
    // Velocidad de la caminata súper lenta (m/s). Por defecto: 0.4
    superSlowSpeed: 0.2,
    
    // Velocidad de la caminata rápida (m/s). Por defecto: 0.48
    fastSpeed: 0.3,
  },

  // --- Distribución de Spawns ---
  // Probabilidades acumulativas (0 a 1) para decidir el tipo de zombi.
  spawnThresholds: {
    extreme: 0.01,
    superFast: 0.30,
    fast: 0.70,
  },

  // --- Detección y Alerta ---
  detection: {
    // Distancia base (m) a la que te detectan "sí o sí" aunque no hagas ruido ni te vean (360 grados).
    immediateProximity: 1.8,
    // Si estás en sigilo, te puedes acercar mucho más por la espalda sin ser detectado.
    stealthProximity: 0.5,
    // Si estás en sigilo y en su campo de visión frontal, su rango de vista se multiplica por esto (0.5 = ven la mitad).
    stealthVisionMultiplier: 0.5,
    // Segundos que el zombi te sigue persiguiendo después de perderte de vista (y sonido). Por defecto: 10
    alertMemoryDuration: 10, 
  }
};

/** Carro de otro jugador (fantasma sincronizado por red) para que los zombis
 *  locales lo traten como sólido y lo ataquen visualmente. El daño real a su
 *  durabilidad lo aplica solo el conductor (autoridad); aquí solo animación.
 *  halfL/halfW = mitades de la carrocería (sin expandir). */
export interface RemoteCarInfo {
  isPassive?: boolean;
  x: number;
  z: number;
  heading: number;
  halfL: number;
  halfW: number;
}
/** Parámetros ajustables del empuje e impacto de carro sobre los zombis. */
export interface CarPushConfig {
  /** Multiplicador de empuje horizontal en la dirección de marcha del carro */
  force: number;
  /** Extra de vuelo vertical, escalado por velocidad (0 = solo base del coche) */
  lift: number;
  /** Dispersión lateral X/Z aleatoria en m/s (0 = línea recta pura) */
  scatter: number;
  /** Torsión / giros angulares en el aire */
  tumble: number;
}

export const DEFAULT_CAR_PUSH_CONFIG: CarPushConfig = {
  force: 1.0,
  lift: 3.0,
  scatter: 0.6,
  tumble: 3.0,
};

/**
 * ¿El segmento p0→p1 (en espacio local del carro: x=lateral, y=frontal)
 * toca la caja [-hx,hx]×[-hz,hz]? Sirve para no alargar la caja hacia
 * adelante (eso golpeaba 2 m antes del contacto) y aun así no atravesar
 * zombis a alta velocidad o con lag.
 */
function segmentHitsBox(
  x0: number, y0: number, x1: number, y1: number, hx: number, hz: number,
): boolean {
  if (Math.abs(x1) <= hx && Math.abs(y1) <= hz) return true;
  if (Math.abs(x0) <= hx && Math.abs(y0) <= hz) return true;
  const dx = x1 - x0;
  const dy = y1 - y0;
  let tmin = 0;
  let tmax = 1;
  // Eje X (lateral)
  if (Math.abs(dx) < 1e-9) {
    if (x0 < -hx || x0 > hx) return false;
  } else {
    let t1 = (-hx - x0) / dx;
    let t2 = (hx - x0) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  // Eje Y (frontal)
  if (Math.abs(dy) < 1e-9) {
    if (y0 < -hz || y0 > hz) return false;
  } else {
    let t1 = (-hz - y0) / dy;
    let t2 = (hz - y0) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

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
  /** Segundos que tarda en caer y que el cadáver permanece antes de desaparecer (30 min). */
  fallTime: 0.45,
  corpseTime: 1800,
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
let cachedZombieAssets: Assets | null = null;

export async function preloadZombieAssets(onItemLoaded?: (name: string) => void): Promise<Assets> {
  if (cachedZombieAssets) return cachedZombieAssets;

  onItemLoaded?.('Modelo zombi base');
  const base = await loadMikuTemplate('Running');

  const zombieAnimList: { key: string; label: string }[] = [
    { key: 'zombie_lento', label: 'Caminata lenta zombi' },
    { key: 'zombie_correr_1', label: 'Carrera zombi tipo 1' },
    { key: 'zombie_correr_2', label: 'Carrera zombi tipo 2' },
    { key: 'zombie_walk_fast', label: 'Caminata rápida zombi' },
    { key: 'correr', label: 'Carrera veloz zombi' },
    { key: 'reaccion_golpe', label: 'Impacto recibido zombi' },
    { key: 'zombie_attack', label: 'Ataque zombi' },
  ];

  const [slowWalk, run1, run2, walk, run, hit, attack] = await Promise.all(
    zombieAnimList.map(async ({ key, label }) => {
      const clip = await loadAnimation(key as any);
      onItemLoaded?.(`Animación: ${label}`);
      return clip;
    })
  );

  cachedZombieAssets = {
    base,
    slowWalk,
    run1,
    run2,
    walk,
    run,
    idle: slowWalk,
    hit,
    attack,
  };
  return cachedZombieAssets;
}

function loadAssets(): Promise<Assets> {
  if (cachedZombieAssets) return Promise.resolve(cachedZombieAssets);
  if (!assetsPromise) {
    assetsPromise = preloadZombieAssets();
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

export interface Zombie {
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
  knockedDown?: boolean;
  recoverTimer?: number;
  /** Tiempo total desde que cayó (seguridad: fuerza la recuperación aunque la física no repose). */
  downTime?: number;
  /** Punto de ruido / jugador hacia el que va; null = deambula normal. */
  alert: { x: number; z: number; timer: number; playerId?: string | null } | null;
  /** Aturdimiento tras un impacto (s). */
  stun: number;
  hit: THREE.Mesh;
  baseScale: number;
  ragdoll?: ZombieRagdoll | null;
  carAttackTimer?: number;
  carHitCooldown?: number;
  lastPhysics?: { x: number; z: number; rot: number; tumble: number; seed: number; impulse: THREE.Vector3 };
  networkCombatVersion?: number;
  pendingBurnDamage?: number;
}

export class ZombieManager {
  private zombies: Zombie[] = [];
  private zombiesById = new Map<string, Zombie>();
  private queue: SpawnRequest[] = [];
  private spawned = new Set<string>();
  private assets: Assets | null = null;
  private ragdolls = new RagdollManager();
  private disposed = false;
  private networkRoom: string | null = null;
  private connectionId: string | null = null;
  private readonly replicas = new ZombieReplicaBook();
  private readonly candidates = new Map<string, SpawnRequest>();
  private syncCursor = 0;
  private candidateCursor = 0;
  private localX = 0;
  private localZ = 0;

  setNetworkSession(room: string | null, connectionId: string | null) {
    if (room !== this.networkRoom) {
      this.clearAllZombies();
      this.replicas.clear();
      this.candidates.clear();
    }
    this.networkRoom = room;
    this.connectionId = connectionId;
  }

  private isAuthority(z: Zombie): boolean {
    return !this.networkRoom ||
      this.replicas.states.get(z.id)?.ownerConnectionId === this.connectionId;
  }

  private enqueue(req: SpawnRequest) {
    if (this.zombiesById.has(req.id) || this.queue.some((r) => r.id === req.id)) return;
    if (this.networkRoom) {
      if (!this.replicas.states.has(req.id) && this.candidates.size < 4096)
        this.candidates.set(req.id, req);
    } else this.queue.push(req);
  }
  /** Última posición del carro conducido: para el test barrido que evita
   *  túneles sin disparar el golpe metros antes del contacto visual. */
  private lastCarId: string | null = null;
  private lastCarX = 0;
  private lastCarZ = 0;
  carPushConfig: CarPushConfig = { ...DEFAULT_CAR_PUSH_CONFIG };
  /** Debug: zombis deambulan pero no detectan, persiguen ni atacan. */
  private _passiveMode = false;
  get passiveMode() {
    return this._passiveMode;
  }
  set passiveMode(on: boolean) {
    this._passiveMode = on;
    if (on) this.clearAllAlerts();
  }
  public onZombieHit?: (hit: Omit<ZombieHitNetworkEvent, 'attackerConnectionId' | 'attackerNickname'>) => void;
  public onPlayerAttacked?: (z: Zombie, damage: number) => void;

  /** Quita alertas/persecuciones activas (p. ej. al activar modo pasivo). */
  clearAllAlerts() {
    for (const z of this.zombies) {
      if (z.dead) continue;
      if (this.networkRoom && z.alert?.playerId !== this.connectionId) continue;
      z.alert = null;
      z.attackCooldown = 0;
    }
  }

  constructor(
    private scene: THREE.Scene,
    private world: WorldManager,
  ) {
    if (cachedZombieAssets) {
      this.assets = cachedZombieAssets;
    } else {
      loadAssets()
        .then((a) => {
          if (!this.disposed) this.assets = a;
        })
        .catch((err) => console.error('[zombie-game] No se pudieron cargar los modelos de zombis:', err));
    }
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
    otherPlayers?: { x: number; z: number; connectionId?: string; isPassive?: boolean; isStealth?: boolean; isRunning?: boolean }[],
    localPlayerStatus?: { isStealth: boolean; isRunning: boolean },
    remoteCars?: RemoteCarInfo[],
  ) {
    this.localX = px;
    this.localZ = pz;
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
    if (this.networkRoom) {
      // Entidades ausentes se materializan por ID desde el registro, incluso cadáveres.
      const nearby = [...this.replicas.states.values()]
        .filter((s) => !s.removed && !this.zombiesById.has(s.id) &&
          Math.hypot(s.x - px, s.z - pz) < 160)
        .sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz));
      for (const s of nearby.slice(0, ZOMBIE.spawnsPerFrame)) {
        if (this.zombies.length >= 640) break;
        this.spawn(this.requestFromState(s));
        const z = this.zombiesById.get(s.id);
        if (z) this.applyNetworkState(z, s, true);
      }
    }
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
        if (this.networkRoom && !this.isAuthority(z)) this.updateReplica(z, dt, px, pz, drv);
        else this.followHips(z);
        if (this.updateCorpse(z, dt) && !this.networkRoom) {
          this.removeZombie(z);
          this.zombies.splice(i, 1);
        }
        continue;
      }
      // Tumbado por un carro: la física ragdoll manda. No deambula ni anima;
      // sigue a las caderas físicas y espera a reponerse donde caiga.
      if (z.knockedDown) {
        if (this.isAuthority(z)) this.updateKnockedDown(z, dt);
        else this.updateReplica(z, dt, px, pz, drv);
        this.applyShadows(z);
        continue;
      }
      if (this.isAuthority(z)) this.wander(z, dt, px, pz, otherPlayers, localPlayerStatus, drv, remoteCars);
      else this.updateReplica(z, dt, px, pz, drv);
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
      const tier: ZombieTier = tierRoll < ZOMBIE_BEHAVIOR.spawnThresholds.extreme ? 'extreme' : tierRoll < ZOMBIE_BEHAVIOR.spawnThresholds.superFast ? 'super_fast' : tierRoll < ZOMBIE_BEHAVIOR.spawnThresholds.fast ? 'fast' : 'slow';
      const profile = ZOMBIE_TIERS[tier];

      const wanderSpeed = profile.minWanderSpeed + rng() * (profile.maxWanderSpeed - profile.minWanderSpeed);
      const alertSpeed = profile.alertSpeed * (0.94 + rng() * 0.12);

      // Ligera variación de altura según la complexión
      const heightVar = tier === 'extreme' ? 0.95 + rng() * 0.07 : tier === 'slow' ? 1.02 + rng() * 0.10 : 0.96 + rng() * 0.09;
      const phase = rng();
      if (!this.networkRoom && Math.hypot(x - px, z - pz) < ZOMBIE.safeSpawnDist) continue;
      const id = `z_${cx}_${cz}_${i}`;
      this.enqueue({ id, x, z, rot, tier, wanderSpeed, alertSpeed, heightVar, phase });
    }
  }

  private spawn(req: SpawnRequest) {
    if (!this.assets || this.zombiesById.has(req.id)) return;
    const pos = this.networkRoom ? { x: req.x, z: req.z } :
      this.world.resolveCollision(req.x, req.z, ZOMBIE.radius + 0.1);
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
      const tier: ZombieTier = tierRoll < ZOMBIE_BEHAVIOR.spawnThresholds.extreme ? 'extreme' : tierRoll < ZOMBIE_BEHAVIOR.spawnThresholds.superFast ? 'super_fast' : tierRoll < ZOMBIE_BEHAVIOR.spawnThresholds.fast ? 'fast' : 'slow';
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
      this.enqueue(req);
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
    this.enqueue(req);
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
      if (z.dead || z.knockedDown || !z.visible) continue;
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
      const dir = res.direction.clone().normalize();
      const bulletImpulse = dir.multiplyScalar(res.melee ? 6.5 : 4.0);
      bulletImpulse.y += res.melee ? 2.5 : 1.2;

      // Si estaba tumbado por un carro, el disparo empuja el ragdoll en vuelo/suelo.
      if (z.knockedDown) {
        this.pushRagdoll(z, bulletImpulse, 2.0);
        if (z.health <= 0) {
          this.kill(z, bulletImpulse);
          kills++;
          this.emitHit(z, od.damage, true, bulletImpulse, false);
        } else {
          this.emitHit(z, od.damage, false, bulletImpulse, false);
        }
        continue;
      }

      z.stun = res.melee ? 0.5 : 0.25;
      if (!this._passiveMode)
        z.alert = { x: res.muzzle.x, z: res.muzzle.z, timer: ZOMBIE_BEHAVIOR.detection.alertMemoryDuration,
          playerId: this.connectionId };

      if (z.health <= 0) {
        this.kill(z, bulletImpulse);
        kills++;
        this.emitHit(z, od.damage, true, bulletImpulse, false);
      } else {
        z.hitAction.reset().play();
        this.emitHit(z, od.damage, false, bulletImpulse, false);
      }
    }
    this.kills += kills;
    return { hits, kills, headshots };
  }

  /**
   * Detecta atropellos con el vehículo en movimiento.
   * - El golpe salta EN el contacto visual (caja ajustada al chasis), no metros
   *   antes: el anti-túnel es un segmento prev→curr, no una caja alargada.
   * - El vuelo depende de la velocidad y masa del carro: toque lento = empujón
   *   corto; a velocidad lo lanza lejos y alto.
   * - Donde cae, tras reposar un instante, se levanta y retoma la persecución.
   * - Parado o muy despacio (< 2 m/s), los zombis atacan el carro en vez de volar.
   */
  private checkCarCollisions(drv: DrivableCar, dt: number) {
    const spd = drv.speed; // con signo: + adelante, - reversa
    const absSpd = Math.abs(spd);

    const fx = Math.sin(drv.heading);
    const fz = Math.cos(drv.heading);
    const rx = Math.cos(drv.heading);
    const rz = -Math.sin(drv.heading);

    // Caja de contacto visual: morro real (paragolpes ≈ +0.14) + radio del
    // zombi (~0.4) menos un pequeño solape para que se vea el toque.
    // Antes: +0.45 más un barrido de hasta +2.2 m → volaba con 2 m de hueco.
    const halfL = drv.dims.L * 0.5 + 0.32;
    const halfW = drv.dims.W * 0.5 + 0.28;

    // Desplazamiento del carro este frame (para el segmento barrido).
    let carDispX = 0;
    let carDispZ = 0;
    if (this.lastCarId === (drv as { id?: string }).id) {
      carDispX = drv.x - this.lastCarX;
      carDispZ = drv.z - this.lastCarZ;
    }
    this.lastCarId = (drv as { id?: string }).id ?? null;
    this.lastCarX = drv.x;
    this.lastCarZ = drv.z;
    const carDisp = Math.hypot(carDispX, carDispZ);
    const hasSweep = carDisp > 0.02;

    const diag = Math.hypot(halfL, halfW);
    const maxReach = diag + carDisp + 0.6;

    const cfg = this.carPushConfig;
    const ATTACK_SPEED = 2.0;

    for (const z of this.zombies) {
      if (z.carHitCooldown !== undefined && z.carHitCooldown > 0) {
        z.carHitCooldown -= dt;
      }

      const dx = z.x - drv.x;
      const dz = z.z - drv.z;
      if (Math.hypot(dx, dz) > maxReach) continue;

      // Coordenadas locales respecto al carro (+adelante, +derecha)
      const localFwd = dx * fx + dz * fz;
      const localRight = dx * rx + dz * rz;
      const insideNow = Math.abs(localFwd) <= halfL && Math.abs(localRight) <= halfW;

      let hit = insideNow;
      if (!hit && hasSweep) {
        // ¿El segmento prev→curr del carro atravesó al zombi este frame?
        // Se evalúa en el marco local actual (el giro por frame es mínimo).
        const pdx = dx + carDispX;
        const pdz = dz + carDispZ;
        const prevFwd = pdx * fx + pdz * fz;
        const prevRight = pdx * rx + pdz * rz;
        hit = segmentHitsBox(prevRight, prevFwd, localRight, localFwd, halfW, halfL);
      }
      if (!hit) continue;

      // --- Carro parado o rodando muy despacio: los zombis vivos lo atacan ---
      // El daño lo aplica el ataque cuerpo a cuerpo en wander() (0.1% por
      // golpe); aquí solo se evita que el contacto a baja velocidad los
      // atraviese o los tumbe. Se comparte el enfriamiento para no duplicar.
      if (absSpd < ATTACK_SPEED) {
        if (z.dead || z.knockedDown) continue; // cadáveres y tumbados no atacan
        continue;
      }

      // --- Cadáver en el suelo: solo se arrastra si el coche va con fuerza ---
      if (z.dead) {
        if (absSpd < 3.0 || (z.carHitCooldown ?? 0) > 0 || !z.ragdoll) continue;
        z.carHitCooldown = 0.5; // no re-empujar cada frame mientras lo pisa
        const corpseLift = Math.min(3.0, 0.3 + cfg.lift * (absSpd / 18));
        const corpseImpulse = new THREE.Vector3(
          fx * spd * 0.85 * cfg.force + (Math.random() - 0.5) * cfg.scatter * 2,
          corpseLift,
          fz * spd * 0.85 * cfg.force + (Math.random() - 0.5) * cfg.scatter * 2,
        );
        this.pushRagdoll(z, corpseImpulse, cfg.tumble);
        this.emitHit(z, 0, true, corpseImpulse, true);
        continue;
      }

      // --- Zombi ya tumbado y volando: no re-aplicar daño, solo arrastrar ---
      if (z.knockedDown) {
        if ((z.carHitCooldown ?? 0) > 0 || !z.ragdoll) continue;
        if (absSpd < 4.0) continue; // rodando sobre él despacio no lo relanza
        z.carHitCooldown = 0.4;
        const dragLift = Math.min(3.0, 0.3 + cfg.lift * (absSpd / 18));
        const dragImpulse = new THREE.Vector3(
          fx * spd * 0.7 * cfg.force + (Math.random() - 0.5) * cfg.scatter,
          dragLift,
          fz * spd * 0.7 * cfg.force + (Math.random() - 0.5) * cfg.scatter,
        );
        this.pushRagdoll(z, dragImpulse, cfg.tumble);
        this.emitHit(z, 0, false, dragImpulse, true);
        continue;
      }

      // --- Zombi VIVO de pie atropellado a velocidad ---
      if ((z.carHitCooldown ?? 0) > 0) continue;
      z.carHitCooldown = 0.6; // evita acumular impactos en frames continuos

      const hitResult = drv.onHitZombie(z, spd, localRight);

      // Horizontal: empuje del coche (ya ∝ velocidad × masa) × slider.
      // Vertical: base del coche (∝ velocidad) + extra del slider escalado por
      // velocidad, para que a 2 m/s apenas salte y a 12+ m/s vuele alto.
      // Toque a ~2 m/s ≈ 0.6 m/s arriba (saltito); a 10 m/s ≈ 4 m/s (vuelo).
      const impulseY = Math.min(7.5, hitResult.impulse.y * 0.65 + cfg.lift * (absSpd / 14));
      const impulse = new THREE.Vector3(
        hitResult.impulse.x * cfg.force + (Math.random() - 0.5) * cfg.scatter * 2,
        impulseY,
        hitResult.impulse.z * cfg.force + (Math.random() - 0.5) * cfg.scatter * 2,
      );

      z.health = Math.max(0, z.health - hitResult.zombieDamage);

      if (z.health <= 0) {
        this.kill(z, impulse, cfg.tumble);
        this.kills++;
        this.emitHit(z, hitResult.zombieDamage, true, impulse, true);
      } else {
        this.knockDown(z, impulse, cfg.tumble);
        this.emitHit(z, hitResult.zombieDamage, false, impulse, true);
      }
    }
  }

  /** El ruido atrae a los zombis dentro del radio hacia el punto del disparo. */
  alertNoise(x: number, z: number, radius: number, sourcePassive = this._passiveMode,
    sourcePlayerId: string | null = this.connectionId) {
    if (sourcePassive || (!this.networkRoom && this._passiveMode)) return;
    for (const zb of this.zombies) {
      if (zb.dead) continue;
      if (Math.hypot(zb.x - x, zb.z - z) <= radius)
        zb.alert = { x, z, timer: ZOMBIE_BEHAVIOR.detection.alertMemoryDuration, playerId: sourcePlayerId };
    }
  }

  private recordPhysics(z: Zombie, impulse: THREE.Vector3, tumble = 3, seed?: number) {
    z.lastPhysics = { x: z.x, z: z.z, rot: z.rot, tumble,
      seed: seed ?? ((Math.random() * 0x7fffffff) | 0), impulse };
    return z.lastPhysics;
  }

  private pushRagdoll(z: Zombie, impulse: THREE.Vector3, tumble = 3) {
    const p = this.recordPhysics(z, impulse, tumble);
    z.ragdoll?.applyImpulse(impulse, tumble, p.seed);
  }

  private emitHit(z: Zombie, damage: number, killed: boolean, impulse: THREE.Vector3, isCar: boolean) {
    if (!this.networkRoom || !this.onZombieHit) return;
    const p = z.lastPhysics?.impulse === impulse ? z.lastPhysics : this.recordPhysics(z, impulse);
    const eventId = crypto.randomUUID();
    this.replicas.predict(eventId, z.id);
    this.onZombieHit?.({ eventId, zombieId: z.id, damage, isKilled: killed, isCarHit: isCar,
      zombieX: p.x, zombieZ: p.z, zombieRot: p.rot, tumble: p.tumble, physicsSeed: p.seed,
      impulseX: impulse.x, impulseY: impulse.y, impulseZ: impulse.z });
  }

  private kill(z: Zombie, impulse?: THREE.Vector3, tumble = 3, physicsSeed?: number) {
    if (z.dead) return;
    const p = this.recordPhysics(z, impulse ?? new THREE.Vector3(), tumble, physicsSeed);
    z.dead = true;
    z.deadTime = 0;
    z.moving = false;
    z.running = false;
    z.alert = null;
    z.knockedDown = false;
    z.recoverTimer = 0;
    z.downTime = 0;
    z.mixer.stopAllAction();
    z.mixer.uncacheRoot(z.inst.model);
    if (z.hit) {
      z.hit.visible = false;
      // Quitar del root si aún es hijo (puede haberse ocultado en knockDown)
      if (z.hit.parent === z.inst.root) z.inst.root.remove(z.hit);
    }
    // Si venía tumbado, reutilizar su posición actual y liberar el ragdoll viejo
    // para no crear dos simulaciones superpuestas del mismo cuerpo.
    if (z.ragdoll) {
      const hipsPos = z.ragdoll.getHipsPosition();
      if (hipsPos) {
        const fixed = this.world.resolveCollision(hipsPos.x, hipsPos.z, ZOMBIE.radius);
        z.x = fixed.x;
        z.z = fixed.z;
        z.inst.root.position.set(z.x, 0, z.z);
      }
      z.inst.model.position.set(0, 0, 0);
      z.inst.model.quaternion.identity();
      this.ragdolls.removeRagdoll(z.ragdoll);
      z.ragdoll = null;
    }
    z.ragdoll = this.ragdolls.createRagdoll(z.inst.model, impulse, tumble, p.seed);
  }

  /** Zombis (vivos por defecto) dentro de un radio. Lo usa el sistema de explosivos. */
  getZombiesNear(x: number, z: number, radius: number, aliveOnly = true): Zombie[] {
    const out: Zombie[] = [];
    for (const zb of this.zombies) {
      if (aliveOnly && (zb.dead || zb.knockedDown)) continue;
      if (Math.hypot(zb.x - x, zb.z - z) <= radius) out.push(zb);
    }
    return out;
  }

  /**
   * Daño de área con impulso (explosiones): si mata, ragdoll con el impulso;
   * si no, tumba igual que un atropello. Emite onZombieHit (isCar=true) para
   * replicar el vuelo en red por la vía existente de golpes con derribo.
   */
  applyBlastHit(z: Zombie, damage: number, impulse: THREE.Vector3) {
    if (!z) return;
    if (z.dead || z.knockedDown) {
      this.pushRagdoll(z, impulse, 3);
      this.emitHit(z, 0, z.dead, impulse, true);
      return;
    }
    z.health -= damage;
    z.stun = 0;
    if (z.health <= 0) {
      this.kill(z, impulse, 3.0);
      this.kills++;
      this.emitHit(z, damage, true, impulse, true);
    } else {
      this.knockDown(z, impulse, 3.0);
      this.emitHit(z, damage, false, impulse, true);
    }
  }

  /**
   * Tick de quemadura (fuego/DoT): daña sin aturdir ni tumbar para no
   * congelar al zombi; al morir cae con un leve impulso hacia arriba.
   */
  applyBurnTick(z: Zombie, damage: number) {
    if (!z || z.dead || z.knockedDown) return;
    if (this.networkRoom) {
      z.pendingBurnDamage = (z.pendingBurnDamage ?? 0) + damage;
      if (z.pendingBurnDamage < Math.min(10, z.health)) return;
      damage = z.pendingBurnDamage;
      z.pendingBurnDamage = 0;
    }
    z.health -= damage;
    if (z.health <= 0) {
      const up = new THREE.Vector3((Math.random() - 0.5) * 2, 2.5, (Math.random() - 0.5) * 2);
      this.kill(z, up, 2.0);
      this.kills++;
      this.emitHit(z, damage, true, up, false);
    } else {
      // Sin los ticks no letales el servidor nunca acumularía el daño del fuego.
      this.emitHit(z, damage, false, new THREE.Vector3(), false);
    }
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
    // Si la velocidad es muy baja (<= 0.45), usamos 'idle' (caminata lentísima)
    // Si es mayor, usamos 'walk' (walk_fast). Si está corriendo, 'run'.
    let targetState: ZombieAnimState = 'idle';
    if (moving && speed > 0.45) {
      targetState = running ? 'run' : 'walk';
    }

    // Ajustar cadencia según la velocidad actual
    if (targetState === 'run') {
      z.runAction.timeScale = THREE.MathUtils.clamp(speed / ZOMBIE.runClipSpeed, 0.45, 2.5);
    } else if (targetState === 'walk') {
      z.walkAction.timeScale = THREE.MathUtils.clamp(speed / ZOMBIE.walkClipSpeed, 0.45, 2.0);
    } else if (targetState === 'idle') {
      // Para caminata lentísima, ajustamos su timeScale para que no patine
      z.idleAction.timeScale = THREE.MathUtils.clamp((speed || 0.5) / 0.8, 0.5, 1.5);
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

    // 1. Proximidad física inmediata (enseguida del zombi).
    // Si estás en sigilo, puedes acercarte más por la espalda sin ser detectado.
    const proxLimit = isStealth 
      ? ZOMBIE_BEHAVIOR.detection.stealthProximity 
      : ZOMBIE_BEHAVIOR.detection.immediateProximity;
      
    if (dist <= proxLimit) {
      return true;
    }

    // 2. Campo de visión frontal
    // Si estás en sigilo, su rango de visión disminuye drásticamente.
    const actualVisionDist = isStealth 
      ? profile.visionDist * ZOMBIE_BEHAVIOR.detection.stealthVisionMultiplier 
      : profile.visionDist;

    if (dist <= actualVisionDist) {
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
          // El zombi te ve directamente en su campo de visión (incluso en sigilo si estás muy cerca de frente)
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

  /**
   * Empuja al zombi fuera de un rectángulo de carro (círculo vs OBB).
   * Así los carros son sólidos para ellos: los rodean en vez de atravesarlos.
   * Devuelve true si corrigió posición.
   */
  private pushOutOfCarRect(
    z: Zombie, cx: number, cz: number, heading: number, halfL: number, halfW: number,
  ): boolean {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    // Centro del zombi contra carro expandido por el radio corporal.
    const solidHalfL = halfL + ZOMBIE.radius;
    const solidHalfW = halfW + ZOMBIE.radius;
    const dx = z.x - cx;
    const dz = z.z - cz;
    const lf = dx * fx + dz * fz;
    const lr = dx * rx + dz * rz;
    if (Math.abs(lf) > solidHalfL || Math.abs(lr) > solidHalfW) return false;
    const penFwd = solidHalfL - Math.abs(lf);
    const penRight = solidHalfW - Math.abs(lr);
    if (penFwd < penRight) {
      const s = lf >= 0 ? 1 : -1;
      z.x += fx * s * penFwd;
      z.z += fz * s * penFwd;
    } else {
      const s = lr >= 0 ? 1 : -1;
      z.x += rx * s * penRight;
      z.z += rz * s * penRight;
    }
    return true;
  }

  private pushOutOfDrivenCar(z: Zombie, drv: DrivableCar): boolean {
    return this.pushOutOfCarRect(z, drv.x, drv.z, drv.heading, drv.dims.L * 0.5, drv.dims.W * 0.5);
  }

  /**
   * Distancia del centro del zombi a la chapa de un carro + punto más cercano
   * de la carrocería en mundo. Sirve para detenerse a golpear el borde en vez
   * de caminar hasta el centro donde está el jugador.
   */
  private carRectEdgeInfo(
    zx: number, zz: number, cx: number, cz: number, heading: number, halfL: number, halfW: number,
  ): { surfaceDist: number; nx: number; nz: number } {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const rx = Math.cos(heading);
    const rz = -Math.sin(heading);
    const dx = zx - cx;
    const dz = zz - cz;
    const lf = dx * fx + dz * fz;
    const lr = dx * rx + dz * rz;
    const clf = THREE.MathUtils.clamp(lf, -halfL, halfL);
    const clr = THREE.MathUtils.clamp(lr, -halfW, halfW);
    const surfaceDist = Math.hypot(lf - clf, lr - clr);
    const c = Math.cos(heading);
    const s = Math.sin(heading);
    return { surfaceDist, nx: cx + clr * c + clf * s, nz: cz - clr * s + clf * c };
  }

  private carEdgeInfo(z: Zombie, drv: DrivableCar): { surfaceDist: number; nx: number; nz: number } {
    return this.carRectEdgeInfo(z.x, z.z, drv.x, drv.z, drv.heading, drv.dims.L * 0.5, drv.dims.W * 0.5);
  }

  private wander(
    z: Zombie,
    dt: number,
    px: number,
    pz: number,
    otherPlayers?: { x: number; z: number; connectionId?: string; isPassive?: boolean; isStealth?: boolean; isRunning?: boolean }[],
    localPlayerStatus?: { isStealth: boolean; isRunning: boolean },
    drv?: DrivableCar | null,
    remoteCars?: RemoteCarInfo[],
  ) {
    // Aturdido por un impacto: se queda quieto un instante
    if (z.stun > 0) {
      z.stun -= dt;
      this.setMotion(z, false, false, 0);
      return;
    }

    // Modo pasivo (debug): sin detección, persecución ni ataques; solo deambular.
    if (this._passiveMode && !this.networkRoom) {
      z.alert = null;
      z.attackCooldown = 0;
      this.wanderPeaceful(z, dt, drv, remoteCars);
      return;
    }

    const profile = ZOMBIE_TIERS[z.tier];

    // Detección: 1. Jugador local con sigilo/visión
    const localDetected = !this._passiveMode && this.checkPlayerDetection(
      z,
      px,
      pz,
      profile,
      localPlayerStatus?.isStealth ?? false,
      localPlayerStatus?.isRunning ?? false
    );

    let alertTarget: { x: number; z: number; playerId?: string | null } | null = null;
    if (localDetected) {
      alertTarget = { x: px, z: pz, playerId: this.connectionId };
    } else if (otherPlayers && otherPlayers.length > 0) {
      // 2. Supervivientes remotos en multijugador
      for (const op of otherPlayers) {
        if (op.isPassive) continue;
        const detected = this.checkPlayerDetection(
          z,
          op.x,
          op.z,
          profile,
          op.isStealth ?? false,
          op.isRunning ?? false
        );
        if (detected) {
          alertTarget = { x: op.x, z: op.z, playerId: op.connectionId };
          break;
        }
      }
    }

    if (z.alert && ((this._passiveMode && z.alert.playerId === this.connectionId) ||
        otherPlayers?.some((op) => op.isPassive && op.connectionId === z.alert?.playerId))) {
      z.alert = null;
      z.timer = 0;
    }
    if (alertTarget) {
      z.alert = { ...alertTarget, timer: ZOMBIE_BEHAVIOR.detection.alertMemoryDuration };
    }

    // Alertado por un ruido o jugador: va hacia allí a su velocidad de carrera/alerta
    if (z.alert) {
      z.alert.timer -= dt;
      if (z.attackCooldown > 0) {
        z.attackCooldown -= dt;
      }
      // ¿El objetivo es un jugador dentro de un carro (local o remoto)?
      // player.x/z == carro cuando se conduce, así que el alert cae en el
      // centro del coche: hay que pelear contra la chapa, no contra el centro.
      let chaseLocalCar = false;
      let chaseRemote: RemoteCarInfo | null = null;
      if (drv && !this._passiveMode && Math.hypot(z.alert.x - drv.x, z.alert.z - drv.z) < Math.hypot(drv.dims.L, drv.dims.W) * 0.5 + 1.0) {
        chaseLocalCar = true;
      } else if (remoteCars) {
        for (const rc of remoteCars) {
          if (rc.isPassive) continue;
          if (Math.hypot(z.alert.x - rc.x, z.alert.z - rc.z) < Math.hypot(rc.halfL * 2, rc.halfW * 2) * 0.5 + 1.0) {
            chaseRemote = rc;
            break;
          }
        }
      }
      const carProtects =
        chaseLocalCar && !!drv && drv.currentDurability > 0 && drv.lockState !== 'broken';

      if (z.alert.timer <= 0) {
        z.alert = null;
        z.timer = 0;
      } else if (carProtects && drv) {
        // Jugador local protegido: el zombi rodea el carro (sólido) y golpea la
        // carrocería (~0.1% por golpe) en vez de herir al conductor.
        const edge = this.carEdgeInfo(z, drv);
        if (edge.surfaceDist < 1.55) {
          z.targetRot = Math.atan2(edge.nx - z.x, edge.nz - z.z);
          this.setMotion(z, true, false, z.wanderSpeed * 0.35);
          if (z.attackCooldown <= 0) {
            z.attackAction.reset().play();
            z.attackCooldown = 1.25;
            drv.onAttackedByZombie((drv.config.maxDurability * 0.001) / 1.80);
          }
        } else {
          z.targetRot = Math.atan2(edge.nx - z.x, edge.nz - z.z);
          this.setMotion(z, true, true, z.alertSpeed);
        }
      } else if (chaseRemote) {
        // Carro de OTRO jugador: sólido y con animación de ataque al borde,
        // pero sin daño local (el daño a su chapa lo aplica el conductor,
        // autoridad del vehículo; aquí solo lo visual).
        const rc = chaseRemote;
        const edge = this.carRectEdgeInfo(z.x, z.z, rc.x, rc.z, rc.heading, rc.halfL, rc.halfW);
        if (edge.surfaceDist < 1.55) {
          z.targetRot = Math.atan2(edge.nx - z.x, edge.nz - z.z);
          this.setMotion(z, true, false, z.wanderSpeed * 0.35);
          if (z.attackCooldown <= 0) {
            z.attackAction.reset().play();
            z.attackCooldown = 1.25;
          }
        } else {
          z.targetRot = Math.atan2(edge.nx - z.x, edge.nz - z.z);
          this.setMotion(z, true, true, z.alertSpeed);
        }
      } else {
        const ax = z.alert.x - z.x;
        const az = z.alert.z - z.z;
        const distToAlert = Math.hypot(ax, az);

        if (distToAlert < 1.35) {
          // Al estar a distancia de contacto, reduce velocidad y ataca.
          // (A pie, o carro ya destruido: sin chapa que lo proteja).
          // El daño solo entra si la presa sigue ahí: el alert es memoria
          // (hasta 10 s) y si el jugador ya se fue —p. ej. subió al carro y
          // arrancó— el zarpazo va al aire y no debe herir a distancia.
          // Esto también evita que un ataque a un jugador remoto le quite
          // vida al conductor local en multijugador.
          z.targetRot = Math.atan2(ax, az);
          this.setMotion(z, true, false, z.wanderSpeed * 0.35);
          if (z.attackCooldown <= 0) {
            z.attackAction.reset().play();
            z.attackCooldown = 1.25;
            const victimStillThere = Math.hypot(z.x - px, z.z - pz) < 2.0;
            if (victimStillThere && !this._passiveMode &&
                (!z.alert.playerId || z.alert.playerId === this.connectionId)) this.onPlayerAttacked?.(z, 10);
          }
        } else {
          z.targetRot = Math.atan2(ax, az);
          // Al perseguir, se activa la animación de correr con la velocidad de su tier
          this.setMotion(z, true, true, z.alertSpeed);
        }
      }
    }

    // Modo deambular pacífico si no está alertado
    this.finishWanderMotion(z, dt, !!z.alert, drv, remoteCars);
  }

  /** Solo deambular (sin alerta): usado en modo pasivo y al acabar la memoria de alerta. */
  private wanderPeaceful(
    z: Zombie,
    dt: number,
    drv?: DrivableCar | null,
    remoteCars?: RemoteCarInfo[],
  ) {
    this.finishWanderMotion(z, dt, false, drv, remoteCars);
  }

  private finishWanderMotion(
    z: Zombie,
    dt: number,
    alerted: boolean,
    drv?: DrivableCar | null,
    remoteCars?: RemoteCarInfo[],
  ) {
    z.timer -= dt;
    if (!z.alert && z.timer <= 0) {
      const isSuperSlow = Math.random() < ZOMBIE_BEHAVIOR.wander.superSlowProb;
      if (isSuperSlow) {
        this.setMotion(z, true, false, ZOMBIE_BEHAVIOR.wander.superSlowSpeed);
        z.targetRot = Math.random() * Math.PI * 2;
        z.timer = 3.0 + Math.random() * 4.0;
      } else {
        this.setMotion(z, true, false, ZOMBIE_BEHAVIOR.wander.fastSpeed);
        z.targetRot = Math.random() * Math.PI * 2;
        z.timer = 2.0 + Math.random() * 4.5;
      }
    }

    const turnRate = alerted ? (z.tier === 'super_fast' ? 7.5 : 5.5) : 2.5;
    const diff = Math.atan2(Math.sin(z.targetRot - z.rot), Math.cos(z.targetRot - z.rot));
    z.rot += diff * Math.min(1, dt * turnRate);

    if (z.moving && z.currentSpeed > 0) {
      const nx = z.x + Math.sin(z.rot) * z.currentSpeed * dt;
      const nz = z.z + Math.cos(z.rot) * z.currentSpeed * dt;
      const fixed = this.world.resolveCollision(nx, nz, ZOMBIE.radius);
      if (Math.hypot(fixed.x - nx, fixed.z - nz) > 0.005) {
        z.timer = 0;
      }
      z.x = fixed.x;
      z.z = fixed.z;
    }

    let pushed = false;
    if (drv) pushed = this.pushOutOfDrivenCar(z, drv) || pushed;
    if (remoteCars) {
      for (const rc of remoteCars) {
        pushed = this.pushOutOfCarRect(z, rc.x, rc.z, rc.heading, rc.halfL, rc.halfW) || pushed;
      }
    }
    if (pushed) {
      z.timer = Math.min(z.timer, 0.4);
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

    disposeMikuInstance(z.inst);
  }

  /** No sustituir nunca un ID ausente por el zombi vecino. */
  findZombie(id: string, _x?: number, _z?: number): Zombie | undefined {
    return this.zombiesById.get(id);
  }

  /** Alerta un zombi a una posición dada recibida por la red */
  applyRemoteAlert(zombieId: string, x: number, z: number) {
    if (this._passiveMode && !this.networkRoom) return;
    const zb = this.findZombie(zombieId, x, z);
    if (!zb || zb.dead) return;
    zb.alert = { x, z, timer: ZOMBIE_BEHAVIOR.detection.alertMemoryDuration };
  }

  private requestFromState(s: ZombieSyncDto): SpawnRequest {
    const tier = (s.tier && s.tier in ZOMBIE_TIERS ? s.tier : 'fast') as ZombieTier;
    const profile = ZOMBIE_TIERS[tier];
    return { id: s.id, x: s.x, z: s.z, rot: s.rot, tier,
      wanderSpeed: (profile.minWanderSpeed + profile.maxWanderSpeed) / 2,
      alertSpeed: profile.alertSpeed, heightVar: s.heightVar ?? 1, phase: 0 };
  }

  /** Guardar también entidades cuyo modelo todavía no existe. */
  applyRemoteSync(states: ZombieSyncDto[]) {
    for (const s of states) {
      this.candidates.delete(s.id);
      if (!this.replicas.states.has(s.id) && Math.hypot(s.x - this.localX, s.z - this.localZ) > 500) continue;
      const previousOwner = this.replicas.states.get(s.id)?.ownerConnectionId;
      if (!this.replicas.accept(s)) continue;
      const z = this.zombiesById.get(s.id);
      if (s.removed) {
        if (z) {
          this.removeZombie(z);
          this.zombies.splice(this.zombies.indexOf(z), 1);
        }
      } else if (z) {
        this.applyNetworkState(z, s, previousOwner !== s.ownerConnectionId && s.ownerConnectionId === this.connectionId);
        if (previousOwner !== s.ownerConnectionId && s.ownerConnectionId === this.connectionId)
          this.moveReplica(z, s.x, s.z);
      }
    }
  }

  private moveReplica(z: Zombie, x: number, targetZ: number) {
    if (z.ragdoll && !z.ragdoll.disposed) {
      const hips = z.ragdoll.getHipsPosition();
      if (hips) z.ragdoll.translate(x - hips.x, targetZ - hips.z);
      this.setPhysicalRoot(z, x, targetZ);
      return;
    }
    z.x = x;
    z.z = targetZ;
    z.inst.root.position.set(x, 0, targetZ);
  }

  private setPhysicalRoot(z: Zombie, x: number, targetZ: number) {
    // Mantener el modelo en mundo al mover el root, también con heading distinto de cero.
    const modelWorld = z.inst.model.getWorldPosition(new THREE.Vector3());
    z.x = x;
    z.z = targetZ;
    z.inst.root.position.set(x, 0, targetZ);
    z.inst.root.updateMatrixWorld(true);
    z.inst.model.position.copy(z.inst.root.worldToLocal(modelWorld));
    z.inst.model.updateMatrixWorld(true);
  }

  private applyNetworkState(z: Zombie, s: ZombieSyncDto, initial: boolean) {
    const hit = s.lastImpact;
    const freshHit = !!hit && (s.combatVersion ?? 0) > (z.networkCombatVersion ?? 0);
    const predicted = freshHit && this.replicas.wasPredicted(hit?.eventId);
    const pending = this.replicas.hasPendingFor(z.id);
    z.health = pending ? Math.min(z.health, s.health) : s.health;
    if (freshHit && !predicted && hit) {
      this.moveReplica(z, initial ? s.x : hit.zombieX ?? s.x, initial ? s.z : hit.zombieZ ?? s.z);
      z.rot = hit.zombieRot ?? s.rot;
      z.inst.root.rotation.y = z.rot;
      const settledCorpse = initial && s.dead && !!s.deadAt && Date.now() - s.deadAt > 2000;
      const impulse = settledCorpse ? new THREE.Vector3() :
        new THREE.Vector3(hit.impulseX, hit.impulseY, hit.impulseZ);
      const tumble = hit.tumble ?? 3;
      if (s.dead && !z.dead) {
        this.kill(z, impulse, tumble, hit.physicsSeed);
        this.kills++;
      } else if (z.dead || z.knockedDown) {
        z.ragdoll?.applyImpulse(impulse, tumble, hit.physicsSeed);
      } else if (s.knockedDown) {
        this.knockDown(z, impulse, tumble, hit.physicsSeed);
      } else {
        z.stun = 0.3;
        z.hitAction.reset().play();
      }
    }
    if (s.dead && !z.dead) this.kill(z);
    if (!s.dead && s.knockedDown && !z.knockedDown && (initial || !this.isAuthority(z)))
      this.knockDown(z, new THREE.Vector3(), 0, hit?.physicsSeed);
    if (!s.dead && !s.knockedDown && z.knockedDown && !predicted && !pending && (initial || !this.isAuthority(z))) {
      this.finishRecovery(z);
      this.moveReplica(z, s.x, s.z);
    }
    if (initial) this.moveReplica(z, s.x, s.z);
    if (s.deadAt) z.deadTime = Math.max(0, (Date.now() - s.deadAt) / 1000);
    z.networkCombatVersion = s.combatVersion ?? 0;
    // No sobrescribir decisiones de IA del autor con su eco atrasado.
    if (!this.isAuthority(z) || initial)
      z.alert = s.targetX != null && s.targetZ != null
        ? { x: s.targetX, z: s.targetZ, timer: ZOMBIE_BEHAVIOR.detection.alertMemoryDuration,
          playerId: s.targetPlayerId } : null;
  }

  private updateReplica(z: Zombie, dt: number, px: number, pz: number, drv?: DrivableCar | null) {
    const s = this.replicas.states.get(z.id);
    if (!s) return;
    const alpha = 1 - Math.exp(-18 * dt);
    this.moveReplica(z, z.x + (s.x - z.x) * alpha, z.z + (s.z - z.z) * alpha);
    const angle = s.rot - z.rot;
    z.rot += Math.atan2(Math.sin(angle), Math.cos(angle)) * alpha;
    z.inst.root.rotation.y = z.rot;
    if (z.dead || z.knockedDown) return;
    this.setMotion(z, s.speed > 0.01, s.animState === 'run', s.speed);
    z.attackCooldown = Math.max(0, z.attackCooldown - dt);
    if (this._passiveMode || s.targetX == null || s.targetZ == null || z.attackCooldown > 0) return;
    if (s.targetPlayerId && s.targetPlayerId !== this.connectionId) return;
    if (drv && Math.hypot(s.targetX - drv.x, s.targetZ - drv.z) < 4 &&
        this.carEdgeInfo(z, drv).surfaceDist < 1.55) {
      z.attackAction.reset().play();
      z.attackCooldown = 1.25;
      drv.onAttackedByZombie((drv.config.maxDurability * 0.001) / 1.80);
    } else if (!drv && Math.hypot(z.x - px, z.z - pz) < 2 &&
        Math.hypot(s.targetX - px, s.targetZ - pz) < 2) {
      z.attackAction.reset().play();
      z.attackCooldown = 1.25;
      this.onPlayerAttacked?.(z, 10);
    }
  }

  /** Lotes rotativos: incluir caídos y cadáveres, no siempre los primeros vivos. */
  getActiveZombiesSync(maxCount = 64, maxDist = 95): ZombieSyncDto[] {
    for (const [id, state] of this.replicas.states) {
      if (!this.zombiesById.has(id) && Math.hypot(state.x - this.localX, state.z - this.localZ) > 512)
        this.replicas.states.delete(id);
    }
    for (const [id, req] of this.candidates) {
      if (Math.hypot(req.x - this.localX, req.z - this.localZ) > 384) this.candidates.delete(id);
    }
    const result: ZombieSyncDto[] = [];
    const active = this.zombies.filter((z) => z.d <= maxDist);
    const budget = this.candidates.size ? Math.min(active.length, maxCount - 16) : maxCount;
    for (let i = 0; i < Math.min(budget, active.length); i++) {
      const z = active[(this.syncCursor + i) % active.length];
      const canonical = this.replicas.states.get(z.id);
      if (!canonical) continue;
      // Réplicas proponen su copia canónica solo para reclamar una concesión expirada.
      result.push(this.isAuthority(z) ? { ...canonical, x: z.x, z: z.z, rot: z.rot,
        speed: z.currentSpeed, animState: z.animState, knockedDown: !!z.knockedDown,
        targetX: z.alert?.x, targetZ: z.alert?.z, targetPlayerId: z.alert?.playerId,
        lastImpact: null } : { ...canonical, lastImpact: null });
    }
    this.syncCursor += Math.min(budget, active.length);
    const pending = [...this.candidates.values()];
    const remaining = Math.min(maxCount - result.length, pending.length);
    for (let i = 0; i < remaining; i++) {
      const req = pending[(this.candidateCursor + i) % pending.length];
      result.push({ id: req.id, x: req.x, z: req.z, rot: req.rot, speed: 0,
        animState: 'idle', health: 100, dead: false, tier: req.tier, heightVar: req.heightVar });
    }
    this.candidateCursor += remaining;
    return result;
  }

  /** Limpia todos los zombis actuales (al cambiar de semilla / sala) */
  clearAllZombies() {
    for (const z of this.zombies) this.removeZombie(z);
    this.zombies = [];
    this.zombiesById.clear();
    this.queue = [];
    this.spawned.clear();
    this.candidates.clear();
    this.replicas.clear();
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

  /**
   * Onda de choque de resurrección: lanza en radial a los zombis del radio con
   * la misma física del atropello (ragdoll + se levantan), pero SIN matarlos:
   * no hace daño ni cuenta bajas. Los ya tumbados reciben empuje extra y los
   * cadáveres se arrastran. Emite onZombieHit con daño 0 para replicarlo en red.
   */
  blastWave(cx: number, cz: number, radius: number, power: number) {
    const tumble = 3.5;
    for (const z of this.zombies) {
      const dx = z.x - cx;
      const dz = z.z - cz;
      const d = Math.hypot(dx, dz);
      if (d > radius) continue;
      const fall = 1 - (d / radius) * 0.6;
      const nx = d > 1e-4 ? dx / d : Math.random() - 0.5;
      const nz = d > 1e-4 ? dz / d : Math.random() - 0.5;
      const impulse = new THREE.Vector3(
        nx * power * fall + (Math.random() - 0.5) * 1.2,
        2.5 * fall + 1.0,
        nz * power * fall + (Math.random() - 0.5) * 1.2,
      );
      if (z.dead) {
        this.pushRagdoll(z, impulse, tumble);
        this.emitHit(z, 0, true, impulse, true);
        continue;
      }
      if (z.knockedDown) {
        this.pushRagdoll(z, impulse, tumble);
        this.emitHit(z, 0, false, impulse, true);
        continue;
      }
      this.knockDown(z, impulse, tumble);
      this.emitHit(z, 0, false, impulse, true);
    }
  }
  private knockDown(z: Zombie, impulse: THREE.Vector3, tumble = 3, physicsSeed?: number) {
    if (z.dead) return;
    const p = this.recordPhysics(z, impulse, tumble, physicsSeed);
    if (z.knockedDown) {
      z.ragdoll?.applyImpulse(impulse, tumble, p.seed);
      return;
    }
    z.knockedDown = true;
    z.recoverTimer = 0;
    z.downTime = 0;
    z.moving = false;
    z.running = false;
    z.currentSpeed = 0;
    z.stun = 0;
    z.mixer.stopAllAction();
    // Ocultar la hitbox cilíndrica: quedó en el punto del atropello mientras
    // el modelo vuela varios metros; evita disparos al aire y re-atropellos.
    if (z.hit) z.hit.visible = false;

    const rd = this.ragdolls.createRagdoll(z.inst.model, impulse, tumble, p.seed);
    if (!rd) {
      // Sin esqueleto no hay física: aturdido breve en el suelo y a seguir.
      z.knockedDown = false;
      if (z.hit) z.hit.visible = true;
      z.stun = 0.8;
      z.idleAction.reset().play();
      z.animState = 'idle';
      return;
    }
    z.ragdoll = rd;
  }

  /**
   * Mientras vuela/cae, la lógica sigue a las caderas físicas para que el
   * zombi aterrice donde la física diga, no donde fue atropellado.
   * Mueve el root a las caderas y compensa el offset del modelo para que
   * el visual no pegue un salto (root+modelo = misma posición de mundo).
   */
  private updateKnockedDown(z: Zombie, dt: number) {
    z.downTime = (z.downTime ?? 0) + dt;
    const rd = z.ragdoll;
    if (!rd || rd.disposed) {
      // Sin física (expulsado por límite o fallo): levantarse en el sitio.
      this.finishRecovery(z);
      return;
    }
    this.followHips(z);
    this.checkRecovery(z, dt);
  }

  private followHips(z: Zombie) {
    const hips = z.ragdoll?.getHipsPosition();
    if (hips && Number.isFinite(hips.x) && Number.isFinite(hips.z)) {
      const dx = hips.x - z.x;
      const dz = hips.z - z.z;
      const dist = Math.hypot(dx, dz);
      // Ignorar teleports absurdos de una física explotada (>15 m en un frame).
      if (dist > 0.005 && dist < 15) {
        this.setPhysicalRoot(z, hips.x, hips.z);
      }
    }
  }

  private checkRecovery(z: Zombie, dt: number) {
    if (!z.knockedDown) return;
    const rd = z.ragdoll;
    if (!rd) {
      this.finishRecovery(z);
      return;
    }
    if (rd.isSettled) {
      z.recoverTimer = (z.recoverTimer ?? 0) + dt;
    } else {
      z.recoverTimer = 0;
    }
    const restedEnough = (z.recoverTimer ?? 0) > 1.2;
    const timedOut = (z.downTime ?? 0) > 6.0; // seguridad: nunca atascado tumbado
    if (restedEnough || timedOut) {
      this.finishRecovery(z);
    }
  }

  /** Levanta al zombi donde cayó: recoloca, limpia la física y retoma la caza. */
  private finishRecovery(z: Zombie) {
    const rd = z.ragdoll;
    if (rd) {
      const hipsPos = rd.getHipsPosition();
      if (hipsPos && Number.isFinite(hipsPos.x) && Number.isFinite(hipsPos.z)) {
        z.x = hipsPos.x;
        z.z = hipsPos.z;
      }
      this.ragdolls.removeRagdoll(rd);
      z.ragdoll = null;
    }
    // Fuera de paredes/obstáculos antes de volver a caminar.
    try {
      const fixed = this.world.resolveCollision(z.x, z.z, ZOMBIE.radius);
      z.x = fixed.x;
      z.z = fixed.z;
    } catch {
      /* mundo aún cargando: se queda donde cayó */
    }
    z.inst.root.position.set(z.x, 0, z.z);
    // Reset del offset/rotación que el ragdoll aplicó al modelo.
    z.inst.model.position.set(0, 0, 0);
    z.inst.model.quaternion.identity();

    z.knockedDown = false;
    z.recoverTimer = 0;
    z.downTime = 0;
    if (z.hit && z.hit.parent === z.inst.root) z.hit.visible = true;
    z.animState = 'idle';
    try {
      z.idleAction.reset().play();
    } catch {
      /* mixer aún sin clips: wander lo reintentará */
    }
    // Pausa de "levantarse" + memoria de caza para que siga sus interacciones:
    // si ya perseguía a alguien, conserva el objetivo y lo refresca.
    z.stun = Math.max(z.stun, 0.6);
    z.timer = 0;
    if (z.alert) {
      z.alert.timer = ZOMBIE_BEHAVIOR.detection.alertMemoryDuration;
    }
  }
}
