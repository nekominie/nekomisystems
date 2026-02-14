<script setup lang="ts">

import { onMounted, onUnmounted, ref, computed } from 'vue'
import type { InstalledAppConfig } from '../data/types';
import Startmenu from './startmenu.vue';
import IconManager from './iconmanager.vue';

defineProps<{ 
    pinnedApps: InstalledAppConfig[]
}>()

const emit = defineEmits<{
    (e: 'taskbar-icon-clicked', id: string): void,
    (e: 'shutdown'): void
}>()

const currentTime = ref('')
const currentDate = ref('')
const showingStartMenu = ref(false)

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
        const isClickOnOrb = (e.target as HTMLElement).closest('.orb');

        if (!isClickInsideMenu && !isClickOnOrb) {
            showingStartMenu.value = false;
        }
    })
})

onUnmounted(() => {
    clearInterval(timer)
})

const isImage = (iconString: string) => {
    return /\.(jpg|jpeg|png|webp|avif|svg)$/.test(iconString) || iconString.startsWith('/');
}
    
</script>

<style scoped>
    @import '../styles/taskbar.css';
</style>

<template>
    <Transition name="start-menu-fade">
        <Startmenu 
            v-show="showingStartMenu"
            @shutdown="$emit('shutdown')"
            @close-startmenu="toggleStartMenu"
        />
    </Transition>

    <div class="taskbar">
        <div class="taskbar-elements">
            <div class="start-container">
                <div class="orb taskbar-btn"
                @click="toggleStartMenu"
            >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="bi bi-house-door-fill" viewBox="0 0 16 16">
                        <path d="M6.5 14.5v-3.505c0-.245.25-.495.5-.495h2c.25 0 .5.25.5.5v3.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5"/>
                    </svg>                
                </div>
            </div>

            <div class="apps-container" >
                <div class="app" v-for="app in pinnedApps" :key="app.id" @click="emit('taskbar-icon-clicked', app.id)">
                    <div class="taskbar-btn app-icon" 
                    :class="{ 'running-app': app.isOpen, 'focused-app': app.isFocused }">  

                    <img
                        v-if="isImage(app.icon)"
                        :src="app.icon"
                        class="taskbar-icon-element"
                    >
                    
                    <IconManager
                        v-else
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