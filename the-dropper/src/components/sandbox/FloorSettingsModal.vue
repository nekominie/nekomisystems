<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 scale-95 translate-y-2"
    enter-to-class="opacity-100 scale-100 translate-y-0"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 scale-100 translate-y-0"
    leave-to-class="opacity-0 scale-95 translate-y-2"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full max-w-lg rounded-3xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-5 sm:p-6 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_30px_rgba(13,240,212,0.15)] flex flex-col space-y-5 text-white animate-appear"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div class="flex items-center space-x-2.5">
            <span class="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#0df0d4]"></span>
            <div>
              <h2 class="text-sm sm:text-base font-semibold tracking-wider uppercase font-mono text-white">
                DIMENSIONES DEL SUELO
              </h2>
              <p class="text-[10px] font-mono text-cyan-400 tracking-wide uppercase">
                GEOMETRÍA Y LÍMITES DEL ESCENARIO
              </p>
            </div>
          </div>

          <button
            type="button"
            class="p-1.5 px-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white/70 hover:text-rose-300 transition-colors cursor-pointer text-xs flex items-center space-x-1"
            @click="emit('close')"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Mode Segmented Control: Plataforma vs Suelo Infinito -->
        <div class="grid grid-cols-2 p-1 rounded-2xl bg-black/50 border border-white/10 text-xs font-mono">
          <button
            type="button"
            class="py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
            :class="[
              !config.isInfinite
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-400/40 shadow-[0_0_15px_rgba(13,240,212,0.2)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            ]"
            @click="setInfinite(false)"
          >
            <i class="bi bi-bounding-box text-sm"></i>
            <span>Plataforma Delimitada</span>
          </button>

          <button
            type="button"
            class="py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2"
            :class="[
              config.isInfinite
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/40 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            ]"
            @click="setInfinite(true)"
          >
            <i class="bi bi-infinity text-sm"></i>
            <span>Suelo Infinito</span>
          </button>
        </div>

        <!-- Option A: Plataforma Delimitada (Manual Resizing Controls) -->
        <div v-if="!config.isInfinite" class="flex flex-col space-y-4">
          <!-- Width Slider (Axis X) -->
          <div class="flex flex-col space-y-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-white/70 flex items-center space-x-1.5">
                <i class="bi bi-arrows"></i>
                <span>Ancho (Eje X):</span>
              </span>
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] cursor-pointer"
                  @click="adjustDimension('width', -2)"
                >
                  -2m
                </button>
                <strong class="text-cyan-300 font-bold text-sm min-w-[50px] text-center">
                  {{ config.width }} m
                </strong>
                <button
                  type="button"
                  class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] cursor-pointer"
                  @click="adjustDimension('width', 2)"
                >
                  +2m
                </button>
              </div>
            </div>

            <input
              type="range"
              min="6"
              max="120"
              step="1"
              :value="config.width"
              class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              @input="onWidthInput"
            />
          </div>

          <!-- Depth Slider (Axis Z) -->
          <div class="flex flex-col space-y-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-white/70 flex items-center space-x-1.5">
                <i class="bi bi-arrows-vertical"></i>
                <span>Largo (Eje Z):</span>
              </span>
              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] cursor-pointer"
                  @click="adjustDimension('depth', -2)"
                >
                  -2m
                </button>
                <strong class="text-cyan-300 font-bold text-sm min-w-[50px] text-center">
                  {{ config.depth }} m
                </strong>
                <button
                  type="button"
                  class="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] cursor-pointer"
                  @click="adjustDimension('depth', 2)"
                >
                  +2m
                </button>
              </div>
            </div>

            <input
              type="range"
              min="6"
              max="120"
              step="1"
              :value="config.depth"
              class="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              @input="onDepthInput"
            />
          </div>

          <!-- Quick Presets -->
          <div class="flex flex-col space-y-1.5">
            <span class="text-[10px] font-mono uppercase tracking-wider text-white/50">
              PRESETS RÁPIDOS
            </span>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-2">
              <button
                v-for="preset in PRESETS"
                :key="preset.label"
                type="button"
                class="py-2 px-1.5 rounded-xl border text-[11px] font-mono tracking-wider transition-all duration-200 cursor-pointer flex flex-col items-center justify-center space-y-0.5"
                :class="[
                  config.width === preset.w && config.depth === preset.d
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_12px_rgba(13,240,212,0.3)]'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-white/70 hover:text-white'
                ]"
                @click="applyPreset(preset.w, preset.d)"
              >
                <span>{{ preset.label }}</span>
                <span class="text-[9px] text-white/40">{{ preset.w }}×{{ preset.d }}m</span>
              </button>
            </div>
          </div>

          <!-- 3D Interactive Stretch Button -->
          <div class="pt-2 border-t border-white/10 flex items-center justify-between">
            <button
              type="button"
              class="w-full py-2.5 px-4 rounded-xl text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center space-x-2 border"
              :class="[
                isGizmoActive
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-white/10 hover:bg-white/15 text-white/90 border-white/10'
              ]"
              @click="emit('toggle-gizmo')"
            >
              <i class="bi" :class="isGizmoActive ? 'bi-check-circle-fill text-amber-400' : 'bi-arrows-fullscreen'"></i>
              <span>{{ isGizmoActive ? 'Desactivar Estiramiento 3D' : 'Estirar Manualmente con Gizmo 3D' }}</span>
            </button>
          </div>
        </div>

        <!-- Option B: Suelo Infinito Info Banner -->
        <div v-else class="flex flex-col space-y-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30">
          <div class="flex items-start space-x-3">
            <i class="bi bi-infinity text-2xl text-emerald-400 shrink-0 mt-0.5"></i>
            <div class="flex flex-col space-y-1">
              <h3 class="text-xs font-bold font-mono text-emerald-300 uppercase tracking-wider">
                Plano Continuo Infinito Habilitado
              </h3>
              <p class="text-[11px] font-mono text-white/70 leading-relaxed">
                El suelo de concreto se extiende 1.8 kilómetros en todas direcciones hasta la niebla del horizonte.
                Las esferas y piezas nunca caerán al vacío y continuarán interactuando por todo el plano de simulación.
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-emerald-400/20">
            <span class="text-[10px] font-mono text-emerald-300/80 uppercase">
              Texturizado con losas modulares continuas
            </span>
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white cursor-pointer transition-colors"
              @click="setInfinite(false)"
            >
              Restaurar Plataforma 18×18m
            </button>
          </div>
        </div>

      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import type { PlatformConfig } from '../../utils/sandboxPhysics';
import { sound } from '../../utils/sound';

const props = defineProps<{
  isOpen: boolean;
  config: PlatformConfig;
  isGizmoActive: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update-config', config: PlatformConfig): void;
  (e: 'toggle-gizmo'): void;
}>();

const PRESETS = [
  { label: 'Compacto', w: 12, d: 12 },
  { label: 'Estándar', w: 18, d: 18 },
  { label: 'Amplio', w: 32, d: 32 },
  { label: 'Pasarela', w: 48, d: 14 },
  { label: 'Estadio', w: 75, d: 75 },
];

function setInfinite(infinite: boolean) {
  emit('update-config', {
    width: props.config.width || 18,
    depth: props.config.depth || 18,
    isInfinite: infinite,
  });
  sound.playClick(0.08);
}

function onWidthInput(event: Event) {
  const val = Number((event.target as HTMLInputElement).value);
  emit('update-config', {
    width: val,
    depth: props.config.depth,
    isInfinite: false,
  });
}

function onDepthInput(event: Event) {
  const val = Number((event.target as HTMLInputElement).value);
  emit('update-config', {
    width: props.config.width,
    depth: val,
    isInfinite: false,
  });
}

function adjustDimension(axis: 'width' | 'depth', delta: number) {
  const newW = axis === 'width' ? Math.max(6, Math.min(120, props.config.width + delta)) : props.config.width;
  const newD = axis === 'depth' ? Math.max(6, Math.min(120, props.config.depth + delta)) : props.config.depth;
  emit('update-config', {
    width: newW,
    depth: newD,
    isInfinite: false,
  });
  sound.playClick(0.04);
}

function applyPreset(w: number, d: number) {
  emit('update-config', {
    width: w,
    depth: d,
    isInfinite: false,
  });
  sound.playClick(0.08);
}
</script>

<style scoped>
@keyframes appear {
  0% {
    opacity: 0;
    transform: scale(0.96) translateY(6px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-appear {
  animation: appear 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
