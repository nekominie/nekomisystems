<template>
  <div
    v-if="item"
    class="flex items-center space-x-2 p-2 sm:p-2.5 rounded-2xl bg-[#090c12]/80 backdrop-blur-2xl border border-cyan-400/40 shadow-[0_15px_40px_rgba(0,0,0,0.6),0_0_20px_rgba(13,240,212,0.15)] animate-appear"
  >
    <!-- Item info pill -->
    <div class="px-3 py-1 rounded-xl bg-white/[0.05] border border-white/10 hidden sm:flex items-center space-x-2 text-xs font-mono">
      <span
        class="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
        :style="{ backgroundColor: SHAPE_TONES[item.type]?.hex || '#0df0d4' }"
      ></span>
      <span class="text-white font-medium">{{ item.name }}</span>
      <span v-if="SHAPE_TONES[item.type]" class="text-[10px] text-white/40 tracking-wider">
        ({{ SHAPE_TONES[item.type].toneName }})
      </span>
    </div>

    <!-- Transform Modes -->
    <div class="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 space-x-1">
      <button
        type="button"
        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center space-x-1.5"
        :class="[
          activeMode === 'translate'
            ? 'bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(13,240,212,0.5)]'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ]"
        title="Modo Mover (Posicionar en X, Y, Z)"
        @click="emit('set-mode', 'translate')"
      >
        <i class="bi bi-arrows-move"></i>
        <span class="hidden md:inline">Mover</span>
      </button>

      <button
        type="button"
        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center space-x-1.5"
        :class="[
          activeMode === 'rotate'
            ? 'bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(13,240,212,0.5)]'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ]"
        title="Modo Rotar (Girar pieza)"
        @click="emit('set-mode', 'rotate')"
      >
        <i class="bi bi-arrow-repeat"></i>
        <span class="hidden md:inline">Rotar</span>
      </button>

      <button
        type="button"
        class="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center space-x-1.5"
        :class="[
          activeMode === 'scale'
            ? 'bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(13,240,212,0.5)]'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ]"
        title="Modo Escalar (Estirar, ensanchar o agrandar)"
        @click="emit('set-mode', 'scale')"
      >
        <i class="bi bi-arrows-angle-expand"></i>
        <span class="hidden md:inline">Estirar</span>
      </button>
    </div>

    <!-- Snap to grid toggle -->
    <button
      type="button"
      class="px-2.5 py-1.5 rounded-xl text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center space-x-1"
      :class="[
        snapEnabled
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
          : 'bg-white/[0.04] text-white/50 border border-white/10 hover:text-white hover:bg-white/10',
      ]"
      title="Ajuste magnético a la cuadrícula (0.5m / 15°)"
      @click="emit('toggle-snap')"
    >
      <i class="bi bi-magnet"></i>
      <span class="hidden lg:inline text-[11px]">Snap</span>
    </button>

    <!-- Mill only: reverse the turning direction of the scoops -->
    <button
      v-if="item.type === 'spinner_wheel'"
      type="button"
      class="px-2.5 py-1.5 rounded-xl text-xs font-mono tracking-wider transition-all duration-200 cursor-pointer flex items-center space-x-1.5"
      :class="[
        spinReversed
          ? 'bg-amber-400 text-black font-bold shadow-[0_0_12px_rgba(251,191,36,0.5)] border border-amber-300'
          : 'bg-white/[0.04] text-white/70 border border-white/10 hover:text-white hover:bg-white/10',
      ]"
      :title="spinReversed ? 'Giro invertido: clic para restaurar el sentido original' : 'Invertir el sentido de giro de las cucharas'"
      :aria-pressed="spinReversed"
      @click="emit('toggle-spin')"
    >
      <i class="bi bi-arrow-left-right"></i>
      <span class="hidden md:inline text-[11px]">{{ spinReversed ? 'Giro invertido' : 'Invertir giro' }}</span>
    </button>

    <!-- Duplicate & Delete Actions -->
    <div class="flex items-center space-x-1 pl-1 border-l border-white/10">
      <button
        type="button"
        class="p-1.5 px-2 rounded-xl text-xs font-mono text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="Duplicar pieza"
        @click="emit('duplicate')"
      >
        <i class="bi bi-copy"></i>
      </button>

      <button
        type="button"
        class="p-1.5 px-2 rounded-xl text-xs font-mono text-rose-400/70 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
        title="Eliminar pieza"
        @click="emit('delete')"
      >
        <i class="bi bi-trash3"></i>
      </button>

      <button
        type="button"
        class="p-1.5 px-2 rounded-xl text-xs font-mono text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="Deseleccionar"
        @click="emit('deselect')"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SHAPE_TONES, type SandboxItem } from '../../utils/sandboxPhysics';

defineProps<{
  item: SandboxItem | null;
  activeMode: 'translate' | 'rotate' | 'scale';
  snapEnabled: boolean;
  spinReversed?: boolean;
}>();

const emit = defineEmits<{
  (e: 'set-mode', mode: 'translate' | 'rotate' | 'scale'): void;
  (e: 'toggle-snap'): void;
  (e: 'toggle-spin'): void;
  (e: 'duplicate'): void;
  (e: 'delete'): void;
  (e: 'deselect'): void;
}>();
</script>

<style scoped>
@keyframes appear {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.animate-appear {
  animation: appear 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
