<template>
  <main class="relative z-10 flex-1 flex flex-col justify-between px-4 sm:px-8 md:px-12 py-6 pointer-events-auto select-none w-full max-w-4xl mx-auto min-h-[85vh]">
    
    <!-- Top Bar: Back Action & Section Title -->
    <div class="w-full flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
      <button
        type="button"
        class="group relative inline-flex items-center space-x-2 py-2 px-4 rounded-full text-xs font-mono tracking-[0.25em] text-white/50 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15 cursor-pointer"
        @click="navigateToMenu"
        @mouseenter="sound.playHover(0.04)"
      >
        <i class="bi bi-arrow-left text-xs transition-transform duration-300 group-hover:-translate-x-1"></i>
        <span class="uppercase">VOLVER</span>
      </button>

      <!-- Prominent Header Title -->
      <div class="text-right">
        <h1 class="text-xl sm:text-2xl md:text-3xl font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.25em]">
          AJUSTES
        </h1>
        <p class="text-[10px] sm:text-xs font-mono text-cyan-400/80 tracking-[0.2em] uppercase">
          PARÁMETROS DEL SISTEMA & CALIBRACIÓN
        </p>
      </div>
    </div>

    <!-- Vertical Stack of Independent Floating Glass Cards (Like in the Modal) -->
    <div class="flex-1 flex flex-col justify-center space-y-3.5 sm:space-y-4 max-w-2xl w-full mx-auto my-auto py-2">
      
      <!-- CARD 1: Efectos & Sonido Táctil -->
      <div
        class="group relative rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all duration-300 ease-out transform-gpu hover:-translate-y-1 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-cyan-400/40 shadow-[0_12px_35px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_40px_rgba(13,240,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.5)] cursor-pointer"
        @click="toggleAmbientSound"
        @mouseenter="sound.playHover(0.04)"
      >
        <div class="pr-4">
          <div class="flex items-center space-x-2.5 mb-1">
            <i class="bi bi-volume-up-fill text-cyan-400 text-sm"></i>
            <span class="text-[10px] font-mono tracking-widest text-cyan-400/80">01 //</span>
            <span class="text-sm sm:text-base font-medium text-white font-['Syne',sans-serif] tracking-wide">
              Efectos & Sonido Táctil
            </span>
          </div>
          <p class="text-xs text-white/50 leading-relaxed font-light">
            Retroalimentación acústica al interactuar con la interfaz y piezas.
          </p>
        </div>

        <div class="pointer-events-none">
          <div
            class="w-12 h-6.5 rounded-full transition-colors duration-300 flex items-center px-1"
            :class="settings.ambientSound ? 'bg-cyan-400 shadow-[0_0_12px_rgba(13,240,212,0.6)]' : 'bg-white/20'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-black transition-transform duration-300"
              :class="settings.ambientSound ? 'translate-x-5.5' : 'translate-x-0 bg-white/80'"
            ></div>
          </div>
        </div>
      </div>

      <!-- CARD 2: Volumen Maestro -->
      <div
        class="group relative rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 ease-out transform-gpu hover:-translate-y-1 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-cyan-400/40 shadow-[0_12px_35px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_40px_rgba(13,240,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.5)]"
        @mouseenter="sound.playHover(0.04)"
      >
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center space-x-2.5">
            <i class="bi bi-sliders text-cyan-400 text-sm"></i>
            <span class="text-[10px] font-mono tracking-widest text-cyan-400/80">02 //</span>
            <span class="text-sm sm:text-base font-medium text-white font-['Syne',sans-serif] tracking-wide">
              Volumen Maestro
            </span>
          </div>
          <span class="font-mono text-xs sm:text-sm text-cyan-400 font-semibold tracking-wider">
            {{ settings.masterVolume }}%
          </span>
        </div>

        <div>
          <input
            type="range"
            min="0"
            max="100"
            v-model="settings.masterVolume"
            class="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            @input="sound.playHover(0.03)"
          />
        </div>
      </div>

      <!-- CARD 3: Parallax de Cámara Cinemático -->
      <div
        class="group relative rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all duration-300 ease-out transform-gpu hover:-translate-y-1 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-cyan-400/40 shadow-[0_12px_35px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_40px_rgba(13,240,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.5)] cursor-pointer"
        @click="toggleParallax"
        @mouseenter="sound.playHover(0.04)"
      >
        <div class="pr-4">
          <div class="flex items-center space-x-2.5 mb-1">
            <i class="bi bi-compass text-cyan-400 text-sm"></i>
            <span class="text-[10px] font-mono tracking-widest text-cyan-400/80">03 //</span>
            <span class="text-sm sm:text-base font-medium text-white font-['Syne',sans-serif] tracking-wide">
              Parallax de Cámara Cinemático
            </span>
          </div>
          <p class="text-xs text-white/50 leading-relaxed font-light">
            Inclinación espacial reactiva al movimiento del cursor del ratón.
          </p>
        </div>

        <div class="pointer-events-none">
          <div
            class="w-12 h-6.5 rounded-full transition-colors duration-300 flex items-center px-1"
            :class="settings.cameraParallax ? 'bg-cyan-400 shadow-[0_0_12px_rgba(13,240,212,0.6)]' : 'bg-white/20'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-black transition-transform duration-300"
              :class="settings.cameraParallax ? 'translate-x-5.5' : 'translate-x-0 bg-white/80'"
            ></div>
          </div>
        </div>
      </div>

      <!-- CARD 4: Efectos de Vidrio & Difracción -->
      <div
        class="group relative rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all duration-300 ease-out transform-gpu hover:-translate-y-1 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-cyan-400/40 shadow-[0_12px_35px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_40px_rgba(13,240,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.5)] cursor-pointer"
        @click="toggleGlass"
        @mouseenter="sound.playHover(0.04)"
      >
        <div class="pr-4">
          <div class="flex items-center space-x-2.5 mb-1">
            <i class="bi bi-droplet-half text-cyan-400 text-sm"></i>
            <span class="text-[10px] font-mono tracking-widest text-cyan-400/80">04 //</span>
            <span class="text-sm sm:text-base font-medium text-white font-['Syne',sans-serif] tracking-wide">
              Efectos de Vidrio & Difracción
            </span>
          </div>
          <p class="text-xs text-white/50 leading-relaxed font-light">
            Filtro de desenfoque de agua y refracciones de luz en la interfaz.
          </p>
        </div>

        <div class="pointer-events-none">
          <div
            class="w-12 h-6.5 rounded-full transition-colors duration-300 flex items-center px-1"
            :class="settings.glassRefractions ? 'bg-cyan-400 shadow-[0_0_12px_rgba(13,240,212,0.6)]' : 'bg-white/20'"
          >
            <div
              class="w-4.5 h-4.5 rounded-full bg-black transition-transform duration-300"
              :class="settings.glassRefractions ? 'translate-x-5.5' : 'translate-x-0 bg-white/80'"
            ></div>
          </div>
        </div>
      </div>

      <!-- CARD 5: Calidad Gráfica 3D -->
      <div
        class="group relative rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300 ease-out transform-gpu hover:-translate-y-1 bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 hover:border-cyan-400/40 shadow-[0_12px_35px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_40px_rgba(13,240,212,0.15),inset_0_1px_2px_rgba(255,255,255,0.5)]"
        @mouseenter="sound.playHover(0.04)"
      >
        <div>
          <div class="flex items-center space-x-2.5">
            <i class="bi bi-display text-cyan-400 text-sm"></i>
            <span class="text-[10px] font-mono tracking-widest text-cyan-400/80">05 //</span>
            <span class="text-sm sm:text-base font-medium text-white font-['Syne',sans-serif] tracking-wide">
              Calidad Gráfica 3D
            </span>
          </div>
          <p class="text-xs text-white/50 leading-relaxed font-light mt-0.5">
            Sombras suaves en la pared y muestreo PBR.
          </p>
        </div>

        <div class="flex space-x-2">
          <button
            v-for="q in (['medium', 'high', 'ultra'] as const)"
            :key="q"
            type="button"
            class="px-3.5 py-1.5 rounded-xl text-[11px] font-mono uppercase tracking-wider transition-all duration-300 cursor-pointer"
            :class="[
              settings.graphicsQuality === q
                ? 'bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(13,240,212,0.5)]'
                : 'bg-white/10 text-white/50 hover:text-white hover:bg-white/15',
            ]"
            @click="setQuality(q)"
          >
            {{ q === 'medium' ? 'BÁSICA' : q === 'high' ? 'ALTA' : 'ULTRA' }}
          </button>
        </div>
      </div>

    </div>

    <!-- Bottom Status Strip -->
    <div class="w-full flex items-center justify-center pt-3 text-[10px] font-mono text-white/30">
      <span>CONFIGURACIÓN SINCRONIZADA EN MEMORIA LOCAL</span>
    </div>

  </main>
</template>

<script setup lang="ts">
import { settings, navigateToMenu } from '../../state/gameStore';
import { sound } from '../../utils/sound';

function toggleAmbientSound() {
  sound.playClick(0.1);
  settings.ambientSound = !settings.ambientSound;
}

function toggleParallax() {
  sound.playClick(0.1);
  settings.cameraParallax = !settings.cameraParallax;
}

function toggleGlass() {
  sound.playClick(0.1);
  settings.glassRefractions = !settings.glassRefractions;
}

function setQuality(q: 'medium' | 'high' | 'ultra') {
  sound.playClick(0.1);
  settings.graphicsQuality = q;
}
</script>
