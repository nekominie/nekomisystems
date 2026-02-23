import { reactive } from 'vue'

export type VolumeSliderState = {
    trigger: boolean
}

const stores = new Map<string, ReturnType<typeof createVolumeSliderStore>>()

function createVolumeSliderStore() {
  const state = reactive<VolumeSliderState>({
    trigger: false,
  })

  function showSlider() {
    state.trigger = !state.trigger
  }

  return { state, showSlider }
}

export function useVolumeSliderStore(appId: string) {
  if (!stores.has(appId)) stores.set(appId, createVolumeSliderStore())
  return stores.get(appId)!
}