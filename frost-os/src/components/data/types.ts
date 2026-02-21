import { App } from './app'

export interface IconConfig {
  id: string;
  paths?: string[];
  svg?: string;
  saved_path?: string;
}

export interface UserProfile{
  name: string;
  avatar: Blob;
  setupDate: Date;
}

export interface DesktopIconState{
  appId: string;
  col: number;
  row: number;
}

export interface DesktopState{
  icons: Record<string, DesktopIconState>
  selected: Set<string>
}

export type AppMenuContext = 
  | 'taskbar'
  | 'tray'
  | 'desktop'
  | 'start'
  | 'window-titlebar'

export type MenuItemDescriptor =
  | { type: 'item'; id: string; label: string; icon?: string; order?: number; when?: MenuWhen }
  | { type: 'separator'; order?: number }

export type MenuWhen = (ctx: MenuResolveCtx) => boolean


export type MenuResolveCtx = {
  app: App
  context: AppMenuContext
  os: {
    launchApp: (id: string) => void | Promise<void>
    closeApp: (id: string) => void
    minimizeWindow: (id: string) => void | Promise<void>
    togglePinApp: (id: string) => void | Promise<void>
    // ...lo que quieras exponer
  }
}
