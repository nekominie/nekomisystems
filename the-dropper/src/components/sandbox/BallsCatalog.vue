<template>
  <div class="flex flex-col space-y-2">
  <!-- Physics material presets -->
  <div class="flex flex-wrap items-stretch gap-2 px-1">
    <span class="hidden sm:flex items-center text-[10px] font-mono tracking-[0.15em] text-white/40 uppercase pr-1">Material</span>
    <button
      v-for="preset in BALL_PRESET_LIST"
      :key="preset.id"
      type="button"
      class="flex-1 min-w-[150px] flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border text-left transition-all duration-200 cursor-pointer"
      :class="[
        activeBallPreset === preset.id
          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_14px_rgba(13,240,212,0.3)]'
          : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.09] hover:border-cyan-400/40'
      ]"
      :title="preset.description"
      @click="onSelectPreset(preset.id)"
    >
      <i :class="['bi', preset.icon, 'text-base', activeBallPreset === preset.id ? 'text-cyan-300' : 'text-white/50']"></i>
      <div class="flex flex-col flex-1 min-w-0">
        <span class="text-[11px] font-mono font-bold uppercase tracking-wider">{{ preset.name }}</span>
        <div class="flex flex-col space-y-0.5 mt-1">
          <div v-for="row in statRows" :key="row.key" class="flex items-center space-x-1.5">
            <span class="w-11 text-[8px] font-mono uppercase text-white/40">{{ row.label }}</span>
            <div class="flex space-x-0.5">
              <span
                v-for="n in 5"
                :key="n"
                class="w-2.5 h-1 rounded-sm"
                :class="n <= preset.stats[row.key] ? 'bg-cyan-400' : 'bg-white/10'"
              ></span>
            </div>
          </div>
        </div>
      </div>
    </button>
  </div>

  <div class="flex items-center space-x-3 overflow-x-auto py-2 px-1 custom-scrollbar">
    <button
      v-for="skin in BALL_SKINS"
      :key="skin.id"
      type="button"
      class="group relative flex flex-col items-center justify-between p-3 sm:p-3.5 rounded-2xl backdrop-blur-xl border transition-all duration-300 transform-gpu cursor-pointer min-w-[90px] sm:min-w-[105px]"
      :class="[
        activePlacementItem?.skin?.id === skin.id
          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(13,240,212,0.35)] -translate-y-1.5'
          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-cyan-400/50 hover:-translate-y-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_rgba(13,240,212,0.15)]'
      ]"
      @click="onSelectSkin(skin)"
      @mouseenter="sound.playHover(0.04)"
    >
      <!-- Active Tool Glow Badge -->
      <span
        v-if="activePlacementItem?.skin?.id === skin.id"
        class="absolute -top-1 -right-1 flex h-3 w-3"
      >
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-3 w-3 bg-cyan-400"></span>
      </span>

      <!-- Circular Material Preview Swatch -->
      <div
        class="w-11 h-11 rounded-full border border-white/30 shadow-md relative overflow-hidden transition-transform duration-300 flex items-center justify-center my-0.5"
        :class="activePlacementItem?.skin?.id === skin.id ? 'scale-110 ring-2 ring-cyan-400' : 'group-hover:scale-110'"
        :style="{ background: skin.cardBackground }"
      >
        <!-- Glare shine reflection -->
        <span class="absolute top-1 left-1.5 w-3 h-1.5 rounded-full bg-white/60 blur-[0.5px] rotate-[-25deg]"></span>
        <!-- Small plus or check icon on hover / active -->
        <span
          v-if="activePlacementItem?.skin?.id === skin.id"
          class="text-[12px] font-bold text-black drop-shadow"
        >
          ✓
        </span>
        <span
          v-else
          class="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] font-bold text-black drop-shadow"
        >
          +
        </span>
      </div>

      <span
        class="text-[10px] sm:text-[11px] font-mono tracking-wider transition-colors duration-200 mt-1 uppercase text-center whitespace-nowrap"
        :class="activePlacementItem?.skin?.id === skin.id ? 'text-white font-bold' : 'text-white/60 group-hover:text-white'"
      >
        {{ skin.name }}
      </span>
    </button>
  </div>
  </div>
</template>

<script setup lang="ts">
import { BALL_SKINS } from '../../state/gameStore';
import { activePlacementItem, activeBallPreset, setPlacementItem, clearPlacementItem } from '../../state/sandboxDragStore';
import { BALL_PRESET_LIST, type BallPresetId } from '../../utils/sandboxPhysics';
import type { BallSkin } from '../../types/game';
import { sound } from '../../utils/sound';

const emit = defineEmits<{
  (e: 'spawn', skin: BallSkin): void;
}>();

const statRows = [
  { key: 'weight', label: 'Peso' },
  { key: 'bounce', label: 'Rebote' },
  { key: 'speed', label: 'Veloc.' },
] as const;

function onSelectPreset(id: BallPresetId) {
  if (activeBallPreset.value === id) return;
  activeBallPreset.value = id;
  sound.playClick(0.08);
}

function onSelectSkin(skin: BallSkin) {
  if (activePlacementItem.value?.skin?.id === skin.id) {
    clearPlacementItem();
    sound.playClick(0.06);
  } else {
    setPlacementItem({
      kind: 'ball',
      skin,
      name: skin.name,
    });
    sound.playClick(0.1);
  }
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
}
</style>
