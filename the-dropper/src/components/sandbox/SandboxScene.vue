<template>
  <div class="relative w-full h-full overflow-hidden select-none">
    <canvas
      ref="canvasRef"
      class="w-full h-full block cursor-grab active:cursor-grabbing"
      @pointerdown="onCanvasClick"
      @pointermove="onCanvasPointerMove"
      @pointerleave="onCanvasPointerLeave"
      @contextmenu="onContextMenu"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { createSkyboxAndLights, type SkySystem } from '../../utils/skyboxGenerator';
import { SandboxWorld, type SandboxItem, type PhysicsBall, type ShapeType, type PlatformConfig } from '../../utils/sandboxPhysics';
import { SandboxDragPreview } from '../../utils/sandboxDragPreview';
import { activePlacementItem, activeBallPreset, clearPlacementItem, type PlacementItem } from '../../state/sandboxDragStore';
import { BALL_SKINS } from '../../state/gameStore';
import { activeWorld, markUnsavedChanges } from '../../state/sandboxWorldStore';
import { timeOfDay, timeAutoPlay, DAY_HOURS_PER_SECOND } from '../../state/sandboxEnvStore';
import type { BallSkin } from '../../types/game';
import { sound } from '../../utils/sound';

const emit = defineEmits<{
  (e: 'select-item', item: SandboxItem | null): void;
  (e: 'update-stats', stats: { items: number; balls: number; isPaused: boolean }): void;
  (e: 'update-spawn-height', height: number): void;
  (e: 'update-platform-config', config: PlatformConfig): void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let orbitControls: OrbitControls | null = null;
let transformControls: TransformControls | null = null;
let skySystem: SkySystem | null = null;
let sandboxWorld: SandboxWorld | null = null;
let dragPreview: SandboxDragPreview | null = null;
let animationFrameId: number | null = null;
let clock: THREE.Clock | null = null;

// Build Mode State
const isBuildMode = ref(true);
const isPlatformGizmoActive = ref(false);

// Hover Highlight Helpers (only for concrete construction shapes)
let hoverShapeHelper: THREE.BoxHelper | null = null;

// Auto-spawn state & emitter
const autoSpawnActive = ref(false);
const autoSpawnInterval = ref(0.8);
let autoSpawnTimer = 0;
let lastSpawnedSkin: BallSkin = BALL_SKINS[0];
let lastSpawnedPos: THREE.Vector3 = new THREE.Vector3(0, 5.0, 0);
let emitterMesh: THREE.Group | null = null;

const selectedItem = ref<SandboxItem | null>(null);
const currentTransformMode = ref<'translate' | 'rotate' | 'scale'>('translate');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let pointerDownTime = 0;
let pointerDownPos = { x: 0, y: 0 };

// Watch activePlacementItem to update selection/preview state
watch(activePlacementItem, (item) => {
  if (item) {
    // Deselect any selected piece when entering placement mode
    selectItem(null);
    enablePlatformGizmo(false);
    if (dragPreview) {
      dragPreview.setPreviewTarget(item.kind, item.shapeType, item.skin);
      emit('update-spawn-height', dragPreview.spawnHeight);
    }
    if (orbitControls) {
      orbitControls.enableZoom = false;
    }
  } else {
    if (dragPreview) {
      dragPreview.hide();
    }
    if (orbitControls) {
      orbitControls.enableZoom = true;
    }
  }
});

function initScene() {
  if (!canvasRef.value) return;

  const width = canvasRef.value.clientWidth || window.innerWidth;
  const height = canvasRef.value.clientHeight || window.innerHeight;

  // 1. Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x8ab4e8, 0.003);

  // 2. Camera: 3/4 perspective overlooking the concrete platform
  camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1200);
  camera.position.set(15, 12, 16);
  camera.lookAt(0, 0, 0);

  // 3. Renderer with shadow maps
  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // 4. High-Altitude Celestial Skybox (Sun, Sky Dome, Lower Cloud Deck)
  skySystem = createSkyboxAndLights(scene);

  // 5. Sandbox Physics World & Concrete Platform
  sandboxWorld = new SandboxWorld(scene);

  // Apply the saved time of day (sun/moon, sky, fog, lamps) before any piece is restored
  applyTimeOfDay(timeOfDay.value);

  // 6. Holographic Drag & Drop / Stamp Preview System
  dragPreview = new SandboxDragPreview(scene);

  // 7. Auto-Spawner Emitter Visual Indicator
  createEmitterVisual();

  // 8. Hover Highlight Visual Helpers
  createHoverHelpers();

  // 9. Camera Orbit Controls
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.target.set(0, 0.5, 0);
  orbitControls.minPolarAngle = 0.05;
  orbitControls.maxPolarAngle = Math.PI * 0.85;
  orbitControls.minDistance = 4;
  orbitControls.maxDistance = 80;

  // 10. TransformControls for gizmo positioning/rotation/scaling
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.size = 0.85;
  transformControls.setMode(currentTransformMode.value);

  transformControls.addEventListener('dragging-changed', (event) => {
    if (orbitControls) {
      orbitControls.enabled = !event.value;
    }

    if (!event.value) {
      markUnsavedChanges();
      if (isPlatformGizmoActive.value && sandboxWorld?.platformMesh) {
        const sX = sandboxWorld.platformMesh.scale.x;
        const sZ = sandboxWorld.platformMesh.scale.z;
        const curW = sandboxWorld.platformConfig.width;
        const curD = sandboxWorld.platformConfig.depth;
        const newW = Math.max(4, Math.min(250, Math.round(curW * sX * 2) / 2));
        const newD = Math.max(4, Math.min(250, Math.round(curD * sZ * 2) / 2));
        sandboxWorld.setPlatformSize(newW, newD, false);
        emit('update-platform-config', sandboxWorld.platformConfig);
      }
    }
  });

  transformControls.addEventListener('change', () => {
    if (selectedItem.value && sandboxWorld) {
      sandboxWorld.updateItemTransform(selectedItem.value);
      if (hoverShapeHelper && hoverShapeHelper.visible) {
        hoverShapeHelper.update();
      }
    } else if (isPlatformGizmoActive.value && sandboxWorld?.platformMesh) {
      const sX = sandboxWorld.platformMesh.scale.x;
      const sZ = sandboxWorld.platformMesh.scale.z;
      const curW = sandboxWorld.platformConfig.width;
      const curD = sandboxWorld.platformConfig.depth;
      const newW = Math.max(4, Math.min(250, Math.round(curW * sX * 2) / 2));
      const newD = Math.max(4, Math.min(250, Math.round(curD * sZ * 2) / 2));
      emit('update-platform-config', {
        width: newW,
        depth: newD,
        isInfinite: false,
      });
    }
  });

  scene.add(transformControls.getHelper());

  // Attach mouse wheel listener with passive: false to adjust spawn height
  canvasRef.value.addEventListener('wheel', onCanvasWheel, { passive: false });

  clock = new THREE.Clock();
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', onKeyDown);

  // If an active world is selected, restore its state
  if (activeWorld.value && sandboxWorld) {
    const raw = JSON.parse(JSON.stringify(activeWorld.value));
    sandboxWorld.loadSerialized(raw);
    emit('update-platform-config', sandboxWorld.platformConfig);
    console.log(`[SandboxScene] Restored world "${activeWorld.value.name}" with ${activeWorld.value.items?.length || 0} items.`);
  }

  emitStats();
  animate();
}

/**
 * Moves the sun/moon and recolors sky, fog, clouds and lights for the given hour.
 * Everything is a few uniform/color updates (no textures are redrawn), so it is cheap enough
 * to run on every slider tick or every frame of the day/night auto-play.
 */
function applyTimeOfDay(hour: number) {
  if (!skySystem) return;
  const state = skySystem.setTimeOfDay(hour);
  if (renderer) {
    // Slightly lower exposure at night so the scene doesn't look washed out
    renderer.toneMappingExposure = 0.95 + 0.2 * state.daylight;
  }
  sandboxWorld?.setDarkness(state.darkness);
}

watch(timeOfDay, (hour) => applyTimeOfDay(hour));

watch(
  () => activeWorld.value?.id,
  (newId, oldId) => {
    if (newId && newId !== oldId && sandboxWorld && activeWorld.value) {
      console.log(`[SandboxScene] World switched to "${activeWorld.value.name}", restoring scene...`);
      const raw = JSON.parse(JSON.stringify(activeWorld.value));
      sandboxWorld.loadSerialized(raw);
      emit('update-platform-config', sandboxWorld.platformConfig);
      emitStats();
    }
  }
);

function createHoverHelpers() {
  if (!scene) return;

  // BoxHelper for shape hover highlight (glowing cyan box)
  const dummyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1));
  hoverShapeHelper = new THREE.BoxHelper(dummyMesh, 0x0df0d4);
  (hoverShapeHelper.material as THREE.LineBasicMaterial).transparent = true;
  (hoverShapeHelper.material as THREE.LineBasicMaterial).opacity = 0.85;
  (hoverShapeHelper.material as THREE.LineBasicMaterial).depthWrite = false;
  hoverShapeHelper.visible = false;
  scene.add(hoverShapeHelper);
}

function createEmitterVisual() {
  if (!scene) return;
  emitterMesh = new THREE.Group();
  emitterMesh.visible = false;

  const ringGeo = new THREE.RingGeometry(0.4, 0.52, 32);
  ringGeo.rotateX(Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x0df0d4,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  emitterMesh.add(ring);

  const innerGeo = new THREE.RingGeometry(0.18, 0.26, 24);
  innerGeo.rotateX(Math.PI / 2);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerRing = new THREE.Mesh(innerGeo, innerMat);
  emitterMesh.add(innerRing);

  emitterMesh.position.copy(lastSpawnedPos);
  scene.add(emitterMesh);
}

function updateEmitterPosition() {
  if (emitterMesh) {
    emitterMesh.position.copy(lastSpawnedPos);
    emitterMesh.visible = autoSpawnActive.value;
  }
}

function onResize() {
  if (!renderer || !camera || !canvasRef.value) return;
  const width = canvasRef.value.clientWidth || window.innerWidth;
  const height = canvasRef.value.clientHeight || window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);

  const delta = clock ? clock.getDelta() : 0.016;
  const elapsedTime = clock ? clock.getElapsedTime() : 0;

  // Update cloud drift
  if (skySystem) {
    skySystem.updateClouds(elapsedTime * 1000);
  }

  // Day/night auto-play (the watcher on timeOfDay applies the new hour)
  if (timeAutoPlay.value) {
    timeOfDay.value = (timeOfDay.value + delta * DAY_HOURS_PER_SECOND) % 24;
  }

  // Update holographic drag / stamp preview animation
  if (dragPreview) {
    dragPreview.animate(elapsedTime);
  }

  // Auto-spawn generator tick
  if (autoSpawnActive.value && !sandboxWorld?.isPaused && lastSpawnedSkin) {
    autoSpawnTimer += delta;
    if (autoSpawnTimer >= autoSpawnInterval.value) {
      autoSpawnTimer = 0;
      if (sandboxWorld && sandboxWorld.balls.length < 50) {
        const jitter = new THREE.Vector3(
          (Math.random() - 0.5) * 0.08,
          0,
          (Math.random() - 0.5) * 0.08
        );
        sandboxWorld.addBall(lastSpawnedSkin, lastSpawnedPos.clone().add(jitter), false, activeBallPreset.value);
        emitStats();
      }
    }
  }

  // Pulse emitter visual
  if (emitterMesh && autoSpawnActive.value) {
    emitterMesh.rotation.y = elapsedTime * 2;
    emitterMesh.scale.setScalar(1 + Math.sin(elapsedTime * 6) * 0.08);
  }

  // Step physics simulation
  if (sandboxWorld) {
    sandboxWorld.update(delta);
  }

  // Update orbit camera damping
  if (orbitControls) {
    orbitControls.update();
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function onCanvasWheel(event: WheelEvent) {
  if (activePlacementItem.value && dragPreview) {
    event.preventDefault();
    event.stopPropagation();
    const newHeight = dragPreview.adjustHeight(event.deltaY);
    emit('update-spawn-height', newHeight);
    sound.playHover(0.02);
  }
}

function onCanvasPointerMove(event: PointerEvent) {
  if (transformControls?.dragging) return;
  if (!camera || !scene || !canvasRef.value || !sandboxWorld) return;

  // 0. Active Placement Mode: preview follows cursor
  if (activePlacementItem.value && dragPreview) {
    if (hoverShapeHelper) hoverShapeHelper.visible = false;

    dragPreview.setPreviewTarget(
      activePlacementItem.value.kind,
      activePlacementItem.value.shapeType,
      activePlacementItem.value.skin
    );
    dragPreview.updatePositionFromScreen(
      event.clientX,
      event.clientY,
      camera,
      canvasRef.value,
      sandboxWorld
    );
    canvasRef.value.style.cursor = 'crosshair';
    return;
  }

  const rect = canvasRef.value.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  // If in Build Mode, check construction shapes for hover highlight
  if (isBuildMode.value) {
    const rootMeshes = sandboxWorld.items.map((item) => item.mesh);
    const shapeIntersects = raycaster.intersectObjects(rootMeshes, true);
    if (shapeIntersects.length > 0) {
      const hitObj = shapeIntersects[0].object;
      const foundItem = sandboxWorld.items.find((item) => {
        if (item.mesh === hitObj) return true;
        let isChild = false;
        item.mesh.traverse((c) => {
          if (c === hitObj) isChild = true;
        });
        return isChild;
      });
      if (foundItem) {
        if (hoverShapeHelper) {
          hoverShapeHelper.setFromObject(foundItem.mesh);
          hoverShapeHelper.visible = true;
        }
        canvasRef.value.style.cursor = 'pointer';
        return;
      }
    }
  }

  // No hover target found
  if (hoverShapeHelper) hoverShapeHelper.visible = false;
  canvasRef.value.style.cursor = 'grab';
}

function onCanvasPointerLeave() {
  if (hoverShapeHelper) hoverShapeHelper.visible = false;
  if (activePlacementItem.value && dragPreview) {
    dragPreview.hide();
  }
}

function onContextMenu(event: MouseEvent) {
  // Right-click cancels placement tool
  if (activePlacementItem.value) {
    event.preventDefault();
    clearPlacementItem();
    if (dragPreview) dragPreview.hide();
    sound.playClick(0.06);
  }
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    if (activePlacementItem.value) {
      clearPlacementItem();
      if (dragPreview) dragPreview.hide();
      sound.playClick(0.06);
    } else if (selectedItem.value) {
      selectItem(null);
    }
  }
}

function onCanvasClick(event: PointerEvent) {
  pointerDownTime = performance.now();
  pointerDownPos = { x: event.clientX, y: event.clientY };

  window.addEventListener(
    'pointerup',
    (upEvent: PointerEvent) => {
      const elapsed = performance.now() - pointerDownTime;
      const dist = Math.hypot(upEvent.clientX - pointerDownPos.x, upEvent.clientY - pointerDownPos.y);

      // Only treat as click if cursor didn't drag the orbit camera (< 6px movement, < 260ms)
      if (elapsed < 260 && dist < 6) {
        // If in Placement Mode:
        if (activePlacementItem.value) {
          if (upEvent.button === 0) {
            // Left click: place / stamp piece!
            handlePlacementClick();
          } else if (upEvent.button === 2) {
            // Right click: cancel
            clearPlacementItem();
            if (dragPreview) dragPreview.hide();
            sound.playClick(0.06);
          }
          return;
        }

        // Normal raycast selection:
        if (upEvent.button === 0) {
          handleRaycastSelect(upEvent);
        }
      }
    },
    { once: true }
  );
}

function handlePlacementClick() {
  if (!activePlacementItem.value || !dragPreview) return;
  const dropPos = dragPreview.lastDropPosition.clone();

  if (activePlacementItem.value.kind === 'shape' && activePlacementItem.value.shapeType) {
    spawnShape(activePlacementItem.value.shapeType, dropPos);
    sound.playClick(0.12);
  } else if (activePlacementItem.value.kind === 'ball' && activePlacementItem.value.skin) {
    spawnBall(activePlacementItem.value.skin, dropPos);
    sound.playClick(0.12);
  }
  // Keep placement active so user can click again to place another piece!
}

function handleRaycastSelect(event: PointerEvent) {
  if (!camera || !scene || !canvasRef.value || !sandboxWorld) return;

  const rect = canvasRef.value.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  // If in Build Mode, check construction shapes
  if (isBuildMode.value) {
    const rootMeshes = sandboxWorld.items.map((item) => item.mesh);
    const shapeIntersects = raycaster.intersectObjects(rootMeshes, true);
    if (shapeIntersects.length > 0) {
      const hitObj = shapeIntersects[0].object;
      const foundItem = sandboxWorld.items.find((item) => {
        if (item.mesh === hitObj) return true;
        let isChild = false;
        item.mesh.traverse((c) => {
          if (c === hitObj) isChild = true;
        });
        return isChild;
      });
      if (foundItem) {
        selectItem(foundItem);
        return;
      }
    }
  }

  // If clicked empty space or platform, deselect
  if (!transformControls?.dragging) {
    selectItem(null);
  }
}

function selectItem(item: SandboxItem | null) {
  selectedItem.value = item;
  emit('select-item', item);

  if (item) {
    enablePlatformGizmo(false);
    if (transformControls) {
      transformControls.attach(item.mesh);
      transformControls.setMode(currentTransformMode.value);
      sound.playClick(0.08);
    }
  } else {
    if (!isPlatformGizmoActive.value && transformControls) {
      transformControls.detach();
    }
  }
}

function setBuildMode(enabled: boolean) {
  isBuildMode.value = enabled;
  if (!enabled) {
    enablePlatformGizmo(false);
    if (selectedItem.value) {
      selectItem(null);
    }
    if (hoverShapeHelper) {
      hoverShapeHelper.visible = false;
    }
    // Only clear placement if placing a shape; balls can be placed in simulation mode!
    if (activePlacementItem.value?.kind === 'shape') {
      clearPlacementItem();
      if (dragPreview) dragPreview.hide();
    }
  }
  sound.playModalTransition();
}

function emitStats() {
  emit('update-stats', {
    items: sandboxWorld?.items.length ?? 0,
    balls: sandboxWorld?.balls.length ?? 0,
    isPaused: sandboxWorld?.isPaused ?? false,
  });
}

// ── Public Exposed Sandbox Actions ──

function spawnShape(type: ShapeType, customPos?: THREE.Vector3) {
  if (!sandboxWorld || !camera) return;
  const spawnPos = customPos ? customPos.clone() : new THREE.Vector3((Math.random() - 0.5) * 4, 1.2, (Math.random() - 0.5) * 4);
  const newItem = sandboxWorld.addShape(type, spawnPos);
  
  // Only auto-attach transform controls if NOT in active placement mode
  if (!activePlacementItem.value) {
    selectItem(newItem);
  }
  markUnsavedChanges();
  emitStats();
}

function spawnBall(skin: BallSkin, customPos?: THREE.Vector3) {
  if (!sandboxWorld) return;
  const spawnPos = customPos ? customPos.clone() : new THREE.Vector3((Math.random() - 0.5) * 3, 5.0, (Math.random() - 0.5) * 3);
  
  // Track last spawned skin and position for auto-spawner
  lastSpawnedSkin = skin;
  lastSpawnedPos.copy(spawnPos);
  updateEmitterPosition();

  const newBall = sandboxWorld.addBall(skin, spawnPos, false, activeBallPreset.value);
  markUnsavedChanges();
  emitStats();
  return newBall;
}

function setAutoSpawn(enabled: boolean) {
  autoSpawnActive.value = enabled;
  autoSpawnTimer = 0;
  updateEmitterPosition();
  sound.playClick(0.08);
}

function setAutoSpawnInterval(val: number) {
  autoSpawnInterval.value = Math.max(0.1, val);
  sound.playClick(0.06);
}

function updateDragPreview(item: PlacementItem, screenX: number, screenY: number, snap = false) {
  if (!dragPreview || !camera || !canvasRef.value || !sandboxWorld) return;
  dragPreview.setPreviewTarget(item.kind, item.shapeType, item.skin);
  dragPreview.updatePositionFromScreen(screenX, screenY, camera, canvasRef.value, sandboxWorld, snap);
}

function hideDragPreview() {
  if (dragPreview) {
    dragPreview.hide();
  }
}

function getDragDropPosition(): THREE.Vector3 {
  return dragPreview?.lastDropPosition.clone() || new THREE.Vector3(0, 1.2, 0);
}

function setTransformMode(mode: 'translate' | 'rotate' | 'scale') {
  currentTransformMode.value = mode;
  if (transformControls) {
    transformControls.setMode(mode);
    sound.playClick(0.06);
  }
}

function setSnap(snapEnabled: boolean) {
  if (transformControls) {
    transformControls.setTranslationSnap(snapEnabled ? 0.5 : null);
    transformControls.setRotationSnap(snapEnabled ? THREE.MathUtils.degToRad(15) : null);
    transformControls.setScaleSnap(snapEnabled ? 0.25 : null);
  }
}

function deleteSelectedItem() {
  if (selectedItem.value && sandboxWorld) {
    const itemToDelete = selectedItem.value;
    selectItem(null);
    sandboxWorld.removeItem(itemToDelete);
    markUnsavedChanges();
    emitStats();
  }
}

function duplicateSelectedItem() {
  if (selectedItem.value && sandboxWorld) {
    const orig = selectedItem.value;
    const newPos = orig.mesh.position.clone().add(new THREE.Vector3(1.0, 0, 1.0));
    const newItem = sandboxWorld.addShape(orig.type, newPos);
    newItem.mesh.rotation.copy(orig.mesh.rotation);
    newItem.mesh.scale.copy(orig.mesh.scale);
    sandboxWorld.updateItemTransform(newItem);
    if (orig.reversed) sandboxWorld.setSpinnerReversed(newItem, true);
    selectItem(newItem);
    markUnsavedChanges();
    emitStats();
  }
}

/** Reverses the scoops of the selected mill. Returns the new state, or null if no mill is selected. */
function toggleSelectedSpin(): boolean | null {
  if (!sandboxWorld || !selectedItem.value) return null;
  const id = selectedItem.value.id;
  const item = sandboxWorld.items.find((i) => i.id === id);
  if (!item || item.type !== 'spinner_wheel') return null;
  sandboxWorld.setSpinnerReversed(item, !item.reversed);
  markUnsavedChanges();
  sound.playClick(0.1);
  return Boolean(item.reversed);
}

function togglePhysics() {
  if (sandboxWorld) {
    sandboxWorld.isPaused = !sandboxWorld.isPaused;
    sound.playClick(0.1);
    emitStats();
  }
}

function resetBalls() {
  if (sandboxWorld) {
    sandboxWorld.resetBalls();
  }
}

function clearBalls() {
  if (sandboxWorld) {
    sandboxWorld.clearBalls();
    markUnsavedChanges();
    emitStats();
  }
}

function clearAll() {
  if (sandboxWorld) {
    selectItem(null);
    sandboxWorld.clearAll();
    markUnsavedChanges();
    emitStats();
  }
}

function resetCamera() {
  if (camera && orbitControls) {
    camera.position.set(15, 12, 16);
    orbitControls.target.set(0, 0.5, 0);
    orbitControls.update();
    sound.playModalTransition();
  }
}

function getSpawnHeight(): number {
  return dragPreview ? dragPreview.spawnHeight : 3.5;
}

function setPlatformSize(width: number, depth: number, isInfinite: boolean = false) {
  if (!sandboxWorld) return;
  sandboxWorld.setPlatformSize(width, depth, isInfinite);
  emit('update-platform-config', sandboxWorld.platformConfig);
  markUnsavedChanges();
  sound.playClick(0.08);
}

function getPlatformConfig(): PlatformConfig {
  return sandboxWorld?.platformConfig ?? { width: 18, depth: 18, isInfinite: false };
}

function enablePlatformGizmo(enabled: boolean) {
  if (!sandboxWorld?.platformMesh || !transformControls) return;
  if (enabled) {
    selectItem(null);
    transformControls.attach(sandboxWorld.platformMesh);
    transformControls.setMode('scale');
    isPlatformGizmoActive.value = true;
    sound.playClick(0.08);
  } else {
    if (isPlatformGizmoActive.value) {
      transformControls.detach();
      isPlatformGizmoActive.value = false;
    }
  }
}

function serializeWorldState() {
  return (
    sandboxWorld?.serialize() || {
      platformConfig: { width: 18, depth: 18, isInfinite: false },
      items: [],
      balls: [],
    }
  );
}

function loadWorldState(data: {
  platformConfig?: PlatformConfig;
  items?: any[];
  balls?: any[];
}) {
  if (sandboxWorld) {
    sandboxWorld.loadSerialized(data);
    emit('update-platform-config', sandboxWorld.platformConfig);
    emitStats();
  }
}

defineExpose({
  spawnShape,
  spawnBall,
  getSpawnHeight,
  setPlatformSize,
  getPlatformConfig,
  enablePlatformGizmo,
  isPlatformGizmoActive,
  isBuildMode,
  setBuildMode,
  setAutoSpawn,
  setAutoSpawnInterval,
  autoSpawnActive,
  autoSpawnInterval,
  updateDragPreview,
  hideDragPreview,
  getDragDropPosition,
  setTransformMode,
  setSnap,
  deleteSelectedItem,
  duplicateSelectedItem,
  toggleSelectedSpin,
  togglePhysics,
  resetBalls,
  clearBalls,
  clearAll,
  resetCamera,
  serializeWorldState,
  loadWorldState,
});

onMounted(() => {
  initScene();
});

onBeforeUnmount(() => {
  timeAutoPlay.value = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', onResize);
  window.removeEventListener('keydown', onKeyDown);
  canvasRef.value?.removeEventListener('wheel', onCanvasWheel);

  if (hoverShapeHelper && scene) {
    scene.remove(hoverShapeHelper);
    hoverShapeHelper.dispose();
  }
  if (emitterMesh && scene) {
    scene.remove(emitterMesh);
  }
  if (dragPreview) {
    dragPreview.dispose();
  }
  if (transformControls) {
    transformControls.dispose();
  }
  if (orbitControls) {
    orbitControls.dispose();
  }
  if (skySystem) {
    skySystem.dispose();
  }
  if (sandboxWorld) {
    sandboxWorld.dispose();
  }
  if (renderer) {
    renderer.dispose();
  }
});
</script>
