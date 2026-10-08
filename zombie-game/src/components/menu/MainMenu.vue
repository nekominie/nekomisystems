<template>
  <div class="relative z-10 min-h-screen flex flex-col justify-between items-center py-6 px-4 sm:px-6">
    <!-- Top System Bar -->
    <header class="w-full max-w-4xl flex items-center justify-between px-3 py-2 bg-black/60 border border-stone-800 rounded-xs backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-[11px] font-mono text-stone-400 font-bold uppercase tracking-wider">
          SISTEMA REFUGIO // SECTOR 7-B
        </span>
      </div>

      <div class="flex items-center gap-3">
        <!-- Audio Mute Toggle -->
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900 border border-stone-700 text-stone-300 hover:text-white hover:border-red-500 text-xs font-mono rounded-xs transition-colors cursor-pointer"
          @click="toggleSound"
          :title="isMuted ? 'Activar Sonido' : 'Silenciar Sonido'"
        >
          <i :class="isMuted ? 'bi bi-volume-mute-fill text-red-500' : 'bi bi-volume-up-fill text-emerald-400'"></i>
          <span class="hidden sm:inline">{{ isMuted ? 'MUTED' : 'AUDIO ON' }}</span>
        </button>

        <!-- Exit / Hub Link -->
        <a
          href="/"
          class="flex items-center gap-1 px-2.5 py-1 bg-stone-900 border border-stone-700 text-stone-400 hover:text-white text-xs font-mono rounded-xs transition-colors"
        >
          <i class="bi bi-box-arrow-up-right"></i>
          <span class="hidden sm:inline">PORTAL</span>
        </a>
      </div>
    </header>

    <!-- Center Block: Title + Menu Buttons -->
    <div class="w-full max-w-lg flex flex-col items-center my-auto py-4">
      <!-- Title Component: Prominent "Zombie game" with blood & metal -->
      <ZombieTitle class="mb-6 sm:mb-8" />

      <!-- Industrial Plate Frame around Buttons -->
      <div class="w-full relative p-4 sm:p-5 bg-gradient-to-b from-[#161a23]/90 via-[#0e1117]/95 to-[#090b0e]/95 border-2 border-[#2f3747] rounded-sm shadow-[0_15px_40px_rgba(0,0,0,0.95)]">
        <!-- Rivets in corners -->
        <span class="rivet absolute top-2 left-2"></span>
        <span class="rivet absolute top-2 right-2"></span>
        <span class="rivet absolute bottom-2 left-2"></span>
        <span class="rivet absolute bottom-2 right-2"></span>

        <!-- Hazard corner decals -->
        <div class="absolute -top-1 left-8 w-12 h-1.5 hazard-stripes"></div>
        <div class="absolute -top-1 right-8 w-12 h-1.5 hazard-stripes"></div>

        <!-- Buttons Stack in exact requested order -->
        <div class="space-y-3 relative z-10">
          <!-- 1. JUGAR (DESTACA / PROMINENT) -->
          <IndustrialButton
            label="JUGAR"
            subtext="UN JUGADOR Y MULTIJUGADOR ONLINE"
            icon-class="bi bi-crosshair text-2xl text-red-400"
            :is-prominent="true"
            badge="PRIORITARIO"
            @click="$emit('open-play')"
          />

          <!-- 2. AJUSTES -->
          <IndustrialButton
            label="AJUSTES"
            subtext="AUDIO, VÍDEO, GORE Y TECLADO"
            icon-class="bi bi-gear-fill"
            @click="$emit('open-settings')"
          />

          <!-- 3. CASILLERO -->
          <IndustrialButton
            label="CASILLERO"
            subtext="ARMERÍA, BLINDAJE Y SUMINISTROS"
            icon-class="bi bi-shield-shaded"
            badge="5 OBJETOS"
            @click="$emit('open-locker')"
          />

          <!-- 4. CRÉDITOS -->
          <IndustrialButton
            label="CRÉDITOS"
            subtext="NEKOMISYSTEMS & MANIFIESTO SURVIVAL"
            icon-class="bi bi-terminal-split"
            @click="$emit('open-credits')"
          />
        </div>
      </div>
    </div>

    <!-- Bottom Footer Status Strip -->
    <footer class="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between px-3 py-2 text-[11px] font-mono text-stone-500 border-t border-stone-800/80 bg-black/40 backdrop-blur-sm">
      <div class="flex items-center gap-2">
        <span class="text-red-500 font-bold">ZOMBIE GAME</span>
        <span>•</span>
        <span>PROTOTIPO ISOMÉTRICO ESTILO ZOMBOID</span>
      </div>
      <div class="mt-1 sm:mt-0 text-stone-400">
        DISEÑO INDUSTRIAL &copy; {{ new Date().getFullYear() }} NEKOMISYSTEMS
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ZombieTitle from './ZombieTitle.vue';
import IndustrialButton from './IndustrialButton.vue';
import { sound } from '../../audio/soundEngine';

defineEmits<{
  (e: 'open-play'): void;
  (e: 'open-settings'): void;
  (e: 'open-locker'): void;
  (e: 'open-credits'): void;
}>();

const isMuted = ref(sound.getIsMuted());

function toggleSound() {
  isMuted.value = sound.toggleMute();
}
</script>
