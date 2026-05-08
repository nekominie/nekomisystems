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
    },
    {
        id: "run",
        name: "Ejecutar",
        window: {
            defaultSize: { width: 500, height: 220 },
            minSize: { width: 500, height: 220 },
            maxSize: { width: 500, height: 220 },
        }
    }
]
    