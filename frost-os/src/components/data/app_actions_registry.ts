import { discordActions } from '../apps/installedapps/discord/contextActions'
import { DesktopMikuActions } from '../apps/installedapps/desktopmiku/contextActions'
import type { MenuResolveCtx } from './types'

export type ActionHandler = (ctx: MenuResolveCtx) => void | Promise<void>

export const AppActionHandlers: Record<string, Record<string, ActionHandler>> = {
  discord: {
    'toggle-mute': discordActions.toggleMute,
    'open': discordActions.open,
  },

  notepad: {
  },

  desktopmiku: {
    "open": DesktopMikuActions.ViewConfig,
    "view-config": DesktopMikuActions.ViewConfig,
    "toggle-pet": DesktopMikuActions.TogglePet,
    "close": DesktopMikuActions.ExitApp
  }
}