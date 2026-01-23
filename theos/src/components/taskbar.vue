<script setup lang="ts">

import type { AppConfig } from '../types';

defineProps<{ 
    pinnedApps: AppConfig[]
}>()

const emit = defineEmits<{
    (e: 'launchApp', id: string): void
}>()
    
</script>

<style>

</style>

<style scoped>
    @import '../styles/taskbar.css';
    @import '../styles/start.css';
</style>

<template>
    <div class="taskbar">
        <div class="taskbar-elements">
            <div class="start-container">
                <div class="orb">
                    <i class="bi bi-house-door-fill"></i>
                </div>
            </div>

            <div class="apps-container">
            </div>
            
            <div class="info-container">
            </div>
        </div>
    </div>
</template>