<template>
  <button
    type="button"
    :class="[
      'group relative w-full overflow-hidden text-left cursor-pointer transition-all duration-200 select-none flex items-center',
      isProminent
        ? 'play-btn-prominent py-4 px-6 sm:py-5 sm:px-8 rounded-sm'
        : 'steel-btn py-3.5 px-5 sm:py-4 sm:px-6 rounded-sm'
    ]"
    @mouseenter="onHover"
    @click="onClick"
  >
    <!-- Screws / Rivets in corners for heavy mechanical look -->
    <span class="rivet absolute top-1.5 left-1.5 scale-75 opacity-70"></span>
    <span class="rivet absolute top-1.5 right-1.5 scale-75 opacity-70"></span>
    <span class="rivet absolute bottom-1.5 left-1.5 scale-75 opacity-70"></span>
    <span class="rivet absolute bottom-1.5 right-1.5 scale-75 opacity-70"></span>

    <!-- Hazard side stripe for prominent button -->
    <div
      v-if="isProminent"
      class="absolute left-0 top-0 bottom-0 w-3 hazard-stripes-blood opacity-80"
    ></div>

    <!-- Bloody splash decal on prominent button -->
    <svg
      v-if="isProminent"
      class="absolute right-3 -bottom-2 w-16 h-16 pointer-events-none opacity-40 text-red-500 transition-opacity group-hover:opacity-75"
      viewBox="0 0 100 100"
      fill="currentColor"
    >
      <path d="M40 10 C30 30 10 40 15 65 C20 85 45 95 65 85 C85 75 90 45 75 25 C60 5 45 0 40 10 Z" />
      <circle cx="85" cy="20" r="4" />
      <circle cx="20" cy="25" r="3" />
      <circle cx="92" cy="70" r="3" />
    </svg>

    <!-- Normal side indicator bar for regular buttons -->
    <div
      v-else
      class="absolute left-0 top-0 bottom-0 w-1.5 bg-[#4b5563] group-hover:bg-red-600 transition-colors"
    ></div>

    <!-- Content Row -->
    <div class="relative z-10 flex items-center justify-between w-full pl-2 sm:pl-3">
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Icon container -->
        <div
          :class="[
            'flex items-center justify-center rounded-xs transition-transform group-hover:scale-110',
            isProminent
              ? 'w-10 h-10 sm:w-12 sm:h-12 bg-red-950/80 border border-red-500/60 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'w-9 h-9 sm:w-10 sm:h-10 bg-black/60 border border-stone-700 text-stone-300 group-hover:border-red-600/70 group-hover:text-red-400'
          ]"
        >
          <slot name="icon">
            <i :class="[iconClass || 'bi bi-chevron-right', 'text-xl sm:text-2xl']"></i>
          </slot>
        </div>

        <!-- Labels -->
        <div class="flex flex-col">
          <span
            :class="[
              'font-extrabold uppercase tracking-widest leading-tight transition-colors',
              isProminent
                ? 'text-2xl sm:text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] group-hover:text-red-100 font-[\'Black_Ops_One\',Impact]'
                : 'text-lg sm:text-xl text-stone-200 group-hover:text-white font-[\'Chakra_Petch\']'
            ]"
          >
            {{ label }}
          </span>
          <span
            v-if="subtext"
            :class="[
              'text-[10px] sm:text-xs font-mono tracking-wider uppercase',
              isProminent ? 'text-red-300/80 font-bold' : 'text-stone-400 group-hover:text-stone-300'
            ]"
          >
            {{ subtext }}
          </span>
        </div>
      </div>

      <!-- Right Action Indicator / Badge -->
      <div class="flex items-center gap-2">
        <span
          v-if="badge"
          :class="[
            'text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-xs uppercase tracking-widest font-bold',
            isProminent
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-stone-800 text-stone-300 border border-stone-700'
          ]"
        >
          {{ badge }}
        </span>

        <!-- Chevron arrow -->
        <i
          :class="[
            'bi bi-caret-right-fill transition-transform group-hover:translate-x-1.5',
            isProminent ? 'text-xl text-red-400' : 'text-base text-stone-500 group-hover:text-red-500'
          ]"
        ></i>
      </div>
    </div>

    <!-- Active / Hover Scanline Flash -->
    <div
      class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
    ></div>
  </button>
</template>

<script setup lang="ts">
import { sound } from '../../audio/soundEngine';

const props = defineProps<{
  label: string;
  subtext?: string;
  iconClass?: string;
  isProminent?: boolean;
  badge?: string;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

function onHover() {
  sound.playHover();
}

function onClick() {
  if (props.isProminent) {
    sound.playPlayClick();
  } else {
    sound.playClick();
  }
  emit('click');
}
</script>
