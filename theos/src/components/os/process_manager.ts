import { reactive, ref, onMounted } from 'vue'

import type { InstalledAppConfig } from '../data/types.ts'

import { db } from '../../database/db.ts'
import html2canvas from 'html2canvas';

import { InstalledApps } from '../data/installedapps'
import { CoreApps } from '../data/coreapps.ts'

export const state = reactive({
    installedApps: [...CoreApps, ...InstalledApps] as InstalledAppConfig[],
    topZ: 100,
    lastAction: 'window-spawn'
})

const installedApps = ref(InstalledApps)

export const processInstructions = () => {

    onMounted(async () => {
        const savedSettings = await db.appSettings.toArray()

        savedSettings.forEach(saved => {
            const app = state.installedApps.find(a => a.id === saved.id)
            if(app){
                app.isPinned = saved.isPinned
                app.isPinnedStart = saved.isPinnedStart
            }
        })
    })

    const togglePinApp = async (id: string) => {
        const app = state.installedApps.find(a => a.id === id)
        if(app){
            app.isPinned = !app.isPinned

            await db.appSettings.put({ 
                id: app.id, 
                isPinnedStart: app.isPinnedStart,
                isPinned: app.isPinned })
        }
    }

    const togglePinAppStart = async (id: string) => {
        const app = state.installedApps.find(a => a.id === id)
        if(app){
            app.isPinnedStart = !app.isPinnedStart

            await db.appSettings.put({ 
                id: app.id,
                isPinned: app.isPinned,
                isPinnedStart: app.isPinnedStart })
        }
    }

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

        setTimeout(() => {
            updatePreviewImage(app.id)
        }, 100);

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

        const currentFocused = state.installedApps.find(app => app.isFocused)
        if(currentFocused && currentFocused.id !== app.id){
            updatePreviewImage(currentFocused.id)
        }

        console.log('brought to front!')

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
            updatePreviewImage(app.id)
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

        updatePreviewImage(app.id)
    }

    const updatePreviewImage = async (appId: string) => {
        const el = document.getElementById(`window-content-${appId}`);
        
        if (el) {
            try {
                const canvas = await html2canvas(el, {
                    backgroundColor: null,
                    scale: 0.3,
                    logging: false,
                    useCORS: true
                });
                
                const app = state.installedApps.find(a => a.id === appId);
                if (app) {
                    app.previewImg = canvas.toDataURL('image/webp', 0.3);
                }

            } catch (err) {
                console.error("Error capturando preview:", err);
            }
        }
    };

    return { 
        state, 
        launchApp, 
        bringToFront, 
        closeApp, 
        minimizeWindow: minimizeWindow, 
        maximizeWindow, 
        togglePinApp, 
        togglePinAppStart 
    }
}