import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { db } from '../../../../database/db'; // Tu archivo de Dexie

export const useSettingsStore = defineStore('settings', () => {
  const wallpaperUrl = ref<string | null>(null);

  // Cargar el wallpaper guardado al iniciar
  async function loadSettings() {
    const setting = await db.systemSettings.get('ui.wallpaper');
    if (setting) {
      // Si guardamos un ID de asset, buscamos el blob
      const asset = await db.assets.get(setting.value);
      if (asset) {
        wallpaperUrl.value = URL.createObjectURL(asset.data);
      }
    }
  }

  async function updateWallpaper(file: File) {
    const id = `wp-${Date.now()}`;
    
    // 1. Guardar el archivo real (Blob) en la tabla de assets
    await db.assets.put({
      id: id,
      name: file.name,
      data: file, // File es un tipo de Blob, Dexie lo guarda directo
      type: 'wallpaper'
    });

    // 2. Guardar la referencia en los ajustes del sistema
    await db.systemSettings.put({ key: 'ui.wallpaper', value: id });

    // 3. Actualizar la URL reactiva para la UI
    // Limpiamos la URL anterior para evitar fugas de memoria
    if (wallpaperUrl.value) URL.revokeObjectURL(wallpaperUrl.value);
    wallpaperUrl.value = URL.createObjectURL(file);
  }

  return { wallpaperUrl, updateWallpaper, loadSettings };
});