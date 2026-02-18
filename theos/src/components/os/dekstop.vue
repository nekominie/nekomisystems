<script setup lang="ts">

import { computed  } from 'vue'
import Window from './window.vue'
import { MasterAppRegistry as AppsIndex } from '../data/master_apps_registry.ts'
import { processInstructions } from './process_manager.ts'
import { useContextMenu } from './context_menu/context_menu.ts'

const { openMenu } = useContextMenu()
const { state, launchApp } = processInstructions()

const transitionName = computed(() => state.lastAction)

const openedApps = computed(() => {
  return state.installedApps.filter(app => app.isOpen)
})

const { minimizeWindow, maximizeWindow, bringToFront, closeApp } = processInstructions();

const handleContextMenu = (e: MouseEvent) => {
    openMenu(e, [
        { label: 'Personalizar', icon: 'bi-brush-fill', action: () => launchApp('settings') }
    ])
}

</script>

<style scoped>
    @import '../styles/desktop.css';
</style>

<template>
    <div class="desktop" @contextmenu.self="handleContextMenu">
        <TransitionGroup :name="transitionName">
            <Window
                v-for="app in openedApps"
                v-show="!app.isMinimized"
                :key="app.id"
                :app-data="app"
                :component="AppsIndex[app.id]"
                @close="$emit('close-app', $event)"
                @minimize="minimizeWindow"
                @maximize="maximizeWindow"
                @focus="$emit('focus-app', $event)"
            />
        </TransitionGroup>
    </div>
</template>