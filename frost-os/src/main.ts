import { createApp } from 'vue'
import Computer from './components/computer.vue'

import 'bootstrap-icons/font/bootstrap-icons.css'
import "./components/styles/libraries/bootstrap-custom.scss"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'
ModuleRegistry.registerModules([AllCommunityModule])

createApp(Computer).mount('#app')