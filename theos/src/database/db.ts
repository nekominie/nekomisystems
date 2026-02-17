import Dexie, { type Table } from 'dexie';

export interface AppState {
  id: string;
  isPinned: boolean;
  isPinnedStart: boolean;
}

export class TheOSDatabase extends Dexie {
  appSettings!: Table<AppState>;

  constructor() {
    super('MyOSDatabase');
    this.version(1).stores({
      appSettings: 'id' // 'id' es nuestra clave primaria
    });
  }
}

export const db = new TheOSDatabase();