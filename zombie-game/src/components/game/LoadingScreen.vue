<template>
  <div class="fixed inset-0 z-50 bg-[#050608] flex flex-col justify-between p-4 sm:p-8 md:p-12 select-none overflow-hidden font-['Chakra_Petch']">
    <!-- Atmospheric Dark Fallout Vignette -->
    <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(6,10,18,0.4)_0%,rgba(3,4,6,0.95)_100%)]"></div>

    <!-- Scanlines -->
    <div class="scanlines absolute inset-0 pointer-events-none opacity-40"></div>

    <!-- Top Bar -->
    <header class="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between px-4 py-2.5 bg-black/75 border border-stone-800 rounded-xs backdrop-blur-md">
      <div class="flex items-center gap-3">
        <span
          class="w-2.5 h-2.5 rounded-full"
          :class="isReady ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-yellow-400 animate-pulse shadow-[0_0_10px_#facc15]'"
        ></span>
        <span class="text-xs sm:text-sm font-mono font-bold tracking-widest uppercase text-stone-300">
          PROJECT HATSUNE // CARGA TÁCTICA
        </span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[11px] font-mono uppercase px-2.5 py-1 rounded-xs border font-bold"
          :class="isReady ? 'border-emerald-500/70 bg-emerald-950/60 text-emerald-300' : 'border-yellow-600/70 bg-yellow-950/50 text-yellow-300'"
        >
          {{ isReady ? 'SISTEMAS LISTOS' : 'SINCRONIZANDO' }}
        </span>
      </div>
    </header>

    <!-- Center Content: Bunker Panel -->
    <main class="relative z-10 w-full max-w-3xl mx-auto my-auto py-4">
      <div class="relative steel-panel p-6 sm:p-9 rounded-xs overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.95)] border-2 border-stone-700">
        <!-- Rivets -->
        <span class="rivet absolute top-3 left-3"></span>
        <span class="rivet absolute top-3 right-3"></span>
        <span class="rivet absolute bottom-3 left-3"></span>
        <span class="rivet absolute bottom-3 right-3"></span>

        <!-- Hazard Top Strip -->
        <div class="hazard-stripes h-2 -mx-9 -mt-9 mb-6"></div>

        <!-- Title & Subtitle -->
        <div class="flex items-center justify-between gap-4 mb-6">
          <div class="flex items-center gap-3.5">
            <div class="w-12 h-12 rounded-xs bg-red-950/80 border border-red-600/80 flex items-center justify-center text-red-400 shrink-0">
              <i class="bi bi-cpu-fill text-2xl"></i>
            </div>
            <div>
              <h2 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-white uppercase tracking-wider font-['Black_Ops_One']">
                {{ isReady ? 'DESPLIEGUE CONFIRMADO' : 'CARGANDO MODELOS 3D' }}
              </h2>
              <p class="text-xs font-mono text-stone-400 uppercase tracking-wide">
                {{ isReady ? 'Modelos y cinemática sincronizados sin mallas provisionales' : 'Descargando mallas bipedales Hatsune, cinemática y zombis' }}
              </p>
            </div>
          </div>

          <!-- Large Percentage Display -->
          <div class="text-right shrink-0">
            <div
              class="text-3xl sm:text-5xl font-extrabold font-mono leading-none tracking-tight"
              :class="isReady ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]' : 'text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.5)]'"
            >
              {{ progress.percent }}%
            </div>
            <div class="text-[10px] font-mono text-stone-500 uppercase tracking-wider mt-1">
              COMPLETADO
            </div>
          </div>
        </div>

        <!-- Progress Bar Container -->
        <div class="space-y-2 mb-6">
          <div class="relative w-full h-7 bg-stone-950 border-2 border-stone-700/90 rounded-xs p-0.5 overflow-hidden shadow-inner">
            <!-- Animated Bar Fill -->
            <div
              class="h-full rounded-xs transition-all duration-200 ease-out relative overflow-hidden flex items-center justify-end pr-2"
              :class="isReady ? 'bg-gradient-to-r from-emerald-600 to-teal-400' : 'bg-gradient-to-r from-cyan-600 via-sky-500 to-emerald-400'"
              :style="{ width: `${Math.max(5, progress.percent)}%` }"
            >
              <!-- Striped moving shine overlay -->
              <div class="absolute inset-0 opacity-25 bg-[linear-gradient(45deg,rgba(255,255,255,0.25)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.25)_50%,rgba(255,255,255,0.25)_75%,transparent_75%,transparent)] bg-[length:24px_24px] animate-[progressStripes_1.2s_linear_infinite]"></div>
            </div>
          </div>

          <!-- Progress Meta Info -->
          <div class="flex items-center justify-between text-xs font-mono text-stone-400 px-1">
            <span class="flex items-center gap-1.5 font-bold text-stone-300">
              <i class="bi bi-box-seam text-cyan-400"></i>
              RECURSOS: {{ progress.loaded }} / {{ progress.total }}
            </span>

            <span class="px-2 py-0.5 bg-stone-900 border border-stone-800 text-[10px] uppercase font-bold text-cyan-300 rounded-xs">
              {{ progress.category }}
            </span>
          </div>
        </div>

        <!-- Live Terminal Stream Line -->
        <div class="bg-black/90 border border-stone-800 p-3 rounded-xs font-mono text-xs text-stone-300 mb-6 flex items-center gap-2">
          <span class="text-cyan-400 font-bold">&gt;</span>
          <span class="truncate">{{ progress.currentLabel }}</span>
          <span class="w-1.5 h-3.5 bg-cyan-400 animate-pulse ml-auto shrink-0"></span>
        </div>

        <!-- Tactical Survival Intel Box -->
        <div class="p-3.5 bg-gradient-to-r from-stone-900/80 to-stone-950/80 border border-stone-800 rounded-xs flex items-start gap-3">
          <div class="w-7 h-7 rounded-xs bg-yellow-950/70 border border-yellow-600/70 flex items-center justify-center text-yellow-400 shrink-0 mt-0.5">
            <i class="bi bi-info-circle-fill text-sm"></i>
          </div>
          <div class="flex-1">
            <div class="text-[11px] font-mono font-bold text-yellow-300 uppercase tracking-wider mb-0.5">
              REGISTRO DE CAMPO // CONSEJO TÁCTICO
            </div>
            <p class="text-xs font-mono text-stone-300 leading-relaxed transition-opacity duration-300">
              {{ currentTip }}
            </p>
          </div>
        </div>

        <!-- Action Button when 100% -->
        <div class="mt-6 pt-5 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            class="px-4 py-2 border border-stone-700 bg-stone-900 hover:bg-stone-800 hover:border-red-600 text-stone-400 hover:text-white text-xs font-mono uppercase tracking-wider rounded-xs transition-colors cursor-pointer"
            @click="handleCancel"
          >
            [ ESC ] Volver al menú
          </button>

          <button
            type="button"
            :disabled="!isReady"
            class="w-full sm:w-auto px-6 py-3.5 font-bold uppercase tracking-wider rounded-xs font-mono text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
            :class="
              isReady
                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)] scale-100 hover:scale-[1.02] active:scale-[0.99]'
                : 'bg-stone-900 border border-stone-700 text-stone-500 opacity-60 cursor-not-allowed'
            "
            @click="handleEnter"
          >
            <i class="bi bi-box-arrow-in-right text-lg"></i>
            <span>{{ isReady ? 'ENTRAR AL MUNDO [ESPACIO / ENTER]' : 'SINCRONIZANDO MODELOS...' }}</span>
          </button>
        </div>
      </div>
    </main>

    <!-- Bottom Bar / Footer -->
    <footer class="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between text-[11px] font-mono text-stone-500 px-4 py-2 border-t border-stone-900">
      <span>ZONA DE CUARENTENA // ACCESO SEGURO</span>
      <span>TODOS LOS MODELOS LISTOS ANTES DEL COMBATE</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { preloadAllGameAssets, type PreloadProgress } from '../../game/world/assetPreloader';
import { sound } from '../../audio/soundEngine';

const emit = defineEmits<{
  (e: 'ready'): void;
  (e: 'cancel'): void;
}>();

const progress = ref<PreloadProgress>({
  loaded: 0,
  total: 32,
  percent: 0,
  currentLabel: 'Iniciando conexión con el almacén de modelos 3D...',
  category: 'INICIANDO',
});

const isReady = computed(() => progress.value.percent >= 100);

// Consejos tácticos rotativos durante la carga
const tips = [
  'Las luces de los vehículos iluminan todo el mapa y son visibles para los demás supervivientes a pie.',
  'Los vehículos colisionan físicamente entre sí. Puedes empujar autos desocupados para abrir paso en barricadas.',
  'Presiona ENTER para abrir la radio de chat y comunicarte con tu escuadrón en tiempo real.',
  'En modo sigilo (tecla C) generas menos vibraciones sonoras y reduces el rango de alerta zombi.',
  'Los impactos certeros a la cabeza causan daño crítico letal y ahorran valiosa munición.',
  'Ten cuidado al acelerar vehículos a altas velocidades: los zombis alertados pueden rodearte rápidamente.',
  'Recuerda equipar y alternar entre armas cuerpo a cuerpo y rifles según la distancia del combate.',
];

const tipIndex = ref(0);
const currentTip = computed(() => tips[tipIndex.value]);
let tipInterval: ReturnType<typeof setInterval> | null = null;
let autoEnterTimeout: ReturnType<typeof setTimeout> | null = null;

function handleEnter() {
  if (!isReady.value) return;
  sound.playPlayClick();
  emit('ready');
}

function handleCancel() {
  sound.playClick();
  emit('cancel');
}

function handleKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    handleCancel();
  } else if ((e.key === 'Enter' || e.key === ' ') && isReady.value) {
    e.preventDefault();
    handleEnter();
  }
}

onMounted(async () => {
  window.addEventListener('keydown', handleKey);

  tipInterval = setInterval(() => {
    tipIndex.value = (tipIndex.value + 1) % tips.length;
  }, 4000);

  try {
    await preloadAllGameAssets((p) => {
      progress.value = p;
    });

    // Pequeño retardo agradable y auto-entrada si el jugador no hace clic de inmediato
    sound.playLevelUp();
    autoEnterTimeout = setTimeout(() => {
      // Auto-iniciar si sigue en pantalla
      emit('ready');
    }, 750);
  } catch (err) {
    progress.value.currentLabel = 'Error al cargar algunos modelos. Presiona ESC para reintentar.';
    console.error('[LoadingScreen] Error en la precarga:', err);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey);
  if (tipInterval) clearInterval(tipInterval);
  if (autoEnterTimeout) clearTimeout(autoEnterTimeout);
});
</script>

<style scoped>
@keyframes progressStripes {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 24px 0;
  }
}
</style>
