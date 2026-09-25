<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, inject } from 'vue';
import MikuViewer from './MikuViewer.vue';
import { useDesktopMikuStore } from '../../store';
import { OS_KEY } from '../../../../../api/os_api';
import { AppStorage } from '../../../../../../database/app_storage';

const os = inject(OS_KEY);
const mikuStore = useDesktopMikuStore();
const storage = new AppStorage('desktopmiku');

type Action = "idle" | "greeting" | "thinking";

type MikuAction = {
  gif: string;
  time: number;
  weight: number;
  cooldown?: number;
  class?: string;
};

const animations: Record<Action, MikuAction> = {
  idle: {
    gif: "/desktopmiku/idle.gif",
    time: 5000,
    weight: 75,
    class: "idle"
  },
  greeting: {
    gif: "/desktopmiku/greeting.gif",
    time: 5000,
    weight: 10,
    cooldown: 15000,
    class: "greeting"
  },
  thinking: {
    gif: "/desktopmiku/thinking.gif",
    time: 5000,
    weight: 15,
    cooldown: 10000,
    class: "thinking"
  },
};

const accionActual = ref<Action>("idle");
const actions: Action[] = ["idle", "greeting", "thinking"];
const lastUsed = new Map<Action, number>();
let timeoutId: ReturnType<typeof setTimeout> | null = null;

function canUseAction(action: Action): boolean {
  const cooldown = animations[action].cooldown;
  if (!cooldown) return true;
  const lastTime = lastUsed.get(action) ?? 0;
  return Date.now() - lastTime >= cooldown;
}

function getRandomAction(): Action {
  const availableActions = actions.filter(canUseAction);
  const totalWeight = availableActions.reduce((total, action) => total + animations[action].weight, 0);
  let random = Math.random() * totalWeight;

  for (const action of availableActions) {
    random -= animations[action].weight;
    if (random <= 0) return action;
  }
  return "idle";
}

function runNextAction() {
  const nextAction = accionActual.value === "idle" ? getRandomAction() : "idle";
  accionActual.value = nextAction;
  lastUsed.set(nextAction, Date.now());

  const duration = animations[nextAction].time;
  timeoutId = setTimeout(() => {
    runNextAction();
  }, duration);
}

// ----------------- FÍSICA, ARRASTRE Y GRAVEDAD -----------------
const FLOOR_Y = 42; // Altura del suelo (justo sobre la barra de tareas de 41px)
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

let vy = 0; // Velocidad vertical de caída (px/s)
const GRAVITY = 3400; // Aceleración de gravedad rápida y caricaturesca (px/s²)
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

    const dt = Math.min((now - lastFrameTime) / 1000, 0.05); // Límite de 50ms por cuadro
    lastFrameTime = now;

    vy += GRAVITY * dt;
    posY.value -= vy * dt;

    if (posY.value <= FLOOR_Y) {
      posY.value = FLOOR_Y;

      // Rebote caricaturesco si venía con suficiente velocidad
      if (Math.abs(vy) > 420) {
        vy = -vy * 0.26;
        triggerSquash();
        animFrameId = requestAnimationFrame(step);
        return;
      } else {
        // Aterrizaje completado
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

// Eventos de arrastre con Mouse
function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return; // Solo clic izquierdo
  isMouseDown.value = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  initialMikuX = posX.value;
  initialMikuY = posY.value;

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
  }

  if (isDragging.value) {
    const maxX = Math.max(0, window.innerWidth - 180);
    const maxY = Math.max(FLOOR_Y, window.innerHeight - 280);

    // X se mueve con deltaX
    posX.value = Math.max(10, Math.min(maxX, initialMikuX + dx));
    // Y se invierte porque posY es desde el fondo (bottom)
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

// Soporte para pantallas táctiles (Touch)
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  isMouseDown.value = true;
  startMouseX = touch.clientX;
  startMouseY = touch.clientY;
  initialMikuX = posX.value;
  initialMikuY = posY.value;

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
  }

  if (isDragging.value) {
    e.preventDefault();
    const maxX = Math.max(0, window.innerWidth - 180);
    const maxY = Math.max(FLOOR_Y, window.innerHeight - 280);

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
  const maxX = Math.max(0, window.innerWidth - 180);
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
      width: 480,
      height: 640
    }
  });
}

function closeDesktopMiku() {
  if (!os) return;
  os.closeApp('desktopmiku');
}

function quickGreeting() {
  mikuStore.triggerAction('greeting');
}

// Ciclo de vida y watchers
onMounted(async () => {
  runNextAction();

  // Cargar posición persistente desde AppStorage (Dexie IndexedDB)
  try {
    const saved = await storage.get('mikuPosition');
    if (saved && typeof saved.x === 'number') {
      const maxX = Math.max(0, window.innerWidth - 180);
      posX.value = Math.max(15, Math.min(maxX, saved.x));
    } else {
      posX.value = Math.max(20, window.innerWidth - 240);
    }
  } catch {
    posX.value = Math.max(20, window.innerWidth - 240);
  }
  posY.value = FLOOR_Y;

  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId);
  if (animFrameId) cancelAnimationFrame(animFrameId);
  window.removeEventListener('resize', onWindowResize);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('touchend', onTouchEnd);
});

watch(() => mikuStore.actionTriggerTimestamp, () => {
  const act = mikuStore.currentAction;
  if (act && animations[act]) {
    accionActual.value = act;
    lastUsed.set(act, Date.now());
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      runNextAction();
    }, animations[act].time);
  }
});
</script>

<template>
  <div
    class="miku-pet-container"
    :class="{ 'is-dragging': isDragging, 'is-falling': isFalling }"
    :style="{
      left: `${posX}px`,
      bottom: `${posY}px`
    }"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
  >
    <!-- BOTONES FLOTANTES AL HACER HOVER (Estilo cómic Hatsune Miku) -->
    <div class="miku-floating-tools" @mousedown.stop @touchstart.stop>
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

      <!-- Botón de interacción rápida -->
      <button
        class="floating-btn wave-btn"
        type="button"
        title="¡Saludar a Miku!"
        @click.stop="quickGreeting"
      >
        <i class="bi bi-music-note-beamed"></i>
        <span class="btn-bubble-tip">¡Saludar!</span>
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

    <!-- MODELO ANIMADO DE MIKU -->
    <div
      class="miku-char"
      :class="[
        animations[accionActual].class,
        {
          'char-falling': isFalling || isDragging,
          'char-squash': isSquashing
        }
      ]"
    >
      <MikuViewer />
    </div>
  </div>
</template>

<style scoped>
.miku-pet-container {
  height: 30rem;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  position: fixed;
  z-index: 10000;
  cursor: grab;
  user-select: none;
  touch-action: none;
  transition: transform 0.08s ease;
}


.miku-pet-container.is-dragging {
  cursor: grabbing !important;
  transition: none !important;
}

/* BOTONES FLOTANTES AL HACER HOVER */
.miku-floating-tools {
  position: absolute;
  top: 18%;
  right: -36px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 10002;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-12px) scale(0.85);
  transition: all 0.24s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Al pasar el mouse por encima de Miku, aparecen las opciones flotantes solo cuando está detenida */
.miku-pet-container:not(.is-dragging):not(.is-falling):hover .miku-floating-tools,
.miku-pet-container:not(.is-dragging):not(.is-falling) .miku-floating-tools:hover {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(0) scale(1);
}

/* Forzar ocultamiento durante arrastre o caída */
.miku-pet-container.is-dragging .miku-floating-tools,
.miku-pet-container.is-falling .miku-floating-tools {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: translateX(-12px) scale(0.85) !important;
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

/* CONTENEDOR DEL MODELO 3D */
.miku-char {
  width: 200px;
  height: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/* Reflejo horizontal en reposo como en el diseño original */
.idle {
  transform: scaleX(-1);
}

/* Efectos caricaturescos de física */
.char-falling {
  transform: scale(0.96, 1.05);
}

.idle.char-falling {
  transform: scaleX(-1) scale(0.96, 1.05);
}

.char-squash {
  transform: scale(1.08, 0.88);
}

.idle.char-squash {
  transform: scaleX(-1) scale(1.08, 0.88);
}
</style>