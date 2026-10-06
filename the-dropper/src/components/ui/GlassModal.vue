<template>
  <Teleport to="body">
    <Transition name="architectural-modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 select-none overflow-y-auto"
        @keydown.esc="onClose"
        tabindex="-1"
      >
        <!-- Liquid Glass Backdrop with deep blur and water tint -->
        <div
          class="fixed inset-0 bg-[#050608]/70 backdrop-blur-2xl transition-opacity duration-400"
          @click="onClose"
        >
          <!-- Subtle water-light caustics gradient -->
          <div
            class="absolute inset-0 bg-gradient-to-tr from-cyan-950/20 via-transparent to-slate-900/40 pointer-events-none"
          ></div>
        </div>

        <!-- Monolithic Brutalist Glass Container -->
        <div
          class="relative z-10 w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden bg-[#0c0f15]/85 border border-white/15 shadow-[0_25px_70px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-3xl transition-transform duration-500"
          @click.stop
        >
          <!-- Top Architectural Status Bar -->
          <div
            class="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 bg-white/[0.02]"
          >
            <div class="flex items-center space-x-3">
              <span class="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]"></span>
              <span class="text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
                {{ systemCode || 'SYS // PROTOCOL' }}
              </span>
              <span class="text-white/20">|</span>
              <h2 class="text-sm md:text-base font-light tracking-[0.2em] text-white uppercase font-['Syne',sans-serif]">
                {{ title }}
              </h2>
            </div>

            <!-- Close button: pure minimalist letters with hover highlight -->
            <button
              type="button"
              class="group px-4 py-1.5 rounded-full text-xs font-mono tracking-[0.2em] text-white/50 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-transparent hover:border-white/15 cursor-pointer"
              @click="onClose"
            >
              <span class="transition-transform group-hover:scale-105 inline-flex items-center space-x-1.5">
                <i class="bi bi-x-lg text-[10px]"></i>
                <span>CERRAR</span>
              </span>
            </button>
          </div>

          <!-- Modal Scrollable Content -->
          <div class="flex-1 overflow-y-auto px-6 md:px-8 py-6 custom-scrollbar text-white/80">
            <slot />
          </div>

          <!-- Bottom Architectural Footprint -->
          <div
            class="px-6 md:px-8 py-3.5 border-t border-white/5 bg-black/30 flex items-center justify-between text-[11px] font-mono text-white/30"
          >
            <span>THE DROPPER ARCHITECTURE // V0.1</span>
            <span>STATUS: NOMINAL</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { sound } from '../../utils/sound';

const props = defineProps<{
  isOpen: boolean;
  title: string;
  systemCode?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

function onClose() {
  sound.playClick(0.08);
  emit('close');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.isOpen) {
    onClose();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.architectural-modal-enter-active,
.architectural-modal-leave-active {
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.architectural-modal-enter-from,
.architectural-modal-leave-to {
  opacity: 0;
}

.architectural-modal-enter-from > div:last-child {
  transform: scale(0.96) translateY(12px);
}

.architectural-modal-leave-to > div:last-child {
  transform: scale(0.97) translateY(8px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
