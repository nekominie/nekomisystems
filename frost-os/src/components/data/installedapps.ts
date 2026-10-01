import type { Manifest } from './app'
import { useDiscordStore } from '../apps/installedapps/discord/store'

export const InstalledApps: Manifest[] = [
    {
            id: 'notepad',
            name: 'Notepad',
    },
    {
        id: 'calculator',
        name: 'Calculadora',
        window: {
            defaultSize: { width: 320, height: 480 },
            minSize: { width: 280, height: 400 },
            maxSize: { width: 500, height: 750 }
        }
    },
    {
        id: 'explorer',
        name: 'Archivos',
        window: {
            defaultSize: { width: 980, height: 640 },
            minSize: { width: 620, height: 420 },
            surface: {
                mode: 'os-glass',
                os: {
                    frameBg: 'rgba(20, 24, 34, 0.45)',
                    frameBlur: 'blur(30px)',
                    contentBg: 'transparent'
                }
            }
        }
    },
    {
        id: 'photos',
        name: 'Fotos',
        window: {
            defaultSize: { width: 940, height: 620 },
            minSize: { width: 540, height: 420 },
            surface: {
                mode: 'os-glass',
                os: {
                    frameBg: 'rgba(18, 22, 30, 0.45)',
                    frameBlur: 'blur(30px)',
                    contentBg: 'transparent'
                }
            }
        }
    },
    {
        id: 'music',
        name: 'Musica',
    },
    {
        id: 'spotify',
        name: 'Spotify',
        window: {
            defaultSize: { width: 1200, height: 800 },
        }
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
            startInTray: true,
            startOnBoot: true,
            closeToTray: true,
        },
        capabilities: {
            tray:{ 
                canUse: true,
                defaultAction: 'open'
            }
        },
        menus:{
            taskbar: [
                { type: 'item', id: 'open', label: 'Abrir', icon: 'bi bi-box-arrow-up-right' },
                { type: 'item', id: 'new-window', label: 'Nueva Ventana', icon: 'bi bi-window-plus' },
            ],
            tray:[
                { 
                    type: 'item', 
                    id: 'toggle-mute', 
                    label: (ctx) => {
                        const store = useDiscordStore(ctx.app.manifest.id);
                        return store.state.muted ? 'Desilenciar' : 'Silenciar';
                    },
                    icon: (ctx) => {
                        const store = useDiscordStore(ctx.app.manifest.id);
                        return store.state.muted ? 'bi bi-mic-mute-fill text-danger' : 'bi bi-mic-fill';
                    }
                },
                { type: 'separator' },
                { type: 'item', id: 'open', label: 'Abrir Discord', icon: 'bi bi-discord' },
                { type: 'separator' },
                { type: 'item', id: 'quit', label: 'Salir de Discord', icon: 'bi bi-x-circle' }
            ]
        },
        window: {
            defaultSize: { width: 1500, height: 850 },
            surface: {
                mode: 'app-solid',
                app: { contentBg: '#0b0d12' }
            }
        }
    },
    {
        id: "mspaint",
        name: "Microsoft Paint",
        preferences: {
            startInTray: true
        },
        capabilities: {
            tray:{ 
                canUse: true,
                defaultAction: 'open'
            }
        },
        window: {
            defaultSize: { width: 1500, height: 850 },
            surface: {
                mode: 'app-solid',
                app: { contentBg: '#0b0d12' }
            }
        }
    },
    {
        id: 'desktopmiku',
        name: 'Desktop Miku',    
        snippet: {
            kind: "flyout",
            mount: "user"
        },
        window: {
            defaultSize: { width: 480, height: 640 },
            minSize: { width: 380, height: 500 },
            startMaximized: false
        },
        capabilities: {
            tray:{ 
                canUse: true,
                defaultAction: 'view-config'
            },
            background: true,
            singleInstance: true
        },
        menus:{
            tray: [
                { type: 'item', id: 'view-config', label: 'Configuración', icon: 'bi bi-gear-fill' },
                { type: 'item', id: 'toggle-pet', label: 'Mostrar/Ocultar Miku', icon: 'bi bi-person-heart' },
                { type: 'item', id: 'close', label: 'Cerrar Desktop Miku', icon: 'bi bi-x-circle' },
            ]            
        },
        preferences: {
            startInTray: true,
            startOnBoot: true,
            minimizeToTray: true,
            closeToTray: true,
            startupWindow: "stealth"
        }
    },
    {
        id: "tetris",
        name: "Tetris",
        window: {
            defaultSize: { width: 520, height: 719 },
            minSize: { width: 520, height: 719 },
        }
    },
    {
        id: "pdf_viewer",
        name: "PDF Viewer",
        window: {
            defaultSize: { width: 1020, height: 680 },
            minSize: { width: 560, height: 420 },
            surface: {
                mode: 'os-glass',
                os: {
                    frameBg: 'rgba(18, 22, 30, 0.55)',
                    frameBlur: 'blur(30px)',
                    contentBg: 'transparent'
                }
            }
        }
    }
]
    