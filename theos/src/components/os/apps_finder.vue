<script lang="ts" setup>

import { CoreApps } from '../data/coreapps'
import { processInstructions } from './process_manager'
import { InstalledApps } from '../data/installedapps';
import { useContextMenu } from './context_menu/context_menu.ts'
import IconManager from './iconmanager.vue'

const { openMenu } = useContextMenu()
const { launchApp, togglePinApp, togglePinAppStart } = processInstructions();

const contextMenuApps = (e: MouseEvent, app: any) => {
    openMenu(e, [
        {
            label: 'Abrir',
            action: () => launchApp(app.id)
        },
        { separator: true},
        { 
            label: app.isPinned ? 'Desanclar de la barra de tareas' : 'Anclar en la barra de tareas',
            icon: app.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-fill', 
            action: () => togglePinApp(app.id) 
        },
        { 
            label: app.isPinnedStart ? 'Desanclar del menu de inicio' : 'Anclar en el menu de inicio',
            icon: app.isPinnedStart ? 'bi-pin-angle-fill' : 'bi-pin-fill', 
            action: () => togglePinAppStart(app.id) 
        }
    ])
}

const emit = defineEmits(['close-app-finder'])

const runApp = (id: string) => {
    emit('close-app-finder')
    launchApp(id)
}

</script>

<template>
    <div class="app-finder">
        <div style="height: 100%; display: flex; flex-direction: column;">
            <div class="" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 18px;">                   
                <div class="main-title">Todas las aplicaciones</div>
                <div class="d-flex flex-row">
                    <i class="bi bi-search" style="margin-right: 10px;"></i>
                    <input class="search"/>
                </div>
            </div>

            <div class="main-container">
                <div>
                    <div class="subtitle">Aplicaciones</div>
                    
                    <div class="icons-container">
                        <div
                            v-for="app in InstalledApps" 
                            :key="app.id"
                            @click="runApp(app.id)"
                            class="app-container"                            
                        >
                            <div class="app-element" @contextmenu="contextMenuApps($event, app)">
                                <IconManager :id="app.id" class="taskbar-icon-element" />
                                <div class="app-name">{{ app.name }}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <hr style="margin: 20px 0;">

                <div>
                    <div class="subtitle">Aplicaciones de Sistema</div>
                    <div class="icons-container">
                        <div
                            v-for="app in CoreApps" 
                            :key="app.id"
                            @click="runApp(app.id)"
                            class="app-container"
                            @contextmenu.prevent="contextMenuApps($event, app)"
                        >
                            <div class="app-element">
                                <IconManager :id="app.id" class="taskbar-icon-element" />
                                <div class="app-name">{{ app.name }}</div>               
                            </div>     
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
    max-height: 90vh;
    max-width: 90vw;
    aspect-ratio: 1/1;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -52%);
    background-color: #00000066;
    backdrop-filter: blur(38px);
    border-radius: 15px;
    z-index: 1000;
    color: rgba(255, 255, 255, 0.708);
}

.search{
    border-radius: 5px;
    border: 0;
    background-color: rgba(0, 0, 0, 0.259);
    color: white;
    padding: 6px;
}

.main-title{
    font-size: 25px;
    font-weight: 600;
}

.main-container{
    border-radius: 10px;
    background-color: #00000030;
    flex: 1;
    padding: 14px;
}

.subtitle{
    font-size: 21px;
    font-weight: 400;
    margin-bottom: 11px;
}

.app-name{
    /*white-space: nowrap;*/
    text-align: center;
    font-size: 11px;
    overflow-wrap: break-word;
    hyphens: auto;
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
    
    padding: 7px;
    border-radius: 10px;
    font-size: 14px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.708);
}

.app-container{
    width: 70px;
    margin: 0 5px;

}

.app-element:hover{
    background-color: #0000004f;    
}

.app-element svg, .app-element img{
    margin-bottom: 10px;
    width: 63% !important;
    aspect-ratio: 1/1 !important;
    height: unset !important;
}

.app-finder > div:first-child{
    flex: 1;
    padding: 17px;
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