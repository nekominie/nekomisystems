import type { MenuResolveCtx } from "../../../data/types";
import { useDesktopMikuStore } from "./store";

export const DesktopMikuActions = {
    ViewConfig: (ctx: MenuResolveCtx) => {
        const id = ctx.app.manifest.id
        const store = useDesktopMikuStore(id)
        store.showConfigPanel()
    }
}