import type { MenuResolveCtx } from "../../../data/types"
import { useDesktopMikuStore } from "./store"

export const DesktopMikuActions = {
    ViewConfig: ({ app, os }: MenuResolveCtx) => {
        const appId = app.manifest.id

        const existingWindow = os.state.windows.find(
            w => w.appId === appId && w.view === 'Config'
        )

        if (existingWindow) {
            os.bringToFront(existingWindow.id)
            return
        }

        os.createWindow(appId, {
            view: 'Config',
            title: 'Desktop Miku • Configuración',
            isMaximized: false,
            params: {
                width: 480,
                height: 640
            }
        })
    },

    TogglePet: ({ app, os }: MenuResolveCtx) => {
        const mikuWin = os.state.windows.find(
            w => w.appId === app.manifest.id && (!w.view || w.view === 'Main')
        )
        if (mikuWin) {
            if (mikuWin.isMinimized) {
                os.bringToFront(mikuWin.id)
            } else {
                os.minimizeWindow(mikuWin.id)
            }
        } else {
            os.createWindow(app.manifest.id, {
                hideFromTaskbar: true
            })
        }
    },

    ExitApp: ({ app, os }: MenuResolveCtx) => {
        os.closeApp(app.manifest.id)
    }
}