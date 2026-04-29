import { createApp } from 'vue'
import Computer from './components/computer.vue'
import { createPinia } from "pinia"

import 'bootstrap-icons/font/bootstrap-icons.css'
import "./components/styles/global.css"
import "./components/styles/libraries/bootstrap-custom.scss"
import "bootstrap/dist/js/bootstrap.bundle.min.js"
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

const app = createApp(Computer)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')