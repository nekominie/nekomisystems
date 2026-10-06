<template>
  <div class="flex items-center space-x-3 overflow-x-auto py-2 px-1 custom-scrollbar">
    <div
      v-for="item in DECOR_LIST"
      :key="item.type"
      class="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl backdrop-blur-xl border transition-all duration-300 transform-gpu cursor-pointer min-w-[100px] sm:min-w-[115px]"
      :class="[
        activePlacementItem?.shapeType === item.type
          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(13,240,212,0.35)] -translate-y-1.5'
          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-cyan-400/50 hover:-translate-y-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_rgba(13,240,212,0.15)]'
      ]"
      :title="`Clic para colocar ${item.name} (${item.toneName}) con vista previa`"
      @click="onToggleStamp(item)"
      @mouseenter="sound.playHover(0.04)"
    >
      <!-- Line icon tinted with the piece color -->
      <div
        class="w-11 h-11 flex items-center justify-center transition-colors duration-300"
        :style="{ color: activePlacementItem?.shapeType === item.type ? '#0df0d4' : item.hex }"
      >
        <svg v-if="item.type === 'plant_fern'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 26 L27 26 L25 36 L15 36 Z" />
          <path d="M20 26 Q12 20 8 10" />
          <path d="M20 26 Q20 16 20 6" />
          <path d="M20 26 Q28 20 32 10" />
          <path d="M20 26 Q15 22 10 20" />
          <path d="M20 26 Q25 22 30 20" />
        </svg>

        <svg v-else-if="item.type === 'plant_tree'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 30 L26 30 L24 37 L16 37 Z" />
          <path d="M20 30 L20 18" />
          <circle cx="20" cy="11" r="7" />
          <circle cx="13" cy="16" r="4.5" />
          <circle cx="27" cy="16" r="4.5" />
        </svg>

        <svg v-else-if="item.type === 'plant_cactus'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 30 L26 30 L24 37 L16 37 Z" />
          <path d="M17 30 L17 10 Q20 5 23 10 L23 30" />
          <path d="M17 22 L12 22 Q10 22 10 20 L10 15" />
          <path d="M23 18 L28 18 Q30 18 30 16 L30 12" />
        </svg>

        <svg v-else-if="item.type === 'lamp_floor'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 6 L27 6 L31 16 L9 16 Z" />
          <path d="M20 16 L20 34" />
          <path d="M13 35 L27 35" />
          <path d="M16 20 L12 24 M24 20 L28 24" stroke-dasharray="1.5 2.5" opacity="0.7" />
        </svg>

        <svg v-else-if="item.type === 'spot_tripod'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 16 L10 36 M20 16 L20 36 M20 16 L30 36" />
          <path d="M12 8 L22 4 L25 12 L15 16 Z" />
          <path d="M27 11 L36 16 M26 14 L34 22" stroke-dasharray="1.5 2.5" opacity="0.7" />
        </svg>

        <svg v-else-if="item.type === 'spot_ground'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 34 L28 34 L26 28 L14 28 Z" />
          <path d="M16 26 L10 8 M20 26 L20 6 M24 26 L30 8" stroke-dasharray="1.5 2.5" opacity="0.7" />
        </svg>

        <svg v-else-if="item.type === 'chair'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 6 L12 22" />
          <path d="M12 8 L22 8 M12 13 L22 13" />
          <path d="M10 22 L30 22" />
          <path d="M12 22 L11 36 M28 22 L29 36" />
          <path d="M22 22 L22 36" opacity="0.6" />
        </svg>

        <svg v-else-if="item.type === 'armchair'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18 Q9 8 14 8 L26 8 Q31 8 31 18" />
          <path d="M7 18 L7 28 L33 28 L33 18 Q33 16 31 16 L9 16 Q7 16 7 18 Z" />
          <path d="M12 16 L12 24 L28 24 L28 16" opacity="0.6" />
          <path d="M10 28 L10 33 M30 28 L30 33" />
        </svg>
      </div>

      <span
        class="text-[10px] sm:text-[11px] font-mono tracking-wider transition-colors duration-200 mt-1 uppercase text-center whitespace-nowrap"
        :class="activePlacementItem?.shapeType === item.type ? 'text-white font-bold' : 'text-white/70 group-hover:text-white'"
      >
        {{ item.name }}
      </span>

      <div class="flex items-center space-x-1.5 mt-1 px-1.5 py-0.5 rounded-full bg-black/30 border border-white/5">
        <span class="w-2 h-2 rounded-full border border-white/20 shrink-0" :style="{ backgroundColor: item.hex }"></span>
        <span class="text-[8px] font-mono text-white/50 tracking-tight truncate max-w-[65px]">{{ item.toneName }}</span>
      </div>

      <div class="flex items-center space-x-1 mt-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 text-[9px] font-mono text-cyan-300 group-hover:border-cyan-400/60 transition-colors">
        <i :class="activePlacementItem?.shapeType === item.type ? 'bi bi-pin-map-fill text-[8px]' : 'bi bi-pin-map text-[8px]'"></i>
        <span>{{ activePlacementItem?.shapeType === item.type ? 'Colocando' : 'Colocar' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DECOR_LIST, type DecorInfo } from '../../utils/sandboxDecor';
import { activePlacementItem, setPlacementItem, clearPlacementItem } from '../../state/sandboxDragStore';
import { sound } from '../../utils/sound';

function onToggleStamp(item: DecorInfo) {
  if (activePlacementItem.value?.shapeType === item.type) {
    clearPlacementItem();
    sound.playClick(0.06);
  } else {
    setPlacementItem({
      kind: 'shape',
      shapeType: item.type,
      name: `${item.name} (${item.toneName})`,
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
