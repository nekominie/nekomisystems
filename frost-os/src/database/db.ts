import Dexie, { type Table } from 'dexie';

export interface AppState {
  id: string;
  isPinned: boolean;
  isPinnedStart: boolean;
  isPinnedDesktop: boolean
}

export interface DesktopIconState {
  id: string;
  col: number;
  row: number;
}

export class TheOSDatabase extends Dexie {
  appSettings!: Table<AppState>
  desktopIcons!: Table<DesktopIconState>

  constructor() {
    super('MyOSDatabase');

    this.version(1).stores({
      appSettings: 'id' // 'id' es nuestra clave primaria
    });

    this.version(2).stores({
      appSettings: 'id',
      desktopIcons: 'id' // 'id' es nuestra clave primaria
    });

  }
}

export const db = new TheOSDatabase();