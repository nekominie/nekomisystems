import { defineAsyncComponent } from "vue";

export default {
    Main: defineAsyncComponent(() => import('./components/views/desktopmiku.vue')),
    Config: defineAsyncComponent(() => import('./components/views/ui_config.vue'))
}