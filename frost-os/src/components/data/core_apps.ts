import type { Manifest } from './app'

export const CoreApps: Manifest[] = [
    {
        id: 'task_supervisor',
        name: 'Supervisor de tareas',
        window: {
            defaultSize: { width: 1333, height: 607 },
            minSize: { width: 500, height: 500 },
        }
    },
    {
        id: 'settings',
        name: 'Configuración',
        window: {
            defaultSize: { width: 1100, height: 650 },
            minSize: { width: 1100, height: 650 },
        }
    },
    {
        id: "run",
        name: "Ejecutar",
        window: {
            defaultSize: { width: 500, height: 220 },
            minSize: { width: 500, height: 220 },
            maxSize: { width: 500, height: 220 },
        }
    },
    {
        id: "store",
        name: "Tienda de Apps",
        window: {
            defaultSize: { width: 1150, height: 720 },
            minSize: { width: 850, height: 540 },
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
        id: "console",
        name: "Consola",
        window: {
            defaultSize: { width: 800, height: 500 },
            minSize: { width: 480, height: 300 },
            surface: {
                mode: 'os-glass',
                os: {
                    frameBg: 'rgba(11, 14, 20, 0.85)',
                    frameBlur: 'blur(36px)',
                    contentBg: 'transparent'
                }
            }
        }
    }
]
    