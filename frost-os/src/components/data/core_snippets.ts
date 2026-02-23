import type { Manifest } from './app'

export const CoreSnippets: Manifest[] = [
    {
        id: 'volume_slider',
        name: 'volume_slider',
        capabilities: {
            tray: {
                canUse: true
            }
        },
        menus:{
            tray:[
                { type: 'item', id: 'toggle-mute', label: 'Silenciar' }
            ]
        },
        preferences: {
            startInTray: true
        },
        transition: 'core-out'
    },
]
    