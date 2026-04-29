/// <reference types="vite/client" />

const modules = import.meta.glob('./{coreapps,installedapps}/**/views.ts', { eager: true })

const registryCache: Record<string, any> = {}

for (const path in modules) {
    const segments = path.split('/'); 
    const appId = segments[2];
    const moduleObj = modules[path] as any;
    registryCache[appId] = moduleObj.views || moduleObj.default || moduleObj;
}

export const getViewsForApp = (appId: string) => {
    console.log("Getting views for ", appId)
    return registryCache[appId] || null;
}