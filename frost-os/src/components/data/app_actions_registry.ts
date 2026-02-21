import { discordActions } from '../apps/installedapps/discord/contextActions'
import type { MenuResolveCtx } from './types'

export type ActionHandler = (ctx: MenuResolveCtx) => void | Promise<void>

export const AppActionHandlers: Record<string, Record<string, ActionHandler>> = {
  discord: {
    'toggle-mute': discordActions.toggleMute
  },

  notepad: {
  }
}