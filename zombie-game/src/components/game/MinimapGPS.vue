<template>
  <div class="relative group select-none pointer-events-auto">
    <!-- Bisel industrial: chapa metálica en degradado con remaches -->
    <div
      class="relative p-[7px] rounded-xs bg-gradient-to-b from-stone-600 via-stone-800 to-black border border-black shadow-[0_6px_28px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)]"
    >
      <!-- Remaches de esquina -->
      <div class="absolute top-[2px] left-[2px] w-1.5 h-1.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d6d3d1,#44403c_70%)] pointer-events-none"></div>
      <div class="absolute top-[2px] right-[2px] w-1.5 h-1.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d6d3d1,#44403c_70%)] pointer-events-none"></div>
      <div class="absolute bottom-[2px] left-[2px] w-1.5 h-1.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d6d3d1,#44403c_70%)] pointer-events-none"></div>
      <div class="absolute bottom-[2px] right-[2px] w-1.5 h-1.5 rounded-full bg-[radial-gradient(circle_at_35%_30%,#d6d3d1,#44403c_70%)] pointer-events-none"></div>

      <!-- Marco interior -->
      <div
        class="relative w-[210px] h-[210px] bg-[#07090e] border border-stone-600 rounded-xs shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)] overflow-hidden cursor-pointer transition-colors duration-200 group-hover:border-amber-500/70"
        @click="handleClick"
        title="Clic para abrir el Mapa Completo interactivo [M]"
      >
        <!-- Bisel metálico flotante -->
        <div class="absolute inset-0 border border-white/10 pointer-events-none rounded-xs z-10"></div>

      <!-- Barra Superior: Estado, Coordenadas y Brújula -->
      <div class="absolute top-0 inset-x-0 h-6 bg-gradient-to-b from-stone-800 to-black/90 border-b border-stone-700 px-2 flex items-center justify-between z-10 font-mono text-[9px]">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#fbbf24]"></span>
          <span class="font-bold tracking-wider text-stone-200">GPS NAV</span>
        </div>
        <div class="text-[8px] text-stone-400 tracking-tight font-mono">
          <span class="text-stone-500">X:</span>{{ Math.round(playerX) }}
          <span class="text-stone-500 ml-1">Z:</span>{{ Math.round(playerZ) }}
        </div>
        <div class="flex items-center gap-0.5 font-bold text-amber-200 text-[9px]">
          <span class="text-red-400 text-[7px]">▲</span>N
        </div>
      </div>

      <!-- Canvas 2D del Minimapa -->
      <canvas
        ref="canvasRef"
        :width="canvasSize"
        :height="canvasSize"
        class="w-full h-full block"
      ></canvas>

      <!-- Retícula / Anillos de Distancia -->
      <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <!-- Anillo de 50 metros (~55px radio a zoom 1.1) -->
        <div class="w-[110px] h-[110px] rounded-full border border-amber-500/20 pointer-events-none shadow-[inset_0_0_18px_rgba(245,158,11,0.06)]"></div>
        <!-- Ejes tenues -->
        <div class="absolute top-6 bottom-5 left-1/2 w-[1px] bg-stone-400/15 pointer-events-none"></div>
        <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-stone-400/15 pointer-events-none"></div>
      </div>

      <!-- Esquinas metálicas (como los slots del inventario) -->
      <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40 pointer-events-none"></div>
      <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/40 pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/40 pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/40 pointer-events-none"></div>

      <!-- Barra Inferior: Escala y Botón de Expandir -->
      <div class="absolute bottom-0 inset-x-0 h-5 bg-gradient-to-t from-stone-800 to-black/90 border-t border-stone-700 px-2 flex items-center justify-between z-10 font-mono text-[8px] text-stone-400">
        <div class="flex items-center gap-1">
          <span class="w-4 h-[2px] bg-amber-400 inline-block shadow-[0_0_4px_rgba(251,191,36,0.7)]"></span>
          <span class="text-amber-300 font-bold">50m</span>
        </div>
        <div class="text-stone-300 group-hover:text-amber-200 transition-colors flex items-center gap-1 font-bold">
          <span>EXPANDIR</span>
          <span class="px-1 py-0.2 bg-stone-800 text-amber-300 rounded-xxs border border-stone-700 text-[7px]">[M]</span>
        </div>
      </div>

        <!-- Superposición de Hover con Hint de Pantalla Completa -->
        <div class="absolute inset-0 bg-amber-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
          <div class="bg-black/90 border border-amber-500 px-2.5 py-1 text-[10px] font-mono text-amber-200 tracking-wider flex items-center gap-1.5 shadow-xl">
            <i class="bi bi-arrows-fullscreen text-amber-400"></i>
            <span class="font-bold">VER MAPA</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import type { WorldGenerator } from '../../game/world/chunkGenerator';
import type { MapManager } from '../../game/map/mapManager';
import { sound } from '../../audio/soundEngine';

const props = defineProps<{
  playerX: number;
  playerZ: number;
  playerRot: number;
  generator?: WorldGenerator | null;
  mapManager: MapManager;
  clock?: string;
  isNight?: boolean;
}>();

const emit = defineEmits<{
  (e: 'openFullMap'): void;
}>();

const canvasSize = 210;
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animFrameId: number | null = null;
const ZOOM = 1.15; // Píxeles por metro (~180m de área visible)

function handleClick() {
  sound.playClick();
  emit('openFullMap');
}

function render() {
  if (!canvasRef.value || !props.generator) return;
  const ctx = canvasRef.value.getContext('2d');
  if (!ctx) return;

  props.mapManager.drawMap(
    ctx,
    canvasSize,
    canvasSize,
    props.playerX,
    props.playerZ,
    ZOOM,
    props.generator,
    props.playerX,
    props.playerZ,
    props.playerRot,
  );
}

// Bucle de renderizado del minimapa (sincronizado con requestAnimationFrame)
function loop() {
  render();
  animFrameId = requestAnimationFrame(loop);
}

onMounted(() => {
  animFrameId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
  }
});
</script>
