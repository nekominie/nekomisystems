<script setup lang="ts">

import type { App } from '../data/app'
import { computed, ref } from 'vue'
import IconManager from './iconmanager.vue';

const props = defineProps<{
    app: App,
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
    emit('focus', props.app.manifest.id);

    let startX = initialCoords.x - props.app.runtime.position.x;
    let startY = initialCoords.y - props.app.runtime.position.y;

    const onMove = (e: MouseEvent | TouchEvent) => {
        const coords = getCoords(e);

        if(props.app.runtime.isMaximized){
            const mouseXRatio = coords.x / window.innerWidth;

            const restoredWidth = props.app.runtime.tempSettings?.size.width || 600;
            const newX = coords.x - (restoredWidth * mouseXRatio);

            props.app.runtime.isMaximized = false;
            props.app.runtime.position.x = newX;
            props.app.runtime.position.y = 0;

            startX = coords.x - props.app.runtime.position.x;
            startY = coords.y - props.app.runtime.position.y;
            
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
        const minX = -(props.app.runtime.size.width - minVisibleWidth);
        const maxX = window.innerWidth - minVisibleWidth;

        newX = Math.max(minX, Math.min(newX, maxX));

        const taskbarHeight = 48; 
        const maxY = window.innerHeight - taskbarHeight - 26;
        newY = Math.max(0, Math.min(newY, maxY));
        // # # # # # # #   

        props.app.runtime.position.x = newX;
        props.app.runtime.position.y = newY;        
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

    if (props.app.runtime.isMaximized) {
        return {
            zIndex: props.app.runtime.zIndex,
            top: '0px',
            left: '0px',
            width: '100%',
            //height: '100%' // O 
            height: `calc(100% - ${taskbarHeight})`
        };
    }

    return {
        zIndex: props.app.runtime.zIndex,
        left: props.app.runtime.position.x + 'px',
        top: props.app.runtime.position.y + 'px',
        width: props.app.runtime.size.width + 'px',
        height: props.app.runtime.size.height + 'px'
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

    if (props.app.runtime.isMaximized) return;
    isResizing.value = true;

    const startX = initialCoords.x;
    const startY = initialCoords.y;
    const startWidth = props.app.runtime.size.width;
    const startHeight = props.app.runtime.size.height;
    const startPosX = props.app.runtime.position.x;
    const startPosY = props.app.runtime.position.y;

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
                const appMinWidth = props.app.manifest.window?.minSize?.width;
                const appMinHeight = props.app.manifest.window?.minSize?.height;

                const minW = (appMinWidth == 0) || (appMinWidth == undefined) ? defaultWidth : appMinWidth; 
                const minH = (appMinHeight == 0) || (appMinHeight == undefined) ? defaultHeight : appMinHeight;

                if (direction.includes('e')) {
                    props.app.runtime.size.width = Math.max(minW, startWidth + deltaX);
                }

                if (direction.includes('w')) {
                    const newWidth = Math.max(minW, startWidth - deltaX);
                    
                    if (newWidth !== minW) {
                        props.app.runtime.size.width = newWidth;
                        props.app.runtime.position.x = startPosX + deltaX;
                    }
                }

                if (direction.includes('s')) {
                    props.app.runtime.size.height = Math.max(minH, startHeight + deltaY);
                }

                if (direction.includes('n')) {            
                    const newHeight = Math.max(minH, startHeight - deltaY);
                    
                    if (newHeight !== minH) {
                        props.app.runtime.size.height = newHeight;
                        props.app.runtime.position.y = startPosY + deltaY;
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
            'focused' : app.runtime.isFocused,
            'maximized' : app.runtime.isMaximized,
            'dragging' : isDragging,
            'resizing' : isResizing,
            'no-transitions' : isResizing || isDragging
        }"        

        :style="windowStyles"
        @mousedown.capture="$emit('focus', app.manifest.id)"
        @touchstart.capture="$emit('focus', app.manifest.id)"
    >
        <div class="resizer n" @mousedown.stop="startResize('n', $event)"></div>
        <div class="resizer s" @mousedown.stop="startResize('s', $event)"></div>
        <div class="resizer e" @mousedown.stop="startResize('e', $event)"></div>
        <div class="resizer w" @mousedown.stop="startResize('w', $event)"></div>
        <div class="resizer nw" @mousedown.stop="startResize('nw', $event)"></div>
        <div class="resizer ne" @mousedown.stop="startResize('ne', $event)"></div>
        <div class="resizer sw" @mousedown.stop="startResize('sw', $event)"></div>
        <div class="resizer se" @mousedown.stop="startResize('se', $event)"></div>
        
        <div class="window-header"@mousedown="startDrag" @touchstart="startDrag" @dblclick="$emit('maximize', app.manifest.id)">
            <div class="window-header-titles">
                <IconManager :id="app.manifest.id" class="taskbar-icon-element" />
                <div>{{ app.manifest.name }}</div>
            </div>

            <div></div>

            <div class="window-header-btns">
                <button class="minimize-btn" @click.stop="emit('minimize', app.manifest.id)">
                    <i class="bi bi-dash-lg"></i>
                </button>

                <button class="maximize-btn" @click.stop="emit('maximize', app.manifest.id)">
                    <i
                        :class="{ 'bi-fullscreen-exit': app.runtime.isMaximized, 'bi-fullscreen': !app.runtime.isMaximized }"></i>
                </button>

                <button class="close-btn" @click.stop="emit('close', app.manifest.id)">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>

        <div :id="'window-content-' + app.manifest.id" class="window-content">

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