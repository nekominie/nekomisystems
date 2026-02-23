<script setup lang="ts">
import { ComponentPublicInstance } from 'vue'
import Snippet from './snippet.vue'

const props = defineProps<{
  snippet: any
  component: any
  setEl: (el: Element | ComponentPublicInstance | null) => void
}>()

const emit = defineEmits<{
  (e: 'after-leave'): void
  (e: 'request-close'): void
}>()
</script>

<template>
  <Transition
    :name="props.snippet.manifest.transition ?? 'snippet-fade'"
    @after-leave="emit('after-leave')"
  >
    <div
      v-if="props.snippet.runtime.isVisible"
      :ref="props.setEl"
      class="snippet-host"
    >
      <Snippet
        :snippet="props.snippet"
        :component="props.component"
        @request-close="emit('request-close')"
      />
    </div>
  </Transition>
</template>

<style scoped>
  /* global: snippet_transitions.css o un css global de snippets */
  .snippet-host{
    position: absolute;
    right: 10px;
    bottom: 60px;
    z-index: 999; /* lo que necesites */
}</style>