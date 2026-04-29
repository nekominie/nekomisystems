import { defineAsyncComponent } from "vue";

export default {
    Main: defineAsyncComponent(() => import('./components/views/discord.vue')),
}