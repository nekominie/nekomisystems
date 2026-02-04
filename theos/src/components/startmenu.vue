<script setup lang="ts">
    import { ref } from 'vue'

</script>

<style scoped>
    @import '../styles/start.css';
</style>

<template>
    <div class="start-menu" style="height: 600px; width: 300px;">
        <div class="start-menu-header">
            <div class="user-picture">
                <img>
            </div>

        </div>

        <div class="divider"></div>
        
        <div class="start-menu-main" style="flex: 1;">
            <div style="display: flex; flex-direction: column;">
                <div style="flex: 1;"></div>
                <button
                    @click=""
                >
                    Ver todas las aplicaciones
                </button>
            </div>

            <div></div>

        </div>

        <div class="divider"></div>

        <div class="start-menu-container">
            <button class="start-menu-button"
                @click="$emit('shutdown')"
            >
                Apagar
            </button>
        </div>
  </div>
</template>