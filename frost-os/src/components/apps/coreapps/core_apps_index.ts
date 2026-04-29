import { defineAsyncComponent, markRaw } from 'vue'

export const CoreAppsIndex: Record<string, any> = {
    task_supervisor: markRaw(defineAsyncComponent(() => import('./task_supervisor/components/views/task_supervisor.vue'))),
    settings: markRaw(defineAsyncComponent(() => import('./settings/settings.vue'))),
}