import { defineStore } from 'pinia';
import { state as kernelState, processInstructions } from './process_manager';
import { computed } from 'vue';

export const useOsStore = defineStore('os', () => {
    // 1. Obtenemos las herramientas del Kernel
    const kernel = processInstructions();

    // 2. Estado (Mapeamos el estado reactivo del Kernel directamente)
    // Al usar el estado del kernel aquí, mantenemos una única fuente de verdad
    const state = kernelState;

    // 3. Getters (Computados para acceso rápido)
    const activeWindows = computed(() => state.windows);
    const runningApps = computed(() => state.apps.filter(a => a.runtime.isRunning));
    const focusedWindow = computed(() => state.windows.find(w => w.isFocused));

    // 4. Actions (Puente directo a las instrucciones del proceso)
    // Esto permite que tus apps hagan os.launchApp() sin importar el kernel
    return {
        // Exponer el estado para que la UI lo lea
        state,
        activeWindows,
        runningApps,
        focusedWindow,

        // Exponer los métodos del kernel
        launchApp: kernel.launchApp,
        closeApp: kernel.closeApp,
        createWindow: kernel.createWindow,
        closeWindow: kernel.closeWindow,
        bringToFront: kernel.bringToFront,
        minimizeWindow: kernel.minimizeWindow,
        maximizeWindow: kernel.maximizeWindow,
        togglePinApp: kernel.togglePinApp,
        togglePinAppStart: kernel.togglePinAppStart,
        showSnippet: kernel.showSnippet,
        hideSnippet: kernel.hideSnippet,
        updatePreviewImage: kernel.updatePreviewImage,
        measure: kernel.measure
    };
});