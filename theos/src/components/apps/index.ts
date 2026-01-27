import { markRaw } from 'vue'
import Notepad from './notepad.vue'

export const appComponents: Record<string, any> = {
    notepad: markRaw(Notepad),
}