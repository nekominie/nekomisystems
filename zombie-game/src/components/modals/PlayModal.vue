<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
    <!-- Steel Bunker Container -->
    <div class="relative w-full max-w-2xl steel-panel rounded-sm overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
      <!-- Rivets -->
      <span class="rivet absolute top-3 left-3"></span>
      <span class="rivet absolute top-3 right-3"></span>
      <span class="rivet absolute bottom-3 left-3"></span>
      <span class="rivet absolute bottom-3 right-3"></span>

      <!-- Hazard Header Strip -->
      <div class="hazard-stripes-blood h-2 -mx-8 -mt-8 mb-6"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-stone-700/80 mb-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xs bg-red-950 border border-red-600/70 flex items-center justify-center text-red-400">
            <i class="bi bi-play-circle-fill text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white font-['Black_Ops_One']">
              DESPLIEGUE // INICIAR JUEGO
            </h2>
            <p class="text-xs font-mono text-red-400/90 tracking-wide uppercase">
              SELECCIONA MODO DE SUPERVIVENCIA ISOMÉTRICA
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

      <!-- Mode Selection Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div
          v-for="mode in modes"
          :key="mode.id"
          :class="[
            'cursor-pointer p-4 rounded-xs border transition-all text-left relative overflow-hidden flex flex-col justify-between',
            selectedMode === mode.id
              ? 'bg-red-950/60 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
              : 'bg-[#12151c] border-stone-700/80 hover:border-stone-500'
          ]"
          @click="selectMode(mode.id)"
        >
          <div v-if="selectedMode === mode.id" class="absolute top-0 right-0 w-8 h-8 bg-red-600 text-white flex items-center justify-center text-xs">
            <i class="bi bi-check-lg"></i>
          </div>

          <div>
            <div class="text-2xl mb-2" :class="selectedMode === mode.id ? 'text-red-400' : 'text-stone-400'">
              <i :class="mode.icon"></i>
            </div>
            <h3 class="font-bold text-base uppercase tracking-wider text-white mb-1">
              {{ mode.name }}
            </h3>
            <p class="text-[11px] font-mono text-stone-400 leading-relaxed">
              {{ mode.description }}
            </p>
          </div>

          <div class="mt-4 pt-2 border-t border-stone-800 text-[10px] font-mono uppercase text-stone-500 flex justify-between">
            <span>Dificultad:</span>
            <span :class="mode.difficultyColor" class="font-bold">{{ mode.difficulty }}</span>
          </div>
        </div>
      </div>

      <!-- Survivor Configuration Summary -->
      <div class="bg-black/60 border border-stone-800 p-4 rounded-xs mb-6">
        <div class="flex items-center justify-between text-xs font-mono text-stone-400 mb-2">
          <span class="uppercase tracking-widest text-stone-300 font-bold flex items-center gap-2">
            <i class="bi bi-person-badge text-red-500"></i> PERFIL SUPERVIVIENTE ACTIVO:
          </span>
          <span class="text-red-400 font-bold">ESTADO: INMUNE</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div class="bg-[#151922] p-2 border border-stone-800">
            <span class="text-stone-500 block text-[10px]">ROL</span>
            <span class="text-stone-200 font-bold">MECÁNICO // CHUCK</span>
          </div>
          <div class="bg-[#151922] p-2 border border-stone-800">
            <span class="text-stone-500 block text-[10px]">ARMA PRINCIPAL</span>
            <span class="text-stone-200 font-bold">PALANCA DE HIERRO</span>
          </div>
          <div class="bg-[#151922] p-2 border border-stone-800">
            <span class="text-stone-500 block text-[10px]">PUNTO SPAWN</span>
            <span class="text-stone-200 font-bold">TALLER INDUSTRIAL</span>
          </div>
          <div class="bg-[#151922] p-2 border border-stone-800">
            <span class="text-stone-500 block text-[10px]">CLIMA</span>
            <span class="text-stone-200 font-bold">LLUVIA ÁCIDA</span>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-stone-800">
        <button
          type="button"
          class="steel-btn w-full sm:w-auto px-6 py-3 text-xs uppercase font-mono tracking-wider font-bold text-stone-300 hover:text-white"
          @click="close"
        >
          Cancelar
        </button>

        <button
          type="button"
          class="play-btn-prominent w-full sm:w-auto px-8 py-3.5 text-sm uppercase font-extrabold tracking-widest text-white flex items-center justify-center gap-2.5 font-['Black_Ops_One']"
          @click="startDemo"
        >
          <i class="bi bi-crosshair2 text-lg text-red-300"></i>
          <span>PROBAR PROTOTIPO ISOMÉTRICO</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { sound } from '../../audio/soundEngine';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'launch-demo'): void;
}>();

const selectedMode = ref('survival');

const modes = [
  {
    id: 'survival',
    name: 'Supervivencia',
    icon: 'bi bi-shield-shaded',
    description: 'Estilo Zomboid clásico. Busca suministros, mantén el sigilo y sobrevive a la noche.',
    difficulty: 'EXTREMA',
    difficultyColor: 'text-red-400',
  },
  {
    id: 'horde',
    name: 'Horda Continua',
    icon: 'bi bi-fire',
    description: 'Oleadas implacables de no-muertos. Fortifica las defensas de tu almacén.',
    difficulty: 'PESADILLA',
    difficultyColor: 'text-orange-400',
  },
  {
    id: 'sandbox',
    name: 'Modo Sandbox',
    icon: 'bi bi-sliders2-vertical',
    description: 'Configuración libre de tasa de infección, densidad de zombis y botín ilimitado.',
    difficulty: 'PERSONALIZADA',
    difficultyColor: 'text-yellow-400',
  },
];

function selectMode(id: string) {
  selectedMode.value = id;
  sound.playClick();
}

function close() {
  sound.playClick();
  emit('close');
}

function startDemo() {
  sound.playPlayClick();
  emit('launch-demo');
}
</script>
