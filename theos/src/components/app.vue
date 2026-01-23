<script setup lang="ts">
    import { ref, onMounted } from 'vue'
    import Taskbar from './taskbar.vue'
    import Desktop from './dekstop.vue'
    import type { AppConfig } from '../types'

    const pinnedApps = ref<AppConfig[]>([
        {
            id: 'notepad',
            name: 'Notepad',
            icon: 'notepad',
            isOpen: false,
            isMinimized: false,
            zIndex: 0
        }
    ])

</script>

<style scoped>
  @import "../styles/display.css";
</style>

<template>
    <div class="display" style="height: 100%; width: 100%;">

        <Desktop />

        <Taskbar 
            :pinnedApps="pinnedApps"
        />
    </div>
</template>

