import * as THREE from 'three';
import type { DriveInput, TerrainType, VehicleConfig, VehicleLockState } from './vehicleTypes';
import { makeBoxCollider } from '../world/cabin';

// Geometrías y materiales compartidos para rendimiento en 60 FPS
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const WHEEL_GEO = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 14).rotateZ(Math.PI / 2);
const SMOKE_GEO = new THREE.DodecahedronGeometry(0.22, 1);
const SPARK_GEO = new THREE.BoxGeometry(0.07, 0.07, 0.07);

const MAT_TIRE = new THREE.MeshLambertMaterial({ color: 0x141414, roughness: 0.9 } as any);
const MAT_HEADLIGHT = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
const MAT_HEADLIGHT_BROKEN = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.95 });
const MAT_TAILLIGHT = new THREE.MeshBasicMaterial({ color: 0x991b1b });
const MAT_EMERGENCY_RED = new THREE.MeshBasicMaterial({ color: 0xef4444 });
const MAT_EMERGENCY_BLUE = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

// Colores cacheados para optimización
const RUST_COLOR = new THREE.Color(0x35231c);
const SOOT_COLOR = new THREE.Color(0x181716);
const GLASS_ORIG_COLOR = new THREE.Color(0x182430);
const GLASS_BROKEN_COLOR = new THREE.Color(0x0c0d10);
const BUMPER_ORIG_COLOR = new THREE.Color(0x27272a);
const BUMPER_BROKEN_COLOR = new THREE.Color(0x141210);
const _tempColor = new THREE.Color();

interface SmokeParticle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  initialScale: number;
  maxScale: number;
  initialOpacity: number;
  active: boolean;
  isSpark?: boolean;
}

/**
 * Entidad física y visual de un vehículo en el mundo de juego.
 * Implementa mecánicas de conducción top-down con masa, inercia, agarre por terreno,
 * desgaste/daño de chasis, ruido de motor para zombis, abolladuras localizadas y humo de motor.
 */
export class VehicleInstance {
  readonly id: string;
  readonly config: VehicleConfig;
  readonly root = new THREE.Group();

  // Estados dinámicos de gameplay (Requisito 2)
  currentDurability: number;
  currentFuel: number;
  lockState: VehicleLockState;
  isEngineRunning = false;
  currentSpeed = 0; // m/s (positivo hacia adelante, negativo hacia atrás)
  readonly velocity = new THREE.Vector3(); // Vector lineal en espacio de mundo

  // Posición y orientación
  x: number;
  z: number;
  heading: number; // Rotación sobre eje Y (radianes)
  steer = 0; // Ángulo actual de giro de ruedas

  // Radio de ruido actual emitido por el motor (metros)
  currentNoiseRadius = 0;

  // Componentes Three.js internos
  private frontPivots: THREE.Group[] = [];
  private wheelMeshes: THREE.Mesh[] = [];
  private wheelSpin = 0;
  private emergencyLightTime = 0;
  private emergencyMesh?: THREE.Mesh;

  // Materiales de instancia para desgaste visual según durabilidad
  private originalColor!: THREE.Color;
  private bodyMat!: THREE.MeshStandardMaterial;
  private glassMat!: THREE.MeshStandardMaterial;
  private bumperMat!: THREE.MeshStandardMaterial;
  private frontHeadlights: THREE.Mesh[] = [];
  private frontBumperMesh?: THREE.Mesh;
  private rearBumperMesh?: THREE.Mesh;

  // Piezas de carrocería deformables por abolladuras
  private deformableMeshes: { mesh: THREE.Mesh; origPositions: Float32Array }[] = [];
  private lastDentTime = 0;

  // Sistema de partículas de humo de motor en espacio de mundo
  private smokeGroup = new THREE.Group();
  private smokeParticles: SmokeParticle[] = [];
  private smokeTimer = 0;

  constructor(
    config: VehicleConfig,
    position: { x: number; z: number; heading?: number },
    options?: {
      id?: string;
      durability?: number;
      fuel?: number;
      lockState?: VehicleLockState;
      color?: number;
    },
  ) {
    this.config = config;
    this.id = options?.id ?? `${config.id}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.x = position.x;
    this.z = position.z;
    this.heading = position.heading ?? 0;

    // Inicialización de estado
    this.lockState = options?.lockState ?? 'unlocked';
    if (this.lockState === 'broken') {
      this.currentDurability = 0;
    } else {
      this.currentDurability = options?.durability ?? config.maxDurability;
    }

    this.currentFuel = Math.min(config.fuelCapacity, options?.fuel ?? config.fuelCapacity * 0.5);

    const chosenColor = options?.color ?? config.defaultColors[Math.floor(Math.random() * config.defaultColors.length)];
    this.buildMesh(chosenColor);
    this.initSmokePool();
    this.updateVisualDeterioration();
    this.syncMesh();
  }

  // --- Propiedades convenientes ---

  get position(): THREE.Vector3 {
    return new THREE.Vector3(this.x, 0, this.z);
  }

  get fuelFraction(): number {
    return this.config.fuelCapacity > 0 ? this.currentFuel / this.config.fuelCapacity : 0;
  }

  get durabilityFraction(): number {
    return this.config.maxDurability > 0 ? this.currentDurability / this.config.maxDurability : 0;
  }

  get isOperable(): boolean {
    return this.lockState !== 'broken' && this.currentDurability > 0;
  }

  get dims() {
    return this.config.dims;
  }

  /**
   * Intenta arrancar el motor del vehículo.
   */
  startEngine(): boolean {
    if (!this.isOperable || this.currentFuel <= 0) {
      this.isEngineRunning = false;
      return false;
    }
    this.isEngineRunning = true;
    this.currentNoiseRadius = this.config.engineNoiseIdle;
    return true;
  }

  /**
   * Apaga el motor voluntariamente o por impacto.
   */
  stopEngine(): void {
    this.isEngineRunning = false;
    this.currentNoiseRadius = 0;
  }

  /**
   * Generación procedural de la carrocería 3D según el arquetipo, con piezas segmentadas deformables.
   */
  private buildMesh(color: number) {
    const { L, W, bodyH, bodyY, cabL, cabW, cabH, cabZ, bedL, lightBar } = this.config.dims;

    // Materiales con soporte PBR instanciados por coche
    this.originalColor = new THREE.Color(color);
    this.bodyMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.42,
      metalness: 0.22,
      flatShading: true,
    });
    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x182430,
      roughness: 0.25,
      metalness: 0.8,
    });
    this.bumperMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.7,
      flatShading: true,
    });

    const addBox = (
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      cast = true,
    ) => {
      const mesh = new THREE.Mesh(BOX_GEO, m);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      mesh.castShadow = cast;
      mesh.receiveShadow = true;
      this.root.add(mesh);
      return mesh;
    };

    // 1. Chasis principal inferior (segmentado para admitir abolladuras localizadas)
    const chassisGeo = new THREE.BoxGeometry(W, bodyH, L, 8, 3, 14);
    chassisGeo.translate(0, bodyH / 2, 0);
    const chassisMesh = new THREE.Mesh(chassisGeo, this.bodyMat);
    chassisMesh.position.set(0, bodyY, 0);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    this.root.add(chassisMesh);
    this.registerDeformable(chassisMesh);

    // 2. Paragolpes delantero (deformable e inclinable)
    const frontBumperGeo = new THREE.BoxGeometry(W * 0.95, bodyH * 0.35, 0.16, 8, 2, 2);
    frontBumperGeo.translate(0, (bodyH * 0.35) / 2, 0);
    this.frontBumperMesh = new THREE.Mesh(frontBumperGeo, this.bumperMat);
    this.frontBumperMesh.position.set(0, bodyY + 0.05, L / 2 + 0.06);
    this.frontBumperMesh.castShadow = true;
    this.frontBumperMesh.receiveShadow = true;
    this.root.add(this.frontBumperMesh);
    this.registerDeformable(this.frontBumperMesh);

    // 3. Paragolpes trasero (deformable)
    const rearBumperGeo = new THREE.BoxGeometry(W * 0.95, bodyH * 0.35, 0.16, 8, 2, 2);
    rearBumperGeo.translate(0, (bodyH * 0.35) / 2, 0);
    this.rearBumperMesh = new THREE.Mesh(rearBumperGeo, this.bumperMat);
    this.rearBumperMesh.position.set(0, bodyY + 0.05, -L / 2 - 0.06);
    this.rearBumperMesh.castShadow = true;
    this.rearBumperMesh.receiveShadow = true;
    this.root.add(this.rearBumperMesh);
    this.registerDeformable(this.rearBumperMesh);

    // 4. Cabina con ventanas
    const cabGeo = new THREE.BoxGeometry(cabW, cabH, cabL, 6, 2, 8);
    cabGeo.translate(0, cabH / 2, 0);
    const cabMesh = new THREE.Mesh(cabGeo, this.glassMat);
    cabMesh.position.set(0, bodyY + bodyH, cabZ);
    cabMesh.castShadow = true;
    cabMesh.receiveShadow = true;
    this.root.add(cabMesh);
    this.registerDeformable(cabMesh);

    // Techo de cabina
    addBox(this.bodyMat, 0, bodyY + bodyH + cabH, cabZ, cabW + 0.03, 0.05, cabL + 0.03);

    // Batea / zona de carga para pickups y camiones
    if (bedL) {
      const bedZ = -L / 2 + bedL / 2 + 0.1;
      addBox(this.bodyMat, -W / 2 + 0.08, bodyY + bodyH, bedZ, 0.12, bodyH * 0.6, bedL);
      addBox(this.bodyMat, W / 2 - 0.08, bodyY + bodyH, bedZ, 0.12, bodyH * 0.6, bedL);
      addBox(this.bodyMat, 0, bodyY + bodyH, -L / 2 + 0.08, W, bodyH * 0.6, 0.12);
    }

    // Torreta de emergencia (Ambulancia)
    if (lightBar) {
      this.emergencyMesh = addBox(MAT_EMERGENCY_RED, 0, bodyY + bodyH + cabH + 0.07, cabZ + 0.2, cabW * 0.6, 0.14, 0.25, false);
    }

    // Faros delanteros (+Z) y traseros (-Z)
    this.frontHeadlights = [];
    for (const sx of [-1, 1]) {
      const hl = addBox(MAT_HEADLIGHT, sx * (W / 2 - 0.25), bodyY + bodyH * 0.45, L / 2 + 0.02, 0.32, 0.16, 0.05, false);
      this.frontHeadlights.push(hl);
      addBox(MAT_TAILLIGHT, sx * (W / 2 - 0.25), bodyY + bodyH * 0.45, -L / 2 - 0.02, 0.32, 0.14, 0.05, false);
    }

    // Ruedas con suspensión y pivotes directrices delanteros
    const wheelY = Math.max(0.28, bodyY * 0.85);
    for (const sz of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const pivot = new THREE.Group();
        const axleZ = sz * (L * 0.31);
        pivot.position.set(sx * (W / 2 - 0.02), wheelY, axleZ);

        const wheel = new THREE.Mesh(WHEEL_GEO, MAT_TIRE);
        wheel.castShadow = true;
        pivot.add(wheel);

        this.root.add(pivot);
        this.wheelMeshes.push(wheel);
        if (sz > 0) this.frontPivots.push(pivot);
      }
    }
  }

  /**
   * Sincroniza la posición, rotación de chasis y ruedas en la escena Three.js.
   */
  syncMesh(): void {
    this.root.position.set(this.x, 0, this.z);
    this.root.rotation.y = this.heading;
    for (const p of this.frontPivots) p.rotation.y = this.steer;
    for (const w of this.wheelMeshes) w.rotation.x = this.wheelSpin;
  }

  private registerDeformable(mesh: THREE.Mesh): void {
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    if (!pos) return;
    this.deformableMeshes.push({
      mesh,
      origPositions: new Float32Array(pos.array),
    });
  }

  /**
   * Inicializa el pool de partículas de humo y chispas de motor.
   */
  private initSmokePool(): void {
    const POOL_SIZE = 40;
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x374151,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(SMOKE_GEO, mat);
      mesh.visible = false;
      this.smokeGroup.add(mesh);
      this.smokeParticles.push({
        mesh,
        mat,
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        initialScale: 0.3,
        maxScale: 1.2,
        initialOpacity: 0.5,
        active: false,
      });
    }
  }

  /**
   * Aplica una abolladura localizada en el chasis y carrocería según el punto de impacto y velocidad.
   * @param impactLocal Coordenadas locales en el espacio del coche (relativo a this.root)
   * @param severity Intensidad de la deformación (0 a 1)
   * @param crashSpeed Velocidad de impacto en m/s
   */
  applyDent(impactLocal: THREE.Vector3, severity: number, crashSpeed = 5): void {
    if (severity <= 0.04) return;
    
    // Evitar abollar múltiples veces por el mismo choque en una fracción de segundo
    const now = Date.now();
    if (now - this.lastDentTime < 250) return;
    this.lastDentTime = now;

    // Radio de abolladura proporcional al golpe
    const dentRadius = Math.min(1.5, 0.55 + severity * 0.65);
    // Profundidad máxima de deformación hacia adentro
    const maxDepth = Math.min(0.42, 0.08 + severity * 0.34);

    for (const dMesh of this.deformableMeshes) {
      // Posición de impacto relativa al origen de la pieza de carrocería
      const meshRelImpact = impactLocal.clone().sub(dMesh.mesh.position);
      
      // Optimización: Si el impacto está muy lejos de la pieza, saltar la iteración de vértices (3.5 cubre la longitud máx de un coche)
      if (meshRelImpact.length() > dentRadius + 3.5) continue;

      const geo = dMesh.mesh.geometry as THREE.BufferGeometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const origArray = dMesh.origPositions;

      let modified = false;

      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        const vx = posArray[idx];
        const vy = posArray[idx + 1];
        const vz = posArray[idx + 2];

        const ox = origArray[idx];
        const oy = origArray[idx + 1];
        const oz = origArray[idx + 2];

        const dist = Math.hypot(vx - meshRelImpact.x, vy - meshRelImpact.y, vz - meshRelImpact.z);
        if (dist < dentRadius) {
          const falloff = 1 - dist / dentRadius;
          const w = falloff * falloff;
          const deformDist = maxDepth * w;
          const noise = (Math.random() - 0.5) * 0.03 * w;

          const dirX = Math.sign(meshRelImpact.x) * -1;
          const dirZ = Math.sign(meshRelImpact.z) * -1;

          let nx = vx;
          let ny = vy - deformDist * 0.15 + noise;
          let nz = vz;

          if (Math.abs(meshRelImpact.z) >= Math.abs(meshRelImpact.x)) {
            nz += dirZ * deformDist + noise;
            nx += (Math.random() - 0.5) * 0.07 * w;
          } else {
            nx += dirX * deformDist + noise;
            nz += (Math.random() - 0.5) * 0.07 * w;
          }

          // Límite de deformación física para preservar la geometría
          const totalDisp = Math.hypot(nx - ox, ny - oy, nz - oz);
          if (totalDisp > 0.45) {
            const factor = 0.45 / totalDisp;
            nx = ox + (nx - ox) * factor;
            ny = oy + (ny - oy) * factor;
            nz = oz + (nz - oz) * factor;
          }

          posArray[idx] = nx;
          posArray[idx + 1] = ny;
          posArray[idx + 2] = nz;
          modified = true;
        }
      }

      if (modified) {
        posAttr.needsUpdate = true;
        geo.computeVertexNormals();
      }
    }

    // Efectos adicionales en componentes externos según la zona impactada:
    if (impactLocal.z > this.config.dims.L * 0.25) {
      if (this.frontBumperMesh && crashSpeed > 3.0) {
        // Desalinear/descolgar ligeramente el parachoques delantero
        this.frontBumperMesh.rotation.z = THREE.MathUtils.clamp(
          this.frontBumperMesh.rotation.z + (impactLocal.x > 0 ? -0.06 : 0.06) * severity,
          -0.22,
          0.22,
        );
        this.frontBumperMesh.rotation.y = THREE.MathUtils.clamp(
          this.frontBumperMesh.rotation.y + (impactLocal.x > 0 ? 0.04 : -0.04) * severity,
          -0.16,
          0.16,
        );
      }

      // Romper faros delanteros si el impacto estuvo cerca de ellos
      if (crashSpeed > 4.0) {
        if (impactLocal.x < -0.15 && this.frontHeadlights[0]) {
          this.frontHeadlights[0].material = MAT_HEADLIGHT_BROKEN;
        }
        if (impactLocal.x > 0.15 && this.frontHeadlights[1]) {
          this.frontHeadlights[1].material = MAT_HEADLIGHT_BROKEN;
        }
      }
    }
  }

  /**
   * Restaura gradualmente las abolladuras de la carrocería (reparaciones).
   */
  restoreDents(fraction: number): void {
    const factor = Math.min(1.0, Math.max(0, fraction));
    for (const dMesh of this.deformableMeshes) {
      const geo = dMesh.mesh.geometry as THREE.BufferGeometry;
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const origArray = dMesh.origPositions;

      for (let i = 0; i < posAttr.count; i++) {
        const idx = i * 3;
        posArray[idx] = THREE.MathUtils.lerp(posArray[idx], origArray[idx], factor);
        posArray[idx + 1] = THREE.MathUtils.lerp(posArray[idx + 1], origArray[idx + 1], factor);
        posArray[idx + 2] = THREE.MathUtils.lerp(posArray[idx + 2], origArray[idx + 2], factor);
      }
      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
    }

    if (this.frontBumperMesh) {
      this.frontBumperMesh.rotation.set(0, 0, 0);
    }
    if (this.frontHeadlights[0]) this.frontHeadlights[0].material = MAT_HEADLIGHT;
    if (this.frontHeadlights[1]) this.frontHeadlights[1].material = MAT_HEADLIGHT;
  }


  /**
   * Actualiza el aspecto de pintura, rugosidad, cristales y componentes según la durabilidad del chasis.
   */
  updateVisualDeterioration(): void {
    if (!this.bodyMat || !this.glassMat || !this.bumperMat) return;

    const f = this.durabilityFraction; // 1.0 = nuevo, 0.0 = destruido

    _tempColor.copy(this.originalColor);
    if (f > 0.5) {
      // 50% - 100%: Pérdida de brillo y ligera suciedad
      const t = (1.0 - f) * 2;
      _tempColor.lerp(RUST_COLOR, t * 0.40);
    } else {
      // 0% - 50%: Óxido severo y quemaduras
      _tempColor.lerp(RUST_COLOR, 0.40);
      const t = (0.5 - f) * 2;
      _tempColor.lerp(SOOT_COLOR, t * 0.85);
    }

    this.bodyMat.color.copy(_tempColor);
    this.bodyMat.roughness = THREE.MathUtils.lerp(0.40, 0.96, 1 - f);
    this.bodyMat.metalness = THREE.MathUtils.lerp(0.24, 0.06, 1 - f);

    // Cristales agrietados y oscurecidos
    this.glassMat.color.lerpColors(GLASS_ORIG_COLOR, GLASS_BROKEN_COLOR, 1 - f);
    this.glassMat.roughness = THREE.MathUtils.lerp(0.25, 0.88, 1 - f);

    // Paragolpes gastados
    this.bumperMat.color.lerpColors(BUMPER_ORIG_COLOR, BUMPER_BROKEN_COLOR, 1 - f);

    // Si el chasis está gravemente dañado (< 35%), descolgar levemente el parachoques frontal
    if (f < 0.35 && this.frontBumperMesh) {
      const sag = (0.35 - f) / 0.35;
      this.frontBumperMesh.position.y = this.config.dims.bodyY + 0.05 - sag * 0.06;
      if (this.frontBumperMesh.rotation.z === 0) {
        this.frontBumperMesh.rotation.z = sag * 0.08;
      }
    }
  }

  /**
   * Actualiza los efectos continuos: partículas de humo de motor y deterioro.
   */
  updateEffects(dt: number): void {
    // Vincular smokeGroup a la escena para simulación en coordenadas de mundo
    if (!this.smokeGroup.parent && this.root.parent) {
      this.root.parent.add(this.smokeGroup);
    }

    const durabilityPct = this.durabilityFraction;
    const isSmoking = durabilityPct <= 0.30 || this.lockState === 'broken';

    // Generar nuevas partículas de humo si la vida del chasis está cerca de morir
    if (isSmoking) {
      this.smokeTimer -= dt;
      const spawnInterval = durabilityPct <= 0.12 ? 0.05 : durabilityPct <= 0.20 ? 0.09 : 0.14;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = spawnInterval;
        this.emitEngineSmoke(durabilityPct);
      }
    }

    // Actualizar partículas de humo activas
    for (const p of this.smokeParticles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      const progress = p.life / p.maxLife;
      const scale = THREE.MathUtils.lerp(p.initialScale, p.maxScale, progress);
      p.mesh.scale.set(scale, scale, scale);
      p.mat.opacity = p.initialOpacity * (1 - progress);
      p.mesh.rotation.y += dt * 1.5;
      p.mesh.rotation.x += dt * 0.8;
    }
  }

  private emitEngineSmoke(durabilityPct: number): void {
    const p = this.smokeParticles.find((item) => !item.active);
    if (!p) return;

    // Posición del capó/motor en coordenadas de mundo
    const hoodLocalX = (Math.random() - 0.5) * (this.config.dims.W * 0.45);
    const hoodLocalZ = this.config.dims.L * 0.28 + (Math.random() - 0.5) * 0.25;
    const hoodWorld = this.worldPoint(hoodLocalX, hoodLocalZ);
    const hoodY = this.config.dims.bodyY + this.config.dims.bodyH + 0.12;

    p.active = true;
    p.mesh.visible = true;
    p.x = hoodWorld.x;
    p.y = hoodY;
    p.z = hoodWorld.z;
    p.mesh.position.set(p.x, p.y, p.z);
    p.life = 0;

    const isNearDeath = durabilityPct <= 0.12;
    const isSpark = isNearDeath && Math.random() < 0.22;
    p.isSpark = isSpark;

    if (isSpark) {
      // Chispas de fuego que saltan del motor
      p.mesh.geometry = SPARK_GEO;
      p.mat.color.setHex(0xf97316);
      p.mat.opacity = 0.95;
      p.initialOpacity = 0.95;
      p.initialScale = 0.6;
      p.maxScale = 1.0;
      p.maxLife = 0.25 + Math.random() * 0.15;
      p.vx = (Math.random() - 0.5) * 1.2 + this.velocity.x * 0.2;
      p.vy = 1.6 + Math.random() * 1.2;
      p.vz = (Math.random() - 0.5) * 1.2 + this.velocity.z * 0.2;
    } else {
      p.mesh.geometry = SMOKE_GEO;
      if (durabilityPct > 0.15) {
        // Vapor / humo gris inicial
        p.mat.color.setHex(0xd1d5db);
        p.initialOpacity = 0.40;
        p.initialScale = 0.25;
        p.maxScale = 0.95 + Math.random() * 0.35;
        p.maxLife = 1.1 + Math.random() * 0.4;
      } else {
        // Humo negro espeso por combustión crítica
        p.mat.color.setHex(0x18181b);
        p.initialOpacity = 0.72;
        p.initialScale = 0.35;
        p.maxScale = 1.45 + Math.random() * 0.55;
        p.maxLife = 1.4 + Math.random() * 0.5;
      }
      p.mat.opacity = p.initialOpacity;
      // Flotabilidad y arrastre por el movimiento del vehículo
      p.vx = (Math.random() - 0.5) * 0.35 + this.velocity.x * 0.12;
      p.vy = 0.9 + Math.random() * 1.1;
      p.vz = (Math.random() - 0.5) * 0.35 + this.velocity.z * 0.12;
    }
  }

  /**
   * Transforma coordenadas locales (lx, lz) a coordenadas de mundo.
   */
  worldPoint(lx: number, lz: number): { x: number; z: number } {
    const c = Math.cos(this.heading);
    const s = Math.sin(this.heading);
    return {
      x: this.x + lx * c + lz * s,
      z: this.z - lx * s + lz * c,
    };
  }

  /**
   * Hitbox 2D orientada para detección de colisiones cuando está estacionado.
   */
  collider() {
    return makeBoxCollider(this.x, this.z, this.heading, this.config.dims.W / 2, this.config.dims.L / 2);
  }

  // =========================================================================
  // FÍSICAS DE CONDUCCIÓN TOP-DOWN (Requisito 3)
  // =========================================================================

  /**
   * Paso de simulación física en el bucle principal de juego.
   * @param deltaTime Tiempo transcurrido (segundos)
   * @param inputs Controles de aceleración, giro y freno
   * @param currentTerrainType Terreno bajo el vehículo ('asphalt', 'dirt', 'grass')
   * @param world Opcional: WorldManager para resolver colisiones contra obstáculos sólidos
   * @returns Daño infligido al conductor por choque (si hubo impacto crítico) y radio de ruido
   */
  update(
    deltaTime: number,
    inputs: DriveInput,
    currentTerrainType: TerrainType = 'asphalt',
    world?: any,
  ): { playerDamage: number; noiseRadius: number } {
    const dt = Math.min(deltaTime, 0.05);
    let playerDamageFromCrash = 0;

    // Verificar estado operativo de durabilidad y combustible
    if (this.currentDurability <= 0) {
      this.currentDurability = 0;
      this.lockState = 'broken';
      this.stopEngine();
    }

    if (this.currentFuel <= 0) {
      this.currentFuel = 0;
      this.stopEngine();
    }

    // Si el conductor presiona acelerador y el coche funciona, asegura que el motor esté encendido
    if (!this.isEngineRunning && (inputs.throttle !== 0) && this.isOperable && this.currentFuel > 0) {
      this.startEngine();
    }

    // --- Factor de adherencia y tracción según terreno ---
    let tractionMultiplier = 1.0;
    if (currentTerrainType === 'dirt' || currentTerrainType === 'grass') {
      // Fuera de asfalto: penaliza aceleración y agarre lateral según el arquetipo
      tractionMultiplier = this.config.offroadTractionMultiplier;
    }

    const effectiveMaxSpeed = this.config.maxSpeed * (0.65 + 0.35 * tractionMultiplier);
    const effectiveAcceleration = this.config.accelerationForce * tractionMultiplier;
    const effectiveReverseMax = (this.config.maxSpeed * 0.32) * tractionMultiplier;

    // --- 1. Dinámica Longitudinal (Aceleración y Frenos) ---
    if (this.isEngineRunning && inputs.throttle > 0) {
      // Aceleración hacia adelante con curva de caída según velocidad máxima efectiva
      const speedRatio = Math.max(0, this.currentSpeed) / Math.max(1, effectiveMaxSpeed);
      const accel = effectiveAcceleration * (1 - Math.min(0.95, speedRatio * 0.85));
      this.currentSpeed += accel * inputs.throttle * dt;

      // Consumo de combustible activo
      const fuelCost = this.config.fuelConsumptionRate * (Math.abs(this.currentSpeed) * 0.8 + 1.2) * dt;
      this.currentFuel = Math.max(0, this.currentFuel - fuelCost);
    } else if (inputs.throttle < 0) {
      if (this.currentSpeed > 0.4) {
        // Frenado de servicio en avance
        this.currentSpeed -= this.config.brakingForce * dt;
      } else if (this.isEngineRunning) {
        // Marcha atrás
        this.currentSpeed -= (effectiveAcceleration * 0.6) * dt;
        const fuelCost = this.config.fuelConsumptionRate * 1.5 * dt;
        this.currentFuel = Math.max(0, this.currentFuel - fuelCost);
      }
    } else if (this.currentSpeed !== 0) {
      // Sin pisar acelerador: desaceleración natural gradual (resistencia por inercia)
      const coastDecel = (1.4 + (1 - tractionMultiplier) * 2.2) * dt;
      const dec = Math.min(Math.abs(this.currentSpeed), coastDecel);
      this.currentSpeed -= Math.sign(this.currentSpeed) * dec;
    }

    // Freno de mano (bloquea ruedas traseras con frenada agresiva)
    if (inputs.handbrake && this.currentSpeed !== 0) {
      const hbDecel = (this.config.brakingForce * 1.6) * dt;
      const dec = Math.min(Math.abs(this.currentSpeed), hbDecel);
      this.currentSpeed -= Math.sign(this.currentSpeed) * dec;
    }

    // Resistencia al avance por rodadura del neumático
    const rollingResistance = (0.015 + (1 - tractionMultiplier) * 0.06);
    this.currentSpeed -= this.currentSpeed * rollingResistance * (this.config.mass / 1000) * dt;

    // Motor apagado o sin gasolina: arrastre inercial muerto
    if (!this.isEngineRunning && this.currentSpeed !== 0) {
      const deadDrag = 3.5 * dt;
      const dec = Math.min(Math.abs(this.currentSpeed), deadDrag);
      this.currentSpeed -= Math.sign(this.currentSpeed) * dec;
    }

    // Límites de velocidad
    this.currentSpeed = THREE.MathUtils.clamp(this.currentSpeed, -effectiveReverseMax, effectiveMaxSpeed);
    if (Math.abs(this.currentSpeed) < 0.02 && inputs.throttle === 0) {
      this.currentSpeed = 0;
    }

    // --- 2. Dinámica de Dirección y Giro (Modelo Cinemático de Bicicleta) ---
    // A alta velocidad el ángulo de giro efectivo se reduce para evitar trompos incontrolables
    const speedDamping = 1 + Math.abs(this.currentSpeed) / 11;
    const targetSteer = (inputs.steer * this.config.steerAngle * tractionMultiplier) / speedDamping;
    this.steer += (targetSteer - this.steer) * Math.min(1, dt * 9);

    // Variación del rumbo (heading) angular
    const wheelBase = this.config.dims.L * 0.62;
    this.heading += ((this.currentSpeed * Math.tan(this.steer)) / wheelBase) * dt;

    // --- 3. Vector de Velocidad y Desplazamiento ---
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    this.velocity.set(fx * this.currentSpeed, 0, fz * this.currentSpeed);

    this.x += this.velocity.x * dt;
    this.z += this.velocity.z * dt;

    // --- 4. Colisiones contra Obstáculos Sólidos del Entorno ---
    if (world && typeof world.resolveCollision === 'function') {
      const radius = this.config.dims.W / 2 + 0.15;
      let totalPushX = 0;
      let totalPushZ = 0;
      let maxPushPointZ = 0;
      let maxPushMag = 0;
      // Comprobar 3 puntos de apoyo a lo largo del chasis (frente, centro, cola)
      const testOffsets = [-this.config.dims.L * 0.32, 0, this.config.dims.L * 0.32];
      for (const lz of testOffsets) {
        const pt = this.worldPoint(0, lz);
        const resolved = world.resolveCollision(pt.x, pt.z, radius);
        const px = resolved.x - pt.x;
        const pz = resolved.z - pt.z;
        totalPushX += px;
        totalPushZ += pz;
        
        const mag = Math.hypot(px, pz);
        if (mag > maxPushMag) {
            maxPushMag = mag;
            maxPushPointZ = lz;
        }
      }

      const pushMag = Math.hypot(totalPushX, totalPushZ);
      if (pushMag > 1e-4) {
        // Reducimos el factor k para evitar el "jerk sideways" (movimiento brusco hacia un lado)
        const k = Math.min(0.5, 0.8 / pushMag);
        this.x += totalPushX * k;
        this.z += totalPushZ * k;

        // Choque contra entorno sólido
        const crashSpeed = Math.abs(this.currentSpeed);
        if (crashSpeed > 1.5) {
          playerDamageFromCrash = this.onCollideWithEnvironment(crashSpeed, 'solid_obstacle');

          // --- CÁLCULO DE ÁREA DE IMPACTO Y ABOLLADURA LOCALIZADA ---
          const rx = Math.cos(this.heading);
          const rz = -Math.sin(this.heading);

          const pushLocalForward = totalPushX * fx + totalPushZ * fz;
          const pushLocalRight = totalPushX * rx + totalPushZ * rz;

          let impactZ = maxPushPointZ;
          if (Math.abs(pushLocalForward) > 0.02) {
            impactZ = pushLocalForward < 0 ? this.config.dims.L * 0.46 : -this.config.dims.L * 0.46;
          }

          let impactX = 0;
          if (Math.abs(pushLocalRight) > 0.02) {
            impactX = pushLocalRight < 0 ? this.config.dims.W * 0.46 : -this.config.dims.W * 0.46;
          } else {
            impactX = this.steer * (this.config.dims.W * 0.35);
          }

          const impactLocal = new THREE.Vector3(
            impactX,
            this.config.dims.bodyY + this.config.dims.bodyH * 0.45,
            impactZ,
          );

          const dentSeverity = Math.min(1.0, (crashSpeed / this.config.maxSpeed) * 1.6);
          this.applyDent(impactLocal, dentSeverity, crashSpeed);
        }

        // Freno drástico por colisión
        this.currentSpeed *= Math.max(0, 1 - Math.min(0.85, pushMag * 2.8));
      }
    }

    // --- 5. Modulación Dinámica del Ruido del Motor ---
    if (!this.isEngineRunning) {
      this.currentNoiseRadius = 0;
    } else {
      const throttleAbs = Math.abs(inputs.throttle);
      if (throttleAbs < 0.05) {
        this.currentNoiseRadius = this.config.engineNoiseIdle;
      } else {
        const noiseFactor = THREE.MathUtils.clamp(
          throttleAbs * 0.7 + (Math.abs(this.currentSpeed) / this.config.maxSpeed) * 0.3,
          0,
          1,
        );
        this.currentNoiseRadius = THREE.MathUtils.lerp(
          this.config.engineNoiseIdle,
          this.config.engineNoiseMax,
          noiseFactor,
        );
      }
    }

    // --- 6. Animación de Luces de Emergencia (Ambulancia) ---
    if (this.emergencyMesh && this.isEngineRunning) {
      this.emergencyLightTime += dt * 8;
      const isRed = Math.floor(this.emergencyLightTime) % 2 === 0;
      this.emergencyMesh.material = isRed ? MAT_EMERGENCY_RED : MAT_EMERGENCY_BLUE;
    }

    // Rodadura visual de neumáticos y actualización de efectos (humo/chasis)
    this.wheelSpin += (this.currentSpeed * dt) / 0.36;
    this.syncMesh();
    this.updateEffects(dt);

    return {
      playerDamage: playerDamageFromCrash,
      noiseRadius: this.currentNoiseRadius,
    };
  }

  // =========================================================================
  // SISTEMA DE COLISIONES, DAÑO Y ATROPELLOS (Requisito 4)
  // =========================================================================

  /**
   * Gestiona el impacto del vehículo contra obstáculos del entorno (árboles, paredes, cabañas).
   * Calcula daño cuadrático al chasis y daño contundente al conductor si se superó el límite crítico.
   * @param collisionSpeed Velocidad de impacto en m/s
   * @param obstacleType Tipo de obstáculo colisionado
   * @returns Daño que debe recibir el jugador
   */
  onCollideWithEnvironment(collisionSpeed: number, _obstacleType = 'obstacle'): number {
    const spd = Math.abs(collisionSpeed);
    if (spd < 1.0) return 0;

    // Daño al chasis basado en velocidad cuadrática moderada
    const chassisDamage = spd * spd * 0.055 * (this.config.mass / 1400);
    this.currentDurability = Math.max(0, this.currentDurability - chassisDamage);

    // Si la durabilidad cae a cero, el motor se apaga y el vehículo queda averiado
    if (this.currentDurability <= 0) {
      this.currentDurability = 0;
      this.lockState = 'broken';
      this.stopEngine();
    }

    this.updateVisualDeterioration();

    // Límite crítico de velocidad: si supera el 60% de la velocidad máxima, daña al conductor
    const criticalThreshold = 0.60 * this.config.maxSpeed;
    let playerDamage = 0;

    if (spd > criticalThreshold) {
      const excess = spd - criticalThreshold;
      playerDamage = Math.round(excess * 3.8 * (this.config.mass / 1400));
    }

    return playerDamage;
  }

  /**
   * Gestiona el atropello de un zombi por parte del vehículo.
   * @param _zombie Entidad zombi impactada
   * @param currentSpeed Velocidad actual del coche al momento del impacto
   * @param impactLocalX Desplazamiento lateral del golpe respecto al morro (-W/2 a +W/2)
   * @returns Datos del golpe para animación, empuje físico y desaceleración
   */
  onHitZombie(_zombie: any, currentSpeed: number, impactLocalX = 0): { zombieDamage: number; impulse: THREE.Vector3; carSlowdown: number } {
    const spd = Math.abs(currentSpeed);
    const minThreshold = 1.2;

    if (spd < minThreshold) {
      return {
        zombieDamage: 25,
        impulse: this.velocity.clone().normalize().multiplyScalar(1.5),
        carSlowdown: 0.98,
      };
    }

    // 1. Daño proporcional infligido al zombi. Se mantiene bajo a propósito:
    // un atropello a velocidad media TUMBA (ragdoll + se levanta) en vez de
    // matar de un golpe; hacen falta varios o ir muy rápido para la baja.
    const zombieDamage = Math.round(spd * (this.config.mass / 500));

    // 2. Vector de empuje y lanzamiento 100% dependiente de la velocidad y la masa.
    // A 2 m/s apenas lo desplaza (~1 m/s); a 10 m/s lo lanza lejos (~11 m/s);
    // un camión pesado lanza más que un compacto a igual velocidad.
    const dir = this.velocity.lengthSq() > 0.001
      ? this.velocity.clone().normalize()
      : new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    const massFactor = THREE.MathUtils.clamp(this.config.mass / 1400, 0.65, 1.9);
    const pushMagnitude = Math.min(22, spd * (0.55 + spd * 0.06) * massFactor);
    const liftY = THREE.MathUtils.clamp((spd - 1.5) * 0.34, 0.35, 5.2) * (0.85 + massFactor * 0.15);
    // Si el golpe da en una esquina, desvía lateralmente hacia ese lado.
    const sidePush = THREE.MathUtils.clamp(impactLocalX, -1.5, 1.5) * spd * 0.25;
    const perpX = Math.cos(this.heading);
    const perpZ = -Math.sin(this.heading);
    const impulse = new THREE.Vector3(
      dir.x * pushMagnitude + perpX * sidePush,
      liftY,
      dir.z * pushMagnitude + perpZ * sidePush,
    );

    // 3. Desgaste del parachoques/motor
    const wearFraction = (0.003 + 0.004 * Math.min(1, spd / this.config.maxSpeed)) * (1400 / this.config.mass);
    const wear = this.config.maxDurability * wearFraction;
    this.currentDurability = Math.max(0, this.currentDurability - wear);

    if (this.currentDurability <= 0) {
      this.currentDurability = 0;
      this.lockState = 'broken';
      this.stopEngine();
    }

    // 4. Abolladura frontal localizada por impacto a alta velocidad contra zombis
    if (spd >= 3.5) {
      const dentLoc = new THREE.Vector3(
        THREE.MathUtils.clamp(impactLocalX, -this.config.dims.W * 0.45, this.config.dims.W * 0.45),
        this.config.dims.bodyY + this.config.dims.bodyH * 0.42,
        this.config.dims.L * 0.48,
      );
      this.applyDent(dentLoc, Math.min(0.55, 0.16 + (spd / 20) * 0.38), spd);
    }
    
    // Actualizar siempre el deterioro visual
    this.updateVisualDeterioration();

    // 5. Desaceleración del coche por transferencia de energía
    const slowFactor = Math.max(0.92, 1 - (45 / this.config.mass));
    this.currentSpeed *= slowFactor;

    return {
      zombieDamage,
      impulse,
      carSlowdown: slowFactor,
    };
  }

  /**
   * Daño menor y acumulativo cuando los zombis golpean el coche parado o a baja velocidad.
   * @param damageAmount Cantidad de daño recibida
   */
  onAttackedByZombie(damageAmount = 1.2): void {
    if (this.currentDurability <= 0) return;

    const armorFactor = Math.min(1.2, 1400 / this.config.mass);
    const effectiveDamage = damageAmount * armorFactor;
    this.currentDurability = Math.max(0, this.currentDurability - effectiveDamage);
    if (this.currentDurability <= 0) {
      this.currentDurability = 0;
      this.lockState = 'broken';
      this.stopEngine();
    }

    this.updateVisualDeterioration();
  }

  /**
   * Recarga de combustible (integración con el sistema de gasolineras).
   */
  refuel(liters: number): number {
    const space = this.config.fuelCapacity - this.currentFuel;
    const added = Math.max(0, Math.min(liters, space));
    this.currentFuel += added;
    return added;
  }

  /**
   * Reparación de chasis/motor. Restaura durabilidad, pintura y abolladuras.
   */
  repair(amount: number): number {
    const space = this.config.maxDurability - this.currentDurability;
    const restored = Math.max(0, Math.min(amount, space));
    this.currentDurability += restored;
    if (this.currentDurability > 0 && this.lockState === 'broken') {
      this.lockState = 'unlocked';
    }
    this.restoreDents(restored / this.config.maxDurability);
    this.updateVisualDeterioration();
    return restored;
  }

  /**
   * Liberación de recursos Three.js.
   */
  dispose(): void {
    this.stopEngine();
    this.smokeGroup.removeFromParent();
    for (const p of this.smokeParticles) {
      p.mat.dispose();
    }
    this.smokeParticles = [];
    this.smokeGroup.clear();

    this.root.removeFromParent();
    for (const p of this.frontPivots) p.clear();
    this.frontPivots = [];
    this.wheelMeshes = [];
    this.deformableMeshes = [];
    this.root.clear();
  }
}
