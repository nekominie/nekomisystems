import type { Manifest } from './app'

export const CoreSnippets: Manifest[] = [
    {
        id: 'wifi',
        name: 'Red e Internet',
        snippet: {
            kind: "flyout",
            mount: "boot"
        },
        menus: {
            tray: [
                {
                    id: 'open_network_settings',
                    type: 'item',
                    label: 'Ir a Configuración de Red',
                    icon: 'bi-gear-fill'
                }
            ]
        },
        preferences: {
            startInTray: true
        },
        transition: 'core-out'
    },
    {
        id: 'volume_slider',
        name: 'volume_slider',
        snippet: {
            kind: "flyout",
            mount: "boot"
        },
        menus:{},
        preferences: {
            startInTray: true
        },
        transition: 'core-out'
    },
];