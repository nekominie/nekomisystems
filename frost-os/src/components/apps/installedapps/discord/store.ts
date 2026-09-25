import { reactive } from 'vue'
import { playSound } from '../../../../shared'

export type DiscordState = {
    muted: boolean
}

const stores = new Map<string, ReturnType<typeof createDiscordStore>>()

function createDiscordStore() {
  const state = reactive<DiscordState>({
    muted: false,
  })

  function toggleMute(playAudio = true) {
    state.muted = !state.muted
    if (playAudio) {
      try {
        playSound(state.muted ? "/discord/sounds/mute.mp3" : "/discord/sounds/unmute.mp3")
      } catch (e) {
        // Silently catch audio play restrictions if any
      }
    }
  }

  function setMuted(val: boolean, playAudio = true) {
    if (state.muted === val) return
    state.muted = val
    if (playAudio) {
      try {
        playSound(state.muted ? "/discord/sounds/mute.mp3" : "/discord/sounds/unmute.mp3")
      } catch (e) {
        // Silently catch audio play restrictions if any
      }
    }
  }

  return { state, toggleMute, setMuted }
}

export function useDiscordStore(appId: string = 'discord') {
  if (!stores.has(appId)) stores.set(appId, createDiscordStore())
  return stores.get(appId)!
}