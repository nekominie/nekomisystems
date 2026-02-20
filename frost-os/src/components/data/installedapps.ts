import type { Manifest } from './app'

export const InstalledApps: Manifest[] = [
        {
            id: 'notepad',
            name: 'Notepad'
        },
        {
            id: 'calculator',
            name: 'Calculadora'
        },
        {
            id: 'explorer',
            name: 'Archivos',
        },
        {
            id: 'music',
            name: 'Musica',
        },
        {
            id: 'spotify',
            name: 'Spotify',
        },
        {
            id: 'bibootaxgame',
            name: 'Biboo Tax Game',
        },
        {
            id: 'doomgame',
            name: 'Doom Game',
        },
        {
            id: 'discord',
            name: 'Discord',
            preferences: {
                startInTray: true
            }
        }
]
    