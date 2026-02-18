<script setup lang="ts">

import type { InstalledAppConfig } from '../data/types'
import { computed, ref } from 'vue'
import IconManager from './iconmanager.vue';

const props = defineProps<{
    appData: InstalledAppConfig,
    component: any
}>()

const emit = defineEmits<{
    (e: 'close', id: string): void
    (e: 'minimize', id: string): void
    (e: 'maximize', id: string): void
    (e: 'focus', id: string): void
}>()

const isDragging = ref(false);
const isResizing = ref(false);
let ticking = false;

const startDrag = (event: MouseEvent | TouchEvent) => {

    const getCoords = (e: MouseEvent | TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    };

    const initialCoords = getCoords(event);
    isDragging.value = true;
    emit('focus', props.appData.id);

    let startX = initialCoords.x - props.appData.position.x;
    let startY = initialCoords.y - props.appData.position.y;

    const onMove = (e: MouseEvent | TouchEvent) => {
        const coords = getCoords(e);

        if(props.appData.isMaximized){
            const mouseXRatio = coords.x / window.innerWidth;

            const restoredWidth = props.appData.tempSettings?.size.width || 600;
            const newX = coords.x - (restoredWidth * mouseXRatio);

            props.appData.isMaximized = false;
            props.appData.position.x = newX;
            props.appData.position.y = 0;

            startX = coords.x - props.appData.position.x;
            startY = coords.y - props.appData.position.y;
            
            return;
        }
                        
        /*props.appData.position.x = e.clientX - startX;
        props.appData.position.y = e.clientY - startY;*/

        let newX = coords.x - startX;
        let newY = coords.y - startY;

        //# # # # LA VENTANA NO SE PUEDE MOVER FUERA DE LA PANTALLA
        /*const maxX = window.innerWidth - props.appData.size.width;
        const maxY = window.innerHeight - props.appData.size.height - 48;

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));*/
        // # # # # # # #

        // # # # # LA VENTANA NO SE PUEDE MOVER FUERA DE LA PANTALLA VERTICALMENTE
        const minVisibleWidth = 100;
        const minX = -(props.appData.size.width - minVisibleWidth);
        const maxX = window.innerWidth - minVisibleWidth;

        newX = Math.max(minX, Math.min(newX, maxX));

        const taskbarHeight = 48; 
        const maxY = window.innerHeight - taskbarHeight - 26;
        newY = Math.max(0, Math.min(newY, maxY));
        // # # # # # # #   

        props.appData.position.x = newX;
        props.appData.position.y = newY;        
    };

    const onEnd = () => {
        isDragging.value = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
}  

const windowStyles = computed(() => {
    const taskbarHeight = '49.5px';

    if (props.appData.isMaximized) {
        return {
            zIndex: props.appData.zIndex,
            top: '0px',
            left: '0px',
            width: '100%',
            //height: '100%' // O 
            height: `calc(100% - ${taskbarHeight})`
        };
    }

    return {
        zIndex: props.appData.zIndex,
        left: props.appData.position.x + 'px',
        top: props.appData.position.y + 'px',
        width: props.appData.size.width + 'px',
        height: props.appData.size.height + 'px'
    };
})

const startResize = (direction: string, event: MouseEvent | TouchEvent) => {

    const getCoords = (e: MouseEvent | TouchEvent) => {
        if ('touches' in e) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    };

    const initialCoords = getCoords(event);

    //Soluciona errores??!!
    //Si el contenido de tu ventana (el iframe o el textarea) captura el mouse mientras te mueves, el reescalado se detendrá. Asegúrate de añadir esto mientras reescalas:
    /*document.body.style.cursor = direction + '-resize';
    document.body.style.userSelect = 'none';*/

    document.body.classList.add('resizing-global');
    document.body.style.cursor = direction + '-resize';

    if (props.appData.isMaximized) return;
    isResizing.value = true;

    const startX = initialCoords.x;
    const startY = initialCoords.y;
    const startWidth = props.appData.size.width;
    const startHeight = props.appData.size.height;
    const startPosX = props.appData.position.x;
    const startPosY = props.appData.position.y;

    let ticking = false;

    const onMove = (e: MouseEvent | TouchEvent) => {
        if (e.cancelable) e.preventDefault();

        if(!ticking){
            window.requestAnimationFrame(() => {            
                const coords = getCoords(e);
                const deltaX = coords.x - startX;
                const deltaY = coords.y - startY;

                const defaultWidth = 200;
                const defaultHeight = 200;
                const appMinWidth = props.appData.minSize?.width;
                const appMinHeight = props.appData.minSize?.height;

                const minW = (appMinWidth == 0) || (appMinWidth == undefined) ? defaultWidth : appMinWidth; 
                const minH = (appMinHeight == 0) || (appMinHeight == undefined) ? defaultHeight : appMinHeight;

                if (direction.includes('e')) {
                    props.appData.size.width = Math.max(minW, startWidth + deltaX);
                }

                if (direction.includes('w')) {
                    const newWidth = Math.max(minW, startWidth - deltaX);
                    
                    if (newWidth !== minW) {
                        props.appData.size.width = newWidth;
                        props.appData.position.x = startPosX + deltaX;
                    }
                }

                if (direction.includes('s')) {
                    props.appData.size.height = Math.max(minH, startHeight + deltaY);
                }

                if (direction.includes('n')) {            
                    const newHeight = Math.max(minH, startHeight - deltaY);
                    
                    if (newHeight !== minH) {
                        props.appData.size.height = newHeight;
                        props.appData.position.y = startPosY + deltaY;
                    }
                }

                ticking = false;
            });
            ticking = true;
        }
    };

    const onEnd = () => {
        isResizing.value = false;

        document.body.classList.remove('resizing-global');
        document.body.style.cursor = 'default';

        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onEnd);        
        
        //Soluciona errores??!!
        //Si el contenido de tu ventana (el iframe o el textarea) captura el mouse mientras te mueves, el reescalado se detendrá. Asegúrate de añadir esto mientras reescalas:
        /*document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';*/
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
}

</script>

<style scoped>
    @import '../styles/window.css';
</style>

<template>
    <div class="window-frame"
        :class="{
            'focused' : appData.isFocused,
            'maximized' : appData.isMaximized,
            'dragging' : isDragging,
            'resizing' : isResizing,
            'no-transitions' : isResizing || isDragging
        }"        

        :style="windowStyles"
        @mousedown.capture="$emit('focus', appData.id)"
        @touchstart.capture="$emit('focus', appData.id)"
    >
        <div class="resizer n" @mousedown.stop="startResize('n', $event)"></div>
        <div class="resizer s" @mousedown.stop="startResize('s', $event)"></div>
        <div class="resizer e" @mousedown.stop="startResize('e', $event)"></div>
        <div class="resizer w" @mousedown.stop="startResize('w', $event)"></div>
        <div class="resizer nw" @mousedown.stop="startResize('nw', $event)"></div>
        <div class="resizer ne" @mousedown.stop="startResize('ne', $event)"></div>
        <div class="resizer sw" @mousedown.stop="startResize('sw', $event)"></div>
        <div class="resizer se" @mousedown.stop="startResize('se', $event)"></div>
        
        <div class="window-header"@mousedown="startDrag" @touchstart="startDrag" @dblclick="$emit('maximize', appData.id)">
            <div class="window-header-titles">
                <IconManager :id="appData.id" class="taskbar-icon-element" />
                <div>{{ appData.name }}</div>
            </div>

            <div></div>

            <div class="window-header-btns">
                <button class="minimize-btn" @click.stop="emit('minimize', appData.id)"><i class="bi bi-dash-lg"></i></button>
                <button class="maximize-btn" @click.stop="emit('maximize', appData.id)"><i class="bi bi-arrows-fullscreen"></i></button>
                <button class="close-btn" @click.stop="emit('close', appData.id)"><i class="bi bi-x-lg"></i></button>
            </div>
        </div>

        <div :id="'window-content-' + appData.id" class="window-content">

            <div
                class="cursor-shield"
                v-if="isDragging || isResizing"                
            >
            </div>

            <component :is="component" v-if="component" />
            <div v-else style="display: flex; justify-content: center; align-items: center; height: 100%; color: #afafafe0;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <i class="bi-emoji-dizzy" style="font-size: 4rem;"></i>
                    <div style="font-weight: 600; font-size: 22px; display: flex; flex-direction: column;">
                        No fue posible cargar la aplicación
                        <div style="display: flex; justify-content: center; font-weight: 500; font-size: 16px; color: #ffffff3d;">Error: null component</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>