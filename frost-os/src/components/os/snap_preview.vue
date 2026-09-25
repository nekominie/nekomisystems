<script setup lang="ts">
import { computed } from 'vue';
import type { SnapTarget } from '../data/app';

const props = defineProps<{
    target: SnapTarget | null
}>();

const previewStyle = computed(() => {
    const taskbarH = 48; // Alto de la barra de tareas
    const margin = 8; // Margen exterior
    const gap = 8; // Espacio entre divisiones

    switch (props.target) {
        case 'maximize':
            return {
                left: `${margin}px`,
                top: `${margin}px`,
                width: `calc(100% - ${margin * 2}px)`,
                height: `calc(100% - ${taskbarH + margin * 2}px)`
            };
        case 'left':
            return {
                left: `${margin}px`,
                top: `${margin}px`,
                width: `calc(50% - ${margin + gap / 2}px)`,
                height: `calc(100% - ${taskbarH + margin * 2}px)`
            };
        case 'right':
            return {
                left: `calc(50% + ${gap / 2}px)`,
                top: `${margin}px`,
                width: `calc(50% - ${margin + gap / 2}px)`,
                height: `calc(100% - ${taskbarH + margin * 2}px)`
            };
        case 'top-left':
            return {
                left: `${margin}px`,
                top: `${margin}px`,
                width: `calc(50% - ${margin + gap / 2}px)`,
                height: `calc((100% - ${taskbarH}) / 2 - ${margin + gap / 2}px)`
            };
        case 'bottom-left':
            return {
                left: `${margin}px`,
                top: `calc((100% - ${taskbarH}) / 2 + ${gap / 2}px)`,
                width: `calc(50% - ${margin + gap / 2}px)`,
                height: `calc((100% - ${taskbarH}) / 2 - ${margin + gap / 2}px)`
            };
        case 'top-right':
            return {
                left: `calc(50% + ${gap / 2}px)`,
                top: `${margin}px`,
                width: `calc(50% - ${margin + gap / 2}px)`,
                height: `calc((100% - ${taskbarH}) / 2 - ${margin + gap / 2}px)`
            };
        case 'bottom-right':
            return {
                left: `calc(50% + ${gap / 2}px)`,
                top: `calc((100% - ${taskbarH}) / 2 + ${gap / 2}px)`,
                width: `calc(50% - ${margin + gap / 2}px)`,
                height: `calc((100% - ${taskbarH}) / 2 - ${margin + gap / 2}px)`
            };
        default:
            return {};
    }
});
</script>

<template>
    <Transition name="snap-preview">
        <div 
            v-if="target" 
            class="snap-preview-container" 
            :style="previewStyle"
        >
            <div class="snap-preview-card">
                <div class="snap-preview-header">
                    <div class="snap-preview-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <div class="snap-preview-body"></div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.snap-preview-container {
    position: absolute;
    z-index: 9990;
    pointer-events: none;
    box-sizing: border-box;
    transition: 
        left 0.16s cubic-bezier(0.16, 1, 0.3, 1),
        top 0.16s cubic-bezier(0.16, 1, 0.3, 1),
        width 0.16s cubic-bezier(0.16, 1, 0.3, 1),
        height 0.16s cubic-bezier(0.16, 1, 0.3, 1);
}

.snap-preview-card {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.16);
    backdrop-filter: blur(28px) saturate(160%);
    -webkit-backdrop-filter: blur(28px) saturate(160%);
    border: 1.5px solid rgba(255, 255, 255, 0.55);
    box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.35),
        inset 0 0 0 1px rgba(255, 255, 255, 0.25);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.snap-preview-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
        circle at 50% 0%, 
        rgba(255, 255, 255, 0.28) 0%, 
        rgba(255, 255, 255, 0.04) 75%
    );
    pointer-events: none;
}

.snap-preview-header {
    height: 32px;
    width: 100%;
    background: rgba(255, 255, 255, 0.14);
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    padding-left: 14px;
}

.snap-preview-dots {
    display: flex;
    gap: 6px;
}

.snap-preview-dots span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
}

.snap-preview-body {
    flex: 1;
}

/* Transición de aparición/desaparición */
.snap-preview-enter-active,
.snap-preview-leave-active {
    transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

.snap-preview-enter-from,
.snap-preview-leave-to {
    opacity: 0;
    transform: scale(0.96);
}
</style>
