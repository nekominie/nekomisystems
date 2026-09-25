import type { MenuResolveCtx } from "../../../data/types";
import { useDiscordStore } from "./store";

export const discordActions = {
    toggleMute: (ctx: MenuResolveCtx) => {
        const id = ctx.app.manifest.id
        const store = useDiscordStore(id)
        store.toggleMute()
    },
    open: (ctx: MenuResolveCtx) => {
        const existingWin = ctx.os.state.windows.find(w => w.appId === ctx.app.manifest.id)
        if (existingWin) {
            ctx.os.bringToFront(existingWin.id)
        } else {
            ctx.os.launchApp(ctx.app.manifest.id)
        }
    },
    quit: (ctx: MenuResolveCtx) => {
        ctx.os.closeApp(ctx.app.manifest.id)
    }
}