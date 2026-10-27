<template>
  <div
    class="px-4 py-2 bg-[#f0f2f5] dark:bg-[#111b21] border-b border-[#e9edef] dark:border-[#2a3942] flex items-center gap-3 transition-all animate-fade-in"
  >
    <div class="relative flex-1 flex items-center">
      <i class="bi bi-search absolute left-3 text-gray-400 text-xs"></i>
      <input
        type="text"
        :value="modelValue"
        placeholder="Buscar mensaje o palabra clave..."
        class="w-full pl-8 pr-8 py-1.5 rounded-xl bg-white dark:bg-[#202c33] text-xs text-[#111b21] dark:text-[#e9edef] placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-[#25d366] border border-transparent dark:border-white/5 transition-all"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="modelValue"
        type="button"
        class="absolute right-2.5 text-gray-400 hover:text-white text-xs"
        @click="$emit('update:modelValue', '')"
      >
        <i class="bi bi-x-circle-fill"></i>
      </button>
    </div>

    <!-- Sender filter selector -->
    <div class="relative">
      <select
        :value="selectedSender"
        class="py-1.5 px-3 rounded-xl bg-white dark:bg-[#202c33] text-xs text-[#111b21] dark:text-[#e9edef] focus:outline-hidden border border-transparent dark:border-white/5 cursor-pointer max-w-[140px] truncate"
        @change="$emit('update:selectedSender', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Todos los participantes</option>
        <option v-for="name in participants" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </div>

    <!-- Match count -->
    <span v-if="modelValue || selectedSender" class="text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
      {{ matchCount }} resultado{{ matchCount !== 1 ? 's' : '' }}
    </span>

    <!-- Close search button -->
    <button
      type="button"
      class="w-7 h-7 rounded-lg text-gray-400 hover:text-white flex items-center justify-center hover:bg-white/10 transition-all shrink-0"
      title="Cerrar búsqueda"
      @click="$emit('close')"
    >
      <i class="bi bi-x-lg text-xs"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
  selectedSender: string
  participants: string[]
  matchCount: number
}>()

defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'update:selectedSender', val: string): void
  (e: 'close'): void
}>()
</script>
