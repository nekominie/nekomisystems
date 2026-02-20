import type { Manifest, Runtime, UserSettings, App } from './app'

export const DEFAULT_MANIFEST: Partial<Manifest> = {
  capabilities: {
    tray: false,
    background: false,
    notifications: false,
  },
  preferences: {
    minimizeToTray: false,
    closeToTray: false,
    startInTray: false,
  },
  window: {
    defaultSize: { width: 600, height: 400 },
    startMaximized: false,
  },
}

export const DEFAULT_RUNTIME: Runtime = {
  isRunning: false,

  isWindowOpen: false,
  isMinimized: false,
  isFocused: false,
  zIndex: 0,

  position: { x: 0, y: 0 },
  size: { width: 600, height: 400 },
  isMaximized: false,
  tempSettings: undefined,

  isInTray: false,
  trayBadge: false,
  trayStatus: 'normal',

  previewImg: undefined,
}

export const DEFAULT_USER: UserSettings = {
  isPinned: false,
  isPinnedStart: false,
  isPinnedDesktop: false,
  overrides: {},
}
