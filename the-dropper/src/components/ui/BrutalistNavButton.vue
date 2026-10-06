<template>
  <button
    type="button"
    class="group relative inline-flex items-center justify-center transition-all duration-500 ease-out focus:outline-none cursor-pointer select-none"
    :class="[
      isPrimary
        ? 'py-4 px-10 text-xl sm:text-2xl md:text-3xl font-light tracking-[0.35em]'
        : 'py-2.5 px-7 text-sm sm:text-base md:text-lg font-light tracking-[0.25em]',
    ]"
    @mouseenter="onHover"
    @click="onClick"
  >
    <!-- Glass & Water hover background (hidden at rest, emerges smoothly on hover) -->
    <span
      class="absolute inset-0 rounded-2xl pointer-events-none transition-all duration-500 ease-out opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100"
      :class="[
        'bg-white/[0.06] dark:bg-white/[0.05]',
        'backdrop-blur-xl',
        'border border-white/20 dark:border-white/15',
        'shadow-[0_8px_32px_0_rgba(255,255,255,0.06),inset_0_1px_1px_0_rgba(255,255,255,0.2)]',
        isPrimary ? 'shadow-[0_12px_40px_rgba(13,240,212,0.12),inset_0_1px_2px_rgba(255,255,255,0.3)]' : '',
      ]"
    >
      <!-- Subtle fluid shimmer / water light reflection running across -->
      <span
        class="absolute inset-0 rounded-2xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
      >
        <span
          class="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
        ></span>
      </span>
    </span>

    <!-- Architectural Index Tag (e.g. 01 // ) -->
    <span
      v-if="index"
      class="relative z-10 mr-3 text-[10px] md:text-xs font-mono uppercase transition-all duration-300 pointer-events-none"
      :class="[
        isPrimary
          ? 'text-cyan-400/70 group-hover:text-cyan-300'
          : 'text-white/30 group-hover:text-white/60',
      ]"
    >
      {{ index }}
    </span>

    <!-- Pure typographic button text -->
    <span
      class="relative z-10 uppercase transition-all duration-500 pointer-events-none font-['Syne',sans-serif]"
      :class="[
        isPrimary
          ? 'text-white group-hover:text-white font-medium group-hover:tracking-[0.45em]'
          : 'text-white/70 group-hover:text-white group-hover:tracking-[0.32em]',
      ]"
    >
      {{ label }}
    </span>

    <!-- Minimalist brutalist architectural bracket indicator on hover -->
    <span
      class="relative z-10 ml-3 text-xs font-mono opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none"
      :class="isPrimary ? 'text-cyan-400' : 'text-white/50'"
    >
      &gt;
    </span>

    <!-- Subtle floor light reflection bar -->
    <span
      v-if="isPrimary"
      class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent opacity-0 group-hover:w-3/4 group-hover:opacity-100 transition-all duration-500 ease-out pointer-events-none"
    ></span>
  </button>
</template>

<script setup lang="ts">
import { sound } from '../../utils/sound';

const props = withDefaults(
  defineProps<{
    label: string;
    index?: string;
    isPrimary?: boolean;
  }>(),
  {
    index: '',
    isPrimary: false,
  }
);

const emit = defineEmits<{
  (e: 'click'): void;
}>();

function onHover() {
  sound.playHover(props.isPrimary ? 0.07 : 0.04);
}

function onClick() {
  emit('click');
}
</script>
