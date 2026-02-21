import type { MenuResolveCtx } from "../../../data/types";
import { useDiscordStore } from "./store";

export const discordActions = {
    toggleMute: (ctx: MenuResolveCtx) => {
        const id = ctx.app.manifest.id
        const store = useDiscordStore(id)
        store.toggleMute()
    }
}