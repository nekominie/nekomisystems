import { defineAsyncComponent } from "vue";

export const views = {
    Main: defineAsyncComponent(() => import('./components/views/pdf_viewer.vue')),
}

export default views;
