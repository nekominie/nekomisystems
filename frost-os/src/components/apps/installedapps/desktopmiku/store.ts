import { reactive } from 'vue'

export type VolumeSliderState = {
    viewConfig: boolean
}

const stores = new Map<string, ReturnType<typeof createDesktopMikuStore>>()

function createDesktopMikuStore() {
  const state = reactive<VolumeSliderState>({
    viewConfig: false,
  })

  function showConfigPanel() {
    state.viewConfig = !state.viewConfig
  }

  return { state, showConfigPanel }
}

export function useDesktopMikuStore(appId: string) {
  if (!stores.has(appId)) stores.set(appId, createDesktopMikuStore())
  return stores.get(appId)!
}
