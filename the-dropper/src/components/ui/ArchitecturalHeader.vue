<template>
  <header
    class="relative z-20 w-full px-6 md:px-12 py-6 flex items-center justify-between pointer-events-auto select-none"
  >
    <!-- Left: Return to portal & Project stamp -->
    <div class="flex items-center space-x-4">
      <a
        href="../index.html"
        class="group inline-flex items-center space-x-2 text-xs font-mono tracking-[0.2em] text-white/40 hover:text-white transition-all duration-300 py-1.5 px-3 rounded-full hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15"
        @mouseenter="sound.playHover(0.04)"
      >
        <i class="bi bi-arrow-left text-xs transition-transform duration-300 group-hover:-translate-x-1"></i>
        <span>PORTAL</span>
      </a>

      <div class="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-white/25">
        <span>/</span>
        <span class="tracking-[0.2em] uppercase">SYSTEMS // V0.1.0-ALPHA</span>
      </div>
    </div>

    <!-- Right: Minimalist audio & display toggles -->
    <div class="flex items-center space-x-3">
      <!-- Audio toggle -->
      <button
        type="button"
        class="group p-2 rounded-full text-xs font-mono tracking-wider text-white/50 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15 cursor-pointer flex items-center space-x-1.5"
        :title="settings.ambientSound ? 'Silenciar Audio' : 'Activar Audio'"
        @click="toggleAudio"
        @mouseenter="sound.playHover(0.04)"
      >
        <i :class="settings.ambientSound ? 'bi bi-volume-up-fill' : 'bi bi-volume-mute-fill'" class="text-sm"></i>
        <span class="hidden md:inline text-[10px] tracking-[0.2em] uppercase text-white/40 group-hover:text-white/80">
          {{ settings.ambientSound ? 'AUDIO ON' : 'AUDIO OFF' }}
        </span>
      </button>

      <!-- Fullscreen toggle -->
      <button
        type="button"
        class="hidden sm:flex group p-2 rounded-full text-xs font-mono tracking-wider text-white/50 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15 cursor-pointer items-center space-x-1"
        title="Pantalla Completa"
        @click="toggleFullscreen"
        @mouseenter="sound.playHover(0.04)"
      >
        <i class="bi bi-arrows-fullscreen text-xs"></i>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { settings } from '../../state/gameStore';
import { sound } from '../../utils/sound';

function toggleAudio() {
  sound.playClick(0.1);
  settings.ambientSound = !settings.ambientSound;
}

function toggleFullscreen() {
  sound.playClick(0.1);
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}
</script>
