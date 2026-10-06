import Dexie, { type Table } from 'dexie';
import type { ShapeType, PlatformConfig } from '../utils/sandboxPhysics';

export interface SerializedVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SerializedQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SerializedSandboxItem {
  id: string;
  type: ShapeType;
  position: SerializedVector3;
  rotation: SerializedQuaternion;
  scale: SerializedVector3;
  /** Mill only: scoops turn in the opposite direction */
  reversed?: boolean;
}

export interface SerializedPhysicsBall {
  id: string;
  skinId: string;
  spawnPos: SerializedVector3;
}

export interface SandboxWorldRecord {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  platformConfig: PlatformConfig;
  items: SerializedSandboxItem[];
  balls: SerializedPhysicsBall[];
  thumbnail?: string;
}

export class SandboxDatabase extends Dexie {
  public worlds!: Table<SandboxWorldRecord, string>;

  constructor() {
    super('TheDropperSandboxDB_v2');
    this.version(1).stores({ worlds: 'id, name, createdAt, updatedAt' });
    this.version(2).stores({ worlds: 'id, name, createdAt, updatedAt' });
    this.version(3).stores({ worlds: 'id, name, createdAt, updatedAt' });
    this.version(4).stores({ worlds: 'id, name, createdAt, updatedAt' });
    this.version(5).stores({ worlds: 'id, name, createdAt, updatedAt' });
  }
}

export const sandboxDb = new SandboxDatabase();

const LS_BACKUP_KEY = 'the_dropper_sandbox_worlds_master_v2';
const SEED_FLAG_KEY = 'the_dropper_starter_seeded_v2';
export const ACTIVE_WORLD_ID_KEY = 'the_dropper_active_world_id_v2';

/**
 * Strips Vue 3 Reactive Proxies, Symbols, getters, and non-cloneable objects
 * so Structured Clone Algorithm (IndexedDB) never fails with DataCloneError.
 */
export function toPlainRecord(world: SandboxWorldRecord): SandboxWorldRecord {
  const clean: SandboxWorldRecord = {
    id: String(world.id),
    name: String(world.name || 'Laboratorio Sandbox'),
    description: String(world.description || ''),
    createdAt: Number(world.createdAt) || Date.now(),
    updatedAt: Number(world.updatedAt) || Date.now(),
    platformConfig: {
      width: Number(world.platformConfig?.width) || 18,
      depth: Number(world.platformConfig?.depth) || 18,
      isInfinite: Boolean(world.platformConfig?.isInfinite),
    },
    items: JSON.parse(JSON.stringify(world.items || [])),
    balls: JSON.parse(JSON.stringify(world.balls || [])),
    thumbnail: world.thumbnail ? String(world.thumbnail) : '',
  };
  return clean;
}

async function ensureDbOpen(): Promise<boolean> {
  try {
    if (!sandboxDb.isOpen()) {
      await sandboxDb.open();
    }
    return true;
  } catch (err) {
    console.warn('[SandboxDB] IndexedDB could not be opened directly (localStorage active):', err);
    return false;
  }
}

function saveToLocalStorage(record: SandboxWorldRecord): void {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    const list: SandboxWorldRecord[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex((w) => w.id === record.id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('[SandboxDB] LocalStorage save error:', err);
  }
}

function getFromLocalStorage(): SandboxWorldRecord[] {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function deleteFromLocalStorage(id: string): void {
  try {
    const list = getFromLocalStorage().filter((w) => w.id !== id);
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Saves or updates a sandbox world in both Dexie (IndexedDB) and localStorage
 */
export async function saveWorld(world: SandboxWorldRecord): Promise<string> {
  const plain = toPlainRecord(world);
  plain.updatedAt = Date.now();
  world.updatedAt = plain.updatedAt;

  // 1. Save synchronously to localStorage first
  saveToLocalStorage(plain);

  // 2. Save to Dexie IndexedDB
  const dbOk = await ensureDbOpen();
  if (dbOk) {
    try {
      await sandboxDb.worlds.put(plain);
      console.log(`[SandboxDB] Saved world "${plain.name}" (${plain.id}) with ${plain.items.length} items to Dexie and LocalStorage.`);
    } catch (err) {
      console.warn('[SandboxDB] IndexedDB put error (data safe in localStorage):', err);
    }
  } else {
    console.log(`[SandboxDB] Saved world "${plain.name}" (${plain.id}) with ${plain.items.length} items to LocalStorage (IndexedDB unavailable).`);
  }

  return plain.id;
}

/**
 * Retrieves all saved sandbox worlds merged from Dexie and localStorage,
 * always prioritizing the freshest copy by updatedAt timestamp.
 */
export async function getAllWorlds(): Promise<SandboxWorldRecord[]> {
  const dexieList: SandboxWorldRecord[] = [];
  const dbOk = await ensureDbOpen();
  if (dbOk) {
    try {
      const records = await sandboxDb.worlds.toArray();
      if (Array.isArray(records)) {
        dexieList.push(...records);
      }
    } catch (err) {
      console.warn('[SandboxDB] Error getting worlds from Dexie:', err);
    }
  }

  const lsList = getFromLocalStorage();

  // Merge both sources by ID, always selecting the entry with the highest updatedAt
  const recordMap = new Map<string, SandboxWorldRecord>();

  for (const w of dexieList) {
    if (w && w.id) {
      recordMap.set(w.id, w);
    }
  }

  for (const w of lsList) {
    if (w && w.id) {
      const existing = recordMap.get(w.id);
      if (!existing) {
        // Exists in localStorage but not Dexie -> adopt and sync into Dexie
        recordMap.set(w.id, w);
        if (dbOk) {
          sandboxDb.worlds.put(toPlainRecord(w)).catch(() => {});
        }
      } else {
        const wTime = Number(w.updatedAt) || 0;
        const exTime = Number(existing.updatedAt) || 0;
        const wItems = w.items?.length || 0;
        const exItems = existing.items?.length || 0;

        if (wTime > exTime || (wTime === exTime && wItems > exItems)) {
          // localStorage has fresher or richer data -> adopt and sync into Dexie
          recordMap.set(w.id, w);
          if (dbOk) {
            sandboxDb.worlds.put(toPlainRecord(w)).catch(() => {});
          }
        } else if (exTime > wTime || (exTime === wTime && exItems > wItems)) {
          // Dexie has fresher or richer data -> sync into localStorage so it is never stale
          saveToLocalStorage(existing);
        }
      }
    }
  }

  // Backup Dexie-only items into localStorage
  for (const w of dexieList) {
    if (w && w.id && !lsList.some((l) => l.id === w.id)) {
      saveToLocalStorage(w);
    }
  }

  const merged = Array.from(recordMap.values());
  const sorted = merged.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
  return sorted;
}

/**
 * Retrieves a single sandbox world by its ID
 */
export async function getWorldById(id: string): Promise<SandboxWorldRecord | undefined> {
  const all = await getAllWorlds();
  const found = all.find((w) => w.id === id);
  if (found) {
    console.log(`[SandboxDB] getWorldById("${id}") returned "${found.name}" with ${found.items.length} items.`);
  } else {
    console.warn(`[SandboxDB] getWorldById("${id}") not found among ${all.length} worlds.`);
  }
  return found;
}

/**
 * Creates a brand new sandbox world with default or custom platform settings
 */
export async function createNewWorld(
  name: string,
  platformConfig: PlatformConfig = { width: 18, depth: 18, isInfinite: false },
  description?: string
): Promise<SandboxWorldRecord> {
  const id = `world_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = Date.now();

  const newWorld: SandboxWorldRecord = {
    id,
    name: name.trim() || 'Nuevo Laboratorio',
    description: description || 'Mundo creado en el laboratorio de físicas',
    createdAt: now,
    updatedAt: now,
    platformConfig: {
      width: Number(platformConfig?.width) || 18,
      depth: Number(platformConfig?.depth) || 18,
      isInfinite: Boolean(platformConfig?.isInfinite),
    },
    items: [],
    balls: [],
  };

  await saveWorld(newWorld);
  return newWorld;
}

/**
 * Duplicates an existing world with a new unique ID
 */
export async function duplicateWorld(id: string, newName?: string): Promise<SandboxWorldRecord | undefined> {
  const original = await getWorldById(id);
  if (!original) return undefined;

  const now = Date.now();
  const copyId = `world_${now}_${Math.random().toString(36).substring(2, 7)}`;
  const clone: SandboxWorldRecord = {
    ...original,
    id: copyId,
    name: newName || `${original.name} (Copia)`,
    createdAt: now,
    updatedAt: now,
    items: JSON.parse(JSON.stringify(original.items || [])),
    balls: JSON.parse(JSON.stringify(original.balls || [])),
  };

  await saveWorld(clone);
  return clone;
}

/**
 * Deletes a sandbox world from Dexie and localStorage
 */
export async function deleteWorld(id: string): Promise<void> {
  const dbOk = await ensureDbOpen();
  if (dbOk) {
    try {
      await sandboxDb.worlds.delete(id);
    } catch (err) {
      console.warn('[SandboxDB] Dexie delete error:', err);
    }
  }
  deleteFromLocalStorage(id);
  try {
    const curActive = localStorage.getItem(ACTIVE_WORLD_ID_KEY);
    if (curActive === id) {
      localStorage.removeItem(ACTIVE_WORLD_ID_KEY);
    }
  } catch {}
}

/**
 * Renames a sandbox world
 */
export async function renameWorld(id: string, newName: string): Promise<void> {
  const world = await getWorldById(id);
  if (world) {
    world.name = newName.trim();
    world.updatedAt = Date.now();
    await saveWorld(world);
  }
}

/**
 * Seeds a default demonstration world if the database is completely empty
 */
export async function seedStarterWorldIfEmpty(): Promise<SandboxWorldRecord | null> {
  let isAlreadySeeded = false;
  try {
    isAlreadySeeded = Boolean(localStorage.getItem(SEED_FLAG_KEY));
  } catch {}

  const all = await getAllWorlds();
  const hasStarter = all.some((w) => w.id === 'starter_circuit_alpha');

  if (isAlreadySeeded || all.length > 0 || hasStarter) {
    return null;
  }

  const starter: SandboxWorldRecord = {
    id: 'starter_circuit_alpha',
    name: 'Laboratorio Alfa (Demo)',
    description: 'Circuito inicial preconfigurado con rampas, toboganes y rueda de cucharas.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    platformConfig: {
      width: 24,
      depth: 24,
      isInfinite: false,
    },
    items: [
      // 1. Straight slide channel
      {
        id: 'seed_slide_straight',
        type: 'slide_straight',
        position: { x: 0, y: 1.5, z: -3.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      // 2. Curved U-drop chute
      {
        id: 'seed_slide_u_drop',
        type: 'slide_u_drop',
        position: { x: 2.8, y: 0.2, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      // 3. Kinetic spoon wheel
      {
        id: 'seed_spinner_wheel',
        type: 'spinner_wheel',
        position: { x: -3.5, y: 0, z: 1.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      // 4. Starting launch ramp
      {
        id: 'seed_ramp',
        type: 'ramp',
        position: { x: -2.0, y: 0.75, z: -3.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
    ],
    balls: [
      {
        id: 'seed_ball_titanium',
        skinId: 'chrome',
        spawnPos: { x: -2.0, y: 4.5, z: -3.5 },
      },
      {
        id: 'seed_ball_neon',
        skinId: 'neon',
        spawnPos: { x: -3.5, y: 5.0, z: 1.5 },
      },
    ],
  };

  await saveWorld(starter);
  try {
    localStorage.setItem(SEED_FLAG_KEY, 'true');
  } catch {}
  return starter;
}
