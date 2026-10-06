import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { createBrutalistConcreteTextures } from './proceduralConcrete';
import { sound } from './sound';
import type { BallSkin } from '../types/game';
import type { SerializedSandboxItem, SerializedPhysicsBall } from '../db/sandboxDb';
import { DECOR_LIST, buildDecor, isDecorType, setDecorGlow, type DecorType, type DecorLightRig } from './sandboxDecor';
import {
  buildMachine,
  getBeltMaterial,
  tickMachineTextures,
  BELT_ACCEL,
  LIFT_ACCEL,
  type MachineCollider,
  type MachineSpec,
} from './sandboxMachines';

export type StructureShapeType =
  | 'cube'
  | 'beam'
  | 'ramp'
  | 'arch'
  | 'pipe'
  | 'cylinder'
  | 'slide_straight'
  | 'slide_u'
  | 'slide_u_drop'
  | 'slide_quarter'
  | 'spinner_wheel'
  | 'escalator'
  | 'ball_lift';

/** Every placeable piece: structural concrete pieces + decoration */
export type ShapeType = StructureShapeType | DecorType;

/**
 * Shadow budget for artificial lights. Every shadow-casting light re-renders the scene
 * (a point light up to 6 times), so only a few of them get shadows at the same time.
 */
const MAX_SPOT_SHADOWS = 3;
const MAX_POINT_SHADOWS = 2;
/** Shadow maps of artificial lights are refreshed every N frames */
const LIGHT_SHADOW_UPDATE_EVERY = 2;

const smoothstep01 = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** Spinner wheel motor: medium-slow constant rotation (radians per second) */
export const SPINNER_MOTOR_SPEED = 1.3;
const SPINNER_MOTOR_MAX_FORCE = 90;

// Scratch objects for the ball-carrying machines (no per-frame allocations)
const _mInv = new THREE.Matrix4();
const _mP = new THREE.Vector3();
const _mDir = new THREE.Vector3();
const _mFwd = new THREE.Vector3();
const _mPull = new THREE.Vector3();
const clampN = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export interface ShapeToneInfo {
  name: string;
  toneName: string;
  color: number;
  roughness: number;
  metalness: number;
  hex: string;
}

const DECOR_TONES = Object.fromEntries(
  DECOR_LIST.map((d) => [
    d.type,
    { name: d.name, toneName: d.toneName, color: d.color, roughness: 0.8, metalness: 0.05, hex: d.hex } as ShapeToneInfo,
  ])
) as Record<DecorType, ShapeToneInfo>;

export const SHAPE_TONES: Record<ShapeType, ShapeToneInfo> = {
  ...DECOR_TONES,
  cube: {
    name: 'Cuadrado',
    toneName: 'Hormigón Neutro',
    color: 0xd8dadc,
    roughness: 0.84,
    metalness: 0.04,
    hex: '#d8dadc',
  },
  beam: {
    name: 'Rectángulo',
    toneName: 'Pizarra Azulada',
    color: 0xb8c6d4,
    roughness: 0.82,
    metalness: 0.06,
    hex: '#b8c6d4',
  },
  ramp: {
    name: 'Rampa',
    toneName: 'Arenisca Cálida',
    color: 0xe6dac6,
    roughness: 0.86,
    metalness: 0.03,
    hex: '#e6dac6',
  },
  arch: {
    name: 'Arco',
    toneName: 'Caliza Monumental',
    color: 0xf5f3ec,
    roughness: 0.78,
    metalness: 0.02,
    hex: '#f5f3ec',
  },
  pipe: {
    name: 'Tubo',
    toneName: 'Basalto Industrial',
    color: 0x9096a0,
    roughness: 0.76,
    metalness: 0.08,
    hex: '#9096a0',
  },
  cylinder: {
    name: 'Cilindro',
    toneName: 'Pátina Salvia',
    color: 0xc8d4c6,
    roughness: 0.83,
    metalness: 0.05,
    hex: '#c8d4c6',
  },
  slide_straight: {
    name: 'Tobogán Recto',
    toneName: 'Pizarra Grafito',
    color: 0x8c96a3,
    roughness: 0.82,
    metalness: 0.06,
    hex: '#8c96a3',
  },
  slide_u: {
    name: 'Tubo en U 180°',
    toneName: 'Cobalto Nórdico',
    color: 0x7fa9cc,
    roughness: 0.78,
    metalness: 0.08,
    hex: '#7fa9cc',
  },
  slide_u_drop: {
    name: 'Tubo U Desnivel',
    toneName: 'Ámbar Volcánico',
    color: 0xdf9d6a,
    roughness: 0.80,
    metalness: 0.06,
    hex: '#df9d6a',
  },
  slide_quarter: {
    name: 'Medio U (Curva 90°)',
    toneName: 'Malaquita Jade',
    color: 0x8db59f,
    roughness: 0.79,
    metalness: 0.05,
    hex: '#8db59f',
  },
  spinner_wheel: {
    name: 'Molino de Cucharas',
    toneName: 'Óxido Corten',
    color: 0xc47a54,
    roughness: 0.75,
    metalness: 0.12,
    hex: '#c47a54',
  },
  escalator: {
    name: 'Escalera Eléctrica',
    toneName: 'Banda Cian',
    color: 0x8ea4b8,
    roughness: 0.74,
    metalness: 0.1,
    hex: '#8ea4b8',
  },
  ball_lift: {
    name: 'Elevador',
    toneName: 'Tubo de Cristal',
    color: 0x9fd8ff,
    roughness: 0.6,
    metalness: 0.12,
    hex: '#9fd8ff',
  },
};

/** Unscaled collider snapshot, used to rebuild the physics shapes whenever the piece is stretched */
interface BaseCollider {
  shape: CANNON.Shape;
  offset: CANNON.Vec3;
  orientation: CANNON.Quaternion;
  halfExtents?: CANNON.Vec3;
  vertices?: CANNON.Vec3[];
  faces?: number[][];
}

export interface SandboxItem {
  id: string;
  type: ShapeType;
  name: string;
  mesh: THREE.Mesh | THREE.Group;
  body: CANNON.Body;
  initialScale: THREE.Vector3;
  baseColliders?: BaseCollider[];
  appliedScale?: THREE.Vector3;
  /** Real lights + beams of lamps/spotlights (decoration) */
  lightRig?: DecorLightRig;
  /** Working zone of a ball-carrying machine (escalator / ball lift) */
  machine?: MachineSpec;
  /** Mill only: the scoops turn in the opposite direction */
  reversed?: boolean;
  // Kinetic / interactive mechanical piece extensions
  rotorMesh?: THREE.Object3D;
  rotorBody?: CANNON.Body;
  rotorOffset?: THREE.Vector3;
  constraints?: CANNON.Constraint[];
  extraBodies?: CANNON.Body[];
}

export type BallPresetId = 'metal' | 'rubber' | 'plastic' | 'flash';

export interface BallPreset {
  id: BallPresetId;
  name: string;
  description: string;
  icon: string;
  mass: number;
  restitution: number;
  friction: number;
  linearDamping: number;
  angularDamping: number;
  /** Relative 1-5 ratings shown in the catalog UI */
  stats: { weight: number; bounce: number; speed: number };
  /**
   * Self-propulsion: while moving horizontally the ball keeps accelerating along its direction
   * of travel (m/s²) until it reaches `maxSpeed` (m/s). Gravity alone cannot make one ball
   * faster than another on a slide, so this is what makes a ball truly faster.
   */
  boost?: { accel: number; maxSpeed: number };
  /** Draws a glow halo and a speed streak behind the ball */
  fx?: { color: number };
}

export const DEFAULT_BALL_PRESET: BallPresetId = 'plastic';

export const BALL_PRESETS: Record<BallPresetId, BallPreset> = {
  metal: {
    id: 'metal',
    name: 'Metal',
    description: 'Pesada y rápida: rebota poco y casi no frena.',
    icon: 'bi-hexagon-fill',
    mass: 4.0,
    restitution: 0.12,
    friction: 0.1,
    linearDamping: 0.005,
    angularDamping: 0.02,
    stats: { weight: 5, bounce: 1, speed: 4 },
  },
  rubber: {
    id: 'rubber',
    name: 'Goma',
    description: 'Liviana y muy rebotona: agarra mucho y pierde velocidad.',
    icon: 'bi-record-circle-fill',
    mass: 0.35,
    restitution: 0.9,
    friction: 0.75,
    linearDamping: 0.06,
    angularDamping: 0.2,
    stats: { weight: 1, bounce: 5, speed: 2 },
  },
  plastic: {
    id: 'plastic',
    name: 'Plástico',
    description: 'Punto medio entre peso, rebote y velocidad.',
    icon: 'bi-circle-half',
    mass: 1.0,
    restitution: 0.5,
    friction: 0.3,
    linearDamping: 0.02,
    angularDamping: 0.08,
    stats: { weight: 3, bounce: 3, speed: 3 },
  },
  flash: {
    id: 'flash',
    name: 'Flash',
    description: 'Superrápida: casi sin fricción y se acelera sola, dejando una estela de luz.',
    icon: 'bi-lightning-charge-fill',
    mass: 0.8,
    restitution: 0.35,
    friction: 0.02,
    linearDamping: 0,
    angularDamping: 0.01,
    stats: { weight: 2, bounce: 2, speed: 5 },
    boost: { accel: 12, maxSpeed: 16 },
    fx: { color: 0xffe27a },
  },
};

export const BALL_PRESET_LIST: BallPreset[] = [
  BALL_PRESETS.metal,
  BALL_PRESETS.rubber,
  BALL_PRESETS.plastic,
  BALL_PRESETS.flash,
];

export interface PhysicsBall {
  id: string;
  skinId: string;
  presetId: BallPresetId;
  name: string;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  spawnPos: THREE.Vector3;
  /** Speed streak behind the ball (only for presets with `fx`) */
  streak?: THREE.Mesh;
}

// ── Speed FX shared by every ball of a fx preset (created lazily, one set per page) ──
const STREAK_LENGTH = 2.2;
const fxCache: { halo?: THREE.CanvasTexture; streakGeo?: THREE.BufferGeometry } = {};

function getHaloTexture(): THREE.CanvasTexture {
  if (!fxCache.halo) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    fxCache.halo = new THREE.CanvasTexture(canvas);
  }
  return fxCache.halo;
}

function getStreakGeometry(): THREE.BufferGeometry {
  if (!fxCache.streakGeo) {
    // Cone with its wide base at the origin (the ball) and its tip STREAK_LENGTH along +Y
    const geo = new THREE.ConeGeometry(0.24, STREAK_LENGTH, 16, 1, true);
    geo.translate(0, STREAK_LENGTH / 2, 0);
    fxCache.streakGeo = geo;
  }
  return fxCache.streakGeo;
}

const _fxDir = new THREE.Vector3();
const _fxQuat = new THREE.Quaternion();
const _fxInv = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);

export interface PlatformConfig {
  width: number;
  depth: number;
  isInfinite: boolean;
}

export class SandboxWorld {
  public world: CANNON.World;
  public concreteMaterial: THREE.MeshStandardMaterial;
  public shapeMaterials: Record<StructureShapeType, THREE.MeshStandardMaterial>;
  
  // Platform configuration and meshes
  public platformConfig: PlatformConfig = {
    width: 18,
    depth: 18,
    isInfinite: false,
  };
  public platformMesh: THREE.Mesh | null = null;
  public platformBody: CANNON.Body | null = null;
  public platformTrim: THREE.Mesh | null = null;
  public platformMaterial: THREE.MeshStandardMaterial | null = null;
  private platformTextures: { map: THREE.Texture; bumpMap: THREE.Texture; roughnessMap: THREE.Texture } | null = null;

  private ballMaterials = {} as Record<BallPresetId, CANNON.Material>;

  // Time-of-day lighting for lamps / spotlights
  private darkness = 0;
  private lightShadowFrame = 0;
  private shadowCasters: (THREE.SpotLight | THREE.PointLight)[] = [];

  public items: SandboxItem[] = [];
  public balls: PhysicsBall[] = [];
  public isPaused: boolean = false;
  public autoRespawn: boolean = false;

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Initialize Cannon-es Physics World
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    (this.world.solver as CANNON.GSSolver).iterations = 10;
    this.world.defaultContactMaterial.friction = 0.35;
    this.world.defaultContactMaterial.restitution = 0.4;
    this.setupBallMaterials();

    // 2. Concrete Textures for architectural pieces
    const { map, bumpMap, roughnessMap } = createBrutalistConcreteTextures();

    // Default platform concrete material
    this.concreteMaterial = new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: 0.02,
      roughnessMap,
      roughness: 0.85,
      metalness: 0.04,
      color: 0xd4d8dc,
    });

    // Specific nuanced concrete tone materials for each shape type
    this.shapeMaterials = {
      cube: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.025,
        roughnessMap,
        color: SHAPE_TONES.cube.color,
        roughness: SHAPE_TONES.cube.roughness,
        metalness: SHAPE_TONES.cube.metalness,
      }),
      beam: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.025,
        roughnessMap,
        color: SHAPE_TONES.beam.color,
        roughness: SHAPE_TONES.beam.roughness,
        metalness: SHAPE_TONES.beam.metalness,
      }),
      ramp: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.025,
        roughnessMap,
        color: SHAPE_TONES.ramp.color,
        roughness: SHAPE_TONES.ramp.roughness,
        metalness: SHAPE_TONES.ramp.metalness,
      }),
      arch: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.025,
        roughnessMap,
        color: SHAPE_TONES.arch.color,
        roughness: SHAPE_TONES.arch.roughness,
        metalness: SHAPE_TONES.arch.metalness,
      }),
      pipe: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.025,
        roughnessMap,
        color: SHAPE_TONES.pipe.color,
        roughness: SHAPE_TONES.pipe.roughness,
        metalness: SHAPE_TONES.pipe.metalness,
        side: THREE.DoubleSide,
      }),
      cylinder: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.025,
        roughnessMap,
        color: SHAPE_TONES.cylinder.color,
        roughness: SHAPE_TONES.cylinder.roughness,
        metalness: SHAPE_TONES.cylinder.metalness,
      }),
      slide_straight: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        color: SHAPE_TONES.slide_straight.color,
        roughness: SHAPE_TONES.slide_straight.roughness,
        metalness: SHAPE_TONES.slide_straight.metalness,
      }),
      slide_u: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        color: SHAPE_TONES.slide_u.color,
        roughness: SHAPE_TONES.slide_u.roughness,
        metalness: SHAPE_TONES.slide_u.metalness,
      }),
      slide_u_drop: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        color: SHAPE_TONES.slide_u_drop.color,
        roughness: SHAPE_TONES.slide_u_drop.roughness,
        metalness: SHAPE_TONES.slide_u_drop.metalness,
      }),
      slide_quarter: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        color: SHAPE_TONES.slide_quarter.color,
        roughness: SHAPE_TONES.slide_quarter.roughness,
        metalness: SHAPE_TONES.slide_quarter.metalness,
      }),
      spinner_wheel: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.022,
        roughnessMap,
        color: SHAPE_TONES.spinner_wheel.color,
        roughness: SHAPE_TONES.spinner_wheel.roughness,
        metalness: SHAPE_TONES.spinner_wheel.metalness,
      }),
      escalator: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        color: SHAPE_TONES.escalator.color,
        roughness: SHAPE_TONES.escalator.roughness,
        metalness: SHAPE_TONES.escalator.metalness,
      }),
      ball_lift: new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.02,
        roughnessMap,
        color: SHAPE_TONES.ball_lift.color,
        roughness: SHAPE_TONES.ball_lift.roughness,
        metalness: SHAPE_TONES.ball_lift.metalness,
      }),
    };

    // 3. Create the Square Central Concrete Platform
    this.createPlatform();
  }

  /**
   * Creates one Cannon material per ball preset and the contact materials that
   * define friction / bounciness against the scenery (default material) and other balls.
   */
  private setupBallMaterials() {
    const ids = Object.keys(BALL_PRESETS) as BallPresetId[];
    ids.forEach((id) => {
      this.ballMaterials[id] = new CANNON.Material(`ball_${id}`);
    });

    ids.forEach((a, i) => {
      const pa = BALL_PRESETS[a];
      this.world.addContactMaterial(
        new CANNON.ContactMaterial(this.ballMaterials[a], this.world.defaultMaterial, {
          friction: pa.friction,
          restitution: pa.restitution,
        })
      );
      for (let j = i; j < ids.length; j++) {
        const pb = BALL_PRESETS[ids[j]];
        this.world.addContactMaterial(
          new CANNON.ContactMaterial(this.ballMaterials[a], this.ballMaterials[ids[j]], {
            friction: Math.sqrt(pa.friction * pb.friction),
            restitution: (pa.restitution + pb.restitution) / 2,
          })
        );
      }
    });
  }

  /**
   * Spawns the flat concrete platform in the center of the void
   */
  private createPlatform() {
    const size = this.platformConfig.width;
    const thickness = 0.8;

    // Dedicated concrete textures for the platform so its tiling scales with floor area
    const { map, bumpMap, roughnessMap } = createBrutalistConcreteTextures();
    this.platformTextures = { map, bumpMap, roughnessMap };

    const tileScale = 4.5;
    const repX = Math.max(1, Math.round(size / tileScale));
    const repZ = Math.max(1, Math.round(size / tileScale));
    map.repeat.set(repX, repZ);
    bumpMap.repeat.set(repX, repZ);
    roughnessMap.repeat.set(repX, repZ);

    this.platformMaterial = new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: 0.02,
      roughnessMap,
      roughness: 0.86,
      metalness: 0.04,
      color: 0xd4d8dc,
    });

    // Three.js Platform Mesh
    const geo = new THREE.BoxGeometry(size, thickness, size);
    this.platformMesh = new THREE.Mesh(geo, this.platformMaterial);
    this.platformMesh.position.set(0, -thickness / 2, 0);
    this.platformMesh.receiveShadow = true;
    this.platformMesh.castShadow = true;
    this.scene.add(this.platformMesh);

    // Decorative chamfer trim around platform perimeter
    const trimGeo = new THREE.BoxGeometry(size + 0.1, 0.06, size + 0.1);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0df0d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
    this.platformTrim = new THREE.Mesh(trimGeo, trimMat);
    this.platformTrim.position.set(0, 0.02, 0);
    this.platformMesh.add(this.platformTrim);

    // Platform Physics Body (Static)
    const shape = new CANNON.Box(new CANNON.Vec3(size / 2, thickness / 2, size / 2));
    this.platformBody = new CANNON.Body({
      mass: 0, // static
      shape,
      material: this.world.defaultMaterial,
      position: new CANNON.Vec3(0, -thickness / 2, 0),
    });
    this.world.addBody(this.platformBody);
  }

  /**
   * Resizes or converts the platform to an infinite plane
   */
  public setPlatformSize(width: number, depth: number, isInfinite: boolean = false) {
    const clampedW = Math.max(4, Math.min(250, Math.round(width * 2) / 2));
    const clampedD = Math.max(4, Math.min(250, Math.round(depth * 2) / 2));

    this.platformConfig = {
      width: clampedW,
      depth: clampedD,
      isInfinite,
    };

    const thickness = 0.8;
    const effWidth = isInfinite ? 1800 : clampedW;
    const effDepth = isInfinite ? 1800 : clampedD;

    // 1. Update Platform Mesh Geometry
    if (this.platformMesh) {
      this.platformMesh.geometry.dispose();
      this.platformMesh.geometry = new THREE.BoxGeometry(effWidth, thickness, effDepth);
      this.platformMesh.position.set(0, -thickness / 2, 0);
      this.platformMesh.scale.set(1, 1, 1);
    }

    // 2. Update Texture Repeat
    if (this.platformTextures) {
      const tileScale = 4.5;
      const repX = Math.max(1, Math.round(effWidth / tileScale));
      const repZ = Math.max(1, Math.round(effDepth / tileScale));
      this.platformTextures.map.repeat.set(repX, repZ);
      this.platformTextures.bumpMap.repeat.set(repX, repZ);
      this.platformTextures.roughnessMap.repeat.set(repX, repZ);
    }

    // 3. Update Decorative Trim
    if (this.platformTrim) {
      if (isInfinite) {
        this.platformTrim.visible = false;
      } else {
        this.platformTrim.visible = true;
        this.platformTrim.geometry.dispose();
        this.platformTrim.geometry = new THREE.BoxGeometry(effWidth + 0.1, 0.06, effDepth + 0.1);
      }
    }

    // 4. Update Cannon Physics Body
    if (this.platformBody) {
      this.world.removeBody(this.platformBody);
    }

    const shape = new CANNON.Box(new CANNON.Vec3(effWidth / 2, thickness / 2, effDepth / 2));
    this.platformBody = new CANNON.Body({
      mass: 0,
      shape,
      material: this.world.defaultMaterial,
      position: new CANNON.Vec3(0, -thickness / 2, 0),
    });
    this.world.addBody(this.platformBody);
  }

  /**
   * Spawns an architectural geometric shape onto the platform with its distinct tone
   */
  public addShape(type: ShapeType, spawnPos = new THREE.Vector3(0, 1.2, 0), silent = false): SandboxItem {
    const id = `shape_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let mesh: THREE.Mesh | THREE.Group;
    let body: CANNON.Body;
    let name = SHAPE_TONES[type]?.name || 'Bloque';
    let itemExtra: Partial<SandboxItem> = {};
    const mat = this.shapeMaterials[type as StructureShapeType] || this.concreteMaterial;

    switch (type) {
      case 'cube': {
        const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        body = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.8)),
        });
        break;
      }

      case 'beam': {
        const geo = new THREE.BoxGeometry(3.6, 0.45, 0.9);
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        body = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Box(new CANNON.Vec3(1.8, 0.225, 0.45)),
        });
        break;
      }

      case 'cylinder': {
        const geo = new THREE.CylinderGeometry(0.65, 0.65, 2.2, 32);
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        body = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Cylinder(0.65, 0.65, 2.2, 16),
        });
        break;
      }

      case 'ramp': {
        // Build wedge ramp geometry
        const wedgeShape = new THREE.Shape();
        wedgeShape.moveTo(0, 0);
        wedgeShape.lineTo(3.2, 0);
        wedgeShape.lineTo(3.2, 1.5);
        wedgeShape.closePath();

        const extrudeSettings = { depth: 1.4, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(wedgeShape, extrudeSettings);
        geo.center();

        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Cannon-es compound ramp approximation (box rotated at incline)
        body = new CANNON.Body({ mass: 0 });
        const boxShape = new CANNON.Box(new CANNON.Vec3(1.7, 0.2, 0.7));
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.atan2(1.5, 3.2));
        body.addShape(boxShape, new CANNON.Vec3(0, 0, 0), q);
        break;
      }

      case 'arch': {
        const group = new THREE.Group();
        body = new CANNON.Body({ mass: 0 });

        // Left pillar
        const pillarGeo = new THREE.BoxGeometry(0.5, 2.4, 0.7);
        const leftP = new THREE.Mesh(pillarGeo, mat);
        leftP.position.set(-1.1, 0, 0);
        leftP.castShadow = true;
        leftP.receiveShadow = true;
        group.add(leftP);
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 1.2, 0.35)), new CANNON.Vec3(-1.1, 0, 0));

        // Right pillar
        const rightP = new THREE.Mesh(pillarGeo, mat);
        rightP.position.set(1.1, 0, 0);
        rightP.castShadow = true;
        rightP.receiveShadow = true;
        group.add(rightP);
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 1.2, 0.35)), new CANNON.Vec3(1.1, 0, 0));

        // Top lintel / beam
        const topGeo = new THREE.BoxGeometry(2.7, 0.5, 0.7);
        const topM = new THREE.Mesh(topGeo, mat);
        topM.position.set(0, 1.45, 0);
        topM.castShadow = true;
        topM.receiveShadow = true;
        group.add(topM);
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.35, 0.25, 0.35)), new CANNON.Vec3(0, 1.45, 0));

        mesh = group;
        break;
      }

      case 'pipe': {
        const pipeGeo = new THREE.CylinderGeometry(1.0, 1.0, 3.0, 32, 1, true);
        mesh = new THREE.Mesh(pipeGeo, mat);
        mesh.rotation.z = Math.PI / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Compound body with left/right floor guides
        body = new CANNON.Body({ mass: 0 });
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.1, 0.8)), new CANNON.Vec3(0, -0.9, 0));
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.8, 0.1)), new CANNON.Vec3(0, 0, 0.9));
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.8, 0.1)), new CANNON.Vec3(0, 0, -0.9));
        body.addShape(new CANNON.Box(new CANNON.Vec3(1.5, 0.1, 0.8)), new CANNON.Vec3(0, 0.9, 0));
        break;
      }

      case 'slide_straight': {
        const group = new THREE.Group();
        body = new CANNON.Body({ mass: 0 });

        const length = 4.0;
        const channelWidth = 0.95;
        const floorThick = 0.18;
        const railHeight = 0.46;
        const railThick = 0.22;

        // Central Chute Floor
        const fGeo = new THREE.BoxGeometry(length, floorThick, channelWidth);
        const fMesh = new THREE.Mesh(fGeo, mat);
        fMesh.position.set(0, floorThick / 2, 0);
        fMesh.castShadow = true;
        fMesh.receiveShadow = true;
        group.add(fMesh);
        body.addShape(
          new CANNON.Box(new CANNON.Vec3(length / 2, floorThick / 2, channelWidth / 2)),
          new CANNON.Vec3(0, floorThick / 2, 0)
        );

        // Left Guard Rail
        const lGeo = new THREE.BoxGeometry(length, railHeight, railThick);
        const lMesh = new THREE.Mesh(lGeo, mat);
        lMesh.position.set(0, railHeight / 2, -(channelWidth / 2 + railThick / 2));
        lMesh.castShadow = true;
        lMesh.receiveShadow = true;
        group.add(lMesh);
        body.addShape(
          new CANNON.Box(new CANNON.Vec3(length / 2, railHeight / 2, railThick / 2)),
          new CANNON.Vec3(0, railHeight / 2, -(channelWidth / 2 + railThick / 2))
        );

        // Right Guard Rail
        const rGeo = new THREE.BoxGeometry(length, railHeight, railThick);
        const rMesh = new THREE.Mesh(rGeo, mat);
        rMesh.position.set(0, railHeight / 2, channelWidth / 2 + railThick / 2);
        rMesh.castShadow = true;
        rMesh.receiveShadow = true;
        group.add(rMesh);
        body.addShape(
          new CANNON.Box(new CANNON.Vec3(length / 2, railHeight / 2, railThick / 2)),
          new CANNON.Vec3(0, railHeight / 2, channelWidth / 2 + railThick / 2)
        );

        mesh = group;
        break;
      }

      case 'slide_u': {
        const chute = this.createCurvedChute(Math.PI, 0, mat);
        mesh = chute.group;
        body = chute.body;
        break;
      }

      case 'slide_u_drop': {
        const chute = this.createCurvedChute(Math.PI, 1.6, mat);
        mesh = chute.group;
        body = chute.body;
        break;
      }

      case 'slide_quarter': {
        const chute = this.createCurvedChute(Math.PI / 2, 0, mat);
        mesh = chute.group;
        body = chute.body;
        break;
      }

      case 'escalator':
      case 'ball_lift': {
        // Ball-carrying machines: static box colliders + a working zone handled in applyMachines()
        const built = buildMachine(type, { body: mat, belt: getBeltMaterial() });
        mesh = built.group;
        body = new CANNON.Body({ mass: 0 });
        this.addMachineColliders(body, built.colliders);
        itemExtra = { machine: built.spec };
        break;
      }

      case 'spinner_wheel': {
        const group = new THREE.Group();
        body = new CANNON.Body({ mass: 0 });

        // 1. Static Sturdy Frame
        // Base plate
        const baseGeo = new THREE.BoxGeometry(1.6, 0.2, 1.4);
        const baseMesh = new THREE.Mesh(baseGeo, mat);
        baseMesh.position.set(0, 0.1, 0);
        baseMesh.castShadow = true;
        baseMesh.receiveShadow = true;
        group.add(baseMesh);
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.8, 0.1, 0.7)), new CANNON.Vec3(0, 0.1, 0));

        // Pillars
        const pillarGeo = new THREE.BoxGeometry(0.26, 2.2, 0.26);
        const leftP = new THREE.Mesh(pillarGeo, mat);
        leftP.position.set(0, 1.1, -0.6);
        leftP.castShadow = true;
        leftP.receiveShadow = true;
        group.add(leftP);
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.13, 1.1, 0.13)), new CANNON.Vec3(0, 1.1, -0.6));

        const rightP = new THREE.Mesh(pillarGeo, mat);
        rightP.position.set(0, 1.1, 0.6);
        rightP.castShadow = true;
        rightP.receiveShadow = true;
        group.add(rightP);
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.13, 1.1, 0.13)), new CANNON.Vec3(0, 1.1, 0.6));

        // Bearing Collars (aesthetic)
        const collarGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.14, 16);
        collarGeo.rotateX(Math.PI / 2);
        const leftC = new THREE.Mesh(collarGeo, mat);
        leftC.position.set(0, 2.0, -0.55);
        group.add(leftC);
        const rightC = new THREE.Mesh(collarGeo, mat);
        rightC.position.set(0, 2.0, 0.55);
        group.add(rightC);

        // 2. Dynamic Kinetic Rotor (Axle + 4 Radial Arms with Spoons)
        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(0, 2.0, 0);

        // Axle shaft
        const axleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 16);
        axleGeo.rotateX(Math.PI / 2);
        const axleMesh = new THREE.Mesh(axleGeo, mat);
        rotorGroup.add(axleMesh);

        // Central hub
        const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.35, 20);
        hubGeo.rotateX(Math.PI / 2);
        const hubMesh = new THREE.Mesh(hubGeo, mat);
        rotorGroup.add(hubMesh);

        // Dynamic Rotor Body in Cannon-es
        const rotorWorldPos = new CANNON.Vec3(spawnPos.x, spawnPos.y + 2.0, spawnPos.z);
        const rotorBody = new CANNON.Body({
          mass: 0.85,
          position: rotorWorldPos,
          angularDamping: 0.06,
          linearDamping: 0.8,
        });

        // 4 Spoons at 90° intervals around Z axis
        for (let k = 0; k < 4; k++) {
          const phi = k * (Math.PI / 2);
          const armGroup = new THREE.Group();
          armGroup.rotation.z = phi;

          // Radial arm rod
          const armGeo = new THREE.BoxGeometry(0.56, 0.08, 0.14);
          const armM = new THREE.Mesh(armGeo, mat);
          armM.position.set(0.42, 0, 0);
          armM.castShadow = true;
          armM.receiveShadow = true;
          armGroup.add(armM);

          // Spoon Bucket Floor (Scoop)
          const scoopFloorGeo = new THREE.BoxGeometry(0.32, 0.06, 0.44);
          const scoopFloorM = new THREE.Mesh(scoopFloorGeo, mat);
          scoopFloorM.position.set(0.82, 0, 0);
          scoopFloorM.castShadow = true;
          scoopFloorM.receiveShadow = true;
          armGroup.add(scoopFloorM);

          // Back wall of scoop (pusher lip to catch the ball)
          const lipGeo = new THREE.BoxGeometry(0.06, 0.22, 0.44);
          const lipM = new THREE.Mesh(lipGeo, mat);
          lipM.position.set(0.82, 0.12, 0);
          lipM.castShadow = true;
          lipM.receiveShadow = true;
          armGroup.add(lipM);

          // Side retaining walls
          const sideGeo = new THREE.BoxGeometry(0.32, 0.14, 0.04);
          const sideL = new THREE.Mesh(sideGeo, mat);
          sideL.position.set(0.82, 0.06, -0.21);
          armGroup.add(sideL);

          const sideR = new THREE.Mesh(sideGeo, mat);
          sideR.position.set(0.82, 0.06, 0.21);
          armGroup.add(sideR);

          rotorGroup.add(armGroup);

          // Cannon Collision Shapes for the Spoon
          const qRotor = new CANNON.Quaternion();
          qRotor.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), phi);

          // Arm rod collider
          rotorBody.addShape(
            new CANNON.Box(new CANNON.Vec3(0.28, 0.04, 0.07)),
            new CANNON.Vec3(0.42 * Math.cos(phi), 0.42 * Math.sin(phi), 0),
            qRotor
          );

          // Scoop floor collider
          rotorBody.addShape(
            new CANNON.Box(new CANNON.Vec3(0.16, 0.03, 0.22)),
            new CANNON.Vec3(0.82 * Math.cos(phi), 0.82 * Math.sin(phi), 0),
            qRotor
          );

          // Scoop back lip collider
          rotorBody.addShape(
            new CANNON.Box(new CANNON.Vec3(0.03, 0.11, 0.22)),
            new CANNON.Vec3(0.82 * Math.cos(phi) - 0.12 * Math.sin(phi), 0.82 * Math.sin(phi) + 0.12 * Math.cos(phi), 0),
            qRotor
          );
        }

        group.add(rotorGroup);
        mesh = group;

        // Register dynamic rotor body
        this.world.addBody(rotorBody);

        // Connect rotor to frame with HingeConstraint along Z axis
        const hinge = new CANNON.HingeConstraint(body, rotorBody, {
          pivotA: new CANNON.Vec3(0, 2.0, 0),
          axisA: new CANNON.Vec3(0, 0, 1),
          pivotB: new CANNON.Vec3(0, 0, 0),
          axisB: new CANNON.Vec3(0, 0, 1),
        });
        // Motor: the wheel turns by itself at a medium-slow pace (balls can still push it)
        hinge.enableMotor();
        hinge.setMotorSpeed(SPINNER_MOTOR_SPEED);
        hinge.setMotorMaxForce(SPINNER_MOTOR_MAX_FORCE);
        this.world.addConstraint(hinge);

        itemExtra = {
          rotorMesh: rotorGroup,
          rotorBody,
          rotorOffset: new THREE.Vector3(0, 2.0, 0),
          constraints: [hinge],
          extraBodies: [rotorBody],
        };
        break;
      }

      default: {
        if (isDecorType(type)) {
          // Decoration: multi-material model (+ real lights for lamps / spotlights) with box colliders
          const built = buildDecor(type, { lights: true });
          mesh = built.group;
          if (built.rig) itemExtra = { lightRig: built.rig };
          body = new CANNON.Body({ mass: 0 });
          built.colliders.forEach((c) => {
            body.addShape(
              new CANNON.Box(new CANNON.Vec3(c.half[0], c.half[1], c.half[2])),
              new CANNON.Vec3(c.offset[0], c.offset[1], c.offset[2])
            );
          });
          break;
        }
        const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        body = new CANNON.Body({
          mass: 0,
          shape: new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.8)),
        });
        break;
      }
    }

    mesh.position.copy(spawnPos);
    mesh.userData = { id, isSandboxItem: true };

    // Cannon only applies custom contact materials when BOTH bodies have a material,
    // so the scenery must carry the world's default material for ball presets to work.
    body.material = this.world.defaultMaterial;
    if (itemExtra.rotorBody) itemExtra.rotorBody.material = this.world.defaultMaterial;

    body.position.set(spawnPos.x, spawnPos.y, spawnPos.z);
    this.scene.add(mesh);
    this.world.addBody(body);

    const item: SandboxItem = {
      id,
      type,
      name,
      mesh,
      body,
      initialScale: new THREE.Vector3(1, 1, 1),
      ...itemExtra,
    };

    this.items.push(item);
    // New lamps/spotlights immediately match the current time of day
    if (item.lightRig) this.applyDecorLighting();
    if (!silent) sound.playClick(0.1);
    return item;
  }

  /**
   * Sets how dark the environment is (0 = bright day, 1 = night). Lamps and spotlights fade in,
   * their emissive parts and beams glow, and the nearest few of them start casting shadows.
   */
  public setDarkness(darkness: number) {
    const d = Math.min(1, Math.max(0, darkness));
    if (Math.abs(d - this.darkness) < 1e-4) return;
    this.darkness = d;
    this.applyDecorLighting();
  }

  private applyDecorLighting() {
    const f = smoothstep01(0.12, 0.8, this.darkness);
    setDecorGlow(f);

    let spotShadows = 0;
    let pointShadows = 0;
    const casters: (THREE.SpotLight | THREE.PointLight)[] = [];

    for (const item of this.items) {
      const rig = item.lightRig;
      if (!rig) continue;

      for (const entry of rig.lights) {
        entry.light.intensity = entry.baseIntensity * f;

        let wantShadow = false;
        if (f > 0.15 && entry.allowShadow) {
          if (entry.kind === 'spot' && spotShadows < MAX_SPOT_SHADOWS) {
            wantShadow = true;
            spotShadows++;
          } else if (entry.kind === 'point' && pointShadows < MAX_POINT_SHADOWS) {
            wantShadow = true;
            pointShadows++;
          }
        }
        // Toggling castShadow recompiles materials, so only touch it when it really changes
        if (entry.light.castShadow !== wantShadow) {
          entry.light.castShadow = wantShadow;
          // Refreshed manually every few frames (see update())
          entry.light.shadow.autoUpdate = false;
          entry.light.shadow.needsUpdate = true;
        }
        if (wantShadow) casters.push(entry.light);
      }

      for (const beam of rig.beams) {
        beam.mesh.visible = f > 0.02;
        (beam.mesh.material as THREE.MeshBasicMaterial).opacity = beam.baseOpacity * f;
      }
    }
    this.shadowCasters = casters;
  }

  private disposeRig(rig?: DecorLightRig) {
    rig?.lights.forEach((e) => e.light.shadow.dispose());
  }

  private addMachineColliders(body: CANNON.Body, colliders: MachineCollider[]) {
    for (const c of colliders) {
      body.addShape(
        new CANNON.Box(new CANNON.Vec3(c.half[0], c.half[1], c.half[2])),
        new CANNON.Vec3(c.offset[0], c.offset[1], c.offset[2]),
        c.quat ? new CANNON.Quaternion(c.quat[0], c.quat[1], c.quat[2], c.quat[3]) : undefined
      );
    }
  }

  /**
   * Escalator and ball lift: every ball inside a machine's working zone is accelerated towards the
   * machine's carrying speed (it never slows balls that are already faster). The zone is evaluated in
   * the piece's local space, so moving, rotating and stretching the piece keeps it working.
   */
  private applyMachines(dt: number) {
    if (this.balls.length === 0) return;

    for (const item of this.items) {
      const spec = item.machine;
      if (!spec) continue;

      item.mesh.updateMatrixWorld(true);
      const mw = item.mesh.matrixWorld;
      _mInv.copy(mw).invert();

      if (spec.kind === 'belt') {
        const cos = Math.cos(spec.alpha);
        const sin = Math.sin(spec.alpha);
        _mDir.set(cos, sin, 0).transformDirection(mw);

        for (const ball of this.balls) {
          const p = ball.body.position;
          _mP.set(p.x, p.y, p.z).applyMatrix4(_mInv);
          const px = _mP.x;
          const py = _mP.y - spec.centerY;
          // Belt-space coordinates: u along the belt, v above its surface, w across
          const u = px * cos + py * sin;
          const v = -px * sin + py * cos;
          if (Math.abs(u) > spec.length / 2 + 0.1 || v < -0.15 || v > 0.75 || Math.abs(_mP.z) > spec.width / 2 + 0.08) {
            continue;
          }
          const vel = ball.body.velocity;
          const along = vel.x * _mDir.x + vel.y * _mDir.y + vel.z * _mDir.z;
          if (along < spec.speed) {
            const dv = Math.min(BELT_ACCEL * dt, spec.speed - along);
            vel.x += _mDir.x * dv;
            vel.y += _mDir.y * dv;
            vel.z += _mDir.z * dv;
          }
        }
      } else {
        _mDir.set(0, 1, 0).transformDirection(mw); // local up
        _mFwd.set(1, 0, 0).transformDirection(mw); // local +X (exit side)

        for (const ball of this.balls) {
          const p = ball.body.position;
          _mP.set(p.x, p.y, p.z).applyMatrix4(_mInv);
          const vel = ball.body.velocity;
          const r = Math.hypot(_mP.x, _mP.z);
          const y = _mP.y;

          // Feeder: gently rolls balls resting in front of the entrance into the tube
          const f = spec.feed;
          if (y < 0.8 && _mP.x > f.x0 && _mP.x < f.x1 && Math.abs(_mP.z) < f.halfZ) {
            const along = vel.x * _mFwd.x + vel.y * _mFwd.y + vel.z * _mFwd.z;
            if (along < f.speed) {
              const dv = Math.min(f.accel * dt, f.speed - along);
              vel.x += _mFwd.x * dv;
              vel.y += _mFwd.y * dv;
              vel.z += _mFwd.z * dv;
            }
          }

          if (r >= spec.liftRadius || y <= 0.08 || y >= spec.topY) continue;

          // Lift: accelerate towards the lift speed, tapering off near the top to avoid overshooting
          const taper = clampN((spec.topY - y) / 0.9, 0.12, 1);
          const target = spec.speed * taper;
          const vUp = vel.x * _mDir.x + vel.y * _mDir.y + vel.z * _mDir.z;
          const dvUp = clampN(target - vUp, -LIFT_ACCEL * dt, LIFT_ACCEL * dt);
          vel.x += _mDir.x * dvUp;
          vel.y += _mDir.y * dvUp;
          vel.z += _mDir.z * dvUp;

          if (y < spec.ejectY) {
            // Keep the ball on the tube axis: damp sideways speed and pull towards the center
            const k = Math.min(1, 6 * dt);
            const vu = vel.x * _mDir.x + vel.y * _mDir.y + vel.z * _mDir.z;
            vel.x -= (vel.x - _mDir.x * vu) * k;
            vel.y -= (vel.y - _mDir.y * vu) * k;
            vel.z -= (vel.z - _mDir.z * vu) * k;
            if (r > 1e-3) {
              _mPull.set(-_mP.x, 0, -_mP.z).transformDirection(mw);
              const pull = Math.min(r, 0.6) * 12 * dt;
              vel.x += _mPull.x * pull;
              vel.y += _mPull.y * pull;
              vel.z += _mPull.z * pull;
            }
          } else {
            // Near the top: push out through the exit window onto the chute
            const vF = vel.x * _mFwd.x + vel.y * _mFwd.y + vel.z * _mFwd.z;
            const dvF = clampN(2.6 - vF, -16 * dt, 16 * dt);
            vel.x += _mFwd.x * dvF;
            vel.y += _mFwd.y * dvF;
            vel.z += _mFwd.z * dvF;
          }
        }
      }
    }
  }

  /** Reverses (or restores) the turning direction of a mill's scoops */
  public setSpinnerReversed(item: SandboxItem, reversed: boolean) {
    item.reversed = reversed;
    if (item.type !== 'spinner_wheel') return;
    const hinge = item.constraints?.[0] as CANNON.HingeConstraint | undefined;
    if (hinge) {
      hinge.setMotorSpeed((reversed ? -1 : 1) * SPINNER_MOTOR_SPEED);
    }
    item.rotorBody?.wakeUp();
  }

  /**
   * Builds an architectural curved slide/chute geometry and compound Cannon-es collider
   */
  private createCurvedChute(
    angleRad: number,
    dropHeight: number,
    mat: THREE.Material
  ): { group: THREE.Group; body: CANNON.Body } {
    const group = new THREE.Group();
    const body = new CANNON.Body({ mass: 0 });

    const { R, channelWidth, floorThickness, wallThickness, wallHeight, offsetX, offsetZ } = SandboxWorld.getChuteParams(
      angleRad,
      dropHeight
    );
    const innerWallHeight = wallHeight;
    const outerWallHeight = wallHeight;
    // Physics colliders: enough segments to follow the curve closely
    const numSegments = Math.max(8, Math.round(18 * (angleRad / Math.PI)));
    const dTheta = angleRad / numSegments;
    // Each box is sized for the radius it sits on, so the outer edge has no gaps
    const floorLength = (R + channelWidth / 2) * dTheta * 1.1;
    const outerLength = (R + channelWidth / 2 + wallThickness / 2) * dTheta * 1.12;
    const innerLength = (R - channelWidth / 2 - wallThickness / 2) * dTheta * 1.12;

    const pitchAngle = dropHeight > 0 ? Math.atan2(dropHeight, R * angleRad) : 0;

    for (let i = 0; i < numSegments; i++) {
      const theta = (i + 0.5) * dTheta;
      const progress = (i + 0.5) / numSegments;
      const ym = dropHeight > 0 ? dropHeight * (1 - progress) + floorThickness / 2 : floorThickness / 2;
      const xm = R * Math.cos(theta) + offsetX;
      const zm = R * Math.sin(theta) + offsetZ;

      // Cannon-es compound collider shapes (the visible mesh is one smooth swept channel, see below)
      const eul = new THREE.Euler(pitchAngle, -theta, 0, 'YXZ');
      const tq = new THREE.Quaternion().setFromEuler(eul);
      const q = new CANNON.Quaternion(tq.x, tq.y, tq.z, tq.w);
      const segCenter = new CANNON.Vec3(xm, ym, zm);

      // Floor box
      body.addShape(new CANNON.Box(new CANNON.Vec3(channelWidth / 2, floorThickness / 2, floorLength / 2)), segCenter, q);

      // Outer wall box (offset in rotated frame)
      const outerOffsetLocal = new THREE.Vector3(
        channelWidth / 2 + wallThickness / 2,
        outerWallHeight / 2 - floorThickness / 2,
        0
      ).applyQuaternion(tq);
      const outerPos = new CANNON.Vec3(xm + outerOffsetLocal.x, ym + outerOffsetLocal.y, zm + outerOffsetLocal.z);
      body.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness / 2, outerWallHeight / 2, outerLength / 2)), outerPos, q);

      // Inner wall box (offset in rotated frame)
      const innerOffsetLocal = new THREE.Vector3(
        -(channelWidth / 2 + wallThickness / 2),
        innerWallHeight / 2 - floorThickness / 2,
        0
      ).applyQuaternion(tq);
      const innerPos = new CANNON.Vec3(xm + innerOffsetLocal.x, ym + innerOffsetLocal.y, zm + innerOffsetLocal.z);
      body.addShape(new CANNON.Box(new CANNON.Vec3(wallThickness / 2, innerWallHeight / 2, innerLength / 2)), innerPos, q);
    }

    // Visible geometry: a single continuous channel swept along the curve
    const chuteGeo = SandboxWorld.buildChuteGeometry({
      angleRad,
      dropHeight,
      R,
      offsetX,
      offsetZ,
      channelWidth,
      floorThickness,
      wallThickness,
      wallHeight,
    });
    const chuteMesh = new THREE.Mesh(chuteGeo, mat);
    chuteMesh.castShadow = true;
    chuteMesh.receiveShadow = true;
    group.add(chuteMesh);

    return { group, body };
  }

  /**
   * Shared dimensions of the curved chutes (used by the real piece and by the ghost preview).
   * Low, flat rims: they only rise ~1.3 ball radii above the running surface. That is just
   * enough to keep the very fast Flash ball (16 m/s) inside the curves while still looking flat.
   */
  public static getChuteParams(angleRad: number, dropHeight: number) {
    const R = 1.7;
    const floorThickness = 0.18;
    return {
      R,
      channelWidth: 1.0,
      floorThickness,
      wallThickness: 0.12,
      // Measured from the floor's underside
      wallHeight: floorThickness + (dropHeight > 0 ? 0.44 : 0.42),
      // Centering offset
      offsetX: angleRad < Math.PI * 0.75 ? -(R / 2) : 0,
      offsetZ: -(R / 2),
    };
  }

  /**
   * Sweeps a low U-shaped cross-section (flat floor + two thin flat-topped rims) along the
   * chute's center curve, producing one continuous watertight mesh. Normals are smooth along
   * the curve and sharp across the profile edges, so the walls look flat and clean.
   * Frames match the physics segments: radial = local X, tangent = local Z (with pitch).
   */
  public static buildChuteGeometry(o: {
    angleRad: number;
    dropHeight: number;
    R: number;
    offsetX: number;
    offsetZ: number;
    channelWidth: number;
    floorThickness: number;
    wallThickness: number;
    wallHeight: number;
  }): THREE.BufferGeometry {
    const { angleRad, dropHeight, R, offsetX, offsetZ, channelWidth, floorThickness: ft, wallThickness: wt, wallHeight } = o;
    const steps = Math.max(16, Math.round(48 * (angleRad / Math.PI)));
    const TILE = 2.0; // meters per texture repeat

    // Profile in (radial, up) coordinates relative to the floor's center line, CCW
    const W = channelWidth / 2 + wt;
    const yBottom = -ft / 2;
    const yFloor = ft / 2;
    const yRim = wallHeight - ft / 2;
    const profile: [number, number][] = [
      [-W, yBottom],
      [W, yBottom],
      [W, yRim],
      [W - wt, yRim],
      [W - wt, yFloor],
      [-(W - wt), yFloor],
      [-(W - wt), yRim],
      [-W, yRim],
    ];
    const P = profile.length;

    // Frames along the path
    const slope = dropHeight > 0 ? dropHeight / (R * angleRad) : 0;
    const centers: THREE.Vector3[] = [];
    const radials: THREE.Vector3[] = [];
    const ups: THREE.Vector3[] = [];
    const dist: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const th = t * angleRad;
      const c = new THREE.Vector3(R * Math.cos(th) + offsetX, dropHeight * (1 - t) + ft / 2, R * Math.sin(th) + offsetZ);
      const rad = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
      const tan = new THREE.Vector3(-Math.sin(th), -slope, Math.cos(th)).normalize();
      const up = new THREE.Vector3().crossVectors(tan, rad).normalize();
      centers.push(c);
      radials.push(rad);
      ups.push(up);
      dist.push(i === 0 ? 0 : dist[i - 1] + c.distanceTo(centers[i - 1]));
    }

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const world = (i: number, px: number, py: number) =>
      new THREE.Vector3().copy(centers[i]).addScaledVector(radials[i], px).addScaledVector(ups[i], py);

    // Side strips: one per profile edge (own vertices => sharp edges across the profile)
    let vOffset = 0;
    for (let k = 0; k < P; k++) {
      const [ax, ay] = profile[k];
      const [bx, by] = profile[(k + 1) % P];
      const edgeLen = Math.hypot(bx - ax, by - ay);
      const base = positions.length / 3;
      for (let i = 0; i <= steps; i++) {
        const a = world(i, ax, ay);
        const b = world(i, bx, by);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
        uvs.push(dist[i] / TILE, vOffset / TILE, dist[i] / TILE, (vOffset + edgeLen) / TILE);
      }
      for (let i = 0; i < steps; i++) {
        const a0 = base + i * 2;
        const b0 = a0 + 1;
        const a1 = a0 + 2;
        const b1 = a0 + 3;
        indices.push(a0, b0, a1, b0, b1, a1);
      }
      vOffset += edgeLen;
    }

    // End caps (flat shaded)
    const contour = profile.map(([x, y]) => new THREE.Vector2(x, y));
    const tris = THREE.ShapeUtils.triangulateShape(contour, []);
    const addCap = (frame: number, facingForward: boolean) => {
      const base = positions.length / 3;
      for (const [x, y] of profile) {
        const v = world(frame, x, y);
        positions.push(v.x, v.y, v.z);
        uvs.push(x / TILE, y / TILE);
      }
      for (const [i0, i1, i2] of tris) {
        const cross =
          (contour[i1].x - contour[i0].x) * (contour[i2].y - contour[i0].y) -
          (contour[i1].y - contour[i0].y) * (contour[i2].x - contour[i0].x);
        const ccw = cross > 0;
        // End cap looks along +tangent (needs CCW), start cap looks along -tangent (needs CW)
        const keep = facingForward ? ccw : !ccw;
        if (keep) indices.push(base + i0, base + i1, base + i2);
        else indices.push(base + i0, base + i2, base + i1);
      }
    };
    addCap(0, false);
    addCap(steps, true);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Synchronizes physics body when user moves, rotates, or scales a shape
   */
  public updateItemTransform(item: SandboxItem) {
    item.body.position.copy(item.mesh.position as unknown as CANNON.Vec3);
    item.body.quaternion.copy(item.mesh.quaternion as unknown as CANNON.Quaternion);

    // Scale the physics colliders so they match the stretched mesh
    const scale = item.mesh.scale;
    this.applyItemScale(item, scale);

    // Sync kinetic secondary rotor body and hinge anchor if item has one
    if (item.rotorBody && item.rotorOffset) {
      const scaledPivot = item.rotorOffset.clone().multiply(scale);
      const worldPivot = scaledPivot.clone().applyQuaternion(item.mesh.quaternion).add(item.mesh.position);
      item.rotorBody.position.copy(worldPivot as unknown as CANNON.Vec3);
      item.rotorBody.quaternion.copy(item.mesh.quaternion as unknown as CANNON.Quaternion);
      item.rotorBody.velocity.set(0, 0, 0);
      item.rotorBody.angularVelocity.set(0, 0, 0);
      item.constraints?.forEach((c) => {
        const pivotA = (c as unknown as { pivotA?: CANNON.Vec3 }).pivotA;
        if (pivotA) pivotA.set(scaledPivot.x, scaledPivot.y, scaledPivot.z);
      });
    }
  }

  /**
   * Rebuilds the collision shapes of an item for the given mesh scale.
   * The scale is an affine transform in the item's local frame, so every collider is
   * transformed the same way as the visible mesh: offsets are scaled, axis-aligned (or
   * uniformly scaled) boxes stay boxes, and rotated boxes / cylinders become convex
   * polyhedra built from their scaled vertices. The body's bounding radius and AABB are
   * refreshed, otherwise the broadphase would still cull collisions on the stretched area.
   */
  private applyItemScale(item: SandboxItem, scale: THREE.Vector3) {
    const body = item.body;

    if (!item.baseColliders) {
      item.baseColliders = body.shapes.map((shape, i) => {
        const base: BaseCollider = {
          shape,
          offset: body.shapeOffsets[i].clone(),
          orientation: body.shapeOrientations[i].clone(),
        };
        if (shape instanceof CANNON.Box) {
          const rep = shape.convexPolyhedronRepresentation;
          base.halfExtents = shape.halfExtents.clone();
          base.vertices = rep.vertices.map((v) => v.clone());
          base.faces = rep.faces.map((f) => [...f]);
        } else if (shape instanceof CANNON.ConvexPolyhedron) {
          base.vertices = shape.vertices.map((v) => v.clone());
          base.faces = shape.faces.map((f) => [...f]);
        }
        return base;
      });
      item.appliedScale = new THREE.Vector3(1, 1, 1);
    }

    const sx = Math.max(Math.abs(scale.x), 0.05);
    const sy = Math.max(Math.abs(scale.y), 0.05);
    const sz = Math.max(Math.abs(scale.z), 0.05);
    const target = new THREE.Vector3(sx, sy, sz);
    const applied = item.appliedScale!;
    if (applied.distanceToSquared(target) < 1e-10) return;
    applied.copy(target);

    const isIdentity = Math.abs(sx - 1) < 1e-6 && Math.abs(sy - 1) < 1e-6 && Math.abs(sz - 1) < 1e-6;
    const isUniform = Math.abs(sx - sy) < 1e-4 && Math.abs(sy - sz) < 1e-4;

    body.shapes = [];
    body.shapeOffsets = [];
    body.shapeOrientations = [];

    for (const base of item.baseColliders) {
      let shape = base.shape;
      const offset = base.offset.clone();
      const orientation = base.orientation.clone();

      if (!isIdentity) {
        offset.set(offset.x * sx, offset.y * sy, offset.z * sz);
        const axisAligned = Math.abs(orientation.x) + Math.abs(orientation.y) + Math.abs(orientation.z) < 1e-6;

        if (base.halfExtents && (axisAligned || isUniform)) {
          shape = new CANNON.Box(new CANNON.Vec3(base.halfExtents.x * sx, base.halfExtents.y * sy, base.halfExtents.z * sz));
        } else if (base.vertices && base.faces) {
          const vertices = base.vertices.map((v) => {
            const r = orientation.vmult(v);
            return new CANNON.Vec3(r.x * sx, r.y * sy, r.z * sz);
          });
          shape = new CANNON.ConvexPolyhedron({ vertices, faces: base.faces.map((f) => [...f]) });
          orientation.set(0, 0, 0, 1);
        }
      }

      shape.body = body;
      body.shapes.push(shape);
      body.shapeOffsets.push(offset);
      body.shapeOrientations.push(orientation);
    }

    body.updateMassProperties();
    body.updateBoundingRadius();
    body.aabbNeedsUpdate = true;
  }

  /**
   * Synchronizes physics body when user moves a ball with TransformControls
   */
  public updateBallTransform(ball: PhysicsBall) {
    ball.body.position.copy(ball.mesh.position as unknown as CANNON.Vec3);
    ball.body.velocity.set(0, 0, 0);
    ball.body.angularVelocity.set(0, 0, 0);
    ball.spawnPos.copy(ball.mesh.position);
  }

  /**
   * Removes an architectural shape from the scene and physics world
   */
  public removeItem(item: SandboxItem) {
    if (item.constraints) {
      item.constraints.forEach((c) => this.world.removeConstraint(c));
    }
    if (item.extraBodies) {
      item.extraBodies.forEach((b) => this.world.removeBody(b));
    }
    this.scene.remove(item.mesh);
    this.world.removeBody(item.body);
    this.items = this.items.filter((i) => i.id !== item.id);
    if (item.lightRig) {
      this.disposeRig(item.lightRig);
      this.applyDecorLighting();
    }
    sound.playClick(0.08);
  }

  /**
   * Spawns a dynamic physics ball with the selected finish
   */
  public addBall(
    skin: BallSkin,
    spawnPos = new THREE.Vector3(0, 4.0, 0),
    silent = false,
    presetId: BallPresetId = DEFAULT_BALL_PRESET
  ): PhysicsBall {
    const preset = BALL_PRESETS[presetId] || BALL_PRESETS[DEFAULT_BALL_PRESET];
    const id = `ball_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const radius = 0.32;

    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(skin.color),
      metalness: skin.metalness,
      roughness: skin.roughness,
      clearcoat: skin.clearcoat ?? 0.5,
      transmission: skin.transmission ?? 0,
      ior: skin.ior ?? 1.5,
      emissive: skin.emissive ? new THREE.Color(skin.emissive) : new THREE.Color(0x000000),
      emissiveIntensity: skin.emissiveIntensity ?? 0,
      reflectivity: 0.9,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { id, isPhysicsBall: true };

    const shape = new CANNON.Sphere(radius);
    const body = new CANNON.Body({
      mass: preset.mass,
      shape,
      material: this.ballMaterials[preset.id],
      position: new CANNON.Vec3(spawnPos.x, spawnPos.y, spawnPos.z),
      linearDamping: preset.linearDamping,
      angularDamping: preset.angularDamping,
    });

    // Sound collision event on high-speed impact
    body.addEventListener('collide', (e: { contact: { getImpactVelocityAlongNormal: () => number } }) => {
      const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (impact > 1.4) {
        sound.playHover(Math.min(0.15, impact * 0.02));
      }
    });

    // Speed FX: glow halo (a camera-facing sprite) + a streak that always trails behind the ball
    let streak: THREE.Mesh | undefined;
    if (preset.fx) {
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getHaloTexture(),
          color: preset.fx.color,
          blending: THREE.AdditiveBlending,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        })
      );
      halo.scale.set(1.5, 1.5, 1);
      halo.raycast = () => {};
      mesh.add(halo);

      streak = new THREE.Mesh(
        getStreakGeometry(),
        new THREE.MeshBasicMaterial({
          color: preset.fx.color,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      streak.raycast = () => {};
      streak.visible = false;
      mesh.add(streak);
    }

    this.scene.add(mesh);
    this.world.addBody(body);

    const ball: PhysicsBall = {
      id,
      skinId: skin.id,
      presetId: preset.id,
      name: skin.name,
      mesh,
      body,
      spawnPos: spawnPos.clone(),
      streak,
    };

    this.balls.push(ball);
    if (!silent) sound.playClick(0.14);
    return ball;
  }

  /**
   * Resets all balls to their spawn points
   */
  public resetBalls() {
    this.balls.forEach((ball) => {
      ball.body.position.copy(ball.spawnPos as unknown as CANNON.Vec3);
      ball.body.velocity.set(0, 0, 0);
      ball.body.angularVelocity.set(0, 0, 0);
      ball.mesh.position.copy(ball.spawnPos);
    });
    sound.playModalTransition();
  }

  /**
   * Clears all balls
   */
  public clearBalls(silent = false) {
    this.balls.forEach((ball) => {
      this.scene.remove(ball.mesh);
      this.world.removeBody(ball.body);
    });
    this.balls = [];
    if (!silent) sound.playClick(0.08);
  }

  /**
   * Clears all pieces and balls
   */
  public clearAll(silent = false) {
    this.clearBalls(silent);
    this.items.forEach((item) => {
      if (item.constraints) {
        item.constraints.forEach((c) => this.world.removeConstraint(c));
      }
      if (item.extraBodies) {
        item.extraBodies.forEach((b) => this.world.removeBody(b));
      }
      this.scene.remove(item.mesh);
      this.world.removeBody(item.body);
      this.disposeRig(item.lightRig);
    });
    this.items = [];
    this.shadowCasters = [];
    if (!silent) sound.playClick(0.1);
  }

  /**
   * Sets gravity preset
   */
  public setGravity(val: number) {
    this.world.gravity.set(0, val, 0);
  }

  /**
   * Simulation step (called every frame)
   */
  public update(delta: number) {
    // Artificial-light shadow maps: refreshed every other frame (even when paused, so moving a
    // piece while paused still updates its shadow). Halves the cost with no visible lag.
    if (this.shadowCasters.length > 0) {
      this.lightShadowFrame++;
      const refresh = this.lightShadowFrame % LIGHT_SHADOW_UPDATE_EVERY === 0;
      for (const light of this.shadowCasters) light.shadow.needsUpdate = refresh;
    }

    if (!this.isPaused) {
      // Escalators / ball lifts carry the balls inside their working zone; belts and light bands scroll
      const machineDt = Math.min(delta, 0.1);
      this.applyMachines(machineDt);
      tickMachineTextures(machineDt);

      // Self-propelled balls (Flash): push along the horizontal direction of travel up to maxSpeed
      for (const ball of this.balls) {
        const boost = BALL_PRESETS[ball.presetId]?.boost;
        if (!boost) continue;
        const v = ball.body.velocity;
        const horizontal = Math.hypot(v.x, v.z);
        if (horizontal > 0.8 && horizontal < boost.maxSpeed) {
          const f = (ball.body.mass * boost.accel) / horizontal;
          ball.body.force.x += v.x * f;
          ball.body.force.z += v.z * f;
        }
      }

      // Fixed time step
      this.world.step(1 / 60, Math.min(delta, 0.1), 3);

      // Sync dynamic kinetic item meshes (such as rotating spoon wheels)
      for (let j = 0; j < this.items.length; j++) {
        const it = this.items[j];
        if (it.rotorMesh && it.rotorBody) {
          const invParent = it.mesh.quaternion.clone().invert();
          const qWorld = new THREE.Quaternion(
            it.rotorBody.quaternion.x,
            it.rotorBody.quaternion.y,
            it.rotorBody.quaternion.z,
            it.rotorBody.quaternion.w
          );
          it.rotorMesh.quaternion.copy(qWorld.premultiply(invParent));
        }
      }

      // Sync balls & cleanup fallen balls in void
      for (let i = this.balls.length - 1; i >= 0; i--) {
        const ball = this.balls[i];

        ball.mesh.position.copy(ball.body.position as unknown as THREE.Vector3);
        ball.mesh.quaternion.copy(ball.body.quaternion as unknown as THREE.Quaternion);

        // Streak trails behind the direction of motion; it is a child of the (spinning) ball mesh,
        // so its local rotation cancels the ball's own rotation to stay aligned in world space
        if (ball.streak) {
          const bv = ball.body.velocity;
          const speed = Math.hypot(bv.x, bv.y, bv.z);
          const k = Math.min(1, Math.max(0, (speed - 5) / 11));
          ball.streak.visible = k > 0.02;
          if (ball.streak.visible) {
            _fxDir.set(-bv.x, -bv.y, -bv.z).normalize();
            _fxQuat.setFromUnitVectors(_UP, _fxDir);
            _fxInv.copy(ball.mesh.quaternion).invert();
            ball.streak.quaternion.copy(_fxInv).multiply(_fxQuat);
            ball.streak.scale.set(1, 0.25 + 0.75 * k, 1);
            (ball.streak.material as THREE.MeshBasicMaterial).opacity = 0.15 + 0.4 * k;
          }
        }

        // Respawn or remove if fell far down into the void
        if (ball.mesh.position.y < -25) {
          if (this.autoRespawn) {
            ball.body.position.copy(ball.spawnPos as unknown as CANNON.Vec3);
            ball.body.velocity.set(0, 0, 0);
            ball.body.angularVelocity.set(0, 0, 0);
            ball.mesh.position.copy(ball.spawnPos);
          } else {
            this.scene.remove(ball.mesh);
            this.world.removeBody(ball.body);
            this.balls.splice(i, 1);
          }
        }
      }
    }
  }

  /**
   * Serializes current platform, items, and balls for saving into Dexie
   */
  public serialize(): {
    platformConfig: PlatformConfig;
    items: SerializedSandboxItem[];
    balls: SerializedPhysicsBall[];
  } {
    const serializedItems: SerializedSandboxItem[] = (this.items || []).map((item) => {
      const pos = item.mesh?.position || { x: 0, y: 0, z: 0 };
      const rot = item.mesh?.quaternion || { x: 0, y: 0, z: 0, w: 1 };
      const scl = item.mesh?.scale || { x: 1, y: 1, z: 1 };

      return {
        id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: item.type,
        position: {
          x: typeof pos.x === 'number' && !isNaN(pos.x) ? Number(pos.x.toFixed(3)) : 0,
          y: typeof pos.y === 'number' && !isNaN(pos.y) ? Number(pos.y.toFixed(3)) : 0,
          z: typeof pos.z === 'number' && !isNaN(pos.z) ? Number(pos.z.toFixed(3)) : 0,
        },
        rotation: {
          x: typeof rot.x === 'number' && !isNaN(rot.x) ? Number(rot.x.toFixed(6)) : 0,
          y: typeof rot.y === 'number' && !isNaN(rot.y) ? Number(rot.y.toFixed(6)) : 0,
          z: typeof rot.z === 'number' && !isNaN(rot.z) ? Number(rot.z.toFixed(6)) : 0,
          w: typeof rot.w === 'number' && !isNaN(rot.w) ? Number(rot.w.toFixed(6)) : 1,
        },
        scale: {
          x: typeof scl.x === 'number' && !isNaN(scl.x) ? Number(scl.x.toFixed(3)) : 1,
          y: typeof scl.y === 'number' && !isNaN(scl.y) ? Number(scl.y.toFixed(3)) : 1,
          z: typeof scl.z === 'number' && !isNaN(scl.z) ? Number(scl.z.toFixed(3)) : 1,
        },
        ...(item.reversed ? { reversed: true } : {}),
      };
    });

    // Balls are intentionally NOT persisted: only the platform and the piece structure are saved.
    const serializedBalls: SerializedPhysicsBall[] = [];

    return {
      platformConfig: {
        width: typeof this.platformConfig?.width === 'number' ? this.platformConfig.width : 18,
        depth: typeof this.platformConfig?.depth === 'number' ? this.platformConfig.depth : 18,
        isInfinite: Boolean(this.platformConfig?.isInfinite),
      },
      items: serializedItems,
      balls: serializedBalls,
    };
  }

  /**
   * Restores a serialized world state from Dexie
   */
  public loadSerialized(data: {
    platformConfig?: PlatformConfig;
    items?: SerializedSandboxItem[];
    balls?: SerializedPhysicsBall[];
  }) {
    if (!data) return;

    // 1. Clear current scene and physics bodies silently
    this.clearAll(true);

    // 2. Restore platform configuration and physics size
    if (data.platformConfig) {
      this.setPlatformSize(
        Number(data.platformConfig.width) || 18,
        Number(data.platformConfig.depth) || 18,
        Boolean(data.platformConfig.isInfinite)
      );
    }

    // 3. Restore architectural items
    if (Array.isArray(data.items)) {
      data.items.forEach((itemData) => {
        if (!itemData || !itemData.type) return;
        const posX = typeof itemData.position?.x === 'number' && !isNaN(itemData.position.x) ? itemData.position.x : 0;
        const posY = typeof itemData.position?.y === 'number' && !isNaN(itemData.position.y) ? itemData.position.y : 1.2;
        const posZ = typeof itemData.position?.z === 'number' && !isNaN(itemData.position.z) ? itemData.position.z : 0;
        const pos = new THREE.Vector3(posX, posY, posZ);

        const item = this.addShape(itemData.type, pos, true);
        if (!item) return;

        if (itemData.id) {
          item.id = itemData.id;
          item.mesh.userData = { id: itemData.id, isSandboxItem: true };
        }

        if (itemData.rotation) {
          const rotX = typeof itemData.rotation.x === 'number' && !isNaN(itemData.rotation.x) ? itemData.rotation.x : 0;
          const rotY = typeof itemData.rotation.y === 'number' && !isNaN(itemData.rotation.y) ? itemData.rotation.y : 0;
          const rotZ = typeof itemData.rotation.z === 'number' && !isNaN(itemData.rotation.z) ? itemData.rotation.z : 0;
          const rotW = typeof itemData.rotation.w === 'number' && !isNaN(itemData.rotation.w) ? itemData.rotation.w : 1;
          item.mesh.quaternion.set(rotX, rotY, rotZ, rotW).normalize();
        }
        if (itemData.scale) {
          const scX = typeof itemData.scale.x === 'number' && !isNaN(itemData.scale.x) && itemData.scale.x > 0 ? itemData.scale.x : 1;
          const scY = typeof itemData.scale.y === 'number' && !isNaN(itemData.scale.y) && itemData.scale.y > 0 ? itemData.scale.y : 1;
          const scZ = typeof itemData.scale.z === 'number' && !isNaN(itemData.scale.z) && itemData.scale.z > 0 ? itemData.scale.z : 1;
          item.mesh.scale.set(scX, scY, scZ);
        }
        this.updateItemTransform(item);
        if (itemData.reversed && item.type === 'spinner_wheel') {
          this.setSpinnerReversed(item, true);
        }
      });
      console.log(`[SandboxPhysics] Deserialized and restored ${data.items.length} items to scene.`);
    }

    // Balls are not persisted: only the platform and the piece structure are restored.
  }

  public dispose() {
    this.clearAll();
    if (this.platformMesh) {
      this.scene.remove(this.platformMesh);
      this.platformMesh.geometry.dispose();
    }
    if (this.platformTrim) {
      this.platformTrim.geometry.dispose();
      (this.platformTrim.material as THREE.Material).dispose();
    }
    if (this.platformMaterial) {
      this.platformMaterial.dispose();
    }
    if (this.platformTextures) {
      this.platformTextures.map.dispose();
      this.platformTextures.bumpMap.dispose();
      this.platformTextures.roughnessMap.dispose();
    }
    if (this.platformBody) {
      this.world.removeBody(this.platformBody);
    }
    this.concreteMaterial.dispose();
    Object.values(this.shapeMaterials).forEach((m) => m.dispose());
  }
}
