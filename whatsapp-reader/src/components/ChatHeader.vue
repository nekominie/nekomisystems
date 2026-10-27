<template>
  <header
    class="h-16 px-4 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#2a3942] flex items-center justify-between shrink-0 shadow-xs z-20 select-none"
  >
    <!-- Left: Avatar & Group Info -->
    <div class="flex items-center gap-3 min-w-0">
      <!-- Chat avatar -->
      <div
        class="w-10 h-10 rounded-full bg-gradient-to-tr from-[#25d366] to-[#128c7e] text-white flex items-center justify-center font-bold text-sm shadow shrink-0"
      >
        <i v-if="isGroup" class="bi bi-people-fill text-lg"></i>
        <span v-else>{{ getInitials(title) }}</span>
      </div>

      <!-- Title & Subtitle -->
      <div class="min-w-0">
        <h2 class="font-bold text-sm text-[#111b21] dark:text-[#e9edef] truncate" :title="title">
          {{ title }}
        </h2>
        <p class="text-[11px] text-gray-500 dark:text-[#8696a0] truncate max-w-xs sm:max-w-md">
          <span v-if="protagonist" class="text-[#00a884] dark:text-[#25d366] font-semibold">Tú: {{ protagonist }}</span>
          <span v-else class="text-gray-400">Modo Observador</span>
          <span class="mx-1.5">•</span>
          <span>{{ participantNames.join(', ') }}</span>
        </p>
      </div>
    </div>

    <!-- Right: Action Buttons -->
    <div class="flex items-center gap-1 sm:gap-2">
      <!-- Search button -->
      <button
        type="button"
        class="w-9 h-9 rounded-full text-gray-600 dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all"
        :class="{ 'text-[#25d366] bg-black/5 dark:bg-white/10': isSearchOpen }"
        title="Buscar mensajes"
        @click="$emit('toggle-search')"
      >
        <i class="bi bi-search text-sm"></i>
      </button>

      <!-- Media Gallery button -->
      <button
        type="button"
        class="w-9 h-9 rounded-full text-gray-600 dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all relative"
        title="Ver archivos y multimedia"
        @click="$emit('open-media')"
      >
        <i class="bi bi-images text-base"></i>
        <span
          v-if="mediaCount > 0"
          class="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#25d366] text-[#111b21] text-[9px] font-extrabold flex items-center justify-center shadow"
        >
          {{ mediaCount }}
        </span>
      </button>

      <!-- Change Protagonist Button -->
      <button
        type="button"
        class="px-2.5 py-1.5 rounded-full text-xs font-semibold text-gray-600 dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-1.5 transition-all border border-black/5 dark:border-white/5"
        title="Cambiar quién eres en el chat"
        @click="$emit('change-protagonist')"
      >
        <i class="bi bi-person-gear text-sm text-[#25d366]"></i>
        <span class="hidden md:inline">Protagonista</span>
      </button>

      <!-- Dark / Light theme toggle -->
      <button
        type="button"
        class="w-9 h-9 rounded-full text-gray-600 dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all"
        :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
        @click="$emit('toggle-theme')"
      >
        <i :class="isDark ? 'bi bi-sun-fill text-amber-400' : 'bi bi-moon-fill text-indigo-500'"></i>
      </button>

      <!-- Upload new zip / Reset -->
      <button
        type="button"
        class="w-9 h-9 rounded-full text-gray-600 dark:text-[#aebac1] hover:text-[#111b21] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all"
        title="Cargar otro chat (.ZIP)"
        @click="$emit('reset')"
      >
        <i class="bi bi-arrow-clockwise text-base"></i>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getInitials } from '../utils/colors'

const props = defineProps<{
  title: string
  participantNames: string[]
  protagonist: string
  mediaCount: number
  isDark: boolean
  isSearchOpen: boolean
}>()

defineEmits<{
  (e: 'toggle-search'): void
  (e: 'open-media'): void
  (e: 'change-protagonist'): void
  (e: 'toggle-theme'): void
  (e: 'reset'): void
}>()

const isGroup = computed(() => props.participantNames.length > 2)
</script>
