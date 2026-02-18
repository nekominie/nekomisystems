<script setup lang="ts">

import { onMounted, onUnmounted, ref, computed } from 'vue'
import type { InstalledAppConfig } from '../data/types.ts'

import Startmenu from './startmenu.vue'
import IconManager from './iconmanager.vue'
import AppFinder from './apps_finder.vue'
import { state } from './process_manager.ts'
import { useContextMenu } from './context_menu/context_menu.ts'
import { processInstructions } from './process_manager.ts'

const { openMenu } = useContextMenu()
const { launchApp } = processInstructions();

const props = defineProps<{ 
    installedApps: InstalledAppConfig[]
}>()

const runningApps = computed(() => {
    return props.installedApps.filter(app => app.isOpen || app.isPinned);
});

const startApps = computed(() => {
    return props.installedApps.filter(app => app.isPinnedStart);
})

const emit = defineEmits<{
    (e: 'taskbar-icon-clicked', id: string): void,
    (e: 'taskbar-closed-app', id: string): void,
    (e: 'shutdown'): void
}>()

const currentTime = ref('')
const currentDate = ref('')
const showingStartMenu = ref(false)
const showingAppFinder = ref(false)
const hoveredAppId = ref<string | null>(null);

let showTimeout: number | null = null;
let hideTimeout: number | null = null;

const contextMenuApps = (e: MouseEvent) => {
    openMenu(e, [
        { 
            label: 'Supervisor de tareas',
            icon: 'bi-list-task', 
            action: () => launchApp('task_supervisor') 
        },
    ])
}

const previewPositionStyle = ref({ left: '0px' })

const activeAppForPreview = computed(() => 
    props.installedApps.find(app => app.id === hoveredAppId.value && app.isOpen)
)

const handleMouseEnter = (id: string) => {
    if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }

    const updatePosition = () => {
        const iconElement = document.getElementById(`taskbar-app-${id}`);
        if (iconElement) {
            const rect = iconElement.getBoundingClientRect();
            previewPositionStyle.value = {
                left: `${rect.left + rect.width / 2}px`
            };
        }
    };

    if (hoveredAppId.value !== null) {

        if(showTimeout) clearTimeout(showTimeout)

        updatePosition()
        hoveredAppId.value = id
        return
    }

    showTimeout = window.setTimeout(() => {
        updatePosition()
        hoveredAppId.value = id;
    }, 500)
}

const handleMouseLeave = () => {
    if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
    }

    hideTimeout = window.setTimeout(() => {
        hoveredAppId.value = null;
    }, 150);
}

const toggleStartMenu = () => {
    showingStartMenu.value = !showingStartMenu.value
}

const updateTime = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString([],
        { hour: '2-digit', minute: '2-digit' }
    );
    currentDate.value = now.toLocaleDateString()
}

let timer: number

onMounted(() => {
    updateTime()
    timer = window.setInterval(updateTime, 1000)

    window.addEventListener('mousedown', (e) => {
        const isClickInsideMenu = (e.target as HTMLElement).closest('.start-menu');
        const isClickInsideAppFinder = (e.target as HTMLElement).closest('.app-finder');
        
        const isClickOnOrb = (e.target as HTMLElement).closest('.orb');

        if (!isClickInsideMenu && !isClickOnOrb) {
            showingStartMenu.value = false;
        }

        if (!isClickInsideAppFinder) {
            showingAppFinder.value = false;
        }
    })
})

onUnmounted(() => {
    clearInterval(timer)
})

const viewAppFinder = () => {
    toggleStartMenu();
    showingAppFinder.value = !showingAppFinder.value
}

const handleIconClick = (id: string) => {
    if (showTimeout) clearTimeout(showTimeout)
    hoveredAppId.value = null
    emit('taskbar-icon-clicked', id)
}

const taskbarAppClosed = (id: string) => {
    if (hoveredAppId.value === id) {
        hoveredAppId.value = null
    }

    emit('taskbar-closed-app', id)
}

</script>

<style scoped>
    @import '../styles/taskbar.css';
</style>

<template>
    <Transition name="start-menu-fade">
        <Startmenu 
            v-show="showingStartMenu"
            :pinned-apps="startApps"
            @shutdown="$emit('shutdown')"
            @close-startmenu="toggleStartMenu"
            @view-app-finder="viewAppFinder"
        />
    </Transition>

    <Transition name="app-finder-fade">
        <AppFinder 
            v-show="showingAppFinder"
            @close-app-finder="showingAppFinder = false"
        />
    </Transition>

    <Transition name="preview-fade">
        <div
            v-if="hoveredAppId && activeAppForPreview"
            class="window-preview"
            @mouseenter="handleMouseEnter(hoveredAppId)"
            @mouseleave="handleMouseLeave"
            :style="previewPositionStyle"                           
        >
            <div class="preview-title">
                <div>
                    <IconManager :id="activeAppForPreview.id"/>
                    <div>{{ activeAppForPreview.name }}</div>
                </div>
                <div>
                    <i class="close-icon bi-x-lg" @click="taskbarAppClosed(activeAppForPreview.id)"></i>
                </div>
            </div>

            <!--<div class="preview-image-father">-->
                <div class="preview-image"
                    @click="handleIconClick(activeAppForPreview.id)"
                >
                    <img :src="activeAppForPreview.previewImg" v-if="activeAppForPreview.previewImg" />
                </div>
            <!--</div>-->
        </div>
    </Transition>    

    <div class="taskbar">
        <div class="taskbar-elements" @contextmenu.self="contextMenuApps($event)">
            <div class="start-container">
                <div class="orb taskbar-btn"
                @click="toggleStartMenu"
            >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-house-door-fill" viewBox="0 0 16 16">
                        <path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"/>
                    </svg>                
                </div>
            </div>

            <div class="apps-container" @contextmenu.self="contextMenuApps($event)">
                <div :id="`taskbar-app-${app.id}`" class="app" v-for="app in runningApps" :key="app.id" @click="handleIconClick(app.id)">                    
                    <div 
                        class="taskbar-btn app-icon" 
                        :class="{ 'running-app': app.isOpen, 'focused-app': app.isFocused }"
                        @mouseenter="handleMouseEnter(app.id)"
                        @mouseleave="handleMouseLeave"
                    >
                        <IconManager                        
                            :id="app.id"
                            class="taskbar-icon-element"
                        />
                    </div>
                </div>
            </div>
            
            <div class="info-container taskbar-btn">
                <div>{{ currentTime }}</div>
                <div>{{ currentDate }}</div>
            </div>
        </div>
    </div>
</template>