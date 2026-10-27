<template>
  <div class="flex justify-center my-3 px-4">
    <div
      class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl shadow-xs text-[11px] sm:text-xs leading-relaxed max-w-md text-center transition-all select-text"
      :class="[
        isEncryption
          ? 'bg-[#ffeecd] text-[#543b18] dark:bg-[#182229] dark:text-[#ffd279] dark:border dark:border-[#ffd279]/20'
          : 'bg-white/90 text-gray-700 dark:bg-[#182229]/90 dark:text-[#8696a0] dark:border dark:border-white/5'
      ]"
    >
      <i
        :class="[
          isEncryption ? 'bi bi-shield-lock-fill text-amber-500' : 'bi bi-info-circle-fill text-gray-400'
        ]"
      ></i>
      <span>{{ cleanContent }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  content: string
}>()

const isEncryption = computed(() => {
  const lower = props.content.toLowerCase()
  return lower.includes('end-to-end encrypted') || lower.includes('cifrados de extremo a extremo')
})

const cleanContent = computed(() => {
  return props.content.replace(/\*([^*]+)\*/g, '$1') // Strip WhatsApp bold asterisks like *Learn more*
})
</script>
