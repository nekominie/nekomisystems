<template>
  <div class="relative w-full h-full min-h-screen bg-[#050608] text-stone-200 select-none overflow-x-hidden font-['Chakra_Petch']">
    <!-- Atmospheric Dark Fallout/Rain & Silhouette Canvas -->
    <DarkAtmosphereCanvas />

    <!-- CRT Scanlines Overlay -->
    <div class="scanlines fixed inset-0 z-30 pointer-events-none opacity-40"></div>

    <!-- Main Menu View (Hidden while playing prototype) -->
    <MainMenu
      v-if="!showTeaser"
      @open-play="activeModal = 'play'"
      @open-settings="activeModal = 'settings'"
      @open-locker="activeModal = 'locker'"
      @open-credits="activeModal = 'credits'"
    />

    <!-- Gameplay: mundo procedural infinito (three.js) -->
    <WorldGameplay
      v-if="showTeaser"
      @exit="showTeaser = false"
    />

    <!-- Modals -->
    <PlayModal
      v-if="activeModal === 'play'"
      @close="activeModal = 'none'"
      @launch-demo="handleLaunchDemo"
    />

    <SettingsModal
      v-if="activeModal === 'settings'"
      @close="activeModal = 'none'"
    />

    <LockerModal
      v-if="activeModal === 'locker'"
      @close="activeModal = 'none'"
    />

    <CreditsModal
      v-if="activeModal === 'credits'"
      @close="activeModal = 'none'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import DarkAtmosphereCanvas from './components/fx/DarkAtmosphereCanvas.vue';
import MainMenu from './components/menu/MainMenu.vue';
import PlayModal from './components/modals/PlayModal.vue';
import SettingsModal from './components/modals/SettingsModal.vue';
import LockerModal from './components/modals/LockerModal.vue';
import CreditsModal from './components/modals/CreditsModal.vue';
import WorldGameplay from './components/game/WorldGameplay.vue';
import { sound } from './audio/soundEngine';

type ModalType = 'none' | 'play' | 'settings' | 'locker' | 'credits';

const activeModal = ref<ModalType>('none');
const showTeaser = ref(false);

function handleLaunchDemo() {
  activeModal.value = 'none';
  showTeaser.value = true;
}

function handleGlobalKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (activeModal.value !== 'none') {
      activeModal.value = 'none';
      sound.playClick();
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKey);
});
</script>
