import type { Manifest } from './app'

export const CoreSnippets: Manifest[] = [
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
    