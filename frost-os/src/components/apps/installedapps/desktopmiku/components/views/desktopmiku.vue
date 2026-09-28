<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue';
import MikuViewer from './MikuViewer.vue';
import { useDesktopMikuStore, type MikuAction } from '../../store';
import { OS_KEY } from '../../../../../api/os_api';
import { AppStorage } from '../../../../../../database/app_storage';

const os = inject(OS_KEY);
const mikuStore = useDesktopMikuStore();
const storage = new AppStorage('desktopmiku');

// Opciones de escalado / resize
const SCALE_OPTIONS = [
  { value: 0.75, label: '75% (S)' },
  { value: 1.0, label: '100% (M)' },
  { value: 1.25, label: '125% (L)' },
  { value: 1.5, label: '150% (XL)' }
];
const currentScale = ref(1.0);
const scaleLabel = computed(() => {
  const found = SCALE_OPTIONS.find(s => s.value === currentScale.value);
  return found ? found.label : `${Math.round(currentScale.value * 100)}%`;
});

async function cycleNextScale() {
  const currentIndex = SCALE_OPTIONS.findIndex(s => s.value === currentScale.value);
  const nextIndex = (currentIndex + 1) % SCALE_OPTIONS.length;
  await setScale(SCALE_OPTIONS[nextIndex].value);
}

async function setScale(newScale: number) {
  currentScale.value = newScale;
  mikuStore.setScale(newScale);

  const maxX = Math.max(0, window.innerWidth - Math.round(300 * newScale));
  if (posX.value > maxX) {
    posX.value = maxX;
  }

  try {
    await storage.set('mikuScale', newScale);
    await storage.set('mikuPosition', { x: Math.round(posX.value) });
  } catch (err) {
    console.error("Error guardando escala de Miku:", err);
  }

  mikuStore.setSpeech(`¡Tamaño cambiado a ${scaleLabel.value}! (◕‿◕)✿`);
}

type ActionConfig = {
  time: number;
  weight: number;
  cooldown?: number;
  speech?: string;
};

// Acciones con animaciones 3D reales
const actionPool: Record<MikuAction, ActionConfig> = {
  idle: { time: 6000, weight: 35, speech: '♪ (◕‿◕)✿' },
  walking: { time: 5500, weight: 30, speech: '¡Paseando por el escritorio! ₍ᐢ.ˬ.⑅ᐢ₎' },
  quick_walk: { time: 4000, weight: 15, cooldown: 12000, speech: '¡Voy de prisa! (ง •̀_•́)ง' },
  running: { time: 3500, weight: 10, cooldown: 15000, speech: '¡Waaaa, carrera! 🏃‍♀️💨' },
  dance_groove: { time: 6500, weight: 15, cooldown: 20000, speech: '¡Siente el ritmo! ٩(ˊᗜˋ*)و 🎵' },
  dance_shake: { time: 7000, weight: 12, cooldown: 20000, speech: 'Shake it off! (≧◡≦)♡ 🎶' },
  chat: { time: 6000, weight: 20, speech: '¿Cómo va tu día hoy? (⌒▽⌒)☆' },
  scheming: { time: 5000, weight: 10, cooldown: 15000, speech: 'Jejeje... pensando algo divertido. (¬‿¬)' },
  fist_pump: { time: 4500, weight: 10, cooldown: 15000, speech: '¡Vamos con todo! ¡Ánimo! (•̀o•́)ง' },
  handstand: { time: 5500, weight: 8, cooldown: 25000, speech: '¡Mira este truco con una mano! 🤸‍♀️✨' },
  sit_drink: { time: 7000, weight: 12, cooldown: 18000, speech: 'Pausa para beber algo rico... 🍵' },
  sit_doze: { time: 7500, weight: 10, cooldown: 22000, speech: 'Mmm... qué sueñito... (˘◡˘) zZ' },
  sleep: { time: 8000, weight: 8, cooldown: 30000, speech: 'zzZ... descansando un ratito... 🌙' },
  wake_up: { time: 5000, weight: 10, cooldown: 25000, speech: '¡Buenos días de nuevo! (⊙‿⊙) ☀️' },
  stand_up: { time: 4000, weight: 10, cooldown: 20000, speech: '¡De pie con energía! (≧◡≦)' },
  sliding_roll: { time: 4500, weight: 8, cooldown: 25000, speech: '¡Vuelta acrobática! 🌀' },
  pole_balance: { time: 5500, weight: 8, cooldown: 25000, speech: '¡Equilibrio perfecto! 🎪' },
  red_carpet: { time: 5500, weight: 10, cooldown: 20000, speech: '¡Modo pasarela de diva! 💅✨' },
  fall_backward: { time: 4000, weight: 5, cooldown: 30000, speech: '¡Ouch, un tropiezo! (｡•́︿•̀｡)' },
  fall_shot: { time: 4000, weight: 5, cooldown: 30000, speech: '¡Teatralidad dramática! 🎭' },
  // Compatibilidad
  greeting: { time: 6000, weight: 15, speech: '¡Konnichiwa! (◕‿◕)ノ♪' },
  thinking: { time: 5000, weight: 12, speech: 'Hmm... pensando en nuevas canciones... (¬_¬)' },
};

const accionActual = ref<MikuAction>('chat');
const isFacingLeft = ref(false);
const lastUsed = new Map<MikuAction, number>();
let actionTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Caminata autónoma por la pantalla
let walkIntervalId: ReturnType<typeof setInterval> | null = null;
let walkDirection = 1; // 1 = derecha, -1 = izquierda
let walkSpeed = 65; // px por segundo

function canUseAction(action: MikuAction): boolean {
  const cfg = actionPool[action];
  if (!cfg?.cooldown) return true;
  const lastTime = lastUsed.get(action) ?? 0;
  return Date.now() - lastTime >= cfg.cooldown;
}

function pickRandomAction(): MikuAction {
  const candidateKeys = (Object.keys(actionPool) as MikuAction[]).filter(canUseAction);
  const totalWeight = candidateKeys.reduce((acc, k) => acc + (actionPool[k]?.weight || 10), 0);
  let r = Math.random() * totalWeight;

  for (const k of candidateKeys) {
    r -= actionPool[k]?.weight || 10;
    if (r <= 0) return k;
  }
  return 'idle';
}

function startWalking() {
  if (walkIntervalId) clearInterval(walkIntervalId);

  // Escoger dirección de caminata
  const maxX = Math.max(0, window.innerWidth - Math.round(300 * currentScale.value));
  if (posX.value >= maxX - 50) {
    walkDirection = -1;
  } else if (posX.value <= 60) {
    walkDirection = 1;
  } else {
    walkDirection = Math.random() > 0.5 ? 1 : -1;
  }

  isFacingLeft.value = walkDirection === -1;

  const intervalMs = 25;
  walkIntervalId = setInterval(() => {
    if (isDragging.value || isFalling.value) return;

    const currentMaxX = Math.max(0, window.innerWidth - Math.round(300 * currentScale.value));
    const step = (walkSpeed * (intervalMs / 1000)) * walkDirection;
    const nextX = posX.value + step;

    if (nextX <= 20) {
      walkDirection = 1;
      isFacingLeft.value = false;
      posX.value = 20;
    } else if (nextX >= currentMaxX) {
      walkDirection = -1;
      isFacingLeft.value = true;
      posX.value = currentMaxX;
    } else {
      posX.value = nextX;
    }
  }, intervalMs);
}

function stopWalking() {
  if (walkIntervalId) {
    clearInterval(walkIntervalId);
    walkIntervalId = null;
    savePosition();
  }
}

function executeAction(action: MikuAction) {
  accionActual.value = action;
  lastUsed.set(action, Date.now());

  const cfg = actionPool[action] || { time: 5000 };

  if (cfg.speech) {
    mikuStore.setSpeech(cfg.speech);
  }

  // Si la acción es de movimiento, activar la caminata en pantalla
  if (action === 'walking' || action === 'quick_walk' || action === 'running' || action === 'red_carpet') {
    walkSpeed = action === 'running' ? 140 : action === 'quick_walk' ? 95 : 65;
    startWalking();
  } else {
    stopWalking();
  }

  if (actionTimeoutId) clearTimeout(actionTimeoutId);
  actionTimeoutId = setTimeout(() => {
    runNextScheduledCycle();
  }, cfg.time);
}

function runNextScheduledCycle() {
  // Si está descansando o caminando, alternar fluidamente
  if (isDragging.value || isFalling.value) {
    actionTimeoutId = setTimeout(runNextScheduledCycle, 2000);
    return;
  }

  const next = pickRandomAction();
  executeAction(next);
}

// ----------------- FÍSICA, ARRASTRE Y GRAVEDAD -----------------
const FLOOR_Y = 42; // Altura de la barra de tareas
const posX = ref(300);
const posY = ref(FLOOR_Y);

const isMouseDown = ref(false);
const isDragging = ref(false);
const isFalling = ref(false);
const isSquashing = ref(false);

let startMouseX = 0;
let startMouseY = 0;
let initialMikuX = 0;
let initialMikuY = 0;

let vy = 0;
const GRAVITY = 3400;
let lastFrameTime = performance.now();
let animFrameId: number | null = null;

function triggerSquash() {
  isSquashing.value = true;
  setTimeout(() => {
    isSquashing.value = false;
  }, 180);
}

function startGravityFall() {
  if (isDragging.value) return;
  if (posY.value <= FLOOR_Y) {
    posY.value = FLOOR_Y;
    savePosition();
    return;
  }

  isFalling.value = true;
  vy = 0;
  lastFrameTime = performance.now();

  function step(now: number) {
    if (isDragging.value) return;

    const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
    lastFrameTime = now;

    vy += GRAVITY * dt;
    posY.value -= vy * dt;

    if (posY.value <= FLOOR_Y) {
      posY.value = FLOOR_Y;

      if (Math.abs(vy) > 420) {
        vy = -vy * 0.26;
        triggerSquash();
        animFrameId = requestAnimationFrame(step);
        return;
      } else {
        vy = 0;
        isFalling.value = false;
        triggerSquash();
        savePosition();
        return;
      }
    }

    animFrameId = requestAnimationFrame(step);
  }

  if (animFrameId) cancelAnimationFrame(animFrameId);
  animFrameId = requestAnimationFrame(step);
}

async function savePosition() {
  try {
    await storage.set('mikuPosition', { x: Math.round(posX.value) });
  } catch (err) {
    console.error("Error guardando posición de Miku:", err);
  }
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  isMouseDown.value = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  initialMikuX = posX.value;
  initialMikuY = posY.value;

  stopWalking();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  isFalling.value = false;

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!isMouseDown.value) return;

  const dx = e.clientX - startMouseX;
  const dy = e.clientY - startMouseY;

  if (!isDragging.value && Math.hypot(dx, dy) > 4) {
    isDragging.value = true;
    stopWalking();
  }

  if (isDragging.value) {
    const maxX = Math.max(0, window.innerWidth - Math.round(280 * currentScale.value));
    const maxY = Math.max(FLOOR_Y, window.innerHeight - Math.round(280 * currentScale.value));

    posX.value = Math.max(10, Math.min(maxX, initialMikuX + dx));
    posY.value = Math.max(FLOOR_Y, Math.min(maxY, initialMikuY - dy));
  }
}

function onMouseUp() {
  if (!isMouseDown.value) return;
  isMouseDown.value = false;
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);

  if (isDragging.value) {
    isDragging.value = false;
    startGravityFall();
  }
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  isMouseDown.value = true;
  startMouseX = touch.clientX;
  startMouseY = touch.clientY;
  initialMikuX = posX.value;
  initialMikuY = posY.value;

  stopWalking();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  isFalling.value = false;

  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
}

function onTouchMove(e: TouchEvent) {
  if (!isMouseDown.value || e.touches.length !== 1) return;
  const touch = e.touches[0];
  const dx = touch.clientX - startMouseX;
  const dy = touch.clientY - startMouseY;

  if (!isDragging.value && Math.hypot(dx, dy) > 5) {
    isDragging.value = true;
    stopWalking();
  }

  if (isDragging.value) {
    e.preventDefault();
    const maxX = Math.max(0, window.innerWidth - Math.round(280 * currentScale.value));
    const maxY = Math.max(FLOOR_Y, window.innerHeight - Math.round(280 * currentScale.value));

    posX.value = Math.max(10, Math.min(maxX, initialMikuX + dx));
    posY.value = Math.max(FLOOR_Y, Math.min(maxY, initialMikuY - dy));
  }
}

function onTouchEnd() {
  if (!isMouseDown.value) return;
  isMouseDown.value = false;
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);

  if (isDragging.value) {
    isDragging.value = false;
    startGravityFall();
  }
}

function onWindowResize() {
  const maxX = Math.max(0, window.innerWidth - Math.round(280 * currentScale.value));
  if (posX.value > maxX) {
    posX.value = maxX;
    savePosition();
  }
}

// ----------------- ACCIONES FLOTANTES (HOVER) -----------------
function openConfigWindow() {
  if (!os) return;
  const existing = os.state.windows.find(w => w.appId === 'desktopmiku' && w.view === 'Config');
  if (existing) {
    os.bringToFront(existing.id);
    return;
  }
  os.createWindow('desktopmiku', {
    view: 'Config',
    title: 'Desktop Miku • Configuración',
    isMaximized: false,
    params: {
      width: 500,
      height: 680
    }
  });
}

function closeDesktopMiku() {
  if (!os) return;
  os.closeApp('desktopmiku');
}

function quickGreeting() {
  executeAction('dance_groove');
}

onMounted(async () => {
  executeAction('chat');

  try {
    const savedScale = await storage.get('mikuScale');
    if (typeof savedScale === 'number' && savedScale >= 0.5 && savedScale <= 2.5) {
      currentScale.value = savedScale;
      mikuStore.setScale(savedScale);
    }
  } catch (err) {
    console.error("Error cargando escala de Miku:", err);
  }

  try {
    const saved = await storage.get('mikuPosition');
    if (saved && typeof saved.x === 'number') {
      const maxX = Math.max(0, window.innerWidth - Math.round(280 * currentScale.value));
      posX.value = Math.max(15, Math.min(maxX, saved.x));
    } else {
      posX.value = Math.max(20, window.innerWidth - Math.round(300 * currentScale.value));
    }
  } catch {
    posX.value = Math.max(20, window.innerWidth - Math.round(300 * currentScale.value));
  }
  posY.value = FLOOR_Y;

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('pointermove', onWindowPointerMove);
});

onUnmounted(() => {
  stopWalking();
  if (actionTimeoutId) clearTimeout(actionTimeoutId);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('pointermove', onWindowPointerMove);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
});

const viewerKey = ref(0);

watch(() => mikuStore.actionTriggerTimestamp, () => {
  const act = mikuStore.currentAction;
  if (act && actionPool[act]) {
    executeAction(act);
  }
});

watch(() => mikuStore.resetTriggerTimestamp, () => {
  stopWalking();
  if (animFrameId) cancelAnimationFrame(animFrameId);
  isDragging.value = false;
  isFalling.value = false;
  isSquashing.value = false;
  vy = 0;

  posY.value = FLOOR_Y;
  posX.value = Math.max(20, window.innerWidth - 320);
  savePosition();

  accionActual.value = 'chat';
  // Recrear MikuViewer para resetear por completo el contexto 3D WebGL
  viewerKey.value++;

  if (actionTimeoutId) clearTimeout(actionTimeoutId);
  actionTimeoutId = setTimeout(() => {
    runNextScheduledCycle();
  }, 6000);
});

watch(() => mikuStore.currentScale, (newScale) => {
  if (typeof newScale === 'number' && newScale !== currentScale.value) {
    currentScale.value = newScale;
    const maxX = Math.max(0, window.innerWidth - Math.round(300 * newScale));
    if (posX.value > maxX) {
      posX.value = maxX;
      savePosition();
    }
  }
});

const isRagdollGrabbing = ref(false);
// true mientras la simulación física del ragdoll está corriendo (agarrado O
// todavía cayendo/asentándose tras soltarlo). Mientras esto sea true, la
// posición real de Miku en pantalla puede diferir mucho de `posX`/`posY`,
// así que el menú flotante debe permanecer oculto para evitar que aparezca
// superpuesto sobre el personaje en vez de a su lado.
const isRagdollPhysicsActive = ref(false);
const isNearMiku = ref(false);

function onWindowPointerMove(e: PointerEvent) {
  if (isRagdollGrabbing.value || isRagdollPhysicsActive.value || isDragging.value || isFalling.value) {
    isNearMiku.value = false;
    return;
  }
  // Coordenadas del centro de Miku en pantalla
  const mikuScreenCenterX = posX.value;
  const mikuScreenCenterY = window.innerHeight - (posY.value + 160 * currentScale.value);
  const dist = Math.hypot(e.clientX - mikuScreenCenterX, e.clientY - mikuScreenCenterY);
  isNearMiku.value = dist < 220;
}

const floatingToolsLeft = computed(() => {
  const desiredX = posX.value + 40;
  if (desiredX + 70 > window.innerWidth) {
    return Math.max(12, posX.value - 90);
  }
  return desiredX;
});

const floatingToolsBottom = computed(() => {
  return posY.value + 120 * currentScale.value;
});

function onUpdatePosition(screenX: number, screenY?: number) {
  posX.value = Math.max(20, Math.min(window.innerWidth - 60, Math.round(screenX)));
  // La Y solo llega mientras el ragdoll está activo (agarrado o cayendo).
  // La guardamos para que el menú flotante sepa dónde está realmente Miku,
  // pero NO persistimos en storage en cada frame para evitar escrituras
  // excesivas: eso se hace una sola vez cuando la física se asienta.
  if (typeof screenY === 'number' && Number.isFinite(screenY)) {
    posY.value = Math.max(FLOOR_Y, Math.round(screenY));
  }
}

function onRagdollPhysicsChange(active: boolean) {
  isRagdollPhysicsActive.value = active;
  if (!active) {
    // La física ya terminó de asentarse y Miku volvió a su pose de pie:
    // ahora sí persistimos la posición final real.
    savePosition();
  }
}

function onRagdollGrab(grabbing: boolean, boneName?: string, _clientX?: number, _clientY?: number) {
  isRagdollGrabbing.value = grabbing;
  if (grabbing) {
    stopWalking();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    isFalling.value = false;
    vy = 0;
    if (actionTimeoutId) clearTimeout(actionTimeoutId);

    const boneSpanish: Record<string, string> = {
      Head: '¡Mi cabeza!',
      LeftHand: '¡Mi mano izquierda!',
      RightHand: '¡Mi mano derecha!',
      LeftArm: '¡Mi brazo!',
      RightArm: '¡Mi brazo!',
      LeftFoot: '¡Mi pie izquierdo!',
      RightFoot: '¡Mi pie derecho!',
      Hips: '¡Waaah, no me levantes así!',
      Spine: '¡Kyaaa!',
      Spine2: '¡Oye!'
    };
    const part = boneName ? (boneSpanish[boneName] || '¡Kyaaa!') : '¡Waaah!';
    mikuStore.setSpeech(`${part} ¡Físicas de muñeca de trapo! (＞﹏＜)✿`);
  } else {
    // No forzamos posY a FLOOR_Y aquí: Miku puede seguir cayendo/rebotando
    // durante unos instantes más tras soltarla. La posición real se sigue
    // sincronizando cuadro a cuadro vía onUpdatePosition hasta que
    // onRagdollPhysicsChange(false) confirme que ya se asentó.
    mikuStore.setSpeech('¡Ufff, de vuelta de pie! (•̀o•́)ง✨');
    if (actionTimeoutId) clearTimeout(actionTimeoutId);
    actionTimeoutId = setTimeout(() => {
      runNextScheduledCycle();
    }, 3000);
  }
}

function onRagdollDrag(_clientX: number, _clientY: number) {
  // Las físicas corren a pantalla completa en MikuRagdoll y MikuViewer.
}
</script>

<template>
  <div class="miku-desktop-layer">
    <!-- VISOR 3D WEBGL PANTALLA COMPLETA: Físicas de ragdoll y animación por todo el monitor -->
    <MikuViewer
      :key="viewerKey"
      :action="accionActual"
      :facing-left="isFacingLeft"
      :scale="currentScale"
      :miku-x="posX"
      :miku-y="posY"
      @ragdoll-grab="onRagdollGrab"
      @ragdoll-drag="onRagdollDrag"
      @ragdoll-physics="onRagdollPhysicsChange"
      @update-position="onUpdatePosition"
    />

    <!-- BOTONES FLOTANTES AL HACER HOVER CERCA DE MIKU (Estilo cómic Hatsune Miku) -->
    <div
      class="miku-floating-tools"
      :class="{
        'is-visible': isNearMiku && !isRagdollGrabbing && !isRagdollPhysicsActive && !isDragging && !isFalling,
        'is-dragging': isDragging
      }"
      :style="{
        left: `${floatingToolsLeft}px`,
        bottom: `${floatingToolsBottom}px`
      }"
      @mouseenter="isNearMiku = true"
      @mousedown.stop
      @touchstart.stop
    >
      <!-- Botón de configuración -->
      <button
        class="floating-btn config-btn"
        type="button"
        title="Abrir Configuración de Desktop Miku"
        @click.stop="openConfigWindow"
      >
        <i class="bi bi-gear-fill"></i>
        <span class="btn-bubble-tip">Ajustes</span>
      </button>

      <!-- Botón de reposicionar / grabber (Arrastrar para mover por la pantalla) -->
      <button
        class="floating-btn grabber-btn"
        type="button"
        title="Mover a Miku (Mantén presionado y arrastra)"
        @mousedown.stop="onMouseDown"
        @touchstart.stop="onTouchStart"
      >
        <i class="bi bi-arrows-move"></i>
        <span class="btn-bubble-tip">Mover</span>
      </button>

      <!-- Botón de cambiar tamaño (Resize) -->
      <button
        class="floating-btn resize-btn"
        type="button"
        :title="`Cambiar tamaño (Actual: ${scaleLabel})`"
        @click.stop="cycleNextScale"
      >
        <i class="bi bi-arrows-angle-expand"></i>
        <span class="btn-bubble-tip">Tamaño: {{ scaleLabel }}</span>
      </button>

      <!-- Botón de interacción rápida -->
      <button
        class="floating-btn wave-btn"
        type="button"
        title="¡Bailar con Miku!"
        @click.stop="quickGreeting"
      >
        <i class="bi bi-music-note-beamed"></i>
        <span class="btn-bubble-tip">¡Bailar!</span>
      </button>

      <!-- Botón de cerrar mascota -->
      <button
        class="floating-btn close-btn"
        type="button"
        title="Cerrar Desktop Miku"
        @click.stop="closeDesktopMiku"
      >
        <i class="bi bi-x-lg"></i>
        <span class="btn-bubble-tip">Cerrar</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.miku-desktop-layer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 10000;
  overflow: hidden;
  user-select: none;
}

/* BOTONES FLOTANTES AL HACER HOVER CERCA DE MIKU */
.miku-floating-tools {
  position: fixed;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10002;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-10px) scale(0.88);
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.miku-floating-tools.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0) scale(1);
}

.floating-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2.5px solid #0e1017;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 3px 3px 0px #0e1017;
  position: relative;
  transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  outline: none;
  pointer-events: auto;
}

.floating-btn:hover {
  transform: scale(1.15) rotate(6deg);
  box-shadow: 4px 4px 0px #0e1017;
}

.floating-btn:active {
  transform: scale(0.95);
  box-shadow: 1px 1px 0px #0e1017;
}

/* Botón Configuración (Miku Cyan) */
.floating-btn.config-btn {
  background: #39c5bb;
  color: #0e1017;
}

.floating-btn.config-btn:hover {
  background: #00f2fe;
}

/* Botón Reposicionar / Grabber (Miku Orange / Move) */
.floating-btn.grabber-btn {
  background: #ff9f1c;
  color: #0e1017;
  cursor: grab;
}

.floating-btn.grabber-btn:hover {
  background: #ffb703;
}

.floating-btn.grabber-btn:active {
  cursor: grabbing;
}

/* Botón Cambiar tamaño (Miku Purple / Violet) */
.floating-btn.resize-btn {
  background: #9d4edd;
  color: #ffffff;
}

.floating-btn.resize-btn:hover {
  background: #b5179e;
}

/* Botón Interacción rápida (Miku Lime/Yellow) */
.floating-btn.wave-btn {
  background: #d4ff00;
  color: #0e1017;
}

.floating-btn.wave-btn:hover {
  background: #ffea00;
}

/* Botón Cerrar (Miku Pink/Red) */
.floating-btn.close-btn {
  background: #ff2a85;
  color: #ffffff;
}

.floating-btn.close-btn:hover {
  background: #ff0055;
}

/* Etiqueta tooltip pop-art */
.btn-bubble-tip {
  position: absolute;
  left: 44px;
  background: #181c25;
  color: #ffffff;
  border: 2px solid #0e1017;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  box-shadow: 2px 2px 0px #0e1017;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-4px);
  transition: all 0.15s ease;
}

.floating-btn:hover .btn-bubble-tip {
  opacity: 1;
  transform: translateX(0);
}
</style>