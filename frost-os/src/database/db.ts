import Dexie, { type Table } from 'dexie';

// --- Interfaces para los nuevos ajustes ---
export interface SystemSetting {
  key: string;   // ej: 'ui.wallpaper', 'miku.scale'
  value: any;
}

export interface Asset {
  id: string;
  name: string;
  data: Blob | File; // Para guardar imágenes reales
  type: string;
}

// --- Tus interfaces existentes ---
export interface AppState {
  id: string;
  isPinned: boolean;
  isPinnedStart: boolean;
  isPinnedDesktop: boolean;
  overrides?: {
    minimizeToTray?: boolean;
    closeToTray?: boolean;
    startInTray?: boolean;
    startOnBoot?: boolean;
  };
}

export interface DesktopIconState {
  id: string;
  col: number;
  row: number;
}

export interface FileItem {
  id: string;
  name: string;
  parentId: string;
  type: 'file' | 'folder' | 'shortcut';
  extension?: string;
  size: number;
  mimeType?: string;
  assetId?: string;
  textContent?: string;
  createdAt: number;
  updatedAt: number;
  isSystem?: boolean;
  shortcutTarget?: {
    type: 'app' | 'file';
    appId?: string;
    targetId?: string;
  };
  appId?: string;
}

export class TheOSDatabase extends Dexie {
  appSettings!: Table<AppState>;
  desktopIcons!: Table<DesktopIconState>;
  // Nuevas tablas
  systemSettings!: Table<SystemSetting>;
  assets!: Table<Asset>;
  files!: Table<FileItem>;

  constructor() {
    super('FROST_OS_ROOT');

    // Mantener versiones anteriores para compatibilidad
    this.version(1).stores({ appSettings: 'id' });
    this.version(2).stores({ appSettings: 'id', desktopIcons: 'id' });

    // VERSIÓN 3: Registro de sistema y Assets
    this.version(3).stores({
      appSettings: 'id',
      desktopIcons: 'id',
      systemSettings: 'key', // Clave primaria para ajustes rápidos
      assets: 'id, type'     // Indexamos por id y tipo para búsquedas rápidas
    });

    // VERSIÓN 4: Sistema de Archivos
    this.version(4).stores({
      appSettings: 'id',
      desktopIcons: 'id',
      systemSettings: 'key',
      assets: 'id, type',
      files: 'id, parentId, type, name'
    });
  }
}

export const db = new TheOSDatabase();