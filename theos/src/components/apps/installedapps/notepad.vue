<script setup lang="ts">
    import { ref } from 'vue'
    const text = ref('')
</script>

<template>
    <div class="notepad-container" style="height: 100%; width: 100%;">
      <textarea 
        v-model="text" 
        placeholder="Escribe algo aquí..."
        class="notepad-textarea"
        style="height: 100%; width: 100%;"
      ></textarea>
  </div>
</template>