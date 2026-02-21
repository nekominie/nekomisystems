import { reactive } from 'vue'

export type DiscordState = {
    muted: boolean
}

const stores = new Map<string, ReturnType<typeof createDiscordStore>>()

function createDiscordStore() {
  const state = reactive<DiscordState>({
    muted: false,
  })

  function toggleMute() {
    state.muted = !state.muted
  }

  return { state, toggleMute }
}

export function useDiscordStore(appId: string) {
  if (!stores.has(appId)) stores.set(appId, createDiscordStore())
  return stores.get(appId)!
}