import * as THREE from 'three';
import type { WeaponDef } from './weaponTypes';
import { damageFalloff, headshotChance, randomInCone } from './ballistics';
import type { RecoilController } from './recoil';

export type HitZone = 'head' | 'body';

export interface PelletHit {
  object: THREE.Object3D;
  /** `object.userData.owner`: la entidad a la que pertenece el hitbox (p. ej. un zombi). */
  owner: unknown;
  point: THREE.Vector3;
  distance: number;
  zone: HitZone;
  damage: number;
}

export interface PelletResult {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  /** Dónde termina el proyectil: el impacto, el obstáculo que lo detuvo o el alcance máximo. */
  end: THREE.Vector3;
  hit: PelletHit | null;
  /** Lo detuvo un obstáculo sólido (pared, árbol...). */
  blocked: boolean;
}

/** Daño acumulado sobre un mismo dueño (los perdigones de una escopeta suman). */
export interface OwnerDamage {
  owner: unknown;
  damage: number;
  /** Zona de la peor herida (cabeza si algún impacto lo fue). */
  zone: HitZone;
  point: THREE.Vector3;
  hits: number;
}

export interface ShotResult {
  weapon: WeaponDef;
  muzzle: THREE.Vector3;
  direction: THREE.Vector3;
  /** Dispersión (rad) con la que se disparó. */
  spread: number;
  pellets: PelletResult[];
  damageByOwner: Map<unknown, OwnerDamage>;
  noiseRadius: number;
  melee: boolean;
}

export interface ShootOptions {
  /** Origen del disparo (por defecto la posición de la cámara). */
  origin?: THREE.Vector3;
  /** Dirección de apuntado (por defecto hacia donde mira la cámara). */
  direction?: THREE.Vector3;
  /**
   * Objetos contra los que se lanzan los rayos (hitboxes). Si se omite se usa `scene.children` de
   * forma recursiva, lo cual es caro en escenas grandes: mejor pasar solo los objetivos cercanos.
   */
  targets?: THREE.Object3D[];
  /**
   * Distancia horizontal hasta el primer obstáculo sólido en el rayo (o null). Permite que paredes y
   * árboles frenen las balas sin que la escena entera sea raycasteable.
   */
  obstacle?: (ox: number, oz: number, dx: number, dz: number, maxDist: number) => number | null;
  /** Si se pasa, el disparo empuja la cámara (retroceso). */
  recoil?: RecoilController;
}

export type FailReason = 'empty' | 'reloading' | 'cooldown' | null;

const UP = new THREE.Vector3(0, 1, 0);
/** Penalización de dispersión (rad) al moverse: fija + proporcional a la dispersión base. */
const MOVE_PENALTY_FLAT = 0.012;
const MOVE_PENALTY_FACTOR = 0.6;
const MOVE_THRESHOLD = 0.1;
const MELEE_RAYS = 9;

/**
 * Arma en partida: una `WeaponDef` (datos) más el estado mutable (munición, recarga, enfriamiento y
 * dispersión acumulada). No depende del juego: solo recibe cámara/escena/objetivos al disparar.
 */
export class Weapon {
  ammo: number;
  reserve: number;
  /** Dispersión acumulada por disparos seguidos (rad); se recupera con spreadRecoverySpeed. */
  bloom = 0;
  reloading = false;
  /** Por qué falló el último shoot() que devolvió null. */
  failReason: FailReason = null;

  private cooldown = 0;
  private reloadLeft = 0;
  private raycaster = new THREE.Raycaster();

  constructor(
    readonly def: WeaponDef,
    init?: { ammo?: number; reserve?: number },
  ) {
    this.ammo = init?.ammo ?? def.magSize;
    this.reserve = init?.reserve ?? def.magSize * (def.startReserveMags ?? 2);
  }

  get isMelee() {
    return this.def.category === 'melee';
  }

  /** 0..1 mientras recarga. */
  get reloadProgress() {
    if (!this.reloading || this.def.reloadDuration <= 0) return 0;
    return 1 - this.reloadLeft / this.def.reloadDuration;
  }

  /** Avanza enfriamiento, recarga y recuperación de dispersión. */
  update(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.bloom = Math.max(0, this.bloom - this.def.spreadRecoverySpeed * dt);
    if (this.reloading) {
      this.reloadLeft -= dt;
      if (this.reloadLeft <= 0) {
        const take = Math.min(this.def.magSize - this.ammo, this.reserve);
        this.ammo += take;
        this.reserve -= take;
        this.reloading = false;
      }
    }
  }

  startReload(): boolean {
    if (this.isMelee || this.reloading || this.ammo >= this.def.magSize || this.reserve <= 0) return false;
    this.reloading = true;
    this.reloadLeft = this.def.reloadDuration;
    return true;
  }

  cancelReload() {
    this.reloading = false;
  }

  /** Dispersión actual (semi-ángulo, rad): base + acumulada + penalización por moverse. */
  currentSpread(playerVelocity: number): number {
    const move = playerVelocity > MOVE_THRESHOLD ? MOVE_PENALTY_FLAT + this.def.baseSpread * MOVE_PENALTY_FACTOR : 0;
    return this.def.baseSpread + this.bloom + move;
  }

  /**
   * Dispara. Devuelve null si no pudo (ver `failReason`).
   * - Armas a distancia: cada perdigón sale en una dirección aleatoria dentro del cono de dispersión
   *   y se resuelve con THREE.Raycaster contra `opts.targets`; un obstáculo sólido lo detiene antes.
   * - Cuerpo a cuerpo: barrido en abanico de corto alcance.
   */
  shoot(camera: THREE.Camera, scene: THREE.Scene, playerVelocity: number, opts: ShootOptions = {}): ShotResult | null {
    this.failReason = null;
    if (this.reloading) return this.fail('reloading');
    if (this.cooldown > 0) return this.fail('cooldown');
    if (!this.isMelee && this.ammo <= 0) return this.fail('empty');

    const origin = opts.origin ? opts.origin.clone() : camera.getWorldPosition(new THREE.Vector3());
    const aim = opts.direction ? opts.direction.clone().normalize() : camera.getWorldDirection(new THREE.Vector3());
    const targets = opts.targets ?? scene.children;
    const recursive = !opts.targets;

    this.cooldown = 60 / this.def.fireRateRPM;
    if (this.isMelee) return this.swing(origin, aim, targets, recursive, opts);

    const def = this.def;
    const spread = this.currentSpread(playerVelocity);
    const maxRange = def.maxRange ?? def.effectiveRange * 2;
    const headChance = headshotChance(spread);
    const headMult = def.headshotMultiplier ?? 2;

    const pellets: PelletResult[] = [];
    const damageByOwner = new Map<unknown, OwnerDamage>();
    this.raycaster.near = 0;
    this.raycaster.far = maxRange;

    for (let i = 0; i < def.pellets; i++) {
      const dir = randomInCone(aim, spread);
      const pellet = this.castPellet(origin, dir, maxRange, targets, recursive, opts);
      if (pellet.hit) {
        const h = pellet.hit;
        h.zone = Math.random() < headChance ? 'head' : 'body';
        h.damage = def.damage * damageFalloff(h.distance, def.effectiveRange) * (h.zone === 'head' ? headMult : 1);
        this.accumulate(damageByOwner, h);
      }
      pellets.push(pellet);
    }

    // Munición, dispersión acumulada y retroceso
    this.ammo--;
    const bloomStep = def.bloomPerShot ?? def.baseSpread * 0.5 + 0.003;
    this.bloom = Math.min(def.baseSpread * 3, this.bloom + bloomStep);
    opts.recoil?.kick(def.recoilForce);

    return { weapon: def, muzzle: origin, direction: aim, spread, pellets, damageByOwner, noiseRadius: def.noiseRadius, melee: false };
  }

  /** Golpe cuerpo a cuerpo: rayos en abanico; golpea a los `meleeMaxTargets` enemigos más cercanos. */
  private swing(
    origin: THREE.Vector3,
    aim: THREE.Vector3,
    targets: THREE.Object3D[],
    recursive: boolean,
    opts: ShootOptions,
  ): ShotResult {
    const def = this.def;
    const arc = def.meleeArc ?? 1.7;
    const reach = def.effectiveRange;
    const pellets: PelletResult[] = [];
    const best = new Map<unknown, PelletHit>();
    this.raycaster.near = 0;
    this.raycaster.far = reach;

    for (let i = 0; i < MELEE_RAYS; i++) {
      const a = (i / (MELEE_RAYS - 1) - 0.5) * arc;
      const dir = aim.clone().applyAxisAngle(UP, a);
      const pellet = this.castPellet(origin, dir, reach, targets, recursive, opts);
      if (pellet.hit) {
        const prev = best.get(pellet.hit.owner);
        if (!prev || pellet.hit.distance < prev.distance) best.set(pellet.hit.owner, pellet.hit);
      }
      pellets.push(pellet);
    }

    const damageByOwner = new Map<unknown, OwnerDamage>();
    [...best.values()]
      .sort((p, q) => p.distance - q.distance)
      .slice(0, def.meleeMaxTargets ?? 2)
      .forEach((h) => {
        h.zone = 'body';
        h.damage = def.damage;
        this.accumulate(damageByOwner, h);
      });

    return { weapon: def, muzzle: origin, direction: aim, spread: 0, pellets, damageByOwner, noiseRadius: def.noiseRadius, melee: true };
  }

  /** Lanza un rayo: el hitbox más cercano vs. el primer obstáculo sólido. */
  private castPellet(
    origin: THREE.Vector3,
    dir: THREE.Vector3,
    maxRange: number,
    targets: THREE.Object3D[],
    recursive: boolean,
    opts: ShootOptions,
  ): PelletResult {
    this.raycaster.set(origin, dir);
    this.raycaster.far = maxRange;
    const hits = this.raycaster.intersectObjects(targets, recursive);
    const first = hits[0];

    // Obstáculos: la rejilla de colisión trabaja en 2D; se convierte a distancia 3D por el rayo.
    let obstacleT: number | null = null;
    if (opts.obstacle) {
      const h = Math.hypot(dir.x, dir.z);
      if (h > 1e-4) {
        const d2 = opts.obstacle(origin.x, origin.z, dir.x / h, dir.z / h, maxRange * h);
        if (d2 !== null) obstacleT = d2 / h;
      }
    }

    if (obstacleT !== null && (!first || obstacleT < first.distance)) {
      return { origin, direction: dir.clone(), end: origin.clone().addScaledVector(dir, obstacleT), hit: null, blocked: true };
    }
    if (first) {
      return {
        origin,
        direction: dir.clone(),
        end: first.point.clone(),
        hit: {
          object: first.object,
          owner: first.object.userData.owner,
          point: first.point.clone(),
          distance: first.distance,
          zone: 'body',
          damage: 0,
        },
        blocked: false,
      };
    }
    return { origin, direction: dir.clone(), end: origin.clone().addScaledVector(dir, maxRange), hit: null, blocked: false };
  }

  private accumulate(map: Map<unknown, OwnerDamage>, h: PelletHit) {
    const cur = map.get(h.owner);
    if (!cur) {
      map.set(h.owner, { owner: h.owner, damage: h.damage, zone: h.zone, point: h.point.clone(), hits: 1 });
    } else {
      cur.damage += h.damage;
      cur.hits++;
      if (h.zone === 'head') cur.zone = 'head';
    }
  }

  private fail(reason: Exclude<FailReason, null>): null {
    this.failReason = reason;
    return null;
  }
}
