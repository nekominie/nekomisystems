<script setup lang="ts">

import { computed, inject  } from 'vue'
import { MasterAppRegistry } from '../data/master_apps_registry.ts'
import { useContextMenu } from './context_menu/context_menu.ts'
import { OS_KEY } from '../api/os_api'
import Window from './window.vue'
import DesktopIconsLayer from './desktop_icons/desktop_icons_layer.vue'

const os = inject(OS_KEY)
if(!os) throw new Error('OS API not found')

const { 
    openMenu 
} = useContextMenu()

const transitionName = computed(() => 
    os.state.lastAction
)

const windowOpenApps = computed(() => 
    os.state.apps.filter(app => app.runtime.isWindowOpen)
)

const pinnedDesktopApps = computed(() => 
    os.state.apps.filter(app => app.user.isPinnedDesktop)
)

const handleContextMenu = (e: MouseEvent) => {
    openMenu(e, [
        { label: 'Personalizar', icon: 'bi-brush-fill', action: () => os.launchApp('settings') }
    ])
}

</script>

<style scoped>
    @import '../styles/desktop.css';
</style>

<template>
    <div class="desktop" @contextmenu="handleContextMenu">

        <DesktopIconsLayer 
            :pinnedApps="pinnedDesktopApps" 
        />
        
        <TransitionGroup :name="transitionName">
            <Window
                v-for="app in windowOpenApps"
                v-show="!app.runtime.isMinimized"
                :key="app.manifest.id"
                :app="app"
                :component="MasterAppRegistry[app.manifest.id]"
                @close="os.closeApp"
                @focus="os.bringToFront"
                @minimize="os.minimizeWindow"
                @maximize="os.maximizeWindow"
            />
        </TransitionGroup>
    </div>
</template>