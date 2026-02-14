<script lang="ts" setup>
import { ref } from 'vue'
import type { StartApp } from '../types';
import { startApps } from '../data/start_apps'
import IconManager from './iconmanager.vue';

</script>

<template>
    <div style="font-size: 14px; flex: 1;">
        <div v-for="app in startApps" :key="app.id" class="start-app">

            <IconManager
                :id="app.id"
                class="taskbar-icon-element"
            />

            {{ app.name }}
        </div>
    </div>
</template>

<style scoped>
.start-app{
    display: flex;
    flex-direction: row;
    align-items: center;
    max-height: 40px;
    margin: 8px 0;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
}

.start-app svg{
    flex: 1;
    max-height: 24px;
}

.start-app:hover{
    background-color: #00000021;
}

.taskbar-icon-element{
    margin-right: 6px;
}
.taskbar-icon-element *{
        max-width: 20px;
    }
</style>