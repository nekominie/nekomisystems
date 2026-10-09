import * as THREE from 'three';
import type { ExplosiveConfig } from './explosiveTypes';
import { buildExplosiveMesh } from './explosiveModels';
import type { Zombie, ZombieManager } from '../world/zombies';
import type { WorldManager } from '../world/worldManager';
import type { VehicleManager, DrivableCar } from '../world/vehicles';
import { weaponAudio } from '../weapons/weaponAudio';

const GRAVITY = 18;
const REST_SPEED = 1.2;
const REST_Y = 0.14;
const MAX_THROW_DIST = 18;

const FIRE_TICK_DPS = 25;
const MINE_ARM_DELAY = 1.0;
const MINE_TRIGGER_DIST = 1.2;

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();

interface ActiveThrowable {
  def: ExplosiveConfig;
  mesh: THREE.Group;
  blinkMats: THREE.MeshStandardMaterial[];
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  fuse: number;
  fuseTotal: number;
  attractT: number;
  resting: boolean;
}

interface ArmedDevice {
  def: ExplosiveConfig;
  mesh: THREE.Group;
  blinkMats: THREE.MeshStandardMaterial[];
  x: number;
  z: number;
  /** Tiempo hasta armarse (mina) o 0 (C4 listo). */
  armT: number;
  phase: number;
}

interface FireZone {
  x: number;
  z: number;
  r: number;
  t: number;
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  geo: THREE.BufferGeometry;
  emberT: number;
}

interface Flash {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
  t: number;
  maxR: number;
}

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  geo: THREE.BufferGeometry;
  t: number;
  maxR: number;
}

interface Debris {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

const FLASH_GEO = new THREE.SphereGeometry(1, 18, 12);
const DEBRIS_GEO = new THREE.BoxGeometry(0.09, 0.09, 0.09);

/**
 * Sistema de explosivos y arrojadizos: granadas con arco parabólico y rebote,
 * mina de proximidad, C4 remoto, bomba de tubo que atrae, molotov con zona de
 * fuego DoT, y VFX ligeros (destello, anillo, escombros) con pools fijos para
 * no tirar FPS. La suciedad (daño/ragdolls) la aplican ZombieManager y los
 * vehículos; aquí solo física de vuelo, temporizadores y efectos.
 */
export class ExplosivesManager {
  private throwables: ActiveThrowable[] = [];
  private devices: ArmedDevice[] = [];
  private fires: FireZone[] = [];
  private flashes: Flash[] = [];
  private rings: Ring[] = [];
  private debrisPool: Debris[] = [];
  private burning = new Map<Zombie, number>();
  private throwCooldownT = 0;
  private disposed = false;

  constructor(
    private scene: THREE.Scene,
    private world: WorldManager,
    private zombies: ZombieManager,
    private vehicles: VehicleManager | null,
  ) {
    for (let i = 0; i < 130; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(DEBRIS_GEO, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.debrisPool.push({
        mesh, mat,
        vel: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        life: 0, maxLife: 1, active: false,
      });
    }
  }

  // --- Acciones del jugador ---

  /** ¿Pasó el enfriamiento entre lanzamientos? */
  get canThrow(): boolean {
    return this.throwCooldownT <= 0;
  }

  /**
   * Lanza un arrojadizo desde el jugador hacia el punto de mira (arco
   * parabólico con componente vertical según distancia). Devuelve false si
   * está en enfriamiento.
   */
  throwExplosive(def: ExplosiveConfig, fromX: number, fromZ: number, targetX: number, targetZ: number): boolean {
    if (this.throwCooldownT > 0) return false;
    this.throwCooldownT = def.throwCooldown ?? 0.8;
    let dx = targetX - fromX;
    let dz = targetZ - fromZ;
    let dist = Math.hypot(dx, dz);
    if (dist > MAX_THROW_DIST) {
      dx = (dx / dist) * MAX_THROW_DIST;
      dz = (dz / dist) * MAX_THROW_DIST;
      dist = MAX_THROW_DIST;
    }
    if (dist < 0.5) {
      dx = 0;
      dz = 1;
      dist = 0.5;
    }
    const speed = def.throwSpeed || 12;
    const { group, blinkMats } = buildExplosiveMesh(def);
    group.position.set(fromX, 1.4, fromZ);
    this.scene.add(group);
    this.throwables.push({
      def,
      mesh: group,
      blinkMats,
      pos: new THREE.Vector3(fromX, 1.4, fromZ),
      vel: new THREE.Vector3(
        (dx / dist) * speed,
        THREE.MathUtils.clamp(dist * 0.64, 2.5, 11),
        (dz / dist) * speed,
      ),
      spin: new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9),
      fuse: def.fuseTime,
      fuseTotal: Math.max(0.01, def.fuseTime),
      attractT: 0,
      resting: false,
    });
    return true;
  }

  /** Planta un desplegable (mina/C4) a los pies del jugador. */
  plantExplosive(def: ExplosiveConfig, x: number, z: number): boolean {
    if (this.throwCooldownT > 0) return false;
    this.throwCooldownT = def.throwCooldown ?? 0.8;
    const fixed = this.world.resolveCollision(x, z, 0.3);
    const { group, blinkMats } = buildExplosiveMesh(def);
    group.position.set(fixed.x, 0, fixed.z);
    this.scene.add(group);
    this.devices.push({
      def,
      mesh: group,
      blinkMats,
      x: fixed.x,
      z: fixed.z,
      armT: def.triggerType === 'proximity' ? MINE_ARM_DELAY : 0,
      phase: Math.random() * 10,
    });
    return true;
  }

  /** Detona todas las cargas C4 plantadas (detonador remoto). Devuelve cuántas. */
  detonateRemote(): number {
    let n = 0;
    for (let i = this.devices.length - 1; i >= 0; i--) {
      const d = this.devices[i];
      if (d.def.triggerType !== 'remote') continue;
      this.devices.splice(i, 1);
      this.scene.remove(d.mesh);
      this.detonate(d.x, 0.5, d.z, d.def);
      n++;
    }
    return n;
  }

  /** ¿Hay al menos una C4 plantada esperando detonador? */
  get hasArmedRemote(): boolean {
    return this.devices.some((d) => d.def.triggerType === 'remote');
  }

  // --- Bucle ---

  update(dt: number) {
    if (this.disposed) return;
    this.throwCooldownT = Math.max(0, this.throwCooldownT - dt);
    this.updateThrowables(dt);
    this.updateDevices(dt);
    this.updateFires(dt);
    this.updateBurning(dt);
    this.updateFx(dt);
  }

  private updateThrowables(dt: number) {
    for (let i = this.throwables.length - 1; i >= 0; i--) {
      const t = this.throwables[i];

      if (!t.resting) {
        t.vel.y -= GRAVITY * dt;
        t.pos.x += t.vel.x * dt;
        t.pos.y += t.vel.y * dt;
        t.pos.z += t.vel.z * dt;

        // Rebote / reposo contra el suelo
        if (t.pos.y <= REST_Y) {
          t.pos.y = REST_Y;
          if (t.def.triggerType === 'impact') {
            this.removeThrowable(i, t);
            this.detonate(t.pos.x, 0.4, t.pos.z, t.def);
            continue;
          }
          if (t.vel.length() < REST_SPEED) {
            t.resting = true;
            t.vel.set(0, 0, 0);
          } else {
            t.vel.y *= -0.4;
            t.vel.x *= 0.6;
            t.vel.z *= 0.6;
          }
        }

        // Muros: resolveCollision devuelve el punto expulsado; si corrigió,
        // hubo choque (amortigua; impacto = detona).
        const fixed = this.world.resolveCollision(t.pos.x, t.pos.z, 0.15);
        if (Math.hypot(fixed.x - t.pos.x, fixed.z - t.pos.z) > 0.02) {
          t.pos.x = fixed.x;
          t.pos.z = fixed.z;
          if (t.def.triggerType === 'impact') {
            this.removeThrowable(i, t);
            this.detonate(t.pos.x, Math.max(0.4, t.pos.y), t.pos.z, t.def);
            continue;
          }
          t.vel.x *= 0.5;
          t.vel.z *= 0.5;
        }

        // Impacto contra zombi (molotov rompe al tocar carne)
        if (t.def.triggerType === 'impact' && t.pos.y < 2.0) {
          const hit = this.zombies.getZombiesNear(t.pos.x, t.pos.z, 0.7);
          if (hit.length > 0) {
            this.removeThrowable(i, t);
            this.detonate(t.pos.x, 0.4, t.pos.z, t.def);
            continue;
          }
        }

        t.mesh.rotation.x += t.spin.x * dt;
        t.mesh.rotation.y += t.spin.y * dt;
        t.mesh.rotation.z += t.spin.z * dt;
      }

      t.mesh.position.copy(t.pos);

      // Mecha por temporizador
      if (t.def.triggerType === 'timer') {
        t.fuse -= dt;
        // Parpadeo que se acelera al acercarse la explosión
        const urgency = 1 - Math.max(0, t.fuse) / t.fuseTotal;
        const f = 4 + urgency * 12;
        for (const m of t.blinkMats) m.emissiveIntensity = 0.4 + Math.abs(Math.sin(t.fuse * f * Math.PI)) * 2;
        // La bomba de tubo atrae a la horda mientras pita
        if (t.def.attractZombiesWhileActive) {
          t.attractT -= dt;
          if (t.attractT <= 0) {
            t.attractT = 0.5;
            this.zombies.alertNoise(t.pos.x, t.pos.z, 18);
          }
        }
        if (t.fuse <= 0) {
          const dx = t.pos.x;
          const dz = t.pos.z;
          this.removeThrowable(i, t);
          this.detonate(dx, 0.5, dz, t.def);
          continue;
        }
      }
    }
  }

  private removeThrowable(index: number, t: ActiveThrowable) {
    this.throwables.splice(index, 1);
    this.scene.remove(t.mesh);
    for (const m of t.blinkMats) m.dispose();
  }

  private updateDevices(dt: number) {
    for (let i = this.devices.length - 1; i >= 0; i--) {
      const d = this.devices[i];
      d.phase += dt;
      if (d.armT > 0) {
        d.armT -= dt; // mina armándose: parpadeo lento
        for (const m of d.blinkMats) m.emissiveIntensity = 0.5 + Math.abs(Math.sin(d.phase * 3)) * 0.8;
        continue;
      }
      for (const m of d.blinkMats) m.emissiveIntensity = 0.5 + Math.abs(Math.sin(d.phase * 6)) * 1.6;

      if (d.def.triggerType !== 'proximity') continue; // C4 espera al detonador
      // Zombi a < 1.2 m
      if (this.zombies.getZombiesNear(d.x, d.z, MINE_TRIGGER_DIST).length > 0) {
        this.devices.splice(i, 1);
        this.scene.remove(d.mesh);
        for (const m of d.blinkMats) m.dispose();
        this.detonate(d.x, 0.4, d.z, d.def);
        continue;
      }
      // Coche encima (caja del carro expandida)
      if (this.vehicleOnPoint(d.x, d.z)) {
        this.devices.splice(i, 1);
        this.scene.remove(d.mesh);
        for (const m of d.blinkMats) m.dispose();
        this.detonate(d.x, 0.4, d.z, d.def);
      }
    }
  }

  private vehicleOnPoint(x: number, z: number): boolean {
    if (!this.vehicles) return false;
    const cars: (DrivableCar | null | undefined)[] = [this.vehicles.driven, ...this.vehicles.parkedCars()];
    for (const car of cars) {
      if (!car) continue;
      const fx = Math.sin(car.heading);
      const fz = Math.cos(car.heading);
      const rx = Math.cos(car.heading);
      const rz = -Math.sin(car.heading);
      const lf = (x - car.x) * fx + (z - car.z) * fz;
      const lr = (x - car.x) * rx + (z - car.z) * rz;
      if (Math.abs(lf) <= car.dims.L * 0.5 + 0.3 && Math.abs(lr) <= car.dims.W * 0.5 + 0.3) return true;
    }
    return false;
  }

  // --- Detonación ---

  /**
   * Detona en (x, y, z): daño esférico con caída lineal y oclusión por muros,
   * impulso radial (ragdolls que luego se levantan), ruido a la horda, fuego
   * persistente si aplica, y VFX.
   */
  detonate(x: number, y: number, z: number, def: ExplosiveConfig) {
    const R = def.damageRadius;
    this.spawnBoomFx(x, y, z, R, def);
    weaponAudio.explosion(R >= 8);

    // Zombis: caída lineal + oclusión (raycast 2D contra estáticos)
    const targets = this.zombies.getZombiesNear(x, z, R, false);
    for (const zb of targets) {
      const dx = zb.x - x;
      const dz = zb.z - z;
      const d = Math.hypot(dx, dz);
      if (d > R) continue;
      if (d > 0.3 && this.blockedByWall(x, z, dx / d, dz / d, d)) continue;
      const mult = Math.max(0, 1 - d / R);
      const nx = d > 1e-4 ? dx / d : Math.random() - 0.5;
      const nz = d > 1e-4 ? dz / d : Math.random() - 0.5;
      _v1.set(
        nx * def.impulseForce * (0.4 + 0.6 * mult) + (Math.random() - 0.5) * 2,
        def.impulseForce * 0.35 * mult + 1.2,
        nz * def.impulseForce * (0.4 + 0.6 * mult) + (Math.random() - 0.5) * 2,
      );
      if (zb.dead) {
        zb.ragdoll?.applyImpulse(_v1, 3.0);
        continue;
      }
      if (zb.knockedDown) {
        zb.ragdoll?.applyImpulse(_v1, 3.0);
        continue;
      }
      this.zombies.applyBlastHit(zb, def.maxDamage * mult, _v1.clone());
    }

    // Vehículos: daño al chasis + leve empujón radial
    if (this.vehicles) {
      const cars: (DrivableCar | null | undefined)[] = [this.vehicles.driven, ...this.vehicles.parkedCars()];
      for (const car of cars) {
        if (!car || car.currentDurability <= 0) continue;
        const edge = this.carSurfaceDist(car, x, z);
        if (edge > R) continue;
        if (edge > 0.3) {
          const h = Math.hypot(x - car.x, z - car.z) || 1;
          if (this.blockedByWall(x, z, (car.x - x) / h, (car.z - z) / h, h)) continue;
        }
        const mult = Math.max(0, 1 - edge / R);
        car.onAttackedByZombie(def.maxDamage * mult * 0.6);
        const h = Math.hypot(car.x - x, car.z - z);
        if (h > 1e-4) {
          const push = Math.min(0.6, 0.6 * mult);
          car.x += ((car.x - x) / h) * push;
          car.z += ((car.z - z) / h) * push;
          car.syncMesh();
        }
      }
    }

    // Jugador en el radio (con oclusión)
    // Nota: hurtPlayer respeta vidas/invulnerabilidad de canalización.
    // (El componente lo conecta vía hooks; aquí no hay acceso directo.)
    this.pendingPlayerBlasts.push({ x, z, radius: R, maxDamage: def.maxDamage });

    // Ruido: la horda converge al epicentro
    this.zombies.alertNoise(x, z, def.noiseRadius);

    // Fuego persistente
    if (def.fireDuration > 0) this.spawnFire(x, z, R + 0.5, def.fireDuration);
  }

  /** Oclusión: ¿un muro/casa estática tapa al objetivo antes de llegar? */
  private blockedByWall(ox: number, oz: number, dx: number, dz: number, dist: number): boolean {
    const hit = this.world.raycastObstacle(ox, oz, dx, dz, dist);
    return hit !== null && hit < dist - 0.2;
  }

  /** Distancia del punto a la chapa del carro (0 dentro). */
  private carSurfaceDist(car: DrivableCar, x: number, z: number): number {
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    const rx = Math.cos(car.heading);
    const rz = -Math.sin(car.heading);
    const lf = (x - car.x) * fx + (z - car.z) * fz;
    const lr = (x - car.x) * rx + (z - car.z) * rz;
    const clf = THREE.MathUtils.clamp(lf, -car.dims.L * 0.5, car.dims.L * 0.5);
    const clr = THREE.MathUtils.clamp(lr, -car.dims.W * 0.5, car.dims.W * 0.5);
    return Math.hypot(lf - clf, lr - clr);
  }

  // El componente consume estos impactos al jugador tras cada update (con
  // oclusión ya resuelta aquí) para aplicar vidas/sangre por la vía normal.
  private pendingPlayerBlasts: { x: number; z: number; radius: number; maxDamage: number }[] = [];

  /** Impactos al jugador pendientes de aplicar (los consume WorldGameplay). */
  drainPlayerBlasts(px: number, pz: number): number {
    let total = 0;
    for (const b of this.pendingPlayerBlasts) {
      const d = Math.hypot(px - b.x, pz - b.z);
      if (d > b.radius) continue;
      if (d > 0.3) {
        const h = Math.max(1e-4, d);
        if (this.blockedByWall(b.x, b.z, (px - b.x) / h, (pz - b.z) / h, d)) continue;
      }
      total += b.maxDamage * Math.max(0, 1 - d / b.radius);
    }
    this.pendingPlayerBlasts.length = 0;
    return Math.round(total);
  }

  // --- Fuego persistente ---

  private spawnFire(x: number, z: number, r: number, dur: number) {
    const geo = new THREE.CircleGeometry(r, 28);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xea580c, transparent: true, opacity: 0.45, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.06, z);
    this.scene.add(mesh);
    this.fires.push({ x, z, r, t: dur, mesh, mat, geo, emberT: 0 });
    for (let k = 0; k < 6; k++) this.spawnDebris(x, 0.3, z, 0xff7b1c, 2.2, 0.9);
  }

  private updateFires(dt: number) {
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.t -= dt;
      if (f.t <= 0) {
        this.scene.remove(f.mesh);
        f.geo.dispose();
        f.mat.dispose();
        this.fires.splice(i, 1);
        continue;
      }
      // Pulso del resplandor
      f.mat.opacity = 0.35 + Math.abs(Math.sin(f.t * 7)) * 0.18;
      // Brasas ascendentes
      f.emberT -= dt;
      if (f.emberT <= 0) {
        f.emberT = 0.06;
        const a = Math.random() * Math.PI * 2;
        const rr = Math.random() * f.r;
        this.spawnDebris(f.x + Math.cos(a) * rr, 0.15, f.z + Math.sin(a) * rr, 0xffa726, 0.6, 1.1, true);
      }
      // Zombis dentro: DoT + prenden visualmente
      const inside = this.zombies.getZombiesNear(f.x, f.z, f.r);
      for (const zb of inside) {
        this.zombies.applyBurnTick(zb, FIRE_TICK_DPS * dt);
        this.ignite(zb);
      }
      // El jugador arde si pisa el fuego (el componente acumula y flashea)
      this.pendingFireDps += FIRE_TICK_DPS * dt * (this.playerInsideFire(f) ? 1 : 0);
    }
  }

  private playerInsideFire(f: FireZone): boolean {
    // El componente fija la posición del jugador cada frame (ver setPlayerPos)
    return Math.hypot(this.playerX - f.x, this.playerZ - f.z) <= f.r;
  }

  private playerX = 0;
  private playerZ = 0;
  private pendingFireDps = 0;

  setPlayerPos(x: number, z: number) {
    this.playerX = x;
    this.playerZ = z;
  }

  /** Daño de fuego al jugador acumulado desde el último drain (el componente lo aplica con throttle). */
  drainFireDamage(): number {
    const dmg = this.pendingFireDps;
    this.pendingFireDps = 0;
    return dmg;
  }

  /** Marca al zombi ardiendo visualmente unos segundos (brasas que lo siguen). */
  ignite(z: Zombie) {
    this.burning.set(z, 6);
  }

  private updateBurning(dt: number) {
    for (const [z, t] of this.burning) {
      const left = t - dt;
      if (left <= 0 || z.dead) {
        this.burning.delete(z);
        continue;
      }
      this.burning.set(z, left);
      _v2.set(z.x, 1.0, z.z);
      this.spawnDebris(_v2.x, _v2.y, _v2.z, 0xffb74d, 0.5, 0.7, true);
    }
  }

  // --- VFX ligeros ---

  private spawnBoomFx(x: number, y: number, z: number, radius: number, def: ExplosiveConfig) {
    // Destello esférico + luz que mueren en 0.25 s
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd27a, transparent: true, opacity: 0.85, depthWrite: false,
    });
    const mesh = new THREE.Mesh(FLASH_GEO, mat);
    mesh.position.set(x, Math.max(0.6, y), z);
    const light = new THREE.PointLight(0xffb15e, 90, radius * 4, 1.8);
    light.position.set(x, 1.6, z);
    this.scene.add(mesh, light);
    this.flashes.push({ mesh, mat, light, t: 0, maxR: Math.max(2, radius * 0.7) });

    // Anillo expansivo en el suelo
    const rgeo = new THREE.RingGeometry(0.9, 1.0, 48);
    const rmat = new THREE.MeshBasicMaterial({
      color: 0xffe6a3, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(rgeo, rmat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.15, z);
    this.scene.add(ring);
    this.rings.push({ mesh: ring, mat: rmat, geo: rgeo, t: 0, maxR: radius });

    // Escombros y chispas
    const n = def.id === 'c4_charge' || def.damageRadius >= 8 ? 25 : 18;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 3 + Math.random() * (4 + radius);
      _v2.set(x, 0.5, z);
      this.spawnDebris(
        _v2.x, _v2.y, _v2.z,
        Math.random() < 0.45 ? 0xff8f3d : 0x78716c,
        sp, 0.7 + Math.random() * 0.5, false, a,
      );
    }
  }

  private spawnDebris(
    x: number, y: number, z: number, color: number, speed: number, life: number,
    rising = false, angle?: number,
  ) {
    const d = this.debrisPool.find((p) => !p.active);
    if (!d) return;
    const a = angle ?? Math.random() * Math.PI * 2;
    d.active = true;
    d.mesh.visible = true;
    d.mesh.position.set(x, y, z);
    d.mat.color.setHex(color);
    d.mat.opacity = 1;
    if (rising) {
      d.vel.set((Math.random() - 0.5) * 0.8, 1.2 + Math.random() * 1.4, (Math.random() - 0.5) * 0.8);
    } else {
      d.vel.set(Math.cos(a) * speed, 2 + Math.random() * speed * 0.6, Math.sin(a) * speed);
    }
    d.spin.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    d.life = 0;
    d.maxLife = life;
    const s = 0.7 + Math.random() * 0.9;
    d.mesh.scale.setScalar(s);
  }

  private updateFx(dt: number) {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.t += dt;
      const k = f.t / 0.25;
      if (k >= 1) {
        this.scene.remove(f.mesh, f.light);
        f.mat.dispose();
        this.flashes.splice(i, 1);
        continue;
      }
      f.mesh.scale.setScalar(0.5 + k * f.maxR);
      f.mat.opacity = 0.85 * (1 - k);
      f.light.intensity = 90 * (1 - k);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.t += dt;
      const k = r.t / 0.4;
      if (k >= 1) {
        this.scene.remove(r.mesh);
        r.geo.dispose();
        r.mat.dispose();
        this.rings.splice(i, 1);
        continue;
      }
      r.mesh.scale.setScalar(1 + k * (r.maxR - 1));
      r.mat.opacity = 0.9 * (1 - k);
    }
    for (const d of this.debrisPool) {
      if (!d.active) continue;
      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }
      d.vel.y -= GRAVITY * 0.55 * dt;
      d.mesh.position.x += d.vel.x * dt;
      d.mesh.position.y += d.vel.y * dt;
      d.mesh.position.z += d.vel.z * dt;
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.vel.y *= -0.3;
        d.vel.x *= 0.7;
        d.vel.z *= 0.7;
      }
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mat.opacity = 1 - d.life / d.maxLife;
    }
  }

  dispose() {
    this.disposed = true;
    for (const t of this.throwables) {
      this.scene.remove(t.mesh);
      for (const m of t.blinkMats) m.dispose();
    }
    for (const d of this.devices) {
      this.scene.remove(d.mesh);
      for (const m of d.blinkMats) m.dispose();
    }
    for (const f of this.fires) {
      this.scene.remove(f.mesh);
      f.geo.dispose();
      f.mat.dispose();
    }
    for (const f of this.flashes) {
      this.scene.remove(f.mesh, f.light);
      f.mat.dispose();
    }
    for (const r of this.rings) {
      this.scene.remove(r.mesh);
      r.geo.dispose();
      r.mat.dispose();
    }
    for (const d of this.debrisPool) {
      this.scene.remove(d.mesh);
      d.mat.dispose();
    }
    this.throwables = [];
    this.devices = [];
    this.fires = [];
    this.flashes = [];
    this.rings = [];
    this.burning.clear();
    this.pendingPlayerBlasts.length = 0;
    this.pendingFireDps = 0;
  }
}
