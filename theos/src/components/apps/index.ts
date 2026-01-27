import { markRaw } from 'vue'
import Notepad from './notepad.vue'
import Spotify from './spotify.vue'

export const appComponents: Record<string, any> = {
    notepad: markRaw(Notepad),
    spotify: markRaw(Spotify)
}