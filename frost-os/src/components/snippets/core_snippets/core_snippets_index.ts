import { defineAsyncComponent, markRaw } from 'vue'

export const CoreSnippetsIndex: Record<string, any> = {
    volume_slider: markRaw(defineAsyncComponent(() => import('./volume/volume_slider.vue'))),
}