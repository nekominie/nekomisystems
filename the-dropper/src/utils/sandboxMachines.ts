import * as THREE from 'three';

/**
 * Machines that carry balls UPWARDS:
 *  - escalator: an inclined conveyor belt ("escalera eléctrica para canicas").
 *  - ball_lift: a vertical glass tube with an air-lift beam ("elevador de canicas").
 *
 * Both are static scenery for the physics engine (box colliders). The carrying itself is done by
 * the world, which pushes the balls that are inside the machine's working zone (see `MachineSpec`).
 */

export type MachineType = 'escalator' | 'ball_lift';

export const MACHINE_TYPES: MachineType[] = ['escalator', 'ball_lift'];
export function isMachineType(type: string): type is MachineType {
  return (MACHINE_TYPES as string[]).includes(type);
}

/** Medium belt speed along the incline (m/s) and how fast the belt accelerates a ball to it */
export const BELT_SPEED = 3.2;
export const BELT_ACCEL = 28;
/** Medium lift speed (m/s) and acceleration */
export const LIFT_SPEED = 3.0;
export const LIFT_ACCEL = 30;

export interface MachineCollider {
  half: [number, number, number];
  offset: [number, number, number];
  /** Orientation as [x, y, z, w]; identity when omitted */
  quat?: [number, number, number, number];
}

/** Working zone of a machine, expressed in the piece's LOCAL (unscaled) coordinates */
export type MachineSpec =
  | {
      kind: 'belt';
      /** Incline angle (rad) of the belt about the local Z axis; the belt rises towards +X */
      alpha: number;
      length: number;
      width: number;
      /** Local height of the belt's center point */
      centerY: number;
      speed: number;
    }
  | {
      kind: 'lift';
      /** Balls closer than this to the vertical axis (local XZ) get lifted */
      liftRadius: number;
      /** Local height where the lift stops pushing */
      topY: number;
      /** Above this height balls are pushed sideways (+X) out onto the exit chute */
      ejectY: number;
      speed: number;
      /** Area in front of the bottom opening (-X side) that gently feeds balls into the tube */
      feed: { x0: number; x1: number; halfZ: number; accel: number; speed: number };
    };

export interface MachineMaterials {
  /** Concrete-like material for structure */
  body: THREE.Material;
  /** Optional special materials (ignored in ghost previews, where everything is `body`) */
  belt?: THREE.Material;
  glass?: THREE.Material;
  beam?: THREE.Material;
  /** Ghost preview mode: single hologram material, no beam */
  preview?: boolean;
}

export interface MachineBuild {
  group: THREE.Group;
  colliders: MachineCollider[];
  spec: MachineSpec;
  /** Approximate footprint diameter in meters (used by the placement ghost ring) */
  footprint: number;
}

const qZ = (a: number): [number, number, number, number] => [0, 0, Math.sin(a / 2), Math.cos(a / 2)];
const qY = (a: number): [number, number, number, number] => [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
/** Rotates a 2D point (x, y) by angle a (about Z) */
const rot2 = (x: number, y: number, a: number): [number, number] => [
  x * Math.cos(a) - y * Math.sin(a),
  x * Math.sin(a) + y * Math.cos(a),
];

function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  material: THREE.Material,
  pos: [number, number, number]
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...pos);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// ───────────────────────── Animated textures (shared, updated once per frame) ─────────────────────────

const BELT_TILE = 0.7; // meters per chevron
const BEAM_TILE = 0.9; // meters per light band
const fx: {
  beltTex?: THREE.CanvasTexture;
  beltMat?: THREE.MeshStandardMaterial;
  beamTex?: THREE.CanvasTexture;
  beamMat?: THREE.MeshBasicMaterial;
  glassMat?: THREE.MeshStandardMaterial;
} = {};

/** Dark rubber belt with glowing chevrons pointing up the slope. Scrolled by `tickMachineTextures`. */
export function getBeltMaterial(): THREE.MeshStandardMaterial {
  if (!fx.beltMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#161d29';
    ctx.fillRect(0, 0, 128, 64);
    ctx.strokeStyle = '#3de0ff';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(38, 8);
    ctx.lineTo(88, 32);
    ctx.lineTo(38, 56);
    ctx.stroke();
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    fx.beltTex = tex;
    fx.beltMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x2a8fa8,
      emissiveMap: tex,
      emissiveIntensity: 0.55,
      roughness: 0.7,
      metalness: 0.1,
    });
  }
  return fx.beltMat;
}

function getBeamMaterial(): THREE.MeshBasicMaterial {
  if (!fx.beamMat) {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 8, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    fx.beamTex = tex;
    fx.beamMat = new THREE.MeshBasicMaterial({
      map: tex,
      color: 0x53e6ff,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
  return fx.beamMat;
}

function getGlassMaterial(): THREE.MeshStandardMaterial {
  if (!fx.glassMat) {
    fx.glassMat = new THREE.MeshStandardMaterial({
      color: 0x9fd8ff,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  return fx.glassMat;
}

/** Scrolls the belt chevrons up the slope and the lift light bands upwards */
export function tickMachineTextures(dt: number) {
  if (fx.beltTex) {
    fx.beltTex.offset.x = (fx.beltTex.offset.x - (dt * BELT_SPEED) / BELT_TILE) % 1;
  }
  if (fx.beamTex) {
    fx.beamTex.offset.y = (fx.beamTex.offset.y - (dt * LIFT_SPEED) / BEAM_TILE) % 1;
  }
}

// ───────────────────────── Escalator ─────────────────────────

const ESC_LENGTH = 4.4;
const ESC_WIDTH = 1.0;
const ESC_ALPHA = Math.PI / 6; // 30°
const ESC_RISE = ESC_LENGTH * Math.sin(ESC_ALPHA); // 2.2 m
const ESC_SLAB = 0.16;
const ESC_RAIL_H = 0.42;
const ESC_RAIL_T = 0.1;

export function buildEscalator(mats: MachineMaterials): MachineBuild {
  const group = new THREE.Group();
  const colliders: MachineCollider[] = [];
  const L = ESC_LENGTH;
  const W = ESC_WIDTH;
  const a = ESC_ALPHA;
  const cy = ESC_RISE / 2;
  const q = qZ(a);
  const beltMat = mats.preview ? mats.body : mats.belt ?? mats.body;

  // Belt group: local X runs up the slope, origin at the middle of the belt surface
  const belt = new THREE.Group();
  belt.position.set(0, cy, 0);
  belt.rotation.z = a;
  group.add(belt);

  // Slab under the belt
  box(belt, [L, ESC_SLAB, W], mats.body, [0, -ESC_SLAB / 2, 0]);
  const [sx, sy] = rot2(0, -ESC_SLAB / 2, a);
  colliders.push({ half: [L / 2, ESC_SLAB / 2, W / 2], offset: [sx, cy + sy, 0], quat: q });

  // Moving belt surface (chevrons scroll up the slope)
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.04, W - 0.04), beltMat);
  surface.geometry.rotateX(-Math.PI / 2);
  surface.position.set(0, 0.004, 0);
  surface.receiveShadow = true;
  belt.add(surface);
  if (!mats.preview) {
    // One chevron every BELT_TILE meters along the belt
    const map = (beltMat as THREE.MeshStandardMaterial).map;
    if (map) map.repeat.set((L - 0.04) / BELT_TILE, 1);
  }

  // Side rails keep balls on the belt
  for (const sz of [-1, 1]) {
    const z = sz * (W / 2 + ESC_RAIL_T / 2);
    box(belt, [L, ESC_RAIL_H, ESC_RAIL_T], mats.body, [0, ESC_RAIL_H / 2, z]);
    const [rx, ry] = rot2(0, ESC_RAIL_H / 2, a);
    colliders.push({ half: [L / 2, ESC_RAIL_H / 2, ESC_RAIL_T / 2], offset: [rx, cy + ry, z], quat: q });
  }

  // Legs under the belt, one row per side
  for (const u of [-0.32 * L, 0, 0.32 * L]) {
    const [lx, ly] = rot2(u, -ESC_SLAB, a);
    const underY = cy + ly;
    if (underY < 0.08) continue;
    for (const sz of [-1, 1]) {
      const z = sz * (W / 2 + ESC_RAIL_T / 2);
      box(group, [0.14, underY, 0.14], mats.body, [lx, underY / 2, z]);
      colliders.push({ half: [0.07, underY / 2, 0.07], offset: [lx, underY / 2, z] });
    }
  }

  return {
    group,
    colliders,
    spec: { kind: 'belt', alpha: a, length: L, width: W, centerY: cy, speed: BELT_SPEED },
    footprint: 3.6,
  };
}

// ───────────────────────── Ball lift ─────────────────────────

const LIFT_R = 0.8;
const LIFT_SLATS = 14;
const LIFT_THK = 0.06;
const LIFT_OPEN_H = 0.8; // bottom entrance height
const LIFT_SPOUT_Y = 3.4; // top of the exit chute floor
const LIFT_TUBE_H = 4.25;
const LIFT_SPOUT_TILT = -0.105; // exit chute slopes down towards +X (~6°)

export function buildBallLift(mats: MachineMaterials): MachineBuild {
  const group = new THREE.Group();
  const colliders: MachineCollider[] = [];
  const R = LIFT_R;
  const N = LIFT_SLATS;
  const glass = mats.preview ? mats.body : mats.glass ?? getGlassMaterial();
  const gap = 3 * ((Math.PI * 2) / N); // three slats are left out at each opening

  // Glass tube in three bands: entrance (opening towards -X), body, exit window (towards +X).
  // CylinderGeometry measures its angle from +Z towards +X, so -X is -PI/2 and +X is PI/2.
  const band = (y0: number, y1: number, openCenter: number | null) => {
    const h = y1 - y0;
    const geo =
      openCenter === null
        ? new THREE.CylinderGeometry(R, R, h, 40, 1, true)
        : new THREE.CylinderGeometry(R, R, h, 40, 1, true, openCenter + gap / 2, Math.PI * 2 - gap);
    const mesh = new THREE.Mesh(geo, glass);
    mesh.position.y = y0 + h / 2;
    group.add(mesh);
  };
  band(0, LIFT_OPEN_H, -Math.PI / 2);
  band(LIFT_OPEN_H, LIFT_SPOUT_Y, null);
  band(LIFT_SPOUT_Y, LIFT_TUBE_H, Math.PI / 2);

  // Frame: rings and posts
  const ringGeo = (y: number, r = R + 0.02) => {
    const g = new THREE.TorusGeometry(r, 0.045, 8, 40);
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, mats.body);
    m.position.y = y;
    m.castShadow = true;
    group.add(m);
  };
  ringGeo(0.045);
  ringGeo(LIFT_OPEN_H);
  ringGeo(LIFT_SPOUT_Y);
  ringGeo(LIFT_TUBE_H);
  for (const deg of [60, 120, 240, 300]) {
    const th = (deg * Math.PI) / 180;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, LIFT_TUBE_H, 10), mats.body);
    post.position.set((R + 0.02) * Math.cos(th), LIFT_TUBE_H / 2, (R + 0.02) * Math.sin(th));
    post.castShadow = true;
    group.add(post);
  }

  // Light beam inside the tube (bands rising upwards)
  if (!mats.preview) {
    const beamH = LIFT_SPOUT_Y + 0.5;
    const beamGeo = new THREE.CylinderGeometry(0.34, 0.34, beamH, 24, 1, true);
    const beamMat = mats.beam ?? getBeamMaterial();
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 0.1 + beamH / 2;
    beam.raycast = () => {};
    const map = (beamMat as THREE.MeshBasicMaterial).map;
    if (map) map.repeat.set(1, beamH / BEAM_TILE);
    group.add(beam);
  }

  // Exit chute through the top window, sloping slightly downwards
  const spoutLen = 1.7;
  const spoutW = 0.9;
  const spoutCx = 1.25;
  const spout = new THREE.Group();
  spout.position.set(spoutCx, LIFT_SPOUT_Y - 0.04, 0);
  spout.rotation.z = LIFT_SPOUT_TILT;
  group.add(spout);
  box(spout, [spoutLen, 0.08, spoutW], mats.body, [0, 0, 0]);
  const spoutQ = qZ(LIFT_SPOUT_TILT);
  colliders.push({ half: [spoutLen / 2, 0.04, spoutW / 2], offset: [spoutCx, LIFT_SPOUT_Y - 0.04, 0], quat: spoutQ });
  for (const sz of [-1, 1]) {
    const z = sz * (spoutW / 2 + 0.03);
    box(spout, [spoutLen, 0.4, 0.06], mats.body, [0, 0.24, z]);
    const [rx, ry] = rot2(0, 0.24, LIFT_SPOUT_TILT);
    colliders.push({
      half: [spoutLen / 2, 0.2, 0.03],
      offset: [spoutCx + rx, LIFT_SPOUT_Y - 0.04 + ry, z],
      quat: spoutQ,
    });
  }

  // Entrance marker on the floor: a small ramp-like chevron pad in front of the opening
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.9), mats.body);
  pad.position.set(-R - 0.5, 0.015, 0);
  pad.receiveShadow = true;
  group.add(pad);

  // Wall colliders: ring of slats, each in three vertical segments; openings are left out
  const slatHalfW = R * Math.tan(Math.PI / N) + 0.02;
  const bottomOpen = new Set([N / 2 - 1, N / 2, N / 2 + 1]);
  const topOpen = new Set([N - 1, 0, 1]);
  const segs: Array<{ y0: number; y1: number; skip?: Set<number> }> = [
    { y0: 0, y1: LIFT_OPEN_H, skip: bottomOpen },
    { y0: LIFT_OPEN_H, y1: LIFT_SPOUT_Y },
    { y0: LIFT_SPOUT_Y, y1: LIFT_TUBE_H, skip: topOpen },
  ];
  for (let k = 0; k < N; k++) {
    const th = (k / N) * Math.PI * 2;
    for (const seg of segs) {
      if (seg.skip?.has(k)) continue;
      const h = seg.y1 - seg.y0;
      colliders.push({
        half: [slatHalfW, h / 2, LIFT_THK / 2],
        offset: [R * Math.cos(th), seg.y0 + h / 2, R * Math.sin(th)],
        quat: qY(Math.PI / 2 - th),
      });
    }
  }

  return {
    group,
    colliders,
    spec: {
      kind: 'lift',
      liftRadius: 0.72,
      topY: LIFT_SPOUT_Y + 0.32 + 0.12,
      ejectY: LIFT_SPOUT_Y + 0.15,
      speed: LIFT_SPEED,
      feed: { x0: -R - 1.6, x1: -0.45, halfZ: 0.55, accel: 8, speed: 1.5 },
    },
    footprint: 4.0,
  };
}

export function buildMachine(type: MachineType, mats: MachineMaterials): MachineBuild {
  return type === 'escalator' ? buildEscalator(mats) : buildBallLift(mats);
}
