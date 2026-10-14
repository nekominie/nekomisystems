<template>
  <div class="relative group select-none pointer-events-auto">
    <!-- Marco Exterior Cuadrado Estilo Navegador GPS con Bordes Delgados -->
    <div
      class="relative w-[210px] h-[210px] bg-[#07090e] border border-cyan-500/60 rounded-xs shadow-[0_4px_25px_rgba(0,0,0,0.85),inset_0_0_15px_rgba(6,182,212,0.06)] overflow-hidden cursor-pointer transition-all duration-200 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]"
      @click="handleClick"
      title="Clic para abrir el Mapa Completo interactivo [M]"
    >
      <!-- Barra Superior del GPS: Estado, Coordenadas y Brújula -->
      <div class="absolute top-0 inset-x-0 h-6 bg-black/85 border-b border-cyan-500/30 px-2 flex items-center justify-between z-10 font-mono text-[9px] text-cyan-300">
        <div class="flex items-center gap-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]"></span>
          <span class="font-bold tracking-wider text-emerald-400">GPS NAV</span>
        </div>
        <div class="text-[8px] text-stone-300 tracking-tight font-mono">
          <span class="text-stone-500">X:</span>{{ Math.round(playerX) }}
          <span class="text-stone-500 ml-1">Z:</span>{{ Math.round(playerZ) }}
        </div>
        <div class="flex items-center gap-0.5 font-bold text-cyan-200 text-[9px]">
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

      <!-- Retícula / Anillos de Distancia GPS -->
      <div class="absolute inset-0 pointer-events-none flex items-center justify-center">
        <!-- Anillo de 50 metros (~55px radio a zoom 1.1) -->
        <div class="w-[110px] h-[110px] rounded-full border border-cyan-500/15 pointer-events-none"></div>
        <!-- Ejes tenues -->
        <div class="absolute top-6 bottom-5 left-1/2 w-[1px] bg-cyan-400/10 pointer-events-none"></div>
        <div class="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400/10 pointer-events-none"></div>
      </div>

      <!-- Esquinas Decorativas de Navegador Táctico (Bordes Delgados) -->
      <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-300 pointer-events-none"></div>
      <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-300 pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-300 pointer-events-none"></div>
      <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-300 pointer-events-none"></div>

      <!-- Barra Inferior del GPS: Escala y Botón de Expandir -->
      <div class="absolute bottom-0 inset-x-0 h-5 bg-black/85 border-t border-cyan-500/30 px-2 flex items-center justify-between z-10 font-mono text-[8px] text-stone-400">
        <div class="flex items-center gap-1">
          <span class="w-4 h-[2px] bg-cyan-400 inline-block"></span>
          <span class="text-cyan-300 font-bold">50m</span>
        </div>
        <div class="text-stone-300 group-hover:text-cyan-200 transition-colors flex items-center gap-1 font-bold">
          <span>EXPANDIR</span>
          <span class="px-1 py-0.2 bg-stone-800 text-cyan-300 rounded-xxs border border-stone-700 text-[7px]">[M]</span>
        </div>
      </div>

      <!-- Superposición de Hover con Hint de Pantalla Completa -->
      <div class="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-20">
        <div class="bg-black/90 border border-cyan-400 px-2.5 py-1 text-[10px] font-mono text-cyan-200 tracking-wider flex items-center gap-1.5 shadow-xl">
          <i class="bi bi-arrows-fullscreen text-cyan-400"></i>
          <span class="font-bold">VER MAPA</span>
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
