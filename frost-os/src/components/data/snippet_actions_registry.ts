import type { MenuResolveCtx } from './types'

export type ActionHandler = (ctx: MenuResolveCtx) => void | Promise<void>

export const SnippetActionHandlers: Record<string, Record<string, ActionHandler>> = {

}