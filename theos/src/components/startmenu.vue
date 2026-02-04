<script setup lang="ts">
    import { ref } from 'vue'

</script>

<style scoped>
    @import '../styles/start.css';
</style>

<template>
    <div class="start-menu" style="height: 600px; width: 300px;">
        <div class="start-menu-header">

        </div>
        
        <div style="flex: 1;">
            <button
                @click=""
            >
                Ver todas las aplicaciones
            </button>
        </div>

        <div class="start-menu-container">
            <button class="start-menu-button"
                @click="$emit('shutdown')"
            >
                Apagar
            </button>
        </div>
  </div>
</template>