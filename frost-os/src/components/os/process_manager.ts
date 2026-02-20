import { reactive, nextTick } from 'vue'

import type { App, Manifest, UserSettings } from '../data/app'
import { createApp } from '../data/create_app'
import { InstalledApps } from '../data/installedapps'
import { CoreApps } from '../data/coreapps'

import { db } from '../../database/db.ts'
import html2canvas from 'html2canvas';

export const state = reactive({
    apps: [] as App[],
    topZ: 100,
    lastAction: 'window-spawn'
})

let initialized = false

async function init() {
    if (initialized) return
    initialized = true

    const manifests: Manifest[] = [...CoreApps, ...InstalledApps]
    const userMap = await loadUserSettingsMap()

    state.apps = manifests.map(m => 
        createApp(m, userMap.get(m.id))
    )

    for (const app of state.apps) {
        if (app.manifest.preferences?.startInTray) {
            app.runtime.isRunning = true
            app.runtime.isInTray = true
            app.runtime.isWindowOpen = false
        }
    }

    async function loadUserSettingsMap() {
        const rows = await db.appSettings.toArray()
        const map = new Map<string, Partial<UserSettings>>()

        for (const r of rows) {
            map.set(r.id, {
            isPinned: r.isPinned,
            isPinnedStart: r.isPinnedStart,
            isPinnedDesktop: r.isPinnedDesktop,
            // overrides: ... si luego lo agregas
            })
        }
        return map
    }    
}

export const processInstructions = () => {

    init().catch(err => console.error(err))

    const togglePinApp = async (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id)
        if(app){
            app.user.isPinned = !app.user.isPinned

            await db.appSettings.put({ 
                id: id, 
                isPinnedStart: app.user.isPinnedStart,
                isPinned: app.user.isPinned,
                isPinnedDesktop: app.user.isPinnedDesktop 
            })
        }
    }

    const togglePinAppStart = async (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id)
        if(app){
            app.user.isPinnedStart = !app.user.isPinnedStart

            await db.appSettings.put({ 
                id: id,
                isPinned: app.user.isPinned,
                isPinnedStart: app.user.isPinnedStart,
                isPinnedDesktop: app.user.isPinnedDesktop 
            })
        }
    }

    const togglePinAppDesktop = async (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id)
        if(app){
            app.user.isPinnedDesktop = !app.user.isPinnedDesktop

            await db.appSettings.put({
                id: id,
                isPinned: app.user.isPinned,
                isPinnedDesktop: app.user.isPinnedDesktop,
                isPinnedStart: app.user.isPinnedStart
            })

            await db.desktopIcons.put({ 
                id: id, 
                col: app.runtime.position.x, 
                row: app.runtime.position.y 
            })

            if (!app.user.isPinnedDesktop) {
                await db.desktopIcons.delete(id)
            }
        }
    }

    const launchApp = async (id: string) => {
        const app = state.apps.find(app => app.manifest.id === id)
        if(!app) return

        if(!app.runtime.isRunning){
            //Abrir desde cero
            state.lastAction = 'window-spawn'

            app.runtime.isRunning = true

            const w = app.manifest.window?.defaultSize ?? { width: 600, height: 400 }
            app.runtime.size = { ...w }

            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight

            app.runtime.position = {
                x: (screenWidth - app.runtime.size.width) / 2,
                y: (screenHeight - app.runtime.size.height) / 2
            }
                
            app.runtime.isWindowOpen = true
            app.runtime.isMinimized = false

            setTimeout(() => {
                updatePreviewImage(id)                
            }, 100);

            bringToFront(id)
            return
        }

        if(app.runtime.isFocused && !app.runtime.isMinimized){
            //Minimizar
            updatePreviewImage(id)        

            state.lastAction = 'window-minimize'
            await nextTick()            

            app.runtime.isMinimized = true
            app.runtime.isFocused = false
            return
        }

        //desminimizar/restaurar
        state.lastAction = 'window-minimize'
        await nextTick()
        app.runtime.isMinimized = false
        bringToFront(id)
    }

    const closeApp = (id: string) => {
        const app = state.apps.find(app => app.manifest.id === id)

        if(app){
            state.lastAction = 'window-spawn'
            app.runtime.isWindowOpen = false
            app.runtime.isRunning = false
        }
    }

    const bringToFront = (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id);
        if (!app) return;

        const currentFocused = state.apps.find(a => a.runtime.isFocused);
        if (currentFocused && currentFocused.manifest.id !== id) 
            updatePreviewImage(id)        

        if (app.runtime.isFocused && !app.runtime.isMinimized && app.runtime.zIndex === state.topZ) return;

        state.apps.forEach(a => a.runtime.isFocused = false);
        
        state.topZ++; 
        app.runtime.zIndex = state.topZ;
        app.runtime.isFocused = true;
        app.runtime.isMinimized = false;
        app.runtime.isWindowOpen = true;
    };

    const minimizeWindow = async (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id)
        if (app) {
            updatePreviewImage(id)

            state.lastAction = 'window-minimize'
            await nextTick()

            app.runtime.isMinimized = true
            app.runtime.isFocused = false
        }
    }

    const maximizeWindow = (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id);
        if (!app) return;

        updatePreviewImage(id)

        if (!app.runtime.isMaximized) {
            app.runtime.tempSettings = {
                position: { ...app.runtime.position },
                size: { ...app.runtime.size }
            };

            app.runtime.position = { x: 0, y: 0 };
            app.runtime.isMaximized = true;
        }
        else{
            if (app.runtime.tempSettings) {
                app.runtime.position = { ...app.runtime.tempSettings.position };
                app.runtime.size = { ...app.runtime.tempSettings.size };
            }

            app.runtime.isMaximized = false;
        }
    }

    const updatePreviewImage = async (id: string) => {
        const el = document.getElementById(`window-content-${id}`);
        
        if (el) {
            try {
                const canvas = await html2canvas(el, {
                    backgroundColor: null,
                    scale: 0.3,
                    logging: false,
                    useCORS: true
                });
                
                const app = state.apps.find(a => a.manifest.id === id);
                if (app) {
                    app.runtime.previewImg = canvas.toDataURL('image/webp', 0.3);
                    console.log(app.runtime.previewImg);
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
        togglePinAppStart,
        togglePinAppDesktop
    }
}