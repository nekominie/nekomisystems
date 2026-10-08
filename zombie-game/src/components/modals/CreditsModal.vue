<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div class="relative w-full max-w-xl steel-panel rounded-sm overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
      <!-- Rivets -->
      <span class="rivet absolute top-3 left-3"></span>
      <span class="rivet absolute top-3 right-3"></span>
      <span class="rivet absolute bottom-3 left-3"></span>
      <span class="rivet absolute bottom-3 right-3"></span>

      <!-- Hazard Header Strip -->
      <div class="hazard-stripes-blood h-2 -mx-8 -mt-8 mb-6"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-stone-700/80 mb-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xs bg-stone-900 border border-stone-600 flex items-center justify-center text-red-500">
            <i class="bi bi-award-fill text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white font-['Black_Ops_One']">
              CRÉDITOS // MANIFIESTO
            </h2>
            <p class="text-xs font-mono text-stone-400 tracking-wide uppercase">
              DESARROLLO Y TRIBUTO DE SUPERVIVENCIA
            </p>
          </div>
        </div>

        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center bg-stone-900 border border-stone-700 text-stone-400 hover:text-white hover:border-red-600 transition-colors rounded-xs cursor-pointer"
          @click="close"
        >
          <i class="bi bi-x-lg text-lg"></i>
        </button>
      </div>

      <!-- Credit Entries -->
      <div class="space-y-4 mb-6">
        <div class="bg-black/50 p-3 rounded-xs border border-stone-800">
          <span class="text-[10px] font-mono text-stone-500 uppercase block">DESARROLLO & CONCEPTO</span>
          <h3 class="text-base font-mono font-bold text-stone-100 flex items-center gap-2">
            <span>NekomiSystems</span>
            <span class="text-xs text-red-500 font-mono">[2026]</span>
          </h3>
          <p class="text-xs font-mono text-stone-400 mt-1">
            Prototipo de supervivencia zombi isométrica con estética industrial bunker y ambientación visceral.
          </p>
        </div>

        <div class="bg-black/50 p-3 rounded-xs border border-stone-800">
          <span class="text-[10px] font-mono text-stone-500 uppercase block">INSPIRACIÓN PRINCIPAL</span>
          <h3 class="text-sm font-mono font-bold text-stone-200">
            Project Zomboid & Survival Horror Clásico
          </h3>
          <p class="text-xs font-mono text-stone-400 mt-1">
            Mecánicas de sigilo, campos de visión isométricos, gestión de peso corporal y atmósfera opresiva.
          </p>
        </div>

        <div class="bg-black/50 p-3 rounded-xs border border-stone-800">
          <span class="text-[10px] font-mono text-stone-500 uppercase block">TECNOLOGÍA</span>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <span class="px-2 py-0.5 bg-stone-900 border border-stone-700 text-[11px] font-mono text-stone-300">Vite Multi-Page</span>
            <span class="px-2 py-0.5 bg-stone-900 border border-stone-700 text-[11px] font-mono text-stone-300">Vue 3 + TypeScript</span>
            <span class="px-2 py-0.5 bg-stone-900 border border-stone-700 text-[11px] font-mono text-stone-300">Web Audio API Synth</span>
            <span class="px-2 py-0.5 bg-stone-900 border border-stone-700 text-[11px] font-mono text-stone-300">Tailwind CSS</span>
            <span class="px-2 py-0.5 bg-stone-900 border border-stone-700 text-[11px] font-mono text-stone-300">HTML5 Canvas</span>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-between pt-4 border-t border-stone-800">
        <a
          href="/"
          class="text-xs font-mono text-stone-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <i class="bi bi-arrow-left"></i>
          <span>Volver al portal NekomiSystems</span>
        </a>

        <button
          type="button"
          class="steel-btn px-6 py-2.5 text-xs uppercase font-mono tracking-wider font-bold text-stone-200 hover:text-white"
          @click="close"
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { sound } from '../../audio/soundEngine';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function close() {
  sound.playClick();
  emit('close');
}
</script>
