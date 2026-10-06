<template>
  <main class="relative z-10 flex-1 min-h-0 flex flex-col w-full px-4 md:px-8 py-6 pointer-events-none select-none">
    <!-- Top Bar: Back Action & Architectural Stamp -->
    <div class="w-full flex items-center justify-between pointer-events-auto">
      <button
        type="button"
        class="group relative inline-flex items-center space-x-2 py-2 px-4 rounded-full text-xs font-mono tracking-[0.25em] text-white/50 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15 cursor-pointer"
        @click="navigateToMenu"
        @mouseenter="sound.playHover(0.04)"
      >
        <i class="bi bi-arrow-left text-xs transition-transform duration-300 group-hover:-translate-x-1"></i>
        <span class="uppercase">VOLVER</span>
      </button>

      <div class="flex items-center space-x-2 text-[10px] sm:text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>SISTEMA // CASILLERO DE MATERIALES</span>
      </div>
    </div>

    <!-- Body: 3D ball framed on the left by the camera zoom, material grid on the right -->
    <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 mt-4 md:mt-6">

      <!-- Left Column: reserved for the floating ball (camera frames it here) -->
      <section class="hidden lg:flex flex-1 flex-col justify-end pb-4 pointer-events-none">
        <!-- Active Specimen Spec Sheet -->
        <Transition name="skin-info" mode="out-in">
          <div
            :key="selectedSkin.id"
            class="max-w-sm rounded-2xl p-5 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 shadow-[0_12px_35px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)]"
          >
            <div class="flex items-center space-x-2.5 mb-2">
              <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(13,240,212,0.8)]"></span>
              <span class="text-[10px] font-mono tracking-[0.3em] text-cyan-400/80 uppercase">
                ESPÉCIMEN ACTIVO // {{ selectedIndex }}
              </span>
            </div>
            <h2 class="text-xl md:text-2xl font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.18em]">
              {{ selectedSkin.name }}
            </h2>
            <p class="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase mt-1">
              {{ selectedSkin.category }}
            </p>
            <p class="text-xs font-light text-white/55 leading-relaxed mt-3 pt-3 border-t border-white/10">
              {{ selectedSkin.description }}
            </p>
          </div>
        </Transition>
      </section>

      <!-- Right Column: Material Grid -->
      <section class="w-full lg:w-[46%] xl:w-[42%] flex flex-col min-h-0 pointer-events-auto">
        <!-- Grid Header -->
        <div class="flex items-end justify-between mb-4 pr-1">
          <div>
            <h1 class="text-lg md:text-2xl font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.18em]">
              Materiales
            </h1>
            <p class="text-[10px] font-mono tracking-[0.25em] text-cyan-400/80 uppercase mt-0.5">
              {{ unlockedCount }}/{{ BALL_SKINS.length }} DESBLOQUEADOS
            </p>
          </div>
          <span class="hidden sm:block text-[10px] font-mono text-white/30 tracking-[0.2em] uppercase text-right">
            SELECCIONA PARA<br />APLICAR A LA ESFERA
          </span>
        </div>

        <!-- Scrollable Card Grid: each card wears its material as background -->
        <div class="locker-scroll flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-2 xl:grid-cols-3 gap-3 auto-rows-max content-start pb-2">
          <button
            v-for="(skin, index) in BALL_SKINS"
            :key="skin.id"
            type="button"
            class="locker-card group relative aspect-square rounded-2xl overflow-hidden border transition-all duration-300 transform-gpu cursor-pointer text-left"
            :class="[
              selectedSkinId === skin.id
                ? 'border-cyan-400 shadow-[0_0_30px_rgba(13,240,212,0.35),inset_0_1px_2px_rgba(255,255,255,0.5)] -translate-y-1'
                : skin.isLocked
                  ? 'border-white/10 hover:border-white/25 shadow-[0_12px_30px_rgba(0,0,0,0.5)]'
                  : 'border-white/15 hover:border-white/45 hover:-translate-y-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_18px_40px_rgba(13,240,212,0.18),inset_0_1px_2px_rgba(255,255,255,0.5)]'
            ]"
            :style="{ animationDelay: `${index * 50}ms` }"
            @click="selectSkin(skin.id)"
            @mouseenter="sound.playHover(skin.isLocked ? 0.02 : 0.04)"
          >
            <!-- Material fill (the material IS the card background) -->
            <div
              class="absolute inset-0 transition-transform duration-500 ease-out"
              :class="[
                skin.isLocked ? 'saturate-[0.35] brightness-[0.45]' : 'group-hover:scale-110',
                selectedSkinId === skin.id ? 'scale-105' : ''
              ]"
              :style="{ background: skin.cardBackground }"
            ></div>

            <!-- Legibility gradient overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/25 pointer-events-none"></div>

            <!-- Locked veil -->
            <div
              v-if="skin.isLocked"
              class="absolute inset-0 flex items-center justify-center bg-black/35 pointer-events-none"
            >
              <i class="bi bi-lock-fill text-white/60 text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"></i>
            </div>

            <!-- Top Row: index & state badge -->
            <div class="absolute top-0 inset-x-0 flex items-start justify-between p-2.5">
              <span class="text-[10px] font-mono tracking-[0.2em] text-white/70 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              <span
                v-if="selectedSkinId === skin.id"
                class="w-5 h-5 rounded-full bg-cyan-400 text-black text-[11px] font-bold flex items-center justify-center shadow-[0_0_14px_rgba(13,240,212,0.9)]"
              >
                ✓
              </span>
            </div>

            <!-- Bottom Label -->
            <div class="absolute bottom-0 inset-x-0 p-2.5">
              <p
                class="text-[11px] sm:text-xs font-medium uppercase font-['Syne',sans-serif] tracking-wider leading-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] transition-colors duration-300"
                :class="selectedSkinId === skin.id ? 'text-cyan-300' : 'text-white group-hover:text-white'"
              >
                {{ skin.name }}
              </p>
              <p class="text-[8px] sm:text-[9px] font-mono tracking-[0.18em] uppercase text-white/50 mt-0.5 line-clamp-1">
                {{ skin.isLocked ? 'BLOQUEADO' : skin.category }}
              </p>
            </div>

            <!-- Active scanline accent -->
            <span
              v-if="selectedSkinId === skin.id"
              class="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-300 to-transparent"
            ></span>
          </button>
        </div>

        <!-- Bottom Hint -->
        <div class="pt-3 flex items-center justify-center pointer-events-none">
          <p class="text-[9px] font-mono tracking-[0.3em] text-white/30 uppercase">
            MATERIAL · REFLEXIÓN · CALIBRACIÓN
          </p>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  BALL_SKINS,
  selectedSkinId,
  selectSkin,
  navigateToMenu,
} from '../../state/gameStore';
import { sound } from '../../utils/sound';

const selectedSkin = computed(
  () => BALL_SKINS.find((s) => s.id === selectedSkinId.value) ?? BALL_SKINS[0]
);

const selectedIndex = computed(() => {
  const idx = BALL_SKINS.findIndex((s) => s.id === selectedSkin.value.id);
  return String(idx + 1).padStart(2, '0');
});

const unlockedCount = computed(() => BALL_SKINS.filter((s) => !s.isLocked).length);
</script>

<style scoped>
/* Staggered card cascade that plays while the camera zooms towards the ball */
@keyframes locker-card-in {
  from {
    opacity: 0;
    transform: translateY(22px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.locker-card {
  animation: locker-card-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Spec sheet swap transition */
.skin-info-enter-active,
.skin-info-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.skin-info-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.skin-info-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Slim architectural scrollbar */
.locker-scroll::-webkit-scrollbar {
  width: 4px;
}
.locker-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.locker-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
}
</style>
