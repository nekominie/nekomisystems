<script setup lang="ts">
import type { App, WindowInstance } from '../data/app'
import { computed, ref, onMounted } from 'vue'
import IconManager from './iconmanager.vue';
import { getViewsForApp } from "../apps/views_loader.ts"

const props = defineProps<{
    app: App,
    win: WindowInstance
}>()

const emit = defineEmits<{
    (e: 'close', id: string): void
    (e: 'minimize', id: string): void
    (e: 'maximize', id: string): void
    (e: 'focus', id: string): void
}>()

onMounted(() => {
    // Si la ventana trae parámetros de tamaño específicos al crearse
    if (props.win.params?.width) {
        props.win.size.width = props.win.params.width;
    }
    if (props.win.params?.height) {
        props.win.size.height = props.win.params.height;
    }
    
    // Lo mismo para la posición si quieres que aparezca en un lugar exacto
    if (props.win.params?.x !== undefined) {
        props.win.position.x = props.win.params.x;
    }
    if (props.win.params?.y !== undefined) {
        props.win.position.y = props.win.params.y;
    }
})

const isDragging = ref(false);
const isResizing = ref(false);

const currentComponent = computed(() => {
    const appViews = getViewsForApp(props.win.appId);
    
    if (!appViews) return null;

    const targetView = props.win.view || 'Main';

    return appViews[targetView];
})

const startDrag = (event: MouseEvent | TouchEvent) => {
    const getCoords = (e: MouseEvent | TouchEvent) => {
        if ('touches' in e && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
    };

    const initialCoords = getCoords(event);
    isDragging.value = true;
    emit('focus', props.win.id);

    // --- LÓGICA DE UNMAXIMIZE ---
    if (props.win.isMaximized && props.win.tempSettings) {
        // 1. Desmaximizar
        props.win.isMaximized = false;
        
        // 2. Restaurar tamaño y posición guardada
        props.win.size = { ...props.win.tempSettings.size };
        
        // 3. Calcular nueva posición para que el ratón quede en el centro (o proporcional)
        // Aquí centramos la ventana restaurada bajo el cursor
        const restoreWidth = props.win.size.width;
        props.win.position.x = initialCoords.x - (restoreWidth / 2);
        props.win.position.y = 0; // La pegamos arriba al desmaximizar
    }
    // ----------------------------

    // Ahora calculamos el offset basado en la posición ACTUAL (ya sea normal o recién restaurada)
    let startX = initialCoords.x - props.win.position.x;
    let startY = initialCoords.y - props.win.position.y;

    const onMove = (e: MouseEvent | TouchEvent) => {
        const coords = getCoords(e);
        
        let newX = coords.x - startX;
        let newY = coords.y - startY;

        // Limites para que no salga de pantalla
        const minVisibleWidth = 100;
        const maxX = window.innerWidth - minVisibleWidth;
        const maxY = window.innerHeight - 48 - 26; 

        newX = Math.max(-(props.win.size.width - minVisibleWidth), Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        props.win.position.x = newX;
        props.win.position.y = newY;        
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
    if (props.win.isMaximized) {
        return {
            zIndex: props.win.zIndex,
            left: '0px',
            top: '0px',
            width: '100%',
            height: 'calc(100% - 48px)' // Ajusta según el alto de tu barra de tareas
        }
    }

    return {
        zIndex: props.win.zIndex,
        left: props.win.position.x + 'px',
        top: props.win.position.y + 'px',
        width: props.win.size.width + 'px',
        height: props.win.size.height + 'px'
    }
})

const surfaceVars = computed(() => {
    const s = props.app.manifest.window?.surface
    const mode = s?.mode ?? 'os-glass'
    return {
        '--os-frame-bg': mode === 'os-glass' ? (s?.os?.frameBg ?? 'rgba(70,70,70,0.45)') : 'transparent',
        '--os-frame-blur': mode === 'os-glass' ? (s?.os?.frameBlur ?? 'blur(24px)') : 'none',
        '--content-bg': mode === 'os-glass' ? (s?.os?.contentBg ?? 'transparent') : (s?.app?.contentBg ?? '#0b0d12'),
    }
})

const startResize = (direction: string, event: MouseEvent | TouchEvent) => {
    if (props.win.isMaximized) return; // No redimensionar si está maximizada
    
    isResizing.value = true;
    document.body.classList.add('resizing-global');
    document.body.style.cursor = direction + '-resize';

    const getCoords = (e: MouseEvent | TouchEvent) => {
        return 'touches' in e ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : { x: e.clientX, y: e.clientY };
    };

    const initialCoords = getCoords(event);
    
    // --- ESTADO INICIAL ---
    // Usamos directamente las propiedades de la ventana, no tempSettings
    const startWidth = props.win.size.width;
    const startHeight = props.win.size.height;
    const startPosX = props.win.position.x;
    const startPosY = props.win.position.y;

    const onMove = (e: MouseEvent | TouchEvent) => {
        const coords = getCoords(e);
        const deltaX = coords.x - initialCoords.x;
        const deltaY = coords.y - initialCoords.y;
        
        const minSize = props.app.manifest.window?.minSize ?? { width: 200, height: 200 };

        // --- EAST / SOUTH (Aumentan tamaño directamente) ---
        if (direction.includes('e')) {
            props.win.size.width = Math.max(minSize.width, startWidth + deltaX);
        }
        if (direction.includes('s')) {
            props.win.size.height = Math.max(minSize.height, startHeight + deltaY);
        }
        
        // --- WEST (Aumenta tamaño y mueve la posición X) ---
        if (direction.includes('w')) {
            const newWidth = Math.max(minSize.width, startWidth - deltaX);
            props.win.size.width = newWidth;
            // La posición X se ajusta para que el borde izquierdo "se mueva"
            props.win.position.x = startPosX + (startWidth - newWidth);
        }
        
        // --- NORTH (Aumenta tamaño y mueve la posición Y) ---
        if (direction.includes('n')) {
            const newHeight = Math.max(minSize.height, startHeight - deltaY);
            props.win.size.height = newHeight;
            // La posición Y se ajusta para que el borde superior "se mueva"
            props.win.position.y = startPosY + (startHeight - newHeight);
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
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
}

const isSnippet = computed(() => {
    // 1. Si la ventana especificó explícitamente en sus parámetros ocultar el marco, le hacemos caso
    if (props.win.params?.hideFrame !== undefined) {
        return props.win.params.hideFrame;
    }
    
    // 2. Comportamiento por defecto: Si es un snippet y es su vista principal, no lleva marco
    return !!props.app.manifest.snippet && (!props.win.view || props.win.view === 'Main');
})

</script>

<style scoped>
    @import '../styles/window.css';
</style>

<template>
    <div v-if="isSnippet">
        <component :is="currentComponent"/>
    </div>

    <div v-else class="window-frame"
        :class="{
            'focused' : win.isFocused,
            'maximized' : win.isMaximized,
            'dragging' : isDragging,
            'resizing' : isResizing,
            'no-transitions' : isResizing || isDragging
        }"        
        :style="[windowStyles, surfaceVars]"
        @mousedown.capture="emit('focus', win.id)"
    >
        <div class="resizer n" @mousedown.stop="startResize('n', $event)"></div>
        <div class="resizer s" @mousedown.stop="startResize('s', $event)"></div>
        <div class="resizer e" @mousedown.stop="startResize('e', $event)"></div>
        <div class="resizer w" @mousedown.stop="startResize('w', $event)"></div>
        <div class="resizer nw" @mousedown.stop="startResize('nw', $event)"></div>
        <div class="resizer ne" @mousedown.stop="startResize('ne', $event)"></div>
        <div class="resizer sw" @mousedown.stop="startResize('sw', $event)"></div>
        <div class="resizer se" @mousedown.stop="startResize('se', $event)"></div>
        
        <div class="window-header" @mousedown="startDrag" @dblclick="emit('maximize', win.id)">
            <div class="window-header-titles">
                <IconManager :id="app.manifest.id" class="taskbar-icon-element" />
                <div>{{ win.title || app.manifest.name }}</div>
            </div>

            <div class="window-header-btns">
                <button class="minimize-btn" @click.stop="emit('minimize', win.id)">
                    <i class="bi bi-dash-lg"></i>
                </button>
                <button class="maximize-btn" @click.stop="emit('maximize', win.id)">
                    <i :class="win.isMaximized ? 'bi-fullscreen-exit' : 'bi-fullscreen'"></i>
                </button>
                <button class="close-btn" @click.stop="emit('close', win.id)">
                    <i class="bi bi-x-lg"></i>
                </button>
            </div>
        </div>

        <div :id="'window-content-' + win.id" class="window-content">
            <div
                class="cursor-shield"
                v-if="isDragging || isResizing"                
            ></div>

            <component v-if="currentComponent" :is="currentComponent" :win="win" />

            <div v-else 
                style="display: flex; justify-content: center; align-items: center; height: 100%; color: #afafafe0; background-color: #434343c2; backdrop-filter: blur(60px);"
            >
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