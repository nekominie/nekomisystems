<script lang="ts" setup>

import { CoreApps } from '../data/coreapps'
import IconManager from './iconmanager.vue'

const emit = defineEmits<{
    (e: 'launch-app', id: string): void,
}>()

</script>

<template>
    <div style="font-size: 14px; flex: 1;">
        <div
            v-for="app in CoreApps" 
            :key="app.id" 
            class="start-app"
            @click="emit('launch-app', app.id)"
        >

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
    height: 24px;
    margin: 8px 0;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
}

.start-app svg{
    flex: 1;
    height: 24px;
    max-width: 24px;
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