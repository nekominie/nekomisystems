import { createApp } from 'vue';
import App from './App.vue';

// Import ONLY Bootstrap Icons (avoiding bootstrap CSS global resets that clash with Tailwind/custom design)
import 'bootstrap-icons/font/bootstrap-icons.css';

import './styles/main.css';

createApp(App).mount('#app');

