import { markRaw } from 'vue'
import Notepad from './notepad/notepad.vue'
import Spotify from './spotify/spotify.vue'
import BibooTaxGame from /*"../../../../../bibootaxgame/src/components/app.vue"*/'./bibootaxgame/bibootaxgame.vue'
import DoomGame from './doomgame/doomgame.vue'
import Discord from './discord/discord.vue'

export const InstalledAppsIndex: Record<string, any> = {
    notepad: markRaw(Notepad),
    spotify: markRaw(Spotify),
    bibootaxgame: markRaw(BibooTaxGame),
    doomgame: markRaw(DoomGame),
    discord: markRaw(Discord)
}