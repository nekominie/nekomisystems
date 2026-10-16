<template>
  <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none select-none">
    <!-- Marco / Carcasa exterior del cluster de instrumentos -->
    <div
      class="relative bg-gradient-to-b from-[#1c222b] via-[#12161d] to-[#0a0d12] p-1.5 sm:p-2 border-2 border-stone-600/80 rounded-md shadow-[0_12px_35px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.12)]"
    >
      <!-- Tornillos / Remaches en las 4 esquinas del tablero -->
      <span class="w-1.5 h-1.5 rounded-full bg-stone-500 border border-stone-800 absolute top-1 left-1 shadow-inner"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-stone-500 border border-stone-800 absolute top-1 right-1 shadow-inner"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-stone-500 border border-stone-800 absolute bottom-1 left-1 shadow-inner"></span>
      <span class="w-1.5 h-1.5 rounded-full bg-stone-500 border border-stone-800 absolute bottom-1 right-1 shadow-inner"></span>

      <!-- Pantalla interior analodigital (LCD / Instrument Cluster Display) -->
      <div
        class="bg-[#05080c] border border-stone-800/90 rounded px-3 py-2 flex items-center gap-3.5 sm:gap-5 relative overflow-hidden shadow-[inset_0_3px_10px_rgba(0,0,0,0.9)] lcd-screen"
      >
        <!-- Reflejo diagonal de cristal (Glass Glare) -->
        <div
          class="absolute -top-10 -left-8 w-40 h-24 bg-gradient-to-b from-white/[0.07] to-transparent rotate-45 pointer-events-none"
        ></div>

        <!-- 1. SECCIÓN IZQUIERDA: VELOCÍMETRO DIGITAL (EN GRANDE, FUENTE RELOJ DIGITAL) -->
        <div class="relative flex items-center justify-end min-w-[70px] sm:min-w-[85px] h-10 px-1">
          <!-- Segmentos fantasma '888' atenuados de fondo (efecto clásico reloj digital LCD) -->
          <span
            class="absolute right-1 text-3xl sm:text-4xl font-black italic tracking-widest leading-none select-none text-cyan-950/30 pointer-events-none digital-clock-font"
          >
            888
          </span>

          <!-- Dígitos de velocidad activa iluminados -->
          <span
            class="relative text-3xl sm:text-4xl font-black italic tracking-widest leading-none text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.75)] digital-clock-font"
          >
            {{ speedDisplay }}
          </span>
        </div>

        <!-- Divisor vertical del cluster -->
        <div class="w-[1.5px] h-10 bg-gradient-to-b from-stone-800 via-stone-700 to-stone-900 shadow-[1px_0_0_rgba(255,255,255,0.05)]"></div>

        <!-- 2. SECCIÓN DERECHA: BARRAS ANALODIGITALES DE CUADROS CON ICONOS -->
        <div class="flex flex-col gap-2.5 justify-center">
          <!-- Fila 1: Barra de Durabilidad / Vida del Carro -->
          <div class="flex items-center gap-2">
            <!-- Icono de Durabilidad / Mantenimiento del Chasis (lado izquierdo) -->
            <div
              class="w-4 h-4 flex items-center justify-center shrink-0 transition-colors duration-200"
              :class="
                durabilityPct <= 0.25
                  ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
                  : durabilityPct <= 0.55
                    ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]'
                    : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]'
              "
            >
              <!-- Wrench SVG Icon -->
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path
                  d="M.102 2.223A3.004 3.004 0 0 0 3.78 5.897l6.341 6.256A3.037 3.037 0 0 0 13 16a3 3 0 0 0 1.707-5.464L8.366 4.195A3.004 3.004 0 0 0 4.69.518a3.003 3.003 0 0 0-4.588 1.705zm10.743 6.941 4.417-4.417a1 1 0 0 0 0-1.414l-1.414-1.414a1 1 0 0 0-1.414 0L8.016 6.336l2.829 2.828z"
                />
              </svg>
            </div>

            <!-- Barra de cuadros de durabilidad (10 segmentos LCD analodigitales) -->
            <div class="flex items-center gap-1">
              <span
                v-for="index in 10"
                :key="'dur-' + index"
                class="w-2 sm:w-2.5 h-3.5 sm:h-4 rounded-[1px] transform -skew-x-12 transition-all duration-150"
                :class="
                  index <= activeDurabilityBlocks
                    ? durabilityPct <= 0.25
                      ? 'bg-red-500 border border-red-400 shadow-[0_0_6px_rgba(239,68,68,0.85)] animate-pulse'
                      : durabilityPct <= 0.55
                        ? 'bg-amber-400 border border-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.75)]'
                        : 'bg-emerald-400 border border-emerald-300 shadow-[0_0_6px_rgba(52,211,153,0.75)]'
                    : 'bg-[#0b1016] border border-stone-800/80 shadow-inner'
                "
              ></span>
            </div>
          </div>

          <!-- Fila 2: Barra de Gasolina / Combustible -->
          <div class="flex items-center gap-2">
            <!-- Icono de Gasolina / Surtidor (lado izquierdo) -->
            <div
              class="w-4 h-4 flex items-center justify-center shrink-0 transition-colors duration-200"
              :class="
                fuelPct <= 0.18
                  ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse'
                  : 'text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]'
              "
            >
              <!-- Fuel Pump SVG Icon -->
              <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5z" />
                <path
                  d="M1 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1 2 2v.5a.5.5 0 0 0 1 0V8h-.5a.5.5 0 0 1-.5-.5V4.379a1.5 1.5 0 0 1 .44-1.06L14.44 2.32a.5.5 0 0 1 .707 0l.707.707a.5.5 0 0 1 0 .707L14.5 5.086V7.5a1.5 1.5 0 0 0 1.5 1.5H16a1 1 0 0 1 1 1v4.5a1.5 1.5 0 0 1-1.5 1.5H14a1.5 1.5 0 0 1-1.5-1.5V13a1 1 0 0 1-1-1v-.5a.5.5 0 0 0-1 0v1.5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm8.5 7.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h5a.5.5 0 0 0 .5-.5v-4z"
                />
              </svg>
            </div>

            <!-- Barra de cuadros de gasolina (10 segmentos LCD analodigitales) -->
            <div class="flex items-center gap-1">
              <span
                v-for="index in 10"
                :key="'fuel-' + index"
                class="w-2 sm:w-2.5 h-3.5 sm:h-4 rounded-[1px] transform -skew-x-12 transition-all duration-150"
                :class="
                  index <= activeFuelBlocks
                    ? fuelPct <= 0.18
                      ? 'bg-red-500 border border-red-400 shadow-[0_0_6px_rgba(239,68,68,0.85)] animate-pulse'
                      : 'bg-amber-400 border border-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.75)]'
                    : 'bg-[#0b1016] border border-stone-800/80 shadow-inner'
                "
              ></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    speed?: number;
    fuelPct?: number;
    durabilityPct?: number;
  }>(),
  {
    speed: 0,
    fuelPct: 1,
    durabilityPct: 1,
  }
);

// Velocidad en km como número entero
const speedDisplay = computed(() => {
  const s = Math.round(props.speed || 0);
  return Math.max(0, s);
});

// Número de cuadros activos para durabilidad (0 a 10)
const activeDurabilityBlocks = computed(() => {
  const pct = Math.max(0, Math.min(1, props.durabilityPct ?? 1));
  if (pct <= 0.001) return 0;
  return Math.min(10, Math.max(1, Math.ceil(pct * 10)));
});

// Número de cuadros activos para gasolina (0 a 10)
const activeFuelBlocks = computed(() => {
  const pct = Math.max(0, Math.min(1, props.fuelPct ?? 1));
  if (pct <= 0.001) return 0;
  return Math.min(10, Math.max(1, Math.ceil(pct * 10)));
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;800;900&display=swap');

.digital-clock-font {
  font-family: 'Orbitron', 'Share Tech Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.lcd-screen {
  background-image: linear-gradient(rgba(18, 24, 32, 0) 50%, rgba(0, 0, 0, 0.35) 50%);
  background-size: 100% 3px;
}
</style>
