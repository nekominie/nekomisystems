import { reactive } from 'vue'

const stores = new Map<string, ReturnType<typeof createDesktopMikuStore>>()

function createDesktopMikuStore() {
  // 2. Instanciamos el store global directamente

  const state = reactive({
      currentAnimation: 'idle',
      isHappy: true
  })

  return { state }
}

export function useDesktopMikuStore(appId: string) {
  if (!stores.has(appId)) stores.set(appId, createDesktopMikuStore())
  return stores.get(appId)!
}