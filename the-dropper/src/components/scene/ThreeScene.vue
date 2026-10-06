<template>
  <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <canvas ref="canvasRef" class="w-full h-full block"></canvas>
    <!-- Soft architectural vignette -->
    <div
      class="absolute inset-0 bg-radial-[circle_at_center,transparent_55%,rgba(6,7,9,0.55)_100%] pointer-events-none"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { selectedSkinId, BALL_SKINS, settings, currentView } from '../../state/gameStore';
import { createBrutalistConcreteTextures } from '../../utils/proceduralConcrete';

const canvasRef = ref<HTMLCanvasElement | null>(null);

// Camera spatial positions
const defaultCamPos = new THREE.Vector3(0, 1.25, 8.8);
const defaultLookAt = new THREE.Vector3(0, 1.25, 0);
const defaultFov = 34;

// In locker view, the camera zooms in close to the floating ball on the
// bench, framing it prominently on the left side of the screen:
const lockerCamPos = new THREE.Vector3(-2.1, 0.28, 2.75);
const lockerLookAt = new THREE.Vector3(-2.75, 0.15, 0.55);
const lockerFov = 26; // tighter telephoto framing for the zoom-in feel

const currentCamPos = defaultCamPos.clone();
const currentLookAt = defaultLookAt.clone();

// Cinematic camera transition state (menu <-> locker zoom glide)
const camFromPos = defaultCamPos.clone();
const camToPos = defaultCamPos.clone();
const camFromLook = defaultLookAt.clone();
const camToLook = defaultLookAt.clone();
let fovFrom = defaultFov;
let fovTo = defaultFov;
let transitionStartTime = -1;
const transitionDuration = 1.5; // seconds

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function startCameraTransition(toLocker: boolean) {
  camFromPos.copy(currentCamPos);
  camFromLook.copy(currentLookAt);
  camToPos.copy(toLocker ? lockerCamPos : defaultCamPos);
  camToLook.copy(toLocker ? lockerLookAt : defaultLookAt);
  fovFrom = camera ? camera.fov : defaultFov;
  fovTo = toLocker ? lockerFov : defaultFov;
  transitionStartTime = performance.now() * 0.001;
}

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let sphereMesh: THREE.Mesh | null = null;
let benchGroup: THREE.Group | null = null;
let plantGroup: THREE.Group | null = null;
let wallMesh: THREE.Mesh | null = null;
let floorMesh: THREE.Mesh | null = null;
let mainLight: THREE.DirectionalLight | null = null;
let animationFrameId: number | null = null;

// Mouse parallax tracking
const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

function onMouseMove(event: MouseEvent) {
  if (!settings.cameraParallax) return;
  const { innerWidth, innerHeight } = window;
  mouse.targetX = (event.clientX / innerWidth - 0.5) * 2;
  mouse.targetY = (event.clientY / innerHeight - 0.5) * 2;
}

function updateBallMaterial() {
  if (!sphereMesh) return;
  const currentSkin = BALL_SKINS.find((s) => s.id === selectedSkinId.value) || BALL_SKINS[0];

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(currentSkin.color),
    metalness: currentSkin.metalness,
    roughness: currentSkin.roughness,
    clearcoat: currentSkin.clearcoat ?? 0.5,
    clearcoatRoughness: 0.1,
    transmission: currentSkin.transmission ?? 0,
    ior: currentSkin.ior ?? 1.5,
    emissive: currentSkin.emissive ? new THREE.Color(currentSkin.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: currentSkin.emissiveIntensity ?? 0,
    reflectivity: 0.9,
  });

  if (sphereMesh.material) {
    if (Array.isArray(sphereMesh.material)) {
      sphereMesh.material.forEach((m) => m.dispose());
    } else {
      sphereMesh.material.dispose();
    }
  }

  sphereMesh.material = material;
}

/**
 * Builds an architectural minimalist bench on the left side
 */
function createArchitecturalBench(): THREE.Group {
  const group = new THREE.Group();

  // Bench Materials
  const woodSlatMat = new THREE.MeshStandardMaterial({
    color: 0x221d19, // Dark charred/smoked architectural oak
    roughness: 0.6,
    metalness: 0.05,
  });

  const steelLegMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f, // Raw blackened steel / dark concrete
    roughness: 0.5,
    metalness: 0.8,
  });

  // Bench top: 3 parallel solid slats with architectural separation
  const slatWidth = 2.4;
  const slatHeight = 0.07;
  const slatDepth = 0.15;
  const slatSpacing = 0.02;

  for (let i = -1; i <= 1; i++) {
    const slatGeo = new THREE.BoxGeometry(slatWidth, slatHeight, slatDepth);
    const slat = new THREE.Mesh(slatGeo, woodSlatMat);
    slat.position.set(0, 0.44, i * (slatDepth + slatSpacing));
    slat.castShadow = true;
    slat.receiveShadow = true;
    group.add(slat);
  }

  // Under-frame crossbar
  const barGeo = new THREE.BoxGeometry(slatWidth * 0.9, 0.03, 0.4);
  const bar = new THREE.Mesh(barGeo, steelLegMat);
  bar.position.set(0, 0.38, 0);
  bar.castShadow = true;
  group.add(bar);

  // Bench Legs: 2 solid brutalist block plinths
  const legGeo = new THREE.BoxGeometry(0.12, 0.44, 0.46);

  const leftLeg = new THREE.Mesh(legGeo, steelLegMat);
  leftLeg.position.set(-0.85, 0.22, 0);
  leftLeg.castShadow = true;
  leftLeg.receiveShadow = true;
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, steelLegMat);
  rightLeg.position.set(0.85, 0.22, 0);
  rightLeg.castShadow = true;
  rightLeg.receiveShadow = true;
  group.add(rightLeg);

  return group;
}

/**
 * Builds an organic architectural plant in a modern concrete pot on the right side
 */
function createArchitecturalPlant(): THREE.Group {
  const group = new THREE.Group();

  // Brutalist Planter Pot
  const potMat = new THREE.MeshStandardMaterial({
    color: 0x1f2329, // Raw dark architectural cement
    roughness: 0.85,
    metalness: 0.05,
  });

  const potGeo = new THREE.CylinderGeometry(0.38, 0.3, 0.75, 32);
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.set(0, 0.375, 0);
  pot.castShadow = true;
  pot.receiveShadow = true;
  group.add(pot);

  // Pot rim accent
  const rimGeo = new THREE.TorusGeometry(0.385, 0.02, 16, 32);
  const rim = new THREE.Mesh(rimGeo, potMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, 0.74, 0);
  rim.castShadow = true;
  group.add(rim);

  // Soil
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x12100e,
    roughness: 0.95,
  });
  const soilGeo = new THREE.CircleGeometry(0.36, 32);
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.rotation.x = -Math.PI / 2;
  soil.position.set(0, 0.73, 0);
  soil.receiveShadow = true;
  group.add(soil);

  // Plant Stems & Foliage (Monstera / Ficus Elastica style)
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x274332,
    roughness: 0.6,
  });

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x1f4732,
    roughness: 0.38,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const leafMatHighlight = new THREE.MeshStandardMaterial({
    color: 0x2b5d41,
    roughness: 0.35,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  // Stems configuration (reaching outwards and upwards towards the light)
  const stemConfigs = [
    { startAngle: 0.2, length: 1.1, rotZ: 0.35, rotY: 0.2, scale: 1.1 },
    { startAngle: 1.1, length: 1.35, rotZ: 0.22, rotY: 0.8, scale: 1.25 },
    { startAngle: 2.3, length: 0.95, rotZ: 0.45, rotY: 2.1, scale: 0.95 },
    { startAngle: 3.4, length: 1.4, rotZ: 0.18, rotY: 3.2, scale: 1.3 },
    { startAngle: 4.6, length: 1.2, rotZ: 0.38, rotY: 4.4, scale: 1.15 },
    { startAngle: 5.5, length: 1.5, rotZ: 0.12, rotY: 5.6, scale: 1.35 },
    { startAngle: 2.9, length: 1.6, rotZ: 0.08, rotY: 2.8, scale: 1.4 }, // Center top tall leaf
  ];

  for (const cfg of stemConfigs) {
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.72, 0),
      new THREE.Vector3(
        Math.cos(cfg.rotY) * 0.15,
        0.72 + cfg.length * 0.45,
        Math.sin(cfg.rotY) * 0.15
      ),
      new THREE.Vector3(
        Math.cos(cfg.rotY) * (cfg.length * 0.55),
        0.72 + cfg.length * 0.88,
        Math.sin(cfg.rotY) * (cfg.length * 0.45)
      ),
    ]);

    const stemGeo = new THREE.TubeGeometry(stemCurve, 12, 0.02, 8, false);
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.castShadow = true;
    group.add(stem);

    // Leaf attached to stem tip
    const tipPoint = stemCurve.getPoint(1);

    // Sculpted organic leaf geometry using a curved shape
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.24 * cfg.scale, 0.3 * cfg.scale, 0.22 * cfg.scale, 0.65 * cfg.scale);
    leafShape.quadraticCurveTo(0.12 * cfg.scale, 0.95 * cfg.scale, 0, 1.1 * cfg.scale);
    leafShape.quadraticCurveTo(-0.12 * cfg.scale, 0.95 * cfg.scale, -0.22 * cfg.scale, 0.65 * cfg.scale);
    leafShape.quadraticCurveTo(-0.24 * cfg.scale, 0.3 * cfg.scale, 0, 0);

    const leafGeo = new THREE.ShapeGeometry(leafShape, 12);

    // Bend the leaf slightly along central axis for realistic 3D volume
    const pos = leafGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const xVal = pos.getX(i);
      const yVal = pos.getY(i);
      // Gentle parabolic trough curvature
      pos.setZ(i, -Math.abs(xVal) * 0.25 + Math.sin(yVal * 1.5) * 0.05);
    }
    leafGeo.computeVertexNormals();

    const leaf = new THREE.Mesh(leafGeo, Math.random() > 0.5 ? leafMat : leafMatHighlight);
    leaf.position.copy(tipPoint);
    leaf.rotation.set(
      cfg.rotZ + 0.3,
      cfg.rotY,
      Math.sin(cfg.rotY) * 0.4
    );
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    group.add(leaf);
  }

  return group;
}

function initScene() {
  if (!canvasRef.value) return;

  const width = window.innerWidth;
  const height = window.innerHeight;

  // Scene setup
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c0f);

  // Camera: standing at eye-level from a distance facing the wall
  // Telephoto architectural perspective (FOV 34) keeps lines straight and wallpaper-like
  camera = new THREE.PerspectiveCamera(defaultFov, width / height, 0.1, 100);
  camera.position.set(0, 1.25, 8.8);
  camera.lookAt(0, 1.25, 0);

  // Renderer with high shadow fidelity
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Concrete Textures
  const { map, bumpMap, roughnessMap } = createBrutalistConcreteTextures();

  // 1. THE MASSIVE CONCRETE WALL
  // Sized 50m x 30m so it covers the entire viewport at any aspect ratio with zero visible borders
  const wallGeo = new THREE.PlaneGeometry(50, 30);
  const wallMat = new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: 0.025,
    roughnessMap,
    roughness: 0.88,
    metalness: 0.02,
  });

  // Repeat texture so panels are properly proportioned across the massive wall
  map.repeat.set(3, 2);
  bumpMap.repeat.set(3, 2);
  roughnessMap.repeat.set(3, 2);

  wallMesh = new THREE.Mesh(wallGeo, wallMat);
  wallMesh.position.set(0, 5, 0);
  wallMesh.receiveShadow = true;
  scene.add(wallMesh);

  // 2. THE FLOOR
  const floorGeo = new THREE.PlaneGeometry(50, 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.75,
    metalness: 0.1,
  });
  floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, -0.72, 5);
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  // 3. ARCHITECTURAL LIGHTING
  // Light that hits directly, slightly from the side (grazing the wall from upper right)
  mainLight = new THREE.DirectionalLight(0xfff6ea, 2.8);
  mainLight.position.set(6.2, 5.8, 5.2);
  mainLight.target.position.set(0, 1.2, 0);
  mainLight.castShadow = true;

  // Crisp, soft shadow configuration
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 25;
  mainLight.shadow.camera.left = -9;
  mainLight.shadow.camera.right = 9;
  mainLight.shadow.camera.top = 7;
  mainLight.shadow.camera.bottom = -4;
  mainLight.shadow.bias = -0.0003;
  mainLight.shadow.radius = 2.0;
  scene.add(mainLight);
  scene.add(mainLight.target);

  // Ambient fill light for deep architectural shadows without absolute darkness
  const ambientLight = new THREE.AmbientLight(0xdde5ee, 0.65);
  scene.add(ambientLight);

  // Soft cool skylight bounce from left
  const skylight = new THREE.DirectionalLight(0x7da4cc, 0.7);
  skylight.position.set(-6, 4, 3);
  scene.add(skylight);

  // 4. THE BENCH (Left side, near bottom edge)
  benchGroup = createArchitecturalBench();
  benchGroup.position.set(-3.7, -0.72, 0.55);
  benchGroup.rotation.y = 0.06; // slight human angle against wall
  scene.add(benchGroup);

  // 5. THE PROTAGONIST BALL (Resting/levitating subtly over the bench)
  const sphereGeo = new THREE.SphereGeometry(0.24, 64, 64);
  sphereMesh = new THREE.Mesh(sphereGeo);
  sphereMesh.position.set(-3.7, 0.05, 0.55);
  sphereMesh.castShadow = true;
  sphereMesh.receiveShadow = true;
  scene.add(sphereMesh);
  updateBallMaterial();

  // 6. THE PLANT (Right side, near bottom edge)
  plantGroup = createArchitecturalPlant();
  plantGroup.position.set(3.8, -0.72, 0.75);
  plantGroup.rotation.y = -0.3; // angled to cast majestic shadows towards left
  scene.add(plantGroup);

  window.addEventListener('resize', onResize);
  window.addEventListener('mousemove', onMouseMove);

  animate(0);
}

function onResize() {
  if (!renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate(time: number) {
  animationFrameId = requestAnimationFrame(animate);

  const t = time * 0.001;

  const isLocker = currentView.value === 'locker';

  // Cinematic eased camera transition (zoom glide between views)
  let easedT = 1;
  if (transitionStartTime >= 0) {
    const progress = Math.min((t - transitionStartTime) / transitionDuration, 1);
    easedT = easeInOutCubic(progress);
    if (progress >= 1) transitionStartTime = -1;
  }
  currentCamPos.lerpVectors(camFromPos, camToPos, easedT);
  currentLookAt.lerpVectors(camFromLook, camToLook, easedT);

  // Dolly-zoom style FOV punch while the camera travels
  if (camera) {
    const targetFov = fovFrom + (fovTo - fovFrom) * easedT;
    if (Math.abs(camera.fov - targetFov) > 0.001) {
      camera.fov = targetFov;
      camera.updateProjectionMatrix();
    }
  }

  // Smooth camera parallax
  mouse.x += (mouse.targetX - mouse.x) * 0.04;
  mouse.y += (mouse.targetY - mouse.y) * 0.04;

  if (camera) {
    const parallaxFactorX = isLocker ? 0.06 : 0.35;
    const parallaxFactorY = isLocker ? 0.04 : 0.18;
    camera.position.set(
      currentCamPos.x + mouse.x * parallaxFactorX,
      currentCamPos.y - mouse.y * parallaxFactorY,
      currentCamPos.z
    );
    camera.lookAt(currentLookAt);
  }

  // Protagonist sphere subtle breathing levitation and rotation
  if (sphereMesh) {
    sphereMesh.position.y = 0.06 + Math.sin(t * 1.6) * 0.035;
    const rotSpeed = isLocker ? 0.75 : 0.4;
    sphereMesh.rotation.y = t * rotSpeed;
    sphereMesh.rotation.x = Math.sin(t * 0.5) * 0.1;
  }

  // Subtle natural leaf flutter / gentle air movement
  if (plantGroup) {
    plantGroup.children.forEach((child, idx) => {
      if (idx > 2) {
        child.rotation.z += Math.sin(t * 1.2 + idx) * 0.0004;
      }
    });
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

watch(selectedSkinId, () => {
  updateBallMaterial();
});

// Zoom in towards the floating ball when entering the locker,
// and glide back out to the wide shot when leaving it.
watch(currentView, (view) => {
  startCameraTransition(view === 'locker');
});

onMounted(() => {
  initScene();
  // If the locker view is already active on mount, play the zoom-in
  if (currentView.value === 'locker') {
    startCameraTransition(true);
  }
});

onBeforeUnmount(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', onResize);
  window.removeEventListener('mousemove', onMouseMove);

  if (renderer) {
    renderer.dispose();
  }
});
</script>
