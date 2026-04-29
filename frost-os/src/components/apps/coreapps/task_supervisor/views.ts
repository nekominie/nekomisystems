import { defineAsyncComponent } from "vue";

export default {
    Aggrid: defineAsyncComponent(() => import('./components/views/task_supervisor_aggrid.vue')),
    Main: defineAsyncComponent(() => import('./components/views/task_supervisor.vue')),
    Modern: defineAsyncComponent(() => import('./components/views/task_supervisor_modern.vue'))
}