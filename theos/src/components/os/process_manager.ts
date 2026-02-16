import { reactive, ref } from 'vue'

import type { InstalledAppConfig } from '../data/types.ts'

import { InstalledApps } from '../data/installedapps'
import { CoreApps } from '../data/coreapps.ts'

export const state = reactive({
    installedApps: [...CoreApps, ...InstalledApps] as InstalledAppConfig[],
    topZ: 100,
    lastAction: 'window-spawn'
})

const installedApps = ref(InstalledApps)

export const processInstructions = () => {
    const launchApp = (appId: string) => {

        state.lastAction = 'window-minimize'

        const app = state.installedApps.find(app => app.id === appId)
        if(!app) return

        if(!app.isOpen){
            state.lastAction = 'window-spawn'

            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight

            app.position = {
                x: (screenWidth - app.size.width) / 2,
                y: (screenHeight - app.size.height) / 2
            }
                
            app.isOpen = true
        }
        else{
            state.lastAction = 'window-minimize'
            app.isMinimized = false
        }

        bringToFront(appId)
    }

    const closeApp = (id: string) => {
        const app = state.installedApps.find(app => app.id === id)

        if(app){
            state.lastAction = 'window-spawn'
            app.isOpen = false
        }
    }

    const bringToFront = (appId: string) => {
        const app = state.installedApps.find(a => a.id === appId)

        if(!app) return

        state.installedApps.forEach(a => a.isFocused = false)
        app.isFocused = true

        const maxZ = Math.max(...installedApps.value.map(a => a.zIndex))
            
        if (app.zIndex < maxZ || app.zIndex === 0) {
            state.topZ++
            app.zIndex = state.topZ
        }
            
        app.isMinimized = false
        app.isOpen = true
    }

    const minimizeWindow = (appId: string) => {
        const app = state.installedApps.find(a => a.id === appId)
        if (app) {
            state.lastAction = 'window-minimize'
            app.isMinimized = true
            app.isFocused = false
        }
    }

    const maximizeWindow = (id: string) => {
        const app = state.installedApps.find(a => a.id === id);
        if (!app) return;

        if (!app.isMaximized) {
            app.tempSettings = {
                position: { ...app.position },
                size: { ...app.size }
            };

            app.position = { x: 0, y: 0 };
            app.isMaximized = true;
        }
        else{
            if (app.tempSettings) {
                app.position = { ...app.tempSettings.position };
                app.size = { ...app.tempSettings.size };
            }

            app.isMaximized = false;
        }
    }

    const togglePinApp = (appId: string) => {
        const app = state.installedApps.find(a => a.id === appId)
        if (app) {
            app.isPinned = !app.isPinned
        }
    }

    return { state, launchApp, bringToFront, closeApp, minimizeWindow: minimizeWindow, maximizeWindow, togglePinApp }
}