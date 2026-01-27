<script setup lang="ts">
    import { ref } from 'vue'
    const text = ref('')
</script>

<template>
    <div class="notepad-container">
    <textarea 
      v-model="text" 
      placeholder="Escribe algo aquí..."
      class="notepad-textarea"
    ></textarea>
  </div>
</template>