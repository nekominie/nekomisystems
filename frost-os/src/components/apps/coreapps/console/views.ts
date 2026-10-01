import { defineAsyncComponent } from "vue";

export const views = {
    Main: defineAsyncComponent(() => import('./components/views/console.vue')),
}

export default views;
