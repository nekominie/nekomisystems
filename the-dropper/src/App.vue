<template>
  <div class="relative min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden bg-[#060709] text-white selection:bg-cyan-500 selection:text-black">
    
    <!-- 1. Dedicated Sandbox Mode (Full-screen skybox & real-time physics sandbox) -->
    <SandboxView v-if="currentView === 'sandbox'" key="sandbox" />

    <!-- 2. Standard Architectural Menu Views (Wall 3D background + UI layers) -->
    <template v-else>
      <!-- Real-time 3D Three.js Concrete Wall & Dynamic Camera Scene -->
      <ThreeScene />

      <!-- Ambient Water & Brutalist Coordinate Overlay -->
      <WaterBackgroundOverlay />

      <!-- Top Architectural Status & Navigation Header -->
      <ArchitecturalHeader />

      <!-- Dynamic Menu View Switcher (In-place transitions on the same 3D background) -->
      <div class="relative z-10 flex-1 flex flex-col items-center justify-center w-full">
        <Transition name="view-architectural" mode="out-in">
          <MainMenu v-if="currentView === 'menu'" key="menu" />
          <GameModesView v-else-if="currentView === 'modes'" key="modes" />
          <SandboxWorldsMenu v-else-if="currentView === 'sandbox_worlds'" key="sandbox_worlds" />
          <LockerView v-else-if="currentView === 'locker'" key="locker" />
          <SettingsView v-else-if="currentView === 'settings'" key="settings" />
        </Transition>
      </div>

      <!-- Bottom Architectural Footer -->
      <footer class="relative z-20 w-full px-6 md:px-12 py-5 flex items-center justify-between pointer-events-auto text-[10px] font-mono text-white/30 border-t border-white/[0.04]">
        <div class="flex items-center space-x-3">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
          <span class="tracking-[0.2em]">MOTOR // THREE.JS + CANNON</span>
        </div>

        <div class="hidden md:flex tracking-[0.25em] uppercase">
          CONCEPTO DE ARQUITECTURA BRUTALISTA Y FÍSICAS
        </div>

        <div class="tracking-[0.2em]">
          © 2026 NEKOMISYSTEMS
        </div>
      </footer>

      <!-- Modals (Créditos) -->
      <CreditsModal />
    </template>

  </div>
</template>

<script setup lang="ts">
import ThreeScene from './components/scene/ThreeScene.vue';
import WaterBackgroundOverlay from './components/ui/WaterBackgroundOverlay.vue';
import ArchitecturalHeader from './components/ui/ArchitecturalHeader.vue';
import MainMenu from './components/menu/MainMenu.vue';
import GameModesView from './components/menu/GameModesView.vue';
import SandboxWorldsMenu from './components/menu/SandboxWorldsMenu.vue';
import LockerView from './components/menu/LockerView.vue';
import SettingsView from './components/menu/SettingsView.vue';
import SandboxView from './components/sandbox/SandboxView.vue';
import CreditsModal from './components/modals/CreditsModal.vue';
import { currentView } from './state/gameStore';
</script>

<style scoped>
.view-architectural-enter-active,
.view-architectural-leave-active {
  transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.view-architectural-enter-from {
  opacity: 0;
  transform: scale(0.97) translateY(12px);
}

.view-architectural-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-12px);
}
</style>
