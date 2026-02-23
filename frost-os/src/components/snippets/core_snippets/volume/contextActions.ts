import type { MenuResolveCtx } from "../../../../data/types";
import { useVolumeSliderStore } from "./store";

export const discordActions = {
    showSlider: (ctx: MenuResolveCtx) => {
        const id = ctx.app.manifest.id
        const store = useVolumeSliderStore(id)
        store.showSlider()
    }
}