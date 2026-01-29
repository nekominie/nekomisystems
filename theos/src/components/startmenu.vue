<script setup lang="ts">
    import { ref } from 'vue'

</script>

<style scoped>
    @import '../styles/start.css';
</style>

<template>
    <div class="start-menu" style="height: 600px; width: 300px;">
        <button
            @click=""
        >
            Ver todas las aplicaciones
        </button>

        <button
            @click="$emit('shutdown')"
        >
            Apagar
        </button>
  </div>
</template>