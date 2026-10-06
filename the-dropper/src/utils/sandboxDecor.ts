import * as THREE from 'three';

/**
 * Decoration pieces for the sandbox: potted plants, lamps, spotlights and chairs.
 * Every piece is built around its origin sitting on the floor (y = 0), faces +Z and
 * comes with simple axis-aligned box colliders so balls can bump into it.
 */

export type DecorType =
  | 'plant_fern'
  | 'plant_tree'
  | 'plant_cactus'
  | 'lamp_floor'
  | 'spot_tripod'
  | 'spot_ground'
  | 'chair'
  | 'armchair';

export interface DecorInfo {
  type: DecorType;
  name: string;
  /** Short material / style description shown next to the swatch */
  toneName: string;
  color: number;
  hex: string;
}

export const DECOR_LIST: DecorInfo[] = [
  { type: 'plant_fern', name: 'Helecho', toneName: 'Maceta Terracota', color: 0x4aa05a, hex: '#4aa05a' },
  { type: 'plant_tree', name: 'Ficus', toneName: 'Maceta Alta', color: 0x3a8a4c, hex: '#3a8a4c' },
  { type: 'plant_cactus', name: 'Cactus', toneName: 'Maceta Pequeña', color: 0x5cae77, hex: '#5cae77' },
  { type: 'lamp_floor', name: 'Lámpara', toneName: 'Luz Cálida', color: 0xffd29a, hex: '#ffd29a' },
  { type: 'spot_tripod', name: 'Foco Trípode', toneName: 'Haz Dirigible', color: 0xfff0d6, hex: '#fff0d6' },
  { type: 'spot_ground', name: 'Foco de Piso', toneName: 'Luz Ascendente', color: 0xcfe8ff, hex: '#cfe8ff' },
  { type: 'chair', name: 'Silla', toneName: 'Madera Clara', color: 0xb07c4f, hex: '#b07c4f' },
  { type: 'armchair', name: 'Sillón', toneName: 'Tela Azul', color: 0x4f7690, hex: '#4f7690' },
];

const DECOR_TYPES = new Set<string>(DECOR_LIST.map((d) => d.type));
export function isDecorType(type: string): type is DecorType {
  return DECOR_TYPES.has(type);
}

export interface DecorBoxCollider {
  half: [number, number, number];
  offset: [number, number, number];
}

/** Real lights + visible beams of a piece, so the world can dim/brighten them with the time of day */
export interface DecorLightEntry {
  light: THREE.PointLight | THREE.SpotLight;
  baseIntensity: number;
  kind: 'point' | 'spot';
  /** Lights aimed at the sky (ground uplights) never get shadows */
  allowShadow: boolean;
}
export interface DecorBeamEntry {
  mesh: THREE.Mesh;
  baseOpacity: number;
}
export interface DecorLightRig {
  lights: DecorLightEntry[];
  beams: DecorBeamEntry[];
}

export interface DecorBuild {
  group: THREE.Group;
  colliders: DecorBoxCollider[];
  /** Approximate footprint diameter in meters (used by the placement ghost ring) */
  footprint: number;
  /** Only present when built with `lights: true` and the piece emits light */
  rig?: DecorLightRig;
}

export interface DecorBuildOptions {
  /** Create real THREE lights (lamp / spotlights). Disabled for ghost previews. */
  lights: boolean;
}

// ── Shared materials ──
const matCache: Record<string, THREE.MeshStandardMaterial> = {};
function mat(key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  if (!matCache[key]) matCache[key] = new THREE.MeshStandardMaterial(params);
  return matCache[key];
}

const M = {
  terracotta: () => mat('terracotta', { color: 0xb9663f, roughness: 0.85, metalness: 0.02 }),
  soil: () => mat('soil', { color: 0x34261c, roughness: 1 }),
  leaf: () => mat('leaf', { color: 0x3e9150, roughness: 0.7, side: THREE.DoubleSide }),
  leafDark: () => mat('leafDark', { color: 0x2b6f3d, roughness: 0.75, side: THREE.DoubleSide }),
  leafLight: () => mat('leafLight', { color: 0x62b265, roughness: 0.7, side: THREE.DoubleSide }),
  trunk: () => mat('trunk', { color: 0x6a4a2f, roughness: 0.9 }),
  cactus: () => mat('cactus', { color: 0x4c9a64, roughness: 0.8 }),
  flower: () => mat('flower', { color: 0xe2557c, roughness: 0.6 }),
  wood: () => mat('wood', { color: 0xb07c4f, roughness: 0.7 }),
  woodDark: () => mat('woodDark', { color: 0x6e4a2c, roughness: 0.75 }),
  metal: () => mat('metal', { color: 0x2c3038, roughness: 0.4, metalness: 0.8 }),
  brass: () => mat('brass', { color: 0xc9a24a, roughness: 0.3, metalness: 0.9 }),
  fabric: () => mat('fabric', { color: 0x4f7690, roughness: 1 }),
  fabricDark: () => mat('fabricDark', { color: 0x3b5a70, roughness: 1 }),
  shade: () =>
    mat('shade', {
      color: 0xf6e7c6,
      emissive: 0xffc979,
      emissiveIntensity: 0.85,
      roughness: 0.9,
      side: THREE.DoubleSide,
    }),
  bulb: () => mat('bulb', { color: 0xfff2cf, emissive: 0xffe2a0, emissiveIntensity: 2 }),
  lens: () => mat('lens', { color: 0xffffff, emissive: 0xfff1d0, emissiveIntensity: 2.2 }),
};

/**
 * Glow of the emissive parts (lamp shade, bulb, spotlight lenses). 0 = lights off (daytime),
 * 1 = fully lit (night). Materials are shared, so one call updates every lamp in the scene.
 */
export function setDecorGlow(level: number) {
  const f = Math.min(1, Math.max(0, level));
  M.shade().emissiveIntensity = 0.05 + 0.85 * f;
  M.bulb().emissiveIntensity = 0.15 + 1.85 * f;
  M.lens().emissiveIntensity = 0.15 + 2.05 * f;
}

/** Shadow settings tuned to be cheap: small maps, short ranges */
function configureShadow(light: THREE.PointLight | THREE.SpotLight, size: number, far: number) {
  light.castShadow = false; // enabled on demand by the world (budgeted)
  light.shadow.mapSize.set(size, size);
  light.shadow.camera.near = 0.15;
  light.shadow.camera.far = far;
  light.shadow.bias = -0.0008;
  light.shadow.normalBias = 0.02;
}

function add(group: THREE.Object3D, geo: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

const cyl = (rTop: number, rBottom: number, h: number, seg = 24, open = false) =>
  new THREE.CylinderGeometry(rTop, rBottom, h, seg, 1, open);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** Flat elongated leaf blade growing outward from the plant center */
function leafBlade(
  group: THREE.Group,
  material: THREE.Material,
  yaw: number,
  tilt: number,
  length: number,
  width: number,
  y0: number,
  startR = 0.04
) {
  const pivot = new THREE.Group();
  pivot.position.set(0, y0, 0);
  pivot.rotation.y = yaw;
  const inner = new THREE.Group();
  inner.rotation.z = tilt;
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), material);
  mesh.scale.set(length / 2, 0.018, width / 2);
  mesh.position.set(startR + length / 2, 0, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  inner.add(mesh);
  pivot.add(inner);
  group.add(pivot);
}

/**
 * Faint additive light cone (visible beam). Apex sits at the origin and the cone opens along
 * `axis`. It is excluded from raycasts so it never gets in the way of picking pieces.
 */
function addBeam(
  parent: THREE.Object3D,
  axis: 'y' | 'z',
  length: number,
  radius: number,
  color: number,
  rig?: DecorLightRig
) {
  const geo = new THREE.ConeGeometry(radius, length, 28, 1, true);
  geo.translate(0, -length / 2, 0); // apex at origin, base at -Y
  if (axis === 'y') geo.rotateX(Math.PI); // base at +Y
  else geo.rotateX(-Math.PI / 2); // base at +Z
  const beam = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beam.raycast = () => {};
  beam.castShadow = false;
  beam.receiveShadow = false;
  beam.visible = false; // shown by the world once it gets dark
  parent.add(beam);
  rig?.beams.push({ mesh: beam, baseOpacity: 0.07 });
  return beam;
}

function addPot(group: THREE.Group, radiusTop: number, radiusBottom: number, height: number) {
  add(group, cyl(radiusTop, radiusBottom, height), M.terracotta(), 0, height / 2, 0);
  add(group, cyl(radiusTop + 0.035, radiusTop + 0.035, 0.07), M.terracotta(), 0, height + 0.01, 0);
  add(group, cyl(radiusTop - 0.01, radiusTop - 0.01, 0.02), M.soil(), 0, height + 0.04, 0);
}

export function buildDecor(type: DecorType, options: DecorBuildOptions = { lights: true }): DecorBuild {
  const group = new THREE.Group();
  const colliders: DecorBoxCollider[] = [];
  let footprint = 1.2;
  const rig: DecorLightRig = { lights: [], beams: [] };

  switch (type) {
    case 'plant_fern': {
      addPot(group, 0.32, 0.23, 0.5);
      const mats = [M.leaf(), M.leafDark(), M.leafLight()];
      const count = 11;
      for (let k = 0; k < count; k++) {
        const yaw = (k / count) * Math.PI * 2 + (k % 2) * 0.2;
        const tilt = 0.55 + (k % 3) * 0.25;
        leafBlade(group, mats[k % 3], yaw, tilt, 0.78 + (k % 4) * 0.08, 0.16, 0.55);
      }
      colliders.push({ half: [0.3, 0.26, 0.3], offset: [0, 0.26, 0] });
      colliders.push({ half: [0.3, 0.2, 0.3], offset: [0, 0.78, 0] });
      footprint = 1.4;
      break;
    }

    case 'plant_tree': {
      addPot(group, 0.38, 0.27, 0.58);
      add(group, cyl(0.055, 0.08, 1.0, 12), M.trunk(), 0, 1.08, 0);
      const canopy: [number, number, number, number, THREE.Material][] = [
        [0, 1.85, 0, 0.5, M.leaf()],
        [0.3, 1.6, 0.1, 0.36, M.leafDark()],
        [-0.28, 1.65, -0.12, 0.38, M.leafLight()],
        [0.05, 1.55, -0.3, 0.32, M.leafDark()],
        [-0.05, 2.15, 0.1, 0.32, M.leafLight()],
      ];
      for (const [x, y, z, r, m] of canopy) {
        add(group, new THREE.SphereGeometry(r, 16, 12), m, x, y, z);
      }
      colliders.push({ half: [0.38, 0.29, 0.38], offset: [0, 0.29, 0] });
      colliders.push({ half: [0.09, 0.5, 0.09], offset: [0, 1.08, 0] });
      colliders.push({ half: [0.5, 0.45, 0.5], offset: [0, 1.85, 0] });
      footprint = 1.6;
      break;
    }

    case 'plant_cactus': {
      addPot(group, 0.27, 0.2, 0.4);
      add(group, new THREE.CapsuleGeometry(0.15, 0.62, 6, 14), M.cactus(), 0, 0.88, 0);
      // Arms: one horizontal stub + one vertical tip on each side
      const armL = new THREE.Group();
      armL.position.set(-0.13, 0.82, 0);
      const stubL = add(armL, new THREE.CapsuleGeometry(0.06, 0.2, 4, 10), M.cactus(), -0.1, 0, 0);
      stubL.rotation.z = Math.PI / 2;
      add(armL, new THREE.CapsuleGeometry(0.06, 0.22, 4, 10), M.cactus(), -0.22, 0.14, 0);
      group.add(armL);
      const armR = new THREE.Group();
      armR.position.set(0.13, 0.98, 0);
      const stubR = add(armR, new THREE.CapsuleGeometry(0.05, 0.16, 4, 10), M.cactus(), 0.08, 0, 0);
      stubR.rotation.z = Math.PI / 2;
      add(armR, new THREE.CapsuleGeometry(0.05, 0.16, 4, 10), M.cactus(), 0.18, 0.1, 0);
      group.add(armR);
      // Flower on top
      add(group, new THREE.SphereGeometry(0.06, 10, 8), M.flower(), 0, 1.3, 0);
      colliders.push({ half: [0.27, 0.2, 0.27], offset: [0, 0.2, 0] });
      colliders.push({ half: [0.16, 0.46, 0.16], offset: [0, 0.88, 0] });
      footprint = 1.0;
      break;
    }

    case 'lamp_floor': {
      add(group, cyl(0.22, 0.24, 0.05, 28), M.metal(), 0, 0.025, 0);
      // Pole ends below the bulb so it never encloses the light (needed for shadows)
      add(group, cyl(0.022, 0.022, 1.38, 10), M.brass(), 0, 0.74, 0);
      // The shade and bulb are the light source: they must not shadow the lamp's own light
      add(group, cyl(0.2, 0.32, 0.4, 28, true), M.shade(), 0, 1.58, 0).castShadow = false;
      add(group, new THREE.SphereGeometry(0.07, 14, 10), M.bulb(), 0, 1.55, 0).castShadow = false;
      if (options.lights) {
        const light = new THREE.PointLight(0xffd29a, 16, 12, 2);
        light.position.set(0, 1.55, 0);
        configureShadow(light, 512, 12);
        group.add(light);
        rig.lights.push({ light, baseIntensity: 16, kind: 'point', allowShadow: true });
      }
      colliders.push({ half: [0.23, 0.03, 0.23], offset: [0, 0.03, 0] });
      colliders.push({ half: [0.04, 0.72, 0.04], offset: [0, 0.76, 0] });
      colliders.push({ half: [0.3, 0.2, 0.3], offset: [0, 1.58, 0] });
      footprint = 1.0;
      break;
    }

    case 'spot_tripod': {
      // Three splayed legs
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
        const leg = new THREE.Group();
        leg.rotation.y = a;
        const bar = add(leg, cyl(0.018, 0.018, 1.2, 8), M.metal(), 0.2, 0.55, 0);
        bar.rotation.z = 0.33;
        group.add(leg);
      }
      add(group, cyl(0.03, 0.03, 0.5, 10), M.metal(), 0, 1.1, 0);
      // Head, aimed down-forward
      const head = new THREE.Group();
      head.position.set(0, 1.45, 0);
      head.rotation.x = 0.55;
      const body = cyl(0.14, 0.12, 0.3, 20);
      body.rotateX(Math.PI / 2);
      add(head, body, M.metal(), 0, 0, 0);
      const lensGeo = new THREE.CircleGeometry(0.115, 20);
      const lens = add(head, lensGeo, M.lens(), 0, 0, 0.152);
      lens.castShadow = false;
      if (options.lights) {
        const spot = new THREE.SpotLight(0xfff0d6, 90, 22, 0.5, 0.45, 1.6);
        spot.position.set(0, 0, 0.2);
        configureShadow(spot, 1024, 22);
        const target = new THREE.Object3D();
        target.position.set(0, 0, 6);
        head.add(target);
        spot.target = target;
        head.add(spot);
        rig.lights.push({ light: spot, baseIntensity: 90, kind: 'spot', allowShadow: true });
        const beam = addBeam(head, 'z', 2.6, 1.0, 0xfff0d6, rig);
        beam.position.set(0, 0, 0.16);
      }
      group.add(head);
      colliders.push({ half: [0.32, 0.03, 0.32], offset: [0, 0.03, 0] });
      colliders.push({ half: [0.06, 0.7, 0.06], offset: [0, 0.75, 0] });
      colliders.push({ half: [0.14, 0.14, 0.2], offset: [0, 1.45, 0.08] });
      footprint = 1.5;
      break;
    }

    case 'spot_ground': {
      add(group, cyl(0.17, 0.19, 0.1, 24), M.metal(), 0, 0.05, 0);
      const lens = add(group, new THREE.CircleGeometry(0.13, 24), M.lens(), 0, 0.103, 0);
      lens.rotation.x = -Math.PI / 2;
      lens.castShadow = false;
      if (options.lights) {
        const spot = new THREE.SpotLight(0xcfe8ff, 70, 18, 0.42, 0.5, 1.5);
        spot.position.set(0, 0.12, 0);
        configureShadow(spot, 512, 18);
        const target = new THREE.Object3D();
        target.position.set(0, 6, 0.3);
        group.add(target);
        spot.target = target;
        group.add(spot);
        // Aimed at the sky: shadows would be wasted work
        rig.lights.push({ light: spot, baseIntensity: 70, kind: 'spot', allowShadow: false });
        const beam = addBeam(group, 'y', 2.4, 0.9, 0xcfe8ff, rig);
        beam.position.set(0, 0.11, 0);
      }
      colliders.push({ half: [0.18, 0.06, 0.18], offset: [0, 0.06, 0] });
      footprint = 0.7;
      break;
    }

    case 'chair': {
      const seatY = 0.5;
      add(group, box(0.5, 0.05, 0.5), M.wood(), 0, seatY, 0);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          add(group, box(0.05, 0.47, 0.05), M.woodDark(), sx * 0.22, 0.235, sz * 0.22);
        }
      }
      // Backrest: two posts + slats
      for (const sx of [-1, 1]) {
        add(group, box(0.05, 0.5, 0.05), M.woodDark(), sx * 0.22, 0.78, -0.22);
      }
      add(group, box(0.5, 0.1, 0.035), M.wood(), 0, 0.98, -0.22);
      add(group, box(0.4, 0.09, 0.03), M.wood(), 0, 0.8, -0.22);
      add(group, box(0.4, 0.09, 0.03), M.wood(), 0, 0.64, -0.22);
      colliders.push({ half: [0.25, 0.03, 0.25], offset: [0, seatY, 0] });
      colliders.push({ half: [0.25, 0.27, 0.03], offset: [0, 0.8, -0.22] });
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          colliders.push({ half: [0.03, 0.235, 0.03], offset: [sx * 0.22, 0.235, sz * 0.22] });
        }
      }
      footprint = 1.2;
      break;
    }

    case 'armchair': {
      add(group, box(0.74, 0.2, 0.7), M.woodDark(), 0, 0.2, 0);
      add(group, box(0.6, 0.14, 0.58), M.fabric(), 0, 0.37, 0.03);
      add(group, box(0.72, 0.56, 0.14), M.fabric(), 0, 0.72, -0.3);
      for (const sx of [-1, 1]) {
        add(group, box(0.12, 0.3, 0.64), M.fabricDark(), sx * 0.38, 0.45, 0);
        for (const sz of [-1, 1]) {
          add(group, box(0.06, 0.1, 0.06), M.metal(), sx * 0.3, 0.05, sz * 0.28);
        }
      }
      colliders.push({ half: [0.37, 0.19, 0.35], offset: [0, 0.2, 0] });
      colliders.push({ half: [0.3, 0.07, 0.29], offset: [0, 0.37, 0.03] });
      colliders.push({ half: [0.36, 0.28, 0.07], offset: [0, 0.72, -0.3] });
      for (const sx of [-1, 1]) {
        colliders.push({ half: [0.06, 0.15, 0.32], offset: [sx * 0.38, 0.45, 0] });
      }
      footprint = 1.6;
      break;
    }
  }

  return { group, colliders, footprint, rig: rig.lights.length > 0 ? rig : undefined };
}
