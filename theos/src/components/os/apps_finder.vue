<script lang="ts" setup>

import { CoreApps } from '../data/coreapps'
import { processInstructions } from './process_manager'
import { InstalledApps } from '../data/installedapps';
import IconManager from './iconmanager.vue'

const { launchApp } = processInstructions();

const emit = defineEmits(['close-app-finder'])

const runApp = (id: string) => {
    emit('close-app-finder')
    launchApp(id)
}

</script>

<template>
    <div class="app-finder">
        <div style="height: 100%; display: flex; flex-direction: column;">
            <div class="main-title">Todas las aplicaciones</div>

            <div class="main-container">
                <div>
                    <div class="subtitle">Aplicaciones</div>
                    <div class="icons-container">
                        <div
                            v-for="app in InstalledApps" 
                            :key="app.id"
                            @click="runApp(app.id)"
                            class="app-element"
                        >
                            <IconManager :id="app.id" class="taskbar-icon-element" />
                            <div class="app-name">{{ app.name }}</div>
                        </div>
                    </div>
                </div>

                <hr style="margin: 48px 0;">

                <div>
                    <div class="subtitle">Aplicaciones de Sistema</div>
                    <div class="icons-container">
                        <div
                            v-for="app in CoreApps" 
                            :key="app.id"
                            @click="runApp(app.id)"
                            class="app-element"
                        >
                            <IconManager :id="app.id" class="taskbar-icon-element" />
                            <div class="app-name">{{ app.name }}</div>                    
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

.app-finder{
    display: flex;
    flex-direction: column;
    /*min-width: 90vw;*/
    min-height: 80vh;
    aspect-ratio: 1/1;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -52%);
    background-color: #00000066;
    backdrop-filter: blur(38px);
    border-radius: 36px;
    z-index: 999999999;
    color: rgba(255, 255, 255, 0.708);
}

.main-title{
    font-size: 35px;
    font-weight: 600;
    margin-bottom: 29px;
}

.main-container{
    border-radius: 10px;
    background-color: #00000030;
    flex: 1;
    padding: 32px;
}

.subtitle{
    font-size: 26px;
    font-weight: 400;
    margin-bottom: 20px;
}

.app-name{
    /*white-space: nowrap;*/
    text-align: center;
}

.icons-container{
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    /*justify-content: space-between;*/
}

.app-element{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 15px;
    cursor: pointer;
    font-size: 14px;
    max-height: 5rem;
    aspect-ratio: 1/1;
    color: rgba(255, 255, 255, 0.708);
    padding: 14px;
    margin: 10px;
    border-radius: 10px;
    justify-content: flex-end;
}

.app-element:hover{
    background-color: #0000004f;    
}

.app-element svg, .app-element img{
    margin-bottom: 10px;
}

.app-finder > div:first-child{
    flex: 1;
    padding: 30px;
}

.app-finder-fade-enter-from,
.app-finder-fade-leave-to {
    opacity: 0;
    transform: translate(-50%, calc(-52% + 20px));
}

/* Estado activo (Durante la animación) */
.app-finder-fade-enter-active {
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); /* Curva suave y rápida */
}

.app-finder-fade-leave-active {
    transition: all 0.2s ease-in; /* Al cerrarse es un poco más directo */
}

/* Estado final (Visible) */
.app-finder-fade-enter-to,
.app-finder-fade-leave-from {
    opacity: 1;
    transform: translate(-50%, -52%);
}

</style>