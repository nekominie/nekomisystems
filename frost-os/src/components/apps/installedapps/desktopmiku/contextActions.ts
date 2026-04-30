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
            title: 'Configuración',
            params: {
                width: 250,
                height: 700
            }
        })
    }
}