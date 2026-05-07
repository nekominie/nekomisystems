import { defineAsyncComponent } from "vue";

export default {
    Main: defineAsyncComponent(() => import('./components/views/run.vue')),
}