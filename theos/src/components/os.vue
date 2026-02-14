<script setup lang="ts">

import { ref, onMounted } from 'vue'
import { processInstructions } from './os/process_manager'

const { state, launchApp, bringToFront, closeApp } = processInstructions();

import Taskbar from './os/taskbar.vue'
import Desktop from './os/dekstop.vue'

const topZ = ref(100);

const desktopComponent = ref<InstanceType<typeof Desktop> | null>(null);

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

        <Desktop ref="desktopComponent"
            :installed-apps="state.installedApps"
            @focus-app="bringToFront"      
            @closeApp="closeApp"
        />

        <Taskbar 
            :pinnedApps="state.installedApps"
            @taskbar-icon-clicked="launchApp"
            @shutdown="$emit('shutdown')"
        />
    </div>
</template>

