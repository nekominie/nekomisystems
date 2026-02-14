import type { InstalledAppConfig } from './types'

export const CoreApps: InstalledAppConfig[] = [
    {
        id: 'task_supervisor',
        name: 'Supervisor de tareas',
        icon: 'tasksupervisor',
        isOpen: false,
        isMinimized: false,
        isFocused: false,
        zIndex: 0,
        position: { x: 0, y: 0 },
        size: {
            width: 600,
            height: 400
        },
        isMaximized: false,
        tempSettings: {
            position: { x: 0, y: 0, },
            size: { width: 0, height: 0 }
        }
    },
    {
        id: 'settings',
        name: 'Configuración',
        icon: 'settings',
        isOpen: false,
        isMinimized: false,
        isFocused: false,
        zIndex: 0,
        position: { x: 0, y: 0 },
        size: {
            width: 600,
            height: 400
        },
        isMaximized: false,
        tempSettings: {
            position: { x: 0, y: 0, },
            size: { width: 0, height: 0 }
        }
    },
]
    