import { ref } from 'vue';
import {
  type SandboxWorldRecord,
  saveWorld,
  getWorldById,
  getAllWorlds,
  createNewWorld,
  type SerializedSandboxItem,
  type SerializedPhysicsBall,
  ACTIVE_WORLD_ID_KEY,
} from '../db/sandboxDb';
import type { PlatformConfig } from '../utils/sandboxPhysics';
import { sound } from '../utils/sound';

export const activeWorld = ref<SandboxWorldRecord | null>(null);
export const hasUnsavedChanges = ref<boolean>(false);
export const isSaving = ref<boolean>(false);
export const lastSavedTime = ref<number | null>(null);
export const saveToastMessage = ref<string | null>(null);

let saveToastTimer: ReturnType<typeof setTimeout> | null = null;

export function setActiveWorld(world: SandboxWorldRecord | null) {
  activeWorld.value = world;
  hasUnsavedChanges.value = false;
  lastSavedTime.value = world?.updatedAt ?? null;
  try {
    if (world?.id) {
      localStorage.setItem(ACTIVE_WORLD_ID_KEY, world.id);
    }
  } catch {}
}

export async function restoreActiveWorld(): Promise<SandboxWorldRecord | null> {
  if (activeWorld.value) return activeWorld.value;

  try {
    const savedId = localStorage.getItem(ACTIVE_WORLD_ID_KEY);
    if (savedId) {
      const found = await getWorldById(savedId);
      if (found) {
        setActiveWorld(found);
        return found;
      }
    }
  } catch {}

  const all = await getAllWorlds();
  if (all && all.length > 0) {
    setActiveWorld(all[0]);
    return all[0];
  }
  return null;
}

export function markUnsavedChanges() {
  hasUnsavedChanges.value = true;
}

export function showSaveToast(msg: string) {
  saveToastMessage.value = msg;
  if (saveToastTimer) clearTimeout(saveToastTimer);
  saveToastTimer = setTimeout(() => {
    saveToastMessage.value = null;
  }, 2800);
}

/**
 * Saves current world state to Dexie database (and localStorage fallback)
 */
export async function saveCurrentWorld(
  state: {
    platformConfig: PlatformConfig;
    items: SerializedSandboxItem[];
    balls: SerializedPhysicsBall[];
  },
  options: { silent?: boolean } = {}
): Promise<boolean> {
  try {
    isSaving.value = true;

    // Ensure we have an active world context
    if (!activeWorld.value) {
      const restored = await restoreActiveWorld();
      if (!restored) {
        const fallbackWorld = await createNewWorld('Mi Laboratorio', state.platformConfig);
        setActiveWorld(fallbackWorld);
      }
    }

    if (!activeWorld.value) {
      throw new Error('No se pudo determinar el mundo activo para guardar');
    }

    const now = Date.now();

    // Prepare clean POJO record without Vue 3 Reactive Proxies or non-serializables
    const recordToSave: SandboxWorldRecord = {
      id: String(activeWorld.value.id),
      name: String(activeWorld.value.name || 'Laboratorio Sandbox'),
      description: String(activeWorld.value.description || ''),
      createdAt: Number(activeWorld.value.createdAt) || now,
      updatedAt: now,
      platformConfig: {
        width: Number(state.platformConfig?.width) || 18,
        depth: Number(state.platformConfig?.depth) || 18,
        isInfinite: Boolean(state.platformConfig?.isInfinite),
      },
      items: JSON.parse(JSON.stringify(state.items || [])),
      balls: JSON.parse(JSON.stringify(state.balls || [])),
      thumbnail: activeWorld.value.thumbnail || '',
    };

    console.log(`[SandboxWorldStore] Saving world "${recordToSave.name}" (${recordToSave.id}) with ${recordToSave.items.length} items...`);
    await saveWorld(recordToSave);

    // Update in-memory reactive activeWorld
    activeWorld.value.platformConfig = { ...recordToSave.platformConfig };
    activeWorld.value.items = [...recordToSave.items];
    activeWorld.value.balls = [...recordToSave.balls];
    activeWorld.value.updatedAt = recordToSave.updatedAt;

    hasUnsavedChanges.value = false;
    lastSavedTime.value = recordToSave.updatedAt;
    if (!options.silent) {
      showSaveToast(`"${activeWorld.value.name}" guardado (${recordToSave.items.length} piezas)`);
      sound.playClick(0.12);
    }
    return true;
  } catch (err: any) {
    console.error('[SandboxWorldStore] Failed to save world:', err);
    const detail = err?.message ? ` (${err.message})` : '';
    showSaveToast(`Error al guardar el mundo${detail}`);
    return false;
  } finally {
    isSaving.value = false;
  }
}

/**
 * Reloads the active world from the database
 */
export async function refreshActiveWorld(): Promise<void> {
  if (!activeWorld.value?.id) return;
  const reloaded = await getWorldById(activeWorld.value.id);
  if (reloaded) {
    activeWorld.value = reloaded;
  }
}
