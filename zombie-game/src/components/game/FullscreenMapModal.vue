<template>
  <div
    class="fixed inset-0 z-50 bg-[#05070a]/95 backdrop-blur-md flex flex-col font-mono select-none text-stone-200"
    @keydown.esc="close"
  >
    <!-- Barra Superior: Encabezado GPS Táctico -->
    <header class="bg-black/90 border-b border-cyan-500/40 px-4 py-2.5 flex items-center justify-between z-20 shadow-lg">
      <div class="flex items-center gap-3">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></span>
        <div class="flex items-baseline gap-2">
          <span class="text-xs uppercase font-bold text-cyan-300 tracking-wider">
            SISTEMA DE NAVEGACIÓN GPS // MODO SATELITAL
          </span>
          <span class="text-[10px] text-stone-500 hidden sm:inline">
            | SECTOR PROCEDURAL
          </span>
        </div>
      </div>

      <!-- Telemetría y Coordenadas -->
      <div class="hidden md:flex items-center gap-6 text-[11px] text-stone-400">
        <div>
          <span class="text-cyan-500">POSICIÓN:</span>
          <span class="text-stone-200 font-bold ml-1">X: {{ Math.round(playerX) }}, Z: {{ Math.round(playerZ) }}</span>
        </div>
        <div>
          <span class="text-cyan-500">CURSOR:</span>
          <span class="text-stone-200 font-bold ml-1">X: {{ Math.round(cursorX) }}, Z: {{ Math.round(cursorZ) }}</span>
        </div>
        <div>
          <span class="text-cyan-500">CHUNKS EXPLORADOS:</span>
          <span class="text-emerald-400 font-bold ml-1">{{ mapManager.unlockedChunks.size }}</span>
        </div>
        <div>
          <span class="text-cyan-500">ZOOM:</span>
          <span class="text-yellow-300 font-bold ml-1">{{ Math.round((zoom / 1.0) * 100) }}%</span>
        </div>
      </div>

      <!-- Botón de Cerrar -->
      <button
        type="button"
        class="px-3 py-1 bg-stone-900 border border-stone-700 hover:border-red-500 hover:bg-red-950/40 text-stone-300 hover:text-red-200 text-xs font-bold uppercase transition-colors flex items-center gap-1.5 cursor-pointer"
        @click="close"
      >
        <span>✕ CERRAR</span>
        <span class="text-[9px] text-stone-500 border border-stone-700 px-1 rounded-xxs">[ESC / M]</span>
      </button>
    </header>

    <!-- Área Principal del Canvas -->
    <div
      ref="containerRef"
      class="relative flex-1 w-full h-full overflow-hidden bg-[#06080c]"
    >
      <canvas
        ref="canvasRef"
        class="w-full h-full block cursor-grab active:cursor-grabbing"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseLeave"
        @wheel.passive="false"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      ></canvas>

      <!-- Brújula / Indicador de Norte en la esquina superior izquierda -->
      <div class="absolute top-4 left-4 z-10 bg-black/85 border border-cyan-500/40 p-2.5 rounded-xs flex flex-col items-center gap-1 shadow-lg pointer-events-none">
        <div class="w-7 h-7 rounded-full border border-cyan-500/30 flex items-center justify-center relative">
          <span class="text-red-500 font-bold text-xs -mt-0.5">▲</span>
          <span class="text-[8px] text-stone-400 absolute bottom-0.5">S</span>
        </div>
        <span class="text-[9px] font-bold text-cyan-300">NORTE</span>
      </div>

      <!-- Panel Flotante de Controles Genéricos (Zoom y Centrado) -->
      <div class="absolute top-4 right-4 z-10 flex flex-col gap-1.5 bg-black/90 border border-cyan-500/40 p-1.5 rounded-xs shadow-2xl">
        <button
          type="button"
          class="w-8 h-8 bg-stone-900 border border-stone-700 hover:border-cyan-400 hover:bg-cyan-950/60 text-cyan-300 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          title="Acercar Zoom (+)"
          @click="zoomIn"
        >
          +
        </button>
        <button
          type="button"
          class="w-8 h-8 bg-stone-900 border border-stone-700 hover:border-cyan-400 hover:bg-cyan-950/60 text-cyan-300 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          title="Alejar Zoom (-)"
          @click="zoomOut"
        >
          −
        </button>
        <div class="h-[1px] bg-stone-800 my-0.5"></div>
        <button
          type="button"
          class="w-8 h-8 bg-stone-900 border border-stone-700 hover:border-cyan-400 hover:bg-cyan-950/60 text-yellow-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          title="Centrar en tu posición"
          @click="centerOnPlayer"
        >
          🎯
        </button>
        <button
          type="button"
          class="w-8 h-8 bg-stone-900 border border-stone-700 hover:border-cyan-400 hover:bg-cyan-950/60 text-stone-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          title="Restablecer Vista"
          @click="resetView"
        >
          ⟲
        </button>
      </div>

      <!-- Barra de Escala Dinámica en la esquina inferior izquierda -->
      <div class="absolute bottom-4 left-4 z-10 bg-black/85 border border-cyan-500/30 px-3 py-1.5 rounded-xs shadow-lg flex flex-col gap-0.5 pointer-events-none">
        <div class="text-[9px] text-stone-400 flex justify-between">
          <span>0</span>
          <span>{{ scaleBarMeters }} m</span>
        </div>
        <div
          class="h-1 bg-cyan-400 border border-black shadow-[0_0_6px_#22d3ee]"
          :style="{ width: `${scaleBarPx}px` }"
        ></div>
        <div class="text-[8px] text-stone-500 mt-0.5">ESCALA GPS</div>
      </div>

      <!-- Leyenda Táctica del Mapa -->
      <div class="absolute bottom-4 right-4 z-10 bg-black/90 border border-cyan-500/30 px-3 py-2 rounded-xs shadow-xl hidden sm:flex flex-wrap items-center gap-4 text-[10px] text-stone-300 pointer-events-none">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-[#334155] border border-[#64748b]"></span>
          <span>Edificios</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-[#78350f] border border-[#1c1917]"></span>
          <span>Residencial</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-[#22252a] border border-[#383d47]"></span>
          <span>Asfalto</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-[#654f35]"></span>
          <span>Caminos</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-3 bg-[#f1f5f9] border border-[#b91c1c]"></span>
          <span>Gasolinera</span>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-cyan-400 font-bold text-xs">▲</span>
          <span class="text-cyan-300 font-bold">Tu Posición</span>
        </div>
      </div>

      <!-- Hint de Navegación con Mouse / Teclas -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/75 border border-stone-800 px-3 py-1 rounded-xs text-[10px] text-stone-400 pointer-events-none hidden md:block">
        Arrastra para navegar | Rueda del mouse para Zoom | ESC o M para cerrar
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import type { WorldGenerator } from '../../game/world/chunkGenerator';
import type { MapManager } from '../../game/map/mapManager';
import { sound } from '../../audio/soundEngine';

const props = defineProps<{
  playerX: number;
  playerZ: number;
  playerRot: number;
  generator?: WorldGenerator | null;
  mapManager: MapManager;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Coordenadas del centro de la cámara del mapa (en metros mundiales)
const viewX = ref(props.playerX);
const viewZ = ref(props.playerZ);

// Nivel de zoom (píxeles por metro)
const zoom = ref(1.0);
const MIN_ZOOM = 0.2; // Vista panorámica amplia
const MAX_ZOOM = 3.5; // Vista cercana detallada

// Coordenadas mundiales bajo el cursor
const cursorX = ref(props.playerX);
const cursorZ = ref(props.playerZ);

// Control de arrastre con mouse
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialViewX = 0;
let initialViewZ = 0;

// Control táctil (pinch zoom y arrastre)
let touchStartDist = 0;
let touchStartZoom = 1.0;

let animId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

// Escala gráfica dinámica
const scaleBarMeters = computed(() => {
  const targetPx = 100;
  const rawMeters = targetPx / zoom.value;
  // Redondear a números amigables (25, 50, 100, 200, 500, 1000)
  const steps = [10, 25, 50, 100, 200, 500, 1000];
  for (const s of steps) {
    if (s * zoom.value >= 60) return s;
  }
  return 1000;
});

const scaleBarPx = computed(() => {
  return Math.round(scaleBarMeters.value * zoom.value);
});

function close() {
  sound.playClick();
  emit('close');
}

function zoomIn() {
  sound.playClick();
  setZoom(zoom.value * 1.35);
}

function zoomOut() {
  sound.playClick();
  setZoom(zoom.value / 1.35);
}

function centerOnPlayer() {
  sound.playClick();
  viewX.value = props.playerX;
  viewZ.value = props.playerZ;
}

function resetView() {
  sound.playClick();
  zoom.value = 1.0;
  viewX.value = props.playerX;
  viewZ.value = props.playerZ;
}

function setZoom(targetZoom: number, focalScreenX?: number, focalScreenY?: number) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetZoom));
  if (Math.abs(newZoom - zoom.value) < 1e-4) return;

  const rect = canvas.getBoundingClientRect();
  const screenX = focalScreenX ?? (rect.left + rect.width / 2);
  const screenY = focalScreenY ?? (rect.top + rect.height / 2);

  const localX = screenX - rect.left - rect.width / 2;
  const localY = screenY - rect.top - rect.height / 2;

  // Coordenada del mundo bajo el punto focal
  const worldX = viewX.value + localX / zoom.value;
  const worldZ = viewZ.value + localY / zoom.value;

  // Ajustar centro para mantener el punto focal estacionario
  viewX.value = worldX - localX / newZoom;
  viewZ.value = worldZ - localY / newZoom;
  zoom.value = newZoom;
}

// --- Eventos de Mouse ---

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0 && e.button !== 1) return;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  initialViewX = viewX.value;
  initialViewZ = viewZ.value;
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const localX = e.clientX - rect.left - rect.width / 2;
  const localY = e.clientY - rect.top - rect.height / 2;

  cursorX.value = viewX.value + localX / zoom.value;
  cursorZ.value = viewZ.value + localY / zoom.value;

  if (isDragging) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    viewX.value = initialViewX - dx / zoom.value;
    viewZ.value = initialViewZ - dy / zoom.value;
  }
}

function onMouseUp() {
  isDragging = false;
}

function onMouseLeave() {
  isDragging = false;
}

function onWheel(e: WheelEvent) {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.2 : 0.833;
  setZoom(zoom.value * factor, e.clientX, e.clientY);
}

// --- Eventos Táctiles (Móvil) ---

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isDragging = true;
    dragStartX = e.touches[0].clientX;
    dragStartY = e.touches[0].clientY;
    initialViewX = viewX.value;
    initialViewZ = viewZ.value;
  } else if (e.touches.length === 2) {
    isDragging = false;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchStartDist = Math.hypot(dx, dy);
    touchStartZoom = zoom.value;
  }
}

function onTouchMove(e: TouchEvent) {
  if (e.touches.length === 1 && isDragging) {
    const dx = e.touches[0].clientX - dragStartX;
    const dy = e.touches[0].clientY - dragStartY;
    viewX.value = initialViewX - dx / zoom.value;
    viewZ.value = initialViewZ - dy / zoom.value;
  } else if (e.touches.length === 2 && touchStartDist > 0) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    setZoom((touchStartZoom * dist) / touchStartDist, midX, midY);
  }
}

function onTouchEnd() {
  isDragging = false;
  touchStartDist = 0;
}

// --- Redibujado del Canvas ---

function render() {
  const canvas = canvasRef.value;
  if (!canvas || !props.generator) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  props.mapManager.drawMap(
    ctx,
    canvas.width,
    canvas.height,
    viewX.value,
    viewZ.value,
    zoom.value,
    props.generator,
    props.playerX,
    props.playerZ,
    props.playerRot,
  );
}

function loop() {
  render();
  animId = requestAnimationFrame(loop);
}

function updateCanvasSize() {
  if (!canvasRef.value || !containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  canvasRef.value.width = Math.floor(rect.width);
  canvasRef.value.height = Math.floor(rect.height);
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'm' || e.key === 'M') {
    close();
  }
}

onMounted(() => {
  updateCanvasSize();
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(containerRef.value);
  }
  if (canvasRef.value) {
    canvasRef.value.addEventListener('wheel', onWheel, { passive: false });
  }
  window.addEventListener('keydown', handleKey);
  animId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  if (animId !== null) cancelAnimationFrame(animId);
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('wheel', onWheel);
  }
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', handleKey);
});
</script>
