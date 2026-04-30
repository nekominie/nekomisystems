import { defineAsyncComponent } from "vue";

export default {
    Main: defineAsyncComponent(() => import('./components/views/notepad.vue')),
}