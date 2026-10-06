<template>
  <div class="flex items-center space-x-3 overflow-x-auto py-2 px-1 custom-scrollbar">
    <div
      v-for="shape in SHAPES"
      :key="shape.type"
      class="group relative flex flex-col items-center justify-between p-2.5 sm:p-3 rounded-2xl backdrop-blur-xl border transition-all duration-300 transform-gpu cursor-pointer min-w-[100px] sm:min-w-[115px]"
      :class="[
        activePlacementItem?.shapeType === shape.type
          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_20px_rgba(13,240,212,0.35)] -translate-y-1.5'
          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/10 hover:border-cyan-400/50 hover:-translate-y-1.5 shadow-[0_10px_25px_rgba(0,0,0,0.4)] hover:shadow-[0_15px_30px_rgba(13,240,212,0.15)]'
      ]"
      :title="`Clic para colocar ${shape.name} (${SHAPE_TONES[shape.type]?.toneName}) con vista previa`"
      @click="onToggleStamp(shape)"
      @mouseenter="sound.playHover(0.04)"
    >
      <!-- Shape Silhouette / Minimalist 3D Wireframe Icon with Tone Tint -->
      <div
        class="w-11 h-11 flex items-center justify-center transition-colors duration-300"
        :style="{
          color: activePlacementItem?.shapeType === shape.type
            ? '#0df0d4'
            : SHAPE_TONES[shape.type]?.hex || '#d8dadc'
        }"
      >
        <!-- SVG Wireframe Diagrams for each architectural shape -->
        <svg v-if="shape.type === 'cube'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M20 6 L33 13 L20 20 L7 13 Z" />
          <path d="M7 13 L7 27 L20 34 L20 20 Z" />
          <path d="M33 13 L33 27 L20 34 Z" />
        </svg>

        <svg v-else-if="shape.type === 'beam'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M6 14 L30 8 L36 12 L12 18 Z" />
          <path d="M6 14 L6 22 L12 26 L12 18 Z" />
          <path d="M36 12 L36 20 L12 26 Z" />
        </svg>

        <svg v-else-if="shape.type === 'ramp'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M6 28 L34 28 L34 10 Z" />
          <path d="M6 28 L14 22 L38 22 L34 28 Z" />
          <path d="M38 22 L38 12 L34 10 Z" />
          <path d="M14 22 L38 12" />
        </svg>

        <svg v-else-if="shape.type === 'arch'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M8 32 L8 18 A12 12 0 0 1 32 18 L32 32" />
          <path d="M15 32 L15 20 A5 5 0 0 1 25 20 L25 32" />
        </svg>

        <svg v-else-if="shape.type === 'pipe'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <ellipse cx="12" cy="20" rx="4" ry="10" />
          <ellipse cx="28" cy="20" rx="4" ry="10" />
          <line x1="12" y1="10" x2="28" y2="10" />
          <line x1="12" y1="30" x2="28" y2="30" />
          <ellipse cx="12" cy="20" rx="2.5" ry="7" />
        </svg>

        <svg v-else-if="shape.type === 'cylinder'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <ellipse cx="20" cy="10" rx="10" ry="4" />
          <line x1="10" y1="10" x2="10" y2="30" />
          <line x1="30" y1="10" x2="30" y2="30" />
          <path d="M10 30 A10 4 0 0 0 30 30" />
        </svg>

        <svg v-else-if="shape.type === 'slide_straight'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M4 22 L36 12" />
          <path d="M4 18 L36 8" />
          <path d="M4 26 L36 16" />
          <path d="M4 18 L4 26 L36 16 L36 8 Z" />
          <path d="M4 22 L36 12" stroke-dasharray="2 2" opacity="0.6" />
        </svg>

        <svg v-else-if="shape.type === 'slide_u'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M12 34 L12 18 A8 8 0 0 1 28 18 L28 34" />
          <path d="M6 34 L6 18 A14 14 0 0 1 34 18 L34 34" />
          <line x1="6" y1="34" x2="12" y2="34" />
          <line x1="28" y1="34" x2="34" y2="34" />
        </svg>

        <svg v-else-if="shape.type === 'slide_u_drop'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M11 10 L11 20 A9 9 0 0 0 29 20 L29 32" />
          <path d="M6 10 L6 20 A14 14 0 0 0 34 20 L34 32" />
          <line x1="6" y1="10" x2="11" y2="10" />
          <line x1="29" y1="32" x2="34" y2="32" />
          <path d="M28 27 L31.5 32 L35 27" stroke-linecap="round" stroke-linejoin="round" />
        </svg>

        <svg v-else-if="shape.type === 'slide_quarter'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <path d="M8 34 A24 24 0 0 1 32 10" />
          <path d="M8 26 A16 16 0 0 1 24 10" />
          <line x1="8" y1="26" x2="8" y2="34" />
          <line x1="24" y1="10" x2="32" y2="10" />
        </svg>

        <svg v-else-if="shape.type === 'spinner_wheel'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]">
          <circle cx="20" cy="20" r="3" />
          <line x1="20" y1="17" x2="20" y2="9" />
          <path d="M20 9 Q26 7 25 13 Q20 13 20 9" />
          <line x1="23" y1="20" x2="31" y2="20" />
          <path d="M31 20 Q33 26 27 25 Q27 20 31 20" />
          <line x1="20" y1="23" x2="20" y2="31" />
          <path d="M20 31 Q14 33 15 27 Q20 27 20 31" />
          <line x1="17" y1="20" x2="9" y2="20" />
          <path d="M9 20 Q7 14 13 15 Q13 20 9 20" />
        </svg>

        <svg v-else-if="shape.type === 'escalator'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 31 L30 11 L36 11 L36 16 L10 36 L4 36 Z" />
          <path d="M12 28 L15 24 L11 24 M19 23 L22 19 L18 19 M26 18 L29 14 L25 14" opacity="0.8" />
          <path d="M18 31 L18 38 M28 24 L28 38" opacity="0.6" />
        </svg>

        <svg v-else-if="shape.type === 'ball_lift'" viewBox="0 0 40 40" class="w-10 h-10 stroke-current fill-none stroke-[1.5]" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 5 L27 5 L27 36 L13 36 Z" />
          <path d="M20 31 L20 11 M15.5 15.5 L20 11 L24.5 15.5" />
          <path d="M27 9 L37 13 M3 33 L13 33" opacity="0.8" />
        </svg>
      </div>

      <!-- Shape Name -->
      <span
        class="text-[10px] sm:text-[11px] font-mono tracking-wider transition-colors duration-200 mt-1 uppercase text-center whitespace-nowrap"
        :class="activePlacementItem?.shapeType === shape.type ? 'text-white font-bold' : 'text-white/70 group-hover:text-white'"
      >
        {{ shape.name }}
      </span>

      <!-- Subtle Architectural Mineral Swatch & Tone Indicator -->
      <div class="flex items-center space-x-1.5 mt-1 px-1.5 py-0.5 rounded-full bg-black/30 border border-white/5">
        <span
          class="w-2 h-2 rounded-full border border-white/20 shrink-0"
          :style="{ backgroundColor: SHAPE_TONES[shape.type]?.hex }"
        ></span>
        <span class="text-[8px] font-mono text-white/50 tracking-tight truncate max-w-[65px]">
          {{ SHAPE_TONES[shape.type]?.toneName }}
        </span>
      </div>

      <!-- Place pill -->
      <div class="flex items-center space-x-1 mt-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/25 text-[9px] font-mono text-cyan-300 group-hover:border-cyan-400/60 transition-colors">
        <i :class="activePlacementItem?.shapeType === shape.type ? 'bi bi-pin-map-fill text-[8px]' : 'bi bi-pin-map text-[8px]'"></i>
        <span>{{ activePlacementItem?.shapeType === shape.type ? 'Colocando' : 'Colocar' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SHAPE_TONES, type ShapeType } from '../../utils/sandboxPhysics';
import { activePlacementItem, setPlacementItem, clearPlacementItem } from '../../state/sandboxDragStore';
import { sound } from '../../utils/sound';

const emit = defineEmits<{
  (e: 'spawn', type: ShapeType): void;
}>();

const SHAPES: { type: ShapeType; name: string }[] = [
  { type: 'cube', name: 'Cuadrado' },
  { type: 'beam', name: 'Rectángulo' },
  { type: 'ramp', name: 'Rampa' },
  { type: 'arch', name: 'Arco' },
  { type: 'pipe', name: 'Tubo' },
  { type: 'cylinder', name: 'Cilindro' },
  { type: 'slide_straight', name: 'Tobogán Recto' },
  { type: 'slide_u', name: 'Tubo en U' },
  { type: 'slide_u_drop', name: 'Tubo U Desnivel' },
  { type: 'slide_quarter', name: 'Medio U (90°)' },
  { type: 'spinner_wheel', name: 'Molino Cucharas' },
  { type: 'escalator', name: 'Escalera Eléctrica' },
  { type: 'ball_lift', name: 'Elevador' },
];

function onToggleStamp(shape: { type: ShapeType; name: string }) {
  if (activePlacementItem.value?.shapeType === shape.type) {
    clearPlacementItem();
    sound.playClick(0.06);
  } else {
    setPlacementItem({
      kind: 'shape',
      shapeType: shape.type,
      name: `${shape.name} (${SHAPE_TONES[shape.type]?.toneName || 'Hormigón'})`,
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
