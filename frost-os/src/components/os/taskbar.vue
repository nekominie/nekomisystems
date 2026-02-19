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
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-snow" viewBox="0 0 16 16">
                <path d="M8 16a.5.5 0 0 1-.5-.5v-1.293l-.646.647a.5.5 0 0 1-.707-.708L7.5 12.793V8.866l-3.4 1.963-.496 1.85a.5.5 0 1 1-.966-.26l.237-.882-1.12.646a.5.5 0 0 1-.5-.866l1.12-.646-.884-.237a.5.5 0 1 1 .26-.966l1.848.495L7 8 3.6 6.037l-1.85.495a.5.5 0 0 1-.258-.966l.883-.237-1.12-.646a.5.5 0 1 1 .5-.866l1.12.646-.237-.883a.5.5 0 1 1 .966-.258l.495 1.849L7.5 7.134V3.207L6.147 1.854a.5.5 0 1 1 .707-.708l.646.647V.5a.5.5 0 1 1 1 0v1.293l.647-.647a.5.5 0 1 1 .707.708L8.5 3.207v3.927l3.4-1.963.496-1.85a.5.5 0 1 1 .966.26l-.236.882 1.12-.646a.5.5 0 0 1 .5.866l-1.12.646.883.237a.5.5 0 1 1-.26.966l-1.848-.495L9 8l3.4 1.963 1.849-.495a.5.5 0 0 1 .259.966l-.883.237 1.12.646a.5.5 0 0 1-.5.866l-1.12-.646.236.883a.5.5 0 1 1-.966.258l-.495-1.849-3.4-1.963v3.927l1.353 1.353a.5.5 0 0 1-.707.708l-.647-.647V15.5a.5.5 0 0 1-.5.5z"/>
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