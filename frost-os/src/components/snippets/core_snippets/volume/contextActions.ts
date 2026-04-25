import type { MenuResolveCtx } from "../../../data/types";
import { useVolumeSliderStore } from "./store";

export const volumeSliderActions = {
    showSlider: (ctx: MenuResolveCtx) => {
        const id = ctx.app.manifest.id
        const store = useVolumeSliderStore(id)
        store.showSlider()
    }
}