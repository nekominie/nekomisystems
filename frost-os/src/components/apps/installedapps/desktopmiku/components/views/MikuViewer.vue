<template>
  <canvas
    ref="canvas"
    class="miku-canvas"
    :class="{ 'is-grabbing': isGrabbing }"
  ></canvas>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MikuRagdoll } from './MikuRagdoll';

const props = withDefaults(
  defineProps<{
    action?: string;
    facingLeft?: boolean;
    scale?: number;
    ragdollActive?: boolean;
    mikuX?: number;
    mikuY?: number;
  }>(),
  {
    action: 'chat',
    facingLeft: false,
    scale: 1.0,
    ragdollActive: false,
    mikuX: 300,
    mikuY: 42,
  }
);

const emit = defineEmits<{
  (e: 'ragdoll-grab', grabbing: boolean, boneName?: string, clientX?: number, clientY?: number): void;
  (e: 'ragdoll-drag', clientX: number, clientY: number): void;
  (e: 'ragdoll-physics', active: boolean): void;
  (e: 'update-position', screenX: number, screenY?: number): void;
}>();

const canvas = ref<HTMLCanvasElement | null>(null);
const isGrabbing = ref(false);
// Controla Únicamente si el bucle de animate() debe avanzar la simulación
// física cruda (cannon-es) en vez del mixer de animaciones.
const isRagdollActive = ref(false);
// true desde que se agarra a Miku hasta que TERMINA la animación de
// "levantarse" (no solo mientras cae/se asienta la física). Mientras esto
// sea true: se bloquean cambios externos de pose/posición/animación y se
// notifica al padre para mantener oculto el menú flotante.
const isRagdollBusy = ref(false);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let mixer: THREE.AnimationMixer | null = null;
let clock: THREE.Clock = new THREE.Clock();
let animFrameId: number | null = null;

let mikuModel: THREE.Group | null = null;
let mikuSkeleton: THREE.Skeleton | null = null;
let currentActionInstance: THREE.AnimationAction | null = null;
const loadedClips: Record<string, THREE.AnimationClip> = {};
// Snapshot de la rotación LOCAL de CADA hueso del esqueleto (incluyendo
// flequillo/copete, cabello, falda, dedos, etc.), tomada una única vez justo
// al cargar el modelo, antes de reproducir cualquier animación. Sirve como
// pose de reposo "conocida buena" para limpiar huesos secundarios que
// algunos clips (p. ej. stand_up) animan pero que ningún otro clip del ciclo
// normal vuelve a corregir, dejando esos huesos "pegados" para siempre.
let restPoseLocalQuats: Map<string, THREE.Quaternion> | null = null;

// Ragdoll y dimensiones de pantalla
let ragdoll: MikuRagdoll | null = null;
let savedModelRotY: number = 0;
let recoveryTimer: ReturnType<typeof setTimeout> | null = null;
// Se incrementa cada vez que empieza un nuevo ciclo de agarre/recuperación,
// para poder invalidar callbacks asíncronos (carga de clip, evento
// 'finished') de una recuperación anterior si se vuelve a agarrar a Miku
// mientras todavía se estaba levantando.
let recoveryToken = 0;
let settleCheckInterval: ReturnType<typeof setInterval> | null = null;

let currentVisibleWidth = 8;
let currentVisibleHeight = 4.5;
let currentFloorY = 0.16;

function screenXTo3D(screenX: number): number {
  return ((screenX / window.innerWidth) - 0.5) * currentVisibleWidth;
}

function threeDtoScreenX(x3d: number): number {
  return ((x3d / currentVisibleWidth) + 0.5) * window.innerWidth;
}

function screenYTo3D(screenBottomY: number): number {
  return screenBottomY * (currentVisibleHeight / window.innerHeight);
}

function threeDtoScreenBottomY(y3d: number): number {
  return (y3d / currentVisibleHeight) * window.innerHeight;
}

/** Activa/desactiva Únicamente la simulación física cruda (cannon-es). */
function setRagdollPhysicsActive(active: boolean): void {
  isRagdollActive.value = active;
}

/**
 * Notifica al padre (desktopmiku.vue) si Miku sigue "ocupada" con el
 * ragdoll: agarrada, cayendo/asentándose, o reproduciendo la animación de
 * levantarse. Mientras esté activa, el menú flotante debe permanecer
 * oculto y no se debe persistir la posición, ya que la pose/posición real
 * de Miku en pantalla cambia constantemente y de forma impredecible.
 */
function setRagdollBusy(active: boolean): void {
  if (isRagdollBusy.value === active) return;
  isRagdollBusy.value = active;
  emit('ragdoll-physics', active);
}

// Archivos de animación GLB
const ANIMATION_FILES: Record<string, string> = {
  walking: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Walking_withSkin.glb',
  running: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Running_withSkin.glb',
  quick_walk: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Quick_Walk_withSkin.glb',
  red_carpet: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Red_Carpet_Walk_withSkin.glb',
  dance_groove: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_OMG_Groove_withSkin.glb',
  dance_shake: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Shake_It_Off_Dance_withSkin.glb',
  handstand: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_One_Arm_Handstand_withSkin.glb',
  chat: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Stand_and_Chat_withSkin.glb',
  scheming: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Scheming_Hand_Rub_withSkin.glb',
  fist_pump: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Seated_Fist_Pump_withSkin.glb',
  sit_drink: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Sit_and_Drink_withSkin.glb',
  sit_doze: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Sit_and_Doze_Off_withSkin.glb',
  sleep: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Sleep_Normally_withSkin.glb',
  wake_up: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Wake_Up_and_Look_Up_withSkin.glb',
  stand_up: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Stand_Up9_withSkin.glb',
  sliding_roll: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_sliding_rool_withSkin.glb',
  pole_balance: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Stand_on_Pole_and_Balance_withSkin.glb',
  fall_backward: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Shot_and_Fall_Backward_withSkin.glb',
  fall_shot: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Shot_in_the_Back_and_Fall_withSkin.glb',
  idle: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Stand_and_Chat_withSkin.glb',
  greeting: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Stand_and_Chat_withSkin.glb',
  thinking: '/desktopmiku/models/miku/animations/Meshy_AI_miku_biped_Animation_Scheming_Hand_Rub_withSkin.glb'
};

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();

const textures: Record<string, THREE.Texture> = {};

function initTextures() {
  const texFiles: Record<string, string> = {
    Body: '/desktopmiku/models/miku/textures/Body_baseColor.png',
    Cloth: '/desktopmiku/models/miku/textures/Cloth_baseColor.png',
    Face: '/desktopmiku/models/miku/textures/Face_baseColor.png',
    Hair: '/desktopmiku/models/miku/textures/Hair_baseColor.png',
    Hair_Stencil: '/desktopmiku/models/miku/textures/Hair_Stencil_baseColor.png',
  };

  for (const [key, path] of Object.entries(texFiles)) {
    const tex = textureLoader.load(path);
    tex.flipY = true;
    tex.colorSpace = THREE.SRGBColorSpace;
    textures[key] = tex;
  }
}

function applyMikuMaterials(targetObject: THREE.Object3D) {
  targetObject.traverse((child: any) => {
    if (child.isMesh) {
      child.frustumCulled = false;
      const matName: string = child.material?.name || '';

      if (matName === 'Body' || matName.includes('Body')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Body,
          side: THREE.DoubleSide
        });
      } else if (matName === 'Cloth_Trance' || matName.includes('Cloth_Trance')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Cloth,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95
        });
      } else if (matName === 'Cloth' || matName.includes('Cloth')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Cloth,
          side: THREE.DoubleSide
        });
      } else if (matName === 'Stencil_eye' || matName.includes('Stencil_eye')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Face,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
      } else if (matName === 'Stencil_eyebrow' || matName.includes('Stencil_eyebrow')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Face,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
      } else if (matName === 'Face' || matName.includes('Face')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Face,
          side: THREE.DoubleSide
        });
      } else if (matName === 'Hair_Shadow_1' || matName.includes('Hair_Shadow')) {
        child.material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(1, 0.8, 0.78),
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
      } else if (matName === 'Hair_Stencil' || matName.includes('Hair_Stencil')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Hair_Stencil,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1
        });
      } else if (matName === 'Hair' || matName.includes('Hair')) {
        child.material = new THREE.MeshBasicMaterial({
          map: textures.Hair,
          side: THREE.DoubleSide,
          transparent: true,
          alphaTest: 0.1
        });
      }
    }
  });
}

async function loadClip(actionKey: string): Promise<THREE.AnimationClip | null> {
  if (loadedClips[actionKey]) return loadedClips[actionKey];

  const url = ANIMATION_FILES[actionKey] || ANIMATION_FILES.chat;
  if (!url) return null;

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(url, resolve, undefined, reject);
    });

    if (gltf.animations && gltf.animations.length > 0) {
      const clip = gltf.animations[0];
      clip.name = actionKey;
      loadedClips[actionKey] = clip;
      return clip;
    }
  } catch (err) {
    console.error(`[MikuViewer] Error loading animation clip ${actionKey}:`, err);
  }
  return null;
}

async function playAnimation(actionKey: string) {
  if (!mixer || !mikuModel) return;

  const clip = await loadClip(actionKey);
  if (!clip) return;

  const newAction = mixer.clipAction(clip);

  if (currentActionInstance && currentActionInstance !== newAction) {
    newAction.reset();
    newAction.crossFadeFrom(currentActionInstance, 0.35, true);
    newAction.play();
  } else {
    newAction.reset().play();
  }

  currentActionInstance = newAction;
}

function captureRestPose(): void {
  if (!mikuSkeleton) return;
  restPoseLocalQuats = new Map();
  mikuSkeleton.bones.forEach((bone) => {
    restPoseLocalQuats!.set(bone.uuid, bone.quaternion.clone());
  });
}

/**
 * Restaura la rotación LOCAL de TODOS los huesos del esqueleto a la pose de
 * reposo capturada al cargar el modelo. A diferencia de
 * `MikuRagdoll.resetTrackedBonesToRestPose()` (que solo cubre los huesos que
 * el ragdoll controla físicamente), esta función también limpia huesos
 * cosméticos como el flequillo/copete o la falda que animaciones como
 * `stand_up` pueden dejar en una pose incorrecta. Los huesos principales del
 * cuerpo se sobrescriben de inmediato por el crossfade hacia la siguiente
 * animación, así que este reset no afecta su transición.
 */
function restoreRestPose(): void {
  if (!mikuSkeleton || !restPoseLocalQuats || !mikuModel) return;
  mikuSkeleton.bones.forEach((bone) => {
    const restQuat = restPoseLocalQuats!.get(bone.uuid);
    if (restQuat) bone.quaternion.copy(restQuat);
  });
  mikuSkeleton.update();
  mikuModel.updateMatrixWorld(true);
}

function updateFacing(facingLeft: boolean) {
  if (!mikuModel) return;
  const isWalking =
    props.action === 'walking' ||
    props.action === 'running' ||
    props.action === 'quick_walk' ||
    props.action === 'red_carpet';

  if (isWalking) {
    mikuModel.rotation.y = facingLeft ? -Math.PI / 2 : Math.PI / 2;
  } else {
    mikuModel.rotation.y = 0;
  }
}

// ─── Setup y Gestión del Ragdoll ──────────────────────────────────
function setupRagdoll() {
  if (!mikuModel || !mikuSkeleton || !camera || !canvas.value) return;
  if (ragdoll) {
    ragdoll.dispose();
  }

  ragdoll = new MikuRagdoll(mikuModel, mikuSkeleton, camera, canvas.value);
  ragdoll.setBounds({
    w: currentVisibleWidth,
    h: currentVisibleHeight,
    floorY: currentFloorY
  });
  ragdoll.build();
  ragdoll.enableInteraction();

  ragdoll.onGrabStart = (boneName: string, clientX?: number, clientY?: number) => {
    if (recoveryTimer) {
      clearTimeout(recoveryTimer);
      recoveryTimer = null;
    }
    if (settleCheckInterval) {
      clearInterval(settleCheckInterval);
      settleCheckInterval = null;
    }

    isGrabbing.value = true;
    recoveryToken++; // invalida cualquier recuperación/levantada pendiente
    setRagdollPhysicsActive(true);
    setRagdollBusy(true);

    if (mixer) mixer.timeScale = 0;

    savedModelRotY = mikuModel!.rotation.y;
    mikuModel!.rotation.y = 0;
    mikuModel!.updateMatrixWorld(true);

    emit('ragdoll-grab', true, boneName, clientX, clientY);
  };

  ragdoll.onPointerDrag = (clientX: number, clientY: number) => {
    emit('ragdoll-drag', clientX, clientY);
  };

  ragdoll.onGrabEnd = (clientX?: number, clientY?: number) => {
    isGrabbing.value = false;
    emit('ragdoll-grab', false, undefined, clientX, clientY);

    if (props.ragdollActive) return;

    // Esperar a que caiga al suelo con gravedad física y ponerse de pie
    // En vez de un timeout fijo, esperar a que la física realmente asiente
    // a Miku en el suelo (hips cerca del floorY con velocidad baja).
    if (recoveryTimer) clearTimeout(recoveryTimer);
    startSettleCheck();
  };
}

/**
 * Polls the ragdoll physics every 100ms to detect when Miku has actually
 * landed near the floor with low velocity. Only then triggers recovery.
 * Has a max fallback of 8 seconds in case she gets stuck somewhere.
 */
function startSettleCheck(): void {
  if (settleCheckInterval) {
    clearInterval(settleCheckInterval);
    settleCheckInterval = null;
  }

  const startTime = Date.now();
  const MAX_SETTLE_WAIT = 8000; // max 8 seconds fallback

  settleCheckInterval = setInterval(() => {
    // If the user grabs Miku again, the interval will be cleared by onGrabStart
    if (!isRagdollActive.value || ragdoll?.isGrabbing) {
      if (settleCheckInterval) {
        clearInterval(settleCheckInterval);
        settleCheckInterval = null;
      }
      return;
    }

    const elapsed = Date.now() - startTime;
    const settled = ragdoll?.isSettled() ?? true;

    if (settled || elapsed >= MAX_SETTLE_WAIT) {
      if (settleCheckInterval) {
        clearInterval(settleCheckInterval);
        settleCheckInterval = null;
      }
      // Small extra delay after settling to let the physics fully stabilize
      recoveryTimer = setTimeout(() => {
        recoverFromRagdoll();
      }, 300);
    }
  }, 100);
}

function recoverFromRagdoll() {
  if (ragdoll?.isGrabbing) return;
  if (!isRagdollActive.value) return;

  const myRecoveryToken = ++recoveryToken;
  setRagdollPhysicsActive(false);

  if (mikuModel) {
    mikuModel.position.y = props.mikuY !== undefined ? screenYTo3D(props.mikuY) : currentFloorY;
    mikuModel.rotation.y = savedModelRotY;
    // Reset de seguridad: deja TODO el esqueleto (incluido el flequillo,
    // cabello y falda) en la pose de reposo capturada al cargar el modelo,
    // por si el clip de "levantarse" no llega a cargar (ver
    // playStandUpThenResume) o tarda en arrancar. NOTA: antes se usaba
    // `mikuSkeleton.pose()`, que reseteaba a la pose de BIND del skinning
    // (distinta de la pose real de reposo de las animaciones) y eso era la
    // causa de que el copete quedara "enterrado" en la frente de forma
    // permanente. `restoreRestPose()` usa la pose real capturada al cargar.
    restoreRestPose();
    mikuModel.updateMatrixWorld(true);
    emit('update-position', threeDtoScreenX(mikuModel.position.x), threeDtoScreenBottomY(mikuModel.position.y));
  }

  if (mixer) {
    mixer.timeScale = 1;
  }

  playStandUpThenResume(myRecoveryToken);
}

/**
 * Reproduce la animación de "levantarse del suelo" (stand_up) una sola vez
 * tras el ragdoll, y solo cuando termina retoma el ciclo normal de
 * animaciones. Esto evita el salto brusco/"atravesado" de pasar
 * directamente de la pose caída del ragdoll a la pose de pie del idle.
 *
 * `token` permite descartar este flujo si, mientras carga el clip o se
 * reproduce, el usuario vuelve a agarrar a Miku (lo que arranca un nuevo
 * ciclo de agarre/recuperación y por lo tanto un `recoveryToken` distinto).
 */
async function playStandUpThenResume(token: number): Promise<void> {
  if (token !== recoveryToken) return;
  if (!mixer || !mikuModel) {
    finishRecovery(token);
    return;
  }

  const clip = await loadClip('stand_up');
  if (token !== recoveryToken) return; // superado por un nuevo agarre mientras cargaba

  if (!clip) {
    finishRecovery(token);
    return;
  }

  const standAction = mixer.clipAction(clip);
  standAction.reset();
  standAction.setLoop(THREE.LoopOnce, 1);
  standAction.clampWhenFinished = true;
  standAction.enabled = true;
  standAction.play();
  currentActionInstance = standAction;

  const onStandUpFinished = (event: { action: THREE.AnimationAction }) => {
    if (event.action !== standAction) return;
    mixer?.removeEventListener('finished', onStandUpFinished);
    finishRecovery(token);
  };
  mixer.addEventListener('finished', onStandUpFinished);
}

/** Retoma el ciclo normal de animación/posición y avisa que ya no está ocupada. */
function finishRecovery(token: number): void {
  if (token !== recoveryToken) return;

  // El clip `stand_up` puede animar huesos secundarios (flequillo/copete,
  // cabello, falda, dedos) que las animaciones normales (chat, caminar,
  // bailar, etc.) nunca vuelven a tocar. Sin este reset, esos huesos
  // quedarían "pegados" en la pose final de stand_up para siempre, lo que
  // se ve como animaciones "dañadas" a partir de ese momento. Los huesos
  // principales del cuerpo se sobrescriben de inmediato por el crossfade de
  // `playAnimation`, así que esto no afecta esa transición.
  restoreRestPose();

  const currentAct = props.action || 'chat';
  playAnimation(currentAct);
  updateFacing(props.facingLeft);
  setRagdollBusy(false);

  setTimeout(() => {
    if (ragdoll && !ragdoll.isGrabbing) {
      ragdoll.syncBonesToPhysics();
    }
  }, 300);
}

// ─── Watchers ─────────────────────────────────────────────────────
watch(
  () => props.action,
  (newAction) => {
    if (newAction && !isRagdollBusy.value) {
      playAnimation(newAction);
      updateFacing(props.facingLeft);
    }
  }
);

watch(
  () => props.facingLeft,
  (isLeft) => {
    if (!isRagdollBusy.value) {
      updateFacing(isLeft);
    }
  }
);

watch(
  () => props.scale,
  () => {
    fitCamera();
  }
);

watch(
  () => props.mikuX,
  (newX) => {
    if (mikuModel && !isRagdollBusy.value && typeof newX === 'number') {
      mikuModel.position.x = screenXTo3D(newX);
      mikuModel.updateMatrixWorld(true);
    }
  }
);

watch(
  () => props.mikuY,
  (newY) => {
    if (mikuModel && !isRagdollBusy.value && typeof newY === 'number') {
      mikuModel.position.y = screenYTo3D(newY);
      mikuModel.updateMatrixWorld(true);
    }
  }
);

watch(
  () => props.ragdollActive,
  (active) => {
    if (active) {
      recoveryToken++; // invalida cualquier recuperación/levantada pendiente
      setRagdollPhysicsActive(true);
      setRagdollBusy(true);
      if (mixer) mixer.timeScale = 0;
      ragdoll?.syncBonesToPhysics();
    } else {
      recoverFromRagdoll();
    }
  }
);

function fitCamera() {
  if (!canvas.value || !renderer || !camera) return;
  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer.setSize(width, height);
  camera.aspect = width / height;

  const mikuHeight = 1.5;
  const targetPxHeight = 360 * props.scale;
  currentVisibleHeight = mikuHeight * (height / targetPxHeight);
  currentVisibleWidth = currentVisibleHeight * (width / height);

  const tan15 = Math.tan(15 * Math.PI / 180);
  const Z = (currentVisibleHeight / 2) / tan15;

  camera.position.set(0, currentVisibleHeight / 2, Z);
  camera.lookAt(0, currentVisibleHeight / 2, 0);
  camera.updateProjectionMatrix();

  currentFloorY = 42 * (currentVisibleHeight / height);

  if (ragdoll) {
    ragdoll.setBounds({
      w: currentVisibleWidth,
      h: currentVisibleHeight,
      floorY: currentFloorY
    });
  }

  if (mikuModel && !isRagdollBusy.value) {
    mikuModel.position.y = props.mikuY !== undefined ? screenYTo3D(props.mikuY) : currentFloorY;
    if (props.mikuX !== undefined) {
      mikuModel.position.x = screenXTo3D(props.mikuX);
    }
    mikuModel.updateMatrixWorld(true);
  }
}

function handleResize() {
  fitCamera();
}

function animate() {
  animFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (isRagdollActive.value && ragdoll?.isBuilt) {
    ragdoll.update(delta);
    if (mikuModel) {
      emit('update-position', threeDtoScreenX(mikuModel.position.x), threeDtoScreenBottomY(mikuModel.position.y));
    }
  } else if (mixer) {
    mixer.update(delta);
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

onMounted(async () => {
  if (!canvas.value) return;
  initTextures();

  const width = window.innerWidth;
  const height = window.innerHeight;

  renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);

  const baseGlbUrl = ANIMATION_FILES.chat;

  try {
    const gltf = await new Promise<any>((resolve, reject) => {
      loader.load(baseGlbUrl, resolve, undefined, reject);
    });

    mikuModel = gltf.scene;
    scene.add(mikuModel);

    mikuModel.traverse((child: any) => {
      if (child.isSkinnedMesh && child.skeleton && !mikuSkeleton) {
        mikuSkeleton = child.skeleton;
      }
    });

    // Capturar la pose de reposo ANTES de reproducir cualquier animación:
    // es la pose "tal cual viene" del archivo, garantizada limpia (incluido
    // el flequillo/copete), y sirve de referencia para poder restaurar
    // cualquier hueso que quede mal posicionado tras un clip problemático.
    captureRestPose();

    applyMikuMaterials(mikuModel);

    // Normalizar altura
    const box = new THREE.Box3().setFromObject(mikuModel);
    const size = new THREE.Vector3();
    box.getSize(size);
    const targetHeight = 1.5;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    mikuModel.scale.set(scale, scale, scale);
    mikuModel.updateMatrixWorld(true);

    // Ajustar cámara para pantalla completa
    fitCamera();

    mixer = new THREE.AnimationMixer(mikuModel);

    if (gltf.animations && gltf.animations.length > 0) {
      const clip = gltf.animations[0];
      clip.name = 'chat';
      loadedClips['chat'] = clip;
      loadedClips['greeting'] = clip;
      loadedClips['idle'] = clip;
    }

    const initialAction = props.action || 'chat';
    await playAnimation(initialAction);
    updateFacing(props.facingLeft);

    setupRagdoll();
  } catch (err) {
    console.error('[MikuViewer] Error loading initial 3D Miku model:', err);
  }

  animate();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
  if (settleCheckInterval) {
    clearInterval(settleCheckInterval);
    settleCheckInterval = null;
  }
  if (ragdoll) {
    ragdoll.dispose();
    ragdoll = null;
  }

  if (animFrameId) cancelAnimationFrame(animFrameId);
  window.removeEventListener('resize', handleResize);
  if (mixer) mixer.stopAllAction();
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.miku-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 10000;
  display: block;
}

.miku-canvas.is-grabbing {
  cursor: grabbing !important;
}
</style>
