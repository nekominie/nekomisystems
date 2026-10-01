import { reactive, nextTick } from 'vue'

import type { App, Manifest, UserSettings, RuntimeStats, WindowInstance, SnapTarget, SnapState } from '../data/app'
import { createApp } from '../data/create_app'

import { InstalledApps } from '../data/installedapps'
import { CoreApps } from '../data/core_apps.ts'

import { CoreSnippets } from '../data/core_snippets.ts'
import { InstalledSnippets } from '../data/installed_snippets.ts'

import { AppStorage } from "../../database/app_storage.ts"

import { startStatsSampler, measureCpu } from './process_stats'

import { db, type FileItem } from '../../database/db.ts'
import html2canvas from 'html2canvas';

import { useSettingsStore } from '../apps/coreapps/settings/store.ts'
import { useLockStore } from './lock/lock_store'

export const state = reactive({
    apps: [] as App[],
    windows: [] as WindowInstance[],
    snippets: [] as App[],
    topZ: 100,
    lastAction: 'window-spawn',
    activeSnapPreview: null as SnapTarget | null,
    peekWindowId: null as string | null
})

let initialized = false

async function init() {
    if (initialized) return
    initialized = true

    let uninstalledSet = new Set<string>()
    try {
        const uninstalledRec = await db.systemSettings.get('system:uninstalled_apps')
        if (Array.isArray(uninstalledRec?.value)) {
            uninstalledSet = new Set(uninstalledRec.value)
        }
    } catch (e) {
        console.error('Error cargando apps desinstaladas:', e)
    }

    const availableInstalled = InstalledApps.filter(m => !uninstalledSet.has(m.id))
    const manifests: Manifest[] = [...CoreApps, ...availableInstalled]
    const snippets: Manifest[] = [...CoreSnippets, ...InstalledSnippets]

    const userMap = await loadUserSettingsMap()
    const snippetsMap = await loadUserSettingsMap()

    state.snippets = snippets.map(m => createApp(m, snippetsMap.get(m.id)))
    state.apps = manifests.map(m => createApp(m, userMap.get(m.id)))

    startStatsSampler(state)

    // Inicialización de apps al arrancar el sistema
    for (const app of state.apps) {
            const canUseTray = !!app.manifest.capabilities?.tray?.canUse;
            const startOnBoot = app.user.overrides?.startOnBoot ?? app.manifest.preferences?.startOnBoot ?? false;
            const shouldStartInTray = app.user.overrides?.startInTray ?? app.manifest.preferences?.startInTray ?? false;

            if (startOnBoot && canUseTray && shouldStartInTray) {

                app.runtime.isRunning = true;
                app.runtime.isInTray = true;
                
                app.runtime.storage = new AppStorage(app.manifest.id);
                
                app.runtime.stats = initStats();
                
                const startupMode = app.manifest.preferences?.startupWindow;

                // CASO 1: Tray + Minimizada en Taskbar
                if (startupMode === 'minimized') {
                    createWindow(app.manifest.id, { 
                        isMinimized: true 
                    });
                }
                // CASO 2: Tray + Abierta (Sin Taskbar) - Útil para Widgets/Miku
                else if (startupMode === 'stealth') {
                    createWindow(app.manifest.id,{ 
                        hideFromTaskbar: true, 
                        isMinimized: true 
                    });
                }
            } else if (startOnBoot && !shouldStartInTray) {
                // Iniciar abierta normalmente al arrancar
                launchApp(app.manifest.id);
            }
    }

    for (const snippet of state.snippets) {
        if (snippet.manifest.snippet?.mount === "boot") {
            snippet.runtime.isRunning = true;
            snippet.runtime.isMounted = true;

            snippet.runtime.storage = new AppStorage(snippet.manifest.id);
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
                overrides: (r as any).overrides || {}
            })
        }
        return map
    }

    useSettingsStore().loadSettings()
}

const createWindow = (appId: string, options: any = {}, parentWinId?: string) => {
        const app = state.apps.find(a => a.manifest.id === appId);
        if (!app) return null;

        // Si la aplicación solo permite una instancia única (singleInstance)
        const targetView = options.view || 'Main';
        const isSingleInstance = !!app.manifest.capabilities?.singleInstance;

        if (isSingleInstance) {
            const existingWin = state.windows.find(
                w => w.appId === appId && (w.view || 'Main') === targetView
            );
            if (existingWin) {
                if (existingWin.isMinimized) {
                    existingWin.isMinimized = false;
                }
                bringToFront(existingWin.id);
                return existingWin;
            }
        }

        // 1. Determinar el PID
        let pid: string;
        if (parentWinId) {
            const parentWin = state.windows.find(w => w.id === parentWinId);
            pid = parentWin ? parentWin.pid : `proc-${Math.random().toString(36).slice(2, 9)}`;
        } else {
            pid = `proc-${Math.random().toString(36).slice(2, 9)}`;
        }

        const winId = `win-${Math.random().toString(36).slice(2, 9)}`;

        // --- NUEVA LÓGICA DE TAMAÑO ---
        // Extraemos width/height de options.params si existen, si no, del manifest, si no, default
        const finalWidth = options.params?.width ?? options.width ?? app.manifest.window?.defaultSize?.width ?? 600;
        const finalHeight = options.params?.height ?? options.height ?? app.manifest.window?.defaultSize?.height ?? 400;
        
        const finalSize = { width: finalWidth, height: finalHeight };

        // --- NUEVA LÓGICA DE POSICIÓN ---
        const offset = state.windows.length * 25;
        const initialPosition = {
            x: options.params?.x ?? options.x ?? ((window.innerWidth - finalSize.width) / 2 + offset),
            y: options.params?.y ?? options.y ?? ((window.innerHeight - finalSize.height) / 2 + offset)
        };

        const newWindow: WindowInstance = {
            id: winId,
            pid: pid,
            appId: appId,
            parentWinId: parentWinId,
            // Usamos options.title si existe, si no options.view, si no el nombre de la app
            title: options.title || (options.view === 'Config' ? 'Configuración' : app.manifest.name),
            view: options.view || 'Main', 
            isMain: !parentWinId,
            isMinimized: options.isMinimized || false,
            hideFromTaskbar: options.params?.hideFromTaskbar || options.hideFromTaskbar || false,
            isMaximized: false,
            isFocused: true,
            zIndex: ++state.topZ,
            position: initialPosition,
            size: finalSize, // <--- Ahora sí usa el tamaño procesado
            params: options.params ? { ...options, ...options.params } : { ...options }, // <--- Guardamos los params limpios y accesibles
            tempSettings: undefined,
            snapState: null
        };

        state.windows.push(newWindow);
        bringToFront(winId);

        // Pre-captura en segundo plano cuando la app termina de montarse
        setTimeout(() => {
            updatePreviewImage(winId);
        }, 800);
        
        return newWindow;
}

const togglePinApp = async (id: string) => {
        const app = state.apps.find(a => a.manifest.id === id)
        if(app){
            app.user.isPinned = !app.user.isPinned
            await db.appSettings.put({ 
                id: id, 
                isPinnedStart: app.user.isPinnedStart,
                isPinned: app.user.isPinned,
                isPinnedDesktop: app.user.isPinnedDesktop,
                overrides: app.user.overrides ? { ...app.user.overrides } : undefined
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
                isPinnedDesktop: app.user.isPinnedDesktop,
                overrides: app.user.overrides ? { ...app.user.overrides } : undefined
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
                isPinnedStart: app.user.isPinnedStart,
                isPinnedDesktop: app.user.isPinnedDesktop,
                overrides: app.user.overrides ? { ...app.user.overrides } : undefined
            })

            // Sincronizar archivo de acceso directo en db.files con parentId: 'desktop'
            if (app.user.isPinnedDesktop) {
                const shortcutFile: FileItem = {
                    id: `shortcut-${app.manifest.id}`,
                    name: `${app.manifest.name}.lnk`,
                    parentId: 'desktop',
                    type: 'shortcut',
                    extension: 'lnk',
                    size: 1024,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    shortcutTarget: { type: 'app', appId: app.manifest.id },
                    appId: app.manifest.id,
                };
                await db.files.put(shortcutFile);
            } else {
                const existing = await db.files.where('parentId').equals('desktop').filter(f => f.appId === app.manifest.id || f.id === `shortcut-${app.manifest.id}`).toArray();
                for (const item of existing) {
                    await db.files.delete(item.id);
                }
                await db.desktopIcons.delete(`shortcut-${app.manifest.id}`);
                await db.desktopIcons.delete(app.manifest.id);
            }

            try {
                const { useFileSystemStore } = await import('../apps/installedapps/explorer/file_system_store');
                await useFileSystemStore().loadAllFiles();
            } catch (e) {}
        }
}

const uninstallApp = async (appId: string): Promise<boolean> => {
        // 1. Proteger aplicaciones de sistema
        const isCore = CoreApps.some(c => c.id === appId);
        if (isCore) {
            console.warn(`No se puede desinstalar una app de sistema: ${appId}`);
            return false;
        }

        // 2. Cerrar ventanas abiertas de la app
        const appWindows = state.windows.filter(w => w.appId === appId);
        appWindows.forEach(w => closeWindow(w.id));

        // 3. Terminar proceso y limpiar runtime
        closeApp(appId);

        // 4. Quitar de la lista reactiva de apps activas
        const appIndex = state.apps.findIndex(a => a.manifest.id === appId);
        if (appIndex !== -1) {
            state.apps.splice(appIndex, 1);
        }

        // 5. Limpiar datos persistentes asociados a la app
        try {
            await db.appSettings.delete(appId);
            await db.desktopIcons.delete(appId);
            await db.desktopIcons.delete(`shortcut-${appId}`);

            const shortcutFiles = await db.files.where('parentId').equals('desktop').filter(f => f.appId === appId || f.id === `shortcut-${appId}`).toArray();
            for (const sf of shortcutFiles) {
                await db.files.delete(sf.id);
            }

            try {
                const { useFileSystemStore } = await import('../apps/installedapps/explorer/file_system_store');
                await useFileSystemStore().loadAllFiles();
            } catch (e) {}

            await db.systemSettings.where('key').startsWith(`app:${appId}:`).delete();

            // Limpieza de claves localStorage
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && (key.includes(appId) || key.startsWith(`frost_${appId}`))) {
                    localStorage.removeItem(key);
                }
            }
        } catch (err) {
            console.error(`Error limpiando datos de ${appId}:`, err);
        }

        // 6. Registrar en system:uninstalled_apps en la base de datos
        try {
            const record = await db.systemSettings.get('system:uninstalled_apps');
            const uninstalledIds: string[] = Array.isArray(record?.value) ? record.value : [];
            if (!uninstalledIds.includes(appId)) {
                uninstalledIds.push(appId);
                await db.systemSettings.put({ key: 'system:uninstalled_apps', value: uninstalledIds });
            }
        } catch (err) {
            console.error(`Error guardando estado desinstalado para ${appId}:`, err);
        }

        return true;
}

const installApp = async (appId: string): Promise<boolean> => {
        const manifest = InstalledApps.find(m => m.id === appId);
        if (!manifest) {
            console.warn(`Manifest no encontrado para app: ${appId}`);
            return false;
        }

        // Si ya está instalada, no duplicar
        if (state.apps.some(a => a.manifest.id === appId)) {
            return true;
        }

        // Crear instancia limpia de la app
        const newApp = createApp(manifest, {
            isPinned: false,
            isPinnedStart: true,
            isPinnedDesktop: true
        });
        state.apps.push(newApp);

        // Guardar ajustes iniciales en IndexedDB
        try {
            await db.appSettings.put({
                id: appId,
                isPinned: false,
                isPinnedStart: true,
                isPinnedDesktop: true
            });

            // Remover de la lista de apps desinstaladas
            const record = await db.systemSettings.get('system:uninstalled_apps');
            let uninstalledIds: string[] = Array.isArray(record?.value) ? record.value : [];
            uninstalledIds = uninstalledIds.filter(id => id !== appId);
            await db.systemSettings.put({ key: 'system:uninstalled_apps', value: uninstalledIds });
        } catch (err) {
            console.error(`Error guardando instalación de ${appId}:`, err);
        }

        return true;
}

const isAppInstalled = (appId: string): boolean => {
        return state.apps.some(a => a.manifest.id === appId);
}

const updateAppPreferences = async (appId: string, overrides: Partial<NonNullable<UserSettings['overrides']>>) => {
        const app = state.apps.find(a => a.manifest.id === appId);
        if (!app) return;

        if (!app.user.overrides) {
            app.user.overrides = {};
        }
        Object.assign(app.user.overrides, overrides);

        await db.appSettings.put({ 
            id: appId, 
            isPinned: app.user.isPinned,
            isPinnedStart: app.user.isPinnedStart,
            isPinnedDesktop: app.user.isPinnedDesktop,
            overrides: { ...app.user.overrides }
        });
}

const launchApp = async (appId: string, params = {}, parentWinId?: string) => {
        const app = state.apps.find(a => a.manifest.id === appId);
        if (!app) return;

        if (!app.runtime.isRunning) {

            //INICIAR PROCESO
            app.runtime.isRunning = true;

            app.runtime.storage = new AppStorage(appId);

            //ensureStats(app)
        }

        return createWindow(appId, params, parentWinId);
}

const closeWindow = (winId: string) => {
        if (state.peekWindowId === winId) {
            state.peekWindowId = null;
        }
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
            if (app) {
                const canUseTray = !!app.manifest.capabilities?.tray?.canUse;
                const closeToTray = app.user.overrides?.closeToTray ?? app.manifest.preferences?.closeToTray ?? false;

                if (canUseTray && closeToTray) {
                    // Mantener el proceso activo en la bandeja del sistema
                    app.runtime.isRunning = true;
                    app.runtime.isInTray = true;
                } else {
                    app.runtime.isRunning = false;
                    app.runtime.isInTray = false;
                }
            }
        }
}

const closeApp = (appId: string) => {
        state.windows = state.windows.filter(w => w.appId !== appId);
        const app = state.apps.find(a => a.manifest.id === appId);
        if (app) {
            app.runtime.isRunning = false;
            app.runtime.isInTray = false;
        }
}

let blurCaptureTimeout: number | null = null

const bringToFront = (winId: string) => {
        const win = state.windows.find(w => w.id === winId)
        if (!win) return

        // Identificar la ventana que estaba activa previamente para refrescar su captura en segundo plano
        const previousFocusedWin = state.windows.find(w => w.isFocused && w.id !== winId && !w.isMinimized)

        state.windows.forEach(w => w.isFocused = false)
        state.topZ++
        win.zIndex = state.topZ
        win.isFocused = true
        win.isMinimized = false

        if (previousFocusedWin) {
            if (blurCaptureTimeout) clearTimeout(blurCaptureTimeout)
            blurCaptureTimeout = window.setTimeout(() => {
                updatePreviewImage(previousFocusedWin.id).catch(() => {})
            }, 300)
        }
}

const minimizeWindow = async (winId: string) => {
        const win = state.windows.find(w => w.id === winId)
        if (win) {
            // Capturar la imagen antes de ocultar la ventana en el DOM
            updatePreviewImage(winId, true).catch(() => {})

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
            if (!win.tempSettings) {
                win.tempSettings = {
                    position: { ...win.position },
                    size: { ...win.size }
                };
            }

            win.snapState = null;

            // 2. MAXIMIZAR: Forzamos el estado activo a "pantalla completa"
            win.position = { x: 0, y: 0 };
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
            win.snapState = null;
            win.tempSettings = undefined; 
        }
}

const snapWindow = (winId: string, target: SnapTarget) => {
        const win = state.windows.find(w => w.id === winId);
        if (!win) return;

        if (target === 'maximize') {
            if (!win.isMaximized) {
                maximizeWindow(winId);
            }
            return;
        }

        // Si la ventana no tiene respaldo previo (estaba flotando), respaldamos su posición/tamaño
        if (!win.isMaximized && !win.snapState && !win.tempSettings) {
            win.tempSettings = {
                position: { ...win.position },
                size: { ...win.size }
            };
        }

        win.isMaximized = false;
        win.snapState = target;

        const taskbarH = 48;
        const totalW = window.innerWidth;
        const totalH = window.innerHeight - taskbarH;
        const halfW = Math.round(totalW / 2);
        const halfH = Math.round(totalH / 2);

        switch (target) {
            case 'left':
                win.position = { x: 0, y: 0 };
                win.size = { width: halfW, height: totalH };
                break;
            case 'right':
                win.position = { x: halfW, y: 0 };
                win.size = { width: totalW - halfW, height: totalH };
                break;
            case 'top-left':
                win.position = { x: 0, y: 0 };
                win.size = { width: halfW, height: halfH };
                break;
            case 'bottom-left':
                win.position = { x: 0, y: halfH };
                win.size = { width: halfW, height: totalH - halfH };
                break;
            case 'top-right':
                win.position = { x: halfW, y: 0 };
                win.size = { width: totalW - halfW, height: halfH };
                break;
            case 'bottom-right':
                win.position = { x: halfW, y: halfH };
                win.size = { width: totalW - halfW, height: totalH - halfH };
                break;
        }

        bringToFront(winId);
}

const setSnapPreview = (target: SnapTarget | null) => {
        state.activeSnapPreview = target;
}

const setPeekWindow = (winId: string | null) => {
        state.peekWindowId = winId;
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

const isCapturing = new Set<string>();

const updatePreviewImage = async (winId: string, force = false) => {
        const win = state.windows.find(w => w.id === winId);
        if (!win) return;

        const now = Date.now();
        // Si ya cuenta con preview reciente (menos de 6 segundos) y no se fuerza, omitir para rendimiento instantáneo
        if (!force && win.previewImg && win.lastPreviewUpdate && (now - win.lastPreviewUpdate < 6000)) {
            return;
        }

        if (isCapturing.has(winId)) return;

        const el = document.getElementById(`window-content-${winId}`);
        if (!el || win.isMinimized) return;

        isCapturing.add(winId);

        try {
            // Ceder el hilo de ejecución para que la UI responda sin congelarse
            await new Promise(resolve => setTimeout(resolve, 0));

            // Escala dinámica para mantener la imagen cerca de los 200px de ancho y no procesar píxeles de más
            const elWidth = el.offsetWidth || 800;
            const dynamicScale = Math.min(0.25, Math.max(0.12, 200 / elWidth));

            const canvas = await html2canvas(el, {
                backgroundColor: null,
                scale: dynamicScale,
                logging: false,
                useCORS: true,
                ignoreElements: (element) => {
                    return element.classList?.contains('cursor-shield') || element.tagName === 'IFRAME';
                }
            });
            win.previewImg = canvas.toDataURL('image/webp', 0.5);
            win.lastPreviewUpdate = Date.now();
        } catch (err) {
            console.error("Error capturando preview:", err);
        } finally {
            isCapturing.delete(winId);
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

export const processInstructions = () => {    
    init().catch(err => console.error(err))

    return { 
        state,
        launchApp: (id: string, params = {}, parentWinId?: string) => launchApp(id, params, parentWinId),
        bringToFront: (winId: string) => bringToFront(winId), 
        closeApp: (id: string) => closeApp(id), 
        closeWindow: (winId: string) => closeWindow(winId),
        createWindow: (id: string, params = {}, parentWinId?: string) => createWindow(id, params, parentWinId),
        minimizeWindow: (winId: string) => minimizeWindow(winId), 
        maximizeWindow: (winId: string) => maximizeWindow(winId), 
        snapWindow: (winId: string, target: SnapTarget) => snapWindow(winId, target),
        setSnapPreview: (target: SnapTarget | null) => setSnapPreview(target),
        setPeekWindow: (winId: string | null) => setPeekWindow(winId),
        togglePinApp: (id: string) => togglePinApp(id), 
        togglePinAppStart: (id: string) => togglePinAppStart(id),
        togglePinAppDesktop: (id: string) => togglePinAppDesktop(id),
        uninstallApp: (id: string) => uninstallApp(id),
        installApp: (id: string) => installApp(id),
        isAppInstalled: (id: string) => isAppInstalled(id),
        showSnippet: (id: string) => showSnippet(id),
        hideSnippet: (id: string) => hideSnippet(id),
        unmountSnippet: (id: string) => unmountSnippet(id),
        measure: <T>(id: string, fn: () => T | Promise<T>) => measure(id, fn),
        updatePreviewImage: (winId: string, force = false) => updatePreviewImage(winId, force),
        lockSystem: () => useLockStore().lock(),
        unlockSystem: () => useLockStore().unlock(),
        updateAppPreferences: (appId: string, overrides: any) => updateAppPreferences(appId, overrides)
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