import { reactive, nextTick } from 'vue'
import type { App, Manifest, UserSettings, RuntimeStats, WindowInstance } from '../data/app'
import { createApp } from '../data/create_app'
import { InstalledApps } from '../data/installedapps'
import { CoreApps } from '../data/core_apps.ts'
import { CoreSnippets } from '../data/core_snippets.ts'
import { InstalledSnippets } from '../data/installed_snippets.ts'
import { startStatsSampler, measureCpu } from './process_stats'
import { db } from '../../database/db.ts'
import html2canvas from 'html2canvas';

export const state = reactive({
    apps: [] as App[],
    windows: [] as WindowInstance[],
    snippets: [] as App[],
    topZ: 100,
    lastAction: 'window-spawn'
})

let initialized = false

async function init() {
    if (initialized) return
    initialized = true

    const manifests: Manifest[] = [...CoreApps, ...InstalledApps]
    const snippets: Manifest[] = [...CoreSnippets, ...InstalledSnippets]

    const userMap = await loadUserSettingsMap()
    const snippetsMap = await loadUserSettingsMap()

    state.snippets = snippets.map(m => createApp(m, snippetsMap.get(m.id)))
    state.apps = manifests.map(m => createApp(m, userMap.get(m.id)))

    startStatsSampler(state)

    // Inicialización de tray apps
    for (const app of state.apps) {
        if (app.manifest.preferences?.startInTray) {
            app.runtime.isRunning = true
            app.runtime.isInTray = true
            app.runtime.stats = initStats()
        }
    }

    for(const snippet of state.snippets){
        if(snippet.manifest.snippet?.mount === "boot"){
            snippet.runtime.isRunning = true
            snippet.runtime.isMounted = true
            snippet.runtime.isVisible = false
            snippet.runtime.stats = initStats()
            if(snippet.manifest.preferences?.startInTray){
                snippet.runtime.isInTray = true
            }
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

    /*const launchApp = async (appId: string, params = {}, parentWinId?: string) => {
        const app = state.apps.find(a => a.manifest.id === appId)
        if (!app) return

        let pid: string

        if (parentWinId) {
            const parentWin = state.windows.find(w => w.id === parentWinId)
            pid = parentWin ? parentWin.pid : `proc-${Math.random().toString(36).slice(2, 9)}`
        } else {
            pid = `proc-${Math.random().toString(36).slice(2, 9)}`
            app.runtime.isRunning = true
            ensureStats(app)
        }

        const winId = `win-${Math.random().toString(36).slice(2, 9)}`
        const defaultSize = app.manifest.window?.defaultSize ?? { width: 600, height: 400 }

        // Calculamos la posición inicial (fuera del objeto para mayor claridad)
        const initialPosition = {
            x: (window.innerWidth - defaultSize.width) / 2 + (state.windows.length * 20),
            y: (window.innerHeight - defaultSize.height) / 2 + (state.windows.length * 20)
        }

        const newWindow: WindowInstance = {
            id: winId,
            pid: pid,
            appId: appId,
            parentWinId: parentWinId,
            //view: params.view || "Main",
            title: app.manifest.name,
            isMain: !parentWinId,
            isMinimized: false,
            isMaximized: false, // La ventana nace normal
            isFocused: true,
            zIndex: ++state.topZ,
            
            // --- ESTADO ACTIVO (Obligatorio) ---
            position: initialPosition,
            size: { ...defaultSize },
            
            // --- ESTADO GUARDADO (Opcional, vacío al nacer) ---
            tempSettings: undefined, 
            
            params: params
        };

        state.windows.push(newWindow);
        bringToFront(winId);
    }*/

    const createWindow = (appId: string, params: any = {}, parentWinId?: string) => {
        const app = state.apps.find(a => a.manifest.id === appId);
        if (!app) return null;

        // 1. Determinar el PID (Process ID)
        // Si hay un parentWinId, usamos su PID (misma app). Si no, generamos uno nuevo.
        let pid: string;
        if (parentWinId) {
            const parentWin = state.windows.find(w => w.id === parentWinId);
            pid = parentWin ? parentWin.pid : `proc-${Math.random().toString(36).slice(2, 9)}`;
        } else {
            pid = `proc-${Math.random().toString(36).slice(2, 9)}`;
        }

        const winId = `win-${Math.random().toString(36).slice(2, 9)}`;
        const defaultSize = app.manifest.window?.defaultSize ?? { width: 600, height: 400 };

        // 2. Lógica de cascada para que las ventanas no nazcan una encima de otra exactamente
        const offset = state.windows.length * 25;
        const initialPosition = {
            x: (window.innerWidth - defaultSize.width) / 2 + offset,
            y: (window.innerHeight - defaultSize.height) / 2 + offset
        };

        const newWindow: WindowInstance = {
            id: winId,
            pid: pid,
            appId: appId,
            parentWinId: parentWinId,
            title: params.title || app.manifest.name,
            view: params.view || 'Main', // <--- Crucial para tu views_loader
            isMain: !parentWinId,
            isMinimized: false,
            isMaximized: false,
            isFocused: true,
            zIndex: ++state.topZ,
            position: initialPosition,
            size: { ...defaultSize },
            params: params,
            tempSettings: undefined
        };

        state.windows.push(newWindow);
        bringToFront(winId);
        
        return newWindow;
    }

    const launchApp = async (appId: string, params = {}, parentWinId?: string) => {
        const app = state.apps.find(a => a.manifest.id === appId);
        if (!app) return;

        if (!app.runtime.isRunning) {
            app.runtime.isRunning = true;
            ensureStats(app);
        }

        return createWindow(appId, params, parentWinId);
    }

    const closeWindow = (winId: string) => {
        const win = state.windows.find(w => w.id === winId);
        if (!win) return;

        const children = state.windows.filter(w => w.parentWinId === winId);
        children.forEach(child => closeWindow(child.id));

        state.windows = state.windows.filter(w => w.id !== winId);

        if (win.isMain) {
            const siblingWindows = state.windows.filter(w => w.pid === win.pid);
            siblingWindows.forEach(s => closeWindow(s.id));
            checkProcessTermination(win.appId);
        }
    }

    const checkProcessTermination = (appId: string) => {
        const stillHasWindows = state.windows.some(w => w.appId === appId);
        if (!stillHasWindows) {
            const app = state.apps.find(a => a.manifest.id === appId);
            if (app) app.runtime.isRunning = false;
        }
    }

    const closeApp = (appId: string) => {
        state.windows = state.windows.filter(w => w.appId !== appId)
        const app = state.apps.find(a => a.manifest.id === appId)
        if (app) app.runtime.isRunning = false
    }

    const bringToFront = (winId: string) => {
        const win = state.windows.find(w => w.id === winId)
        if (!win) return

        state.windows.forEach(w => w.isFocused = false)
        state.topZ++
        win.zIndex = state.topZ
        win.isFocused = true
        win.isMinimized = false
    }

    const minimizeWindow = async (winId: string) => {
        const win = state.windows.find(w => w.id === winId)
        if (win) {
            state.lastAction = 'window-minimize'
            await nextTick()
            win.isMinimized = true
            win.isFocused = false
            
            const nextWin = [...state.windows]
                .filter(w => !w.isMinimized && w.id !== winId)
                .sort((a, b) => b.zIndex - a.zIndex)[0]
            if (nextWin) bringToFront(nextWin.id)
        }
    }

    const maximizeWindow = (winId: string) => {
        const win = state.windows.find(w => w.id === winId);
        if (!win) return;

        if (!win.isMaximized) {
            // 1. GUARDAR: Copiamos el estado ACTIVO al respaldo (tempSettings)
            win.tempSettings = {
                position: { ...win.position },
                size: { ...win.size }
            };

            // 2. MAXIMIZAR: Forzamos el estado activo a "pantalla completa"
            win.position = { x: 0, y: 0 };
            // Ajusta el '48' a la altura real de tu taskbar
            win.size = { width: window.innerWidth, height: window.innerHeight - 48 }; 
            
            win.isMaximized = true;
        } else {
            // 1. RESTAURAR: Devolvemos los valores guardados al estado ACTIVO
            if (win.tempSettings) {
                win.position = { ...win.tempSettings.position };
                win.size = { ...win.tempSettings.size };
            }

            // 2. LIMPIAR: Marcamos como no maximizado y borramos el respaldo
            win.isMaximized = false;
            win.tempSettings = undefined; 
        }
    }

    // Esta función es para cuando arrastras el header estando maximizado
    const unmaximizeAtPosition = (winId: string, newX: number) => {
        const win = state.windows.find(w => w.id === winId);
        if (!win || !win.isMaximized || !win.tempSettings) return;

        // Calculamos el porcentaje donde el mouse estaba en la ventana maximizada
        // para que al encogerse, el mouse siga "agarrando" el mismo sitio (aprox)
        const ratio = newX / window.innerWidth;
        const restoredWidth = win.tempSettings.size.width;
        
        win.isMaximized = false;
        win.tempSettings.size = { ...win.tempSettings.size };
        
        // Reposicionamos la ventana para que el mouse quede centrado en el drag
        win.tempSettings.position = {
            x: newX - (restoredWidth * ratio), 
            y: 0 // Lo mantenemos arriba para que siga el drag
        };
    }

    const updatePreviewImage = async (winId: string) => {
        const win = state.windows.find(w => w.id === winId);
        if (!win) return; // Ahora winId será win-xyz, no spotify

        const el = document.getElementById(`window-content-${winId}`);
        if (!el || win.isMinimized) return;

        try {
            const canvas = await html2canvas(el, {
                backgroundColor: null,
                scale: 0.3,
                logging: false,
                useCORS: true
            });
            win.previewImg = canvas.toDataURL('image/webp', 0.1);
        } catch (err) {
            console.error("Error capturando preview:", err);
        }
    }

    const showSnippet = async (id: string) => {
        const s = state.snippets.find(a => a.manifest.id === id)
        if(!s) return
        s.runtime.isRunning = true
        ensureStats(s)
        if (!s.runtime.stats!.startedAt) s.runtime.stats!.startedAt = Date.now()
        s.runtime.isMounted = true
        s.runtime.isVisible = false
        await nextTick()
        requestAnimationFrame(() => { s.runtime.isVisible = true })
    }

    const hideSnippet = (id: string) => {
        const s = state.snippets.find(a => a.manifest.id === id)
        if(!s) return
        s.runtime.isVisible = false
    }

    const unmountSnippet = (id: string) => {
        const s = state.snippets.find(a => a.manifest.id === id)
        if(!s) return
        s.runtime.isMounted = false
    }

    const measure = <T>(id: string, fn: () => T | Promise<T>) => {
        const app = state.apps.find(a => a.manifest.id === id)
            ?? state.snippets.find(s => s.manifest.id === id)
        if (!app) return Promise.resolve(fn() as any)
        ensureStats(app)
        return measureCpu(app, fn)
    }

    return { 
        state, 
        launchApp, 
        bringToFront, 
        closeApp, 
        closeWindow,
        createWindow,
        minimizeWindow, 
        maximizeWindow, 
        togglePinApp, 
        togglePinAppStart,
        showSnippet,
        hideSnippet,
        unmountSnippet,
        measure,
        updatePreviewImage
    }
}

function ensureStats(proc: App) {
    if (!proc.runtime.stats) {
        proc.runtime.stats = initStats()
    }
}    

function initStats(): RuntimeStats {
    const now = Date.now()
    return {
        startedAt: now,
        cpuMsWindow: 0,
        cpuMsLast5s: 0,
        cpuWindowStartedAt: now,
        memScore: 0,
        lastMemSampleAt: 0,
    }
}