// src/os/db.ts
import Dexie, { type Table } from 'dexie';

export interface AppState {
  id: string;
  isPinned: boolean;
  // Solo guardamos lo que queremos que sea persistente
  // No guardamos 'isOpen' ni 'isFocused' porque queremos que 
  // el SO arranque "limpio" pero con tus apps ancladas.
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