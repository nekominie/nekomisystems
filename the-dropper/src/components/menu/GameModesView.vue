<template>
  <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8 pointer-events-auto select-none w-full max-w-7xl mx-auto">
    <!-- Top Back Action & Minimalist Architectural Stamp -->
    <div class="w-full flex items-center justify-between mb-8 sm:mb-12 max-w-6xl">
      <button
        type="button"
        class="group relative inline-flex items-center space-x-2 py-2 px-4 rounded-full text-xs font-mono tracking-[0.25em] text-white/50 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15 cursor-pointer"
        @click="navigateToMenu"
        @mouseenter="sound.playHover(0.04)"
      >
        <i class="bi bi-arrow-left text-xs transition-transform duration-300 group-hover:-translate-x-1"></i>
        <span class="uppercase">VOLVER</span>
      </button>

      <div class="flex items-center space-x-2 text-[10px] sm:text-xs font-mono tracking-[0.3em] text-white/30 uppercase">
        <span>SISTEMA // SELECCIÓN DE PROTOCOLO</span>
      </div>
    </div>

    <!-- 3 Horizontal Ice/Glass 3D Block Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl w-full items-stretch">
      
      <!-- 1. MODO INFINITO (Red Backlight) -->
      <div
        class="group relative cursor-pointer select-none rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-500 ease-out transform-gpu hover:-translate-y-3 hover:scale-[1.02] min-h-[340px] sm:min-h-[380px]"
        @click="selectMode('infinito')"
        @mouseenter="sound.playHover(0.06)"
      >
        <!-- Intense Red Lamp Backlight behind card (lamp shot from behind) -->
        <div
          class="absolute -inset-4 sm:-inset-6 -z-10 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out blur-2xl pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.75)_0%,rgba(220,38,38,0.35)_45%,transparent_75%)]"
        ></div>

        <!-- 3D Ice / Glass Block Body -->
        <div
          class="absolute inset-0 rounded-3xl transition-all duration-500 pointer-events-none bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/15 group-hover:border-red-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] group-hover:shadow-[0_0_50px_12px_rgba(239,68,68,0.4),inset_0_0_30px_rgba(239,68,68,0.2),inset_0_1px_2px_rgba(255,255,255,0.7)]"
        >
          <!-- Prismatic diagonal ice reflection sheen -->
          <div
            class="absolute inset-0 rounded-3xl overflow-hidden opacity-40 group-hover:opacity-80 transition-opacity duration-500"
          >
            <div
              class="w-full h-full bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent transform -rotate-12 translate-y-[-10%]"
            ></div>
          </div>
        </div>

        <!-- Content: Minimalist & Pure -->
        <div class="relative z-10 flex flex-col items-start">
          <span class="text-xs font-mono tracking-[0.3em] uppercase text-white/30 group-hover:text-red-400 transition-colors duration-300 mb-6">
            01 // PROTOCOLO
          </span>

          <!-- Highlighting Title -->
          <h2
            class="text-2xl sm:text-3xl lg:text-[32px] font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.18em] transition-all duration-300 group-hover:tracking-[0.22em] group-hover:text-white [text-shadow:0_0_0_transparent] group-hover:[text-shadow:0_0_25px_rgba(239,68,68,0.7)]"
          >
            Modo Infinito
          </h2>
        </div>

        <!-- Description -->
        <div class="relative z-10 mt-8 pt-6 border-t border-white/10 group-hover:border-red-500/30 transition-colors duration-300">
          <p class="text-xs sm:text-sm font-light text-white/60 group-hover:text-white/85 leading-relaxed tracking-wide transition-colors duration-300">
            Pon a prueba tu habilidad con piezas limitadas, tiempo y escenarios estrictos
          </p>
        </div>
      </div>

      <!-- 2. MODO ZEN (Green Backlight) -->
      <div
        class="group relative cursor-pointer select-none rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-500 ease-out transform-gpu hover:-translate-y-3 hover:scale-[1.02] min-h-[340px] sm:min-h-[380px]"
        @click="selectMode('zen')"
        @mouseenter="sound.playHover(0.06)"
      >
        <!-- Intense Green Lamp Backlight behind card (lamp shot from behind) -->
        <div
          class="absolute -inset-4 sm:-inset-6 -z-10 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out blur-2xl pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.75)_0%,rgba(22,163,74,0.35)_45%,transparent_75%)]"
        ></div>

        <!-- 3D Ice / Glass Block Body -->
        <div
          class="absolute inset-0 rounded-3xl transition-all duration-500 pointer-events-none bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/15 group-hover:border-emerald-400/80 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] group-hover:shadow-[0_0_50px_12px_rgba(34,197,94,0.4),inset_0_0_30px_rgba(34,197,94,0.2),inset_0_1px_2px_rgba(255,255,255,0.7)]"
        >
          <!-- Prismatic diagonal ice reflection sheen -->
          <div
            class="absolute inset-0 rounded-3xl overflow-hidden opacity-40 group-hover:opacity-80 transition-opacity duration-500"
          >
            <div
              class="w-full h-full bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent transform -rotate-12 translate-y-[-10%]"
            ></div>
          </div>
        </div>

        <!-- Content: Minimalist & Pure -->
        <div class="relative z-10 flex flex-col items-start">
          <span class="text-xs font-mono tracking-[0.3em] uppercase text-white/30 group-hover:text-emerald-400 transition-colors duration-300 mb-6">
            02 // PROTOCOLO
          </span>

          <!-- Highlighting Title -->
          <h2
            class="text-2xl sm:text-3xl lg:text-[32px] font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.18em] transition-all duration-300 group-hover:tracking-[0.22em] group-hover:text-white [text-shadow:0_0_0_transparent] group-hover:[text-shadow:0_0_25px_rgba(34,197,94,0.7)]"
          >
            Modo Zen
          </h2>
        </div>

        <!-- Description -->
        <div class="relative z-10 mt-8 pt-6 border-t border-white/10 group-hover:border-emerald-400/30 transition-colors duration-300">
          <p class="text-xs sm:text-sm font-light text-white/60 group-hover:text-white/85 leading-relaxed tracking-wide transition-colors duration-300">
            Modo infinito pero sin limitantes
          </p>
        </div>
      </div>

      <!-- 3. MODO SANDBOX (Turquoise Blue Backlight) -->
      <div
        class="group relative cursor-pointer select-none rounded-3xl p-8 sm:p-10 flex flex-col justify-between transition-all duration-500 ease-out transform-gpu hover:-translate-y-3 hover:scale-[1.02] min-h-[340px] sm:min-h-[380px]"
        @click="selectMode('sandbox')"
        @mouseenter="sound.playHover(0.06)"
      >
        <!-- Intense Turquoise Lamp Backlight behind card (lamp shot from behind) -->
        <div
          class="absolute -inset-4 sm:-inset-6 -z-10 rounded-[32px] opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out blur-2xl pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(13,240,212,0.85)_0%,rgba(6,182,212,0.4)_45%,transparent_75%)]"
        ></div>

        <!-- 3D Ice / Glass Block Body -->
        <div
          class="absolute inset-0 rounded-3xl transition-all duration-500 pointer-events-none bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/15 group-hover:border-cyan-400/80 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.35)] group-hover:shadow-[0_0_50px_12px_rgba(13,240,212,0.45),inset_0_0_30px_rgba(13,240,212,0.25),inset_0_1px_2px_rgba(255,255,255,0.7)]"
        >
          <!-- Prismatic diagonal ice reflection sheen -->
          <div
            class="absolute inset-0 rounded-3xl overflow-hidden opacity-40 group-hover:opacity-80 transition-opacity duration-500"
          >
            <div
              class="w-full h-full bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent transform -rotate-12 translate-y-[-10%]"
            ></div>
          </div>
        </div>

        <!-- Content: Minimalist & Pure -->
        <div class="relative z-10 flex flex-col items-start">
          <span class="text-xs font-mono tracking-[0.3em] uppercase text-white/30 group-hover:text-cyan-300 transition-colors duration-300 mb-6">
            03 // PROTOCOLO
          </span>

          <!-- Highlighting Title -->
          <h2
            class="text-2xl sm:text-3xl lg:text-[32px] font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.18em] transition-all duration-300 group-hover:tracking-[0.22em] group-hover:text-white [text-shadow:0_0_0_transparent] group-hover:[text-shadow:0_0_25px_rgba(13,240,212,0.7)]"
          >
            Modo Sandbox
          </h2>
        </div>

        <!-- Description -->
        <div class="relative z-10 mt-8 pt-6 border-t border-white/10 group-hover:border-cyan-400/30 transition-colors duration-300">
          <p class="text-xs sm:text-sm font-light text-white/60 group-hover:text-white/85 leading-relaxed tracking-wide transition-colors duration-300">
            creatividad absoluta, el escenario es tuyo
          </p>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup lang="ts">
import { navigateToMenu, navigateToSandboxWorlds } from '../../state/gameStore';
import { sound } from '../../utils/sound';

function selectMode(mode: 'infinito' | 'zen' | 'sandbox') {
  if (mode === 'sandbox') {
    navigateToSandboxWorlds();
    return;
  }
  sound.playClick(0.18);
  const titles = {
    infinito: 'Modo Infinito',
    zen: 'Modo Zen',
  };
  alert(`Seleccionaste: ${titles[mode]}\n\nEste modo de juego estará disponible en la siguiente fase.`);
}
</script>
