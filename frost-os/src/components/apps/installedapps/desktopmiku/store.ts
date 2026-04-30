// apps/installedapps/desktopmiku/store.ts
import { reactive } from 'vue'
import { useOsStore } from "../../../os/os_store" // Importa tu store global directamente

// 1. Ya no usamos inject ni OS_KEY aquí

const stores = new Map<string, ReturnType<typeof createDesktopMikuStore>>()

function createDesktopMikuStore() {
  // 2. Instanciamos el store global directamente
  const os = useOsStore() 

  const state = reactive({
    viewConfig: false,
  })

  function showConfigPanel(parentId: string) {
    console.log("Intentando abrir configuración...")

    const existingWindow = os.activeWindows.find(
        w => w.appId === 'desktopmiku' && w.view === 'Config' && w.parentWinId === parentId
    )

    if (existingWindow) {
        os.bringToFront(existingWindow.id)
        return
    }

    os.createWindow("desktopmiku", {
        view: 'Config',
        parentId: parentId,
        title: 'Configuración',
        params: {
          width: 250,
          height: 700
        }
    })
  }

  return { state, showConfigPanel }
}

export function useDesktopMikuStore(appId: string) {
  if (!stores.has(appId)) stores.set(appId, createDesktopMikuStore())
  return stores.get(appId)!
}