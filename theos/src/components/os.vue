<script setup lang="ts">

import { onMounted, onUnmounted } from 'vue'
import { processInstructions } from './os/process_manager'

const { state, launchApp, bringToFront, closeApp } = processInstructions()

import Taskbar from './os/taskbar.vue'
import Desktop from './os/dekstop.vue'
import ContextMenu from './os/context_menu/context_menu.vue'

onMounted(() => {
    const preventDefaulContextMenu = (e: MouseEvent) => {
        e.preventDefault()
    }

    window.addEventListener('contextmenu', preventDefaulContextMenu)

    onUnmounted(() => {
        window.removeEventListener('contextmenu', preventDefaulContextMenu)
    })
})

</script>

<style scoped>
  @import "./styles/display.css";
</style>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap');    
    .main-font {
        font-family: "Quicksand", sans-serif;
        font-optical-sizing: auto;
        font-weight: 400;
        font-style: normal;    
    }
</style>

<template>
    <div class="display main-font" style="height: 100%; width: 100%;">
        <Desktop
            :installed-apps="state.installedApps"
            @focus-app="bringToFront"      
            @closeApp="closeApp"
        />

        <Taskbar 
            :installedApps="state.installedApps"
            @taskbar-icon-clicked="launchApp"
            @taskbar-closed-app="closeApp"
            @shutdown="$emit('shutdown')"
        />
        <ContextMenu />
    </div>
</template>

