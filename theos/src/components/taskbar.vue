<script setup lang="ts">

import type { AppConfig } from '../types';

defineProps<{ 
    apps: AppConfig[]
}>()

const emit = defineEmits<{
    (e: 'launchApp', id: string): void
}>()
    
</script>

<style scoped>
    @import '../styles/taskbar.css';
</style>

<template>
    <div class="taskbar">
        <div class="start-container">

        </div>

        <div class="apps-container">

        </div>
        
        <div class="info-container">

        </div>
    </div>
</template>