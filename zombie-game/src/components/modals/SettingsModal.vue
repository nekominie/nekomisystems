<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div class="relative w-full max-w-2xl steel-panel rounded-sm overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
      <!-- Rivets -->
      <span class="rivet absolute top-3 left-3"></span>
      <span class="rivet absolute top-3 right-3"></span>
      <span class="rivet absolute bottom-3 left-3"></span>
      <span class="rivet absolute bottom-3 right-3"></span>

      <!-- Hazard Header Strip -->
      <div class="hazard-stripes h-2 -mx-8 -mt-8 mb-6"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-stone-700/80 mb-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xs bg-stone-900 border border-stone-600 flex items-center justify-center text-yellow-500">
            <i class="bi bi-gear-wide-connected text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white font-['Black_Ops_One']">
              AJUSTES // SISTEMA
            </h2>
            <p class="text-xs font-mono text-stone-400 tracking-wide uppercase">
              PARÁMETROS DE AUDIO, GRÁFICOS Y SUPERVIVENCIA
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

      <!-- Category Tabs -->
      <div class="flex gap-2 mb-6 border-b border-stone-800 pb-2">
        <button
          v-for="tab in ['audio', 'graphics', 'controls']"
          :key="tab"
          type="button"
          :class="[
            'px-4 py-2 font-mono text-xs uppercase font-bold tracking-wider rounded-xs transition-colors cursor-pointer flex items-center gap-2',
            activeTab === tab
              ? 'bg-stone-800 text-red-400 border-b-2 border-red-500'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          ]"
          @click="setTab(tab)"
        >
          <i
            :class="[
              tab === 'audio' ? 'bi bi-volume-up-fill' : '',
              tab === 'graphics' ? 'bi bi-display-fill' : '',
              tab === 'controls' ? 'bi bi-controller' : '',
            ]"
          ></i>
          <span>{{ tab === 'audio' ? 'Audio' : tab === 'graphics' ? 'Gráficos & Gore' : 'Controles' }}</span>
        </button>
      </div>

      <!-- Tab 1: Audio -->
      <div v-if="activeTab === 'audio'" class="space-y-4 mb-6">
        <div class="bg-black/50 p-3 rounded-xs border border-stone-800 flex items-center justify-between">
          <div class="w-1/2">
            <span class="block text-sm font-bold text-stone-200 font-mono">VOLUMEN GENERAL</span>
            <span class="text-[11px] text-stone-500 font-mono">Nivel maestro de salida acústica</span>
          </div>
          <div class="flex items-center gap-3 w-1/2 justify-end">
            <input
              type="range"
              min="0"
              max="100"
              v-model.number="masterVolume"
              @input="updateVolume"
              class="accent-red-600 cursor-pointer w-32"
            />
            <span class="text-xs font-mono w-8 text-right font-bold text-stone-300">{{ masterVolume }}%</span>
          </div>
        </div>

        <div class="bg-black/50 p-3 rounded-xs border border-stone-800 flex items-center justify-between">
          <div class="w-1/2">
            <span class="block text-sm font-bold text-stone-200 font-mono">EFECTOS SONOROS (SFX)</span>
            <span class="text-[11px] text-stone-500 font-mono">Impactos metálicos, armas y zombis</span>
          </div>
          <div class="flex items-center gap-3 w-1/2 justify-end">
            <input
              type="range"
              min="0"
              max="100"
              v-model.number="sfxVolume"
              class="accent-red-600 cursor-pointer w-32"
            />
            <button
              type="button"
              class="px-2 py-1 bg-stone-800 border border-stone-700 text-[10px] font-mono text-stone-300 hover:text-white rounded-xs"
              @click="testSound"
            >
              PROBAR
            </button>
          </div>
        </div>

        <div class="bg-black/50 p-3 rounded-xs border border-stone-800 flex items-center justify-between">
          <div>
            <span class="block text-sm font-bold text-stone-200 font-mono">AMBIENTE INDUSTRIAL & LATIDOS</span>
            <span class="text-[11px] text-stone-500 font-mono">Zumbido de generador y tensión psicológica</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="ambientSound" @change="toggleAmbient" class="sr-only peer" />
            <div class="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>

      <!-- Tab 2: Graphics & Gore -->
      <div v-if="activeTab === 'graphics'" class="space-y-4 mb-6">
        <div class="bg-black/50 p-3 rounded-xs border border-stone-800 flex items-center justify-between">
          <div>
            <span class="block text-sm font-bold text-stone-200 font-mono">NIVEL DE SANGRE Y DESMEMBRAMIENTO</span>
            <span class="text-[11px] text-stone-500 font-mono">Salpicaduras en suelo y manchas dinámicas</span>
          </div>
          <div class="flex gap-1">
            <button
              v-for="lvl in ['REDUCIDO', 'NORMAL', 'EXTREMO']"
              :key="lvl"
              type="button"
              :class="[
                'px-2.5 py-1 text-xs font-mono font-bold rounded-xs cursor-pointer border',
                bloodLevel === lvl
                  ? 'bg-red-950 border-red-500 text-red-200'
                  : 'bg-stone-900 border-stone-800 text-stone-400'
              ]"
              @click="bloodLevel = lvl"
            >
              {{ lvl }}
            </button>
          </div>
        </div>

        <div class="bg-black/50 p-3 rounded-xs border border-stone-800 flex items-center justify-between">
          <div>
            <span class="block text-sm font-bold text-stone-200 font-mono">CONO DE LUZ DE LINTERNA</span>
            <span class="text-[11px] text-stone-500 font-mono">Iluminación volumétrica reactiva al ratón</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="flashlightFx" class="sr-only peer" />
            <div class="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>

        <div class="bg-black/50 p-3 rounded-xs border border-stone-800 flex items-center justify-between">
          <div>
            <span class="block text-sm font-bold text-stone-200 font-mono">PARTÍCULAS DE CENIZA Y LLUVIA</span>
            <span class="text-[11px] text-stone-500 font-mono">Efecto atmosférico de tormenta post-apocalíptica</span>
          </div>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="ashParticles" class="sr-only peer" />
            <div class="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
          </label>
        </div>
      </div>

      <!-- Tab 3: Controls Guide -->
      <div v-if="activeTab === 'controls'" class="mb-6">
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="bg-black/50 p-2.5 rounded-xs border border-stone-800 flex items-center justify-between">
            <span class="text-stone-400">MOVIMIENTO</span>
            <kbd class="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-200 rounded-xs font-bold">W A S D</kbd>
          </div>
          <div class="bg-black/50 p-2.5 rounded-xs border border-stone-800 flex items-center justify-between">
            <span class="text-stone-400">CORRER / SPRINT</span>
            <kbd class="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-200 rounded-xs font-bold">SHIFT IZQ</kbd>
          </div>
          <div class="bg-black/50 p-2.5 rounded-xs border border-stone-800 flex items-center justify-between">
            <span class="text-stone-400">APUNTAR / FOCO</span>
            <kbd class="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-200 rounded-xs font-bold">CLICK DER</kbd>
          </div>
          <div class="bg-black/50 p-2.5 rounded-xs border border-stone-800 flex items-center justify-between">
            <span class="text-stone-400">ATACAR / DISPARAR</span>
            <kbd class="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-200 rounded-xs font-bold">CLICK IZQ</kbd>
          </div>
          <div class="bg-black/50 p-2.5 rounded-xs border border-stone-800 flex items-center justify-between">
            <span class="text-stone-400">EMPUJAR / PISOTÓN</span>
            <kbd class="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-200 rounded-xs font-bold">ESPACIO</kbd>
          </div>
          <div class="bg-black/50 p-2.5 rounded-xs border border-stone-800 flex items-center justify-between">
            <span class="text-stone-400">INTERACTUAR</span>
            <kbd class="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-200 rounded-xs font-bold">E</kbd>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
        <button
          type="button"
          class="steel-btn px-6 py-2.5 text-xs uppercase font-mono tracking-wider font-bold text-stone-200 hover:text-white"
          @click="close"
        >
          Guardar y Volver
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
}>();

const activeTab = ref('audio');
const masterVolume = ref(80);
const sfxVolume = ref(90);
const ambientSound = ref(true);
const bloodLevel = ref('EXTREMO');
const flashlightFx = ref(true);
const ashParticles = ref(true);

function setTab(tab: string) {
  activeTab.value = tab;
  sound.playClick();
}

function updateVolume() {
  sound.setVolume(masterVolume.value / 100);
}

function testSound() {
  sound.playPlayClick();
}

function toggleAmbient() {
  if (ambientSound.value) {
    sound.startAmbient();
  } else {
    sound.stopAmbient();
  }
}

function close() {
  sound.playClick();
  emit('close');
}
</script>
