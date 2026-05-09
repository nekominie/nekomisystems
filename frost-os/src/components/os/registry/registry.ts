import { defineStore } from 'pinia';
import { reactive } from 'vue';
import { db } from '../../../database/db';

export const useSettingsStore = defineStore('system_settings', () => {
  // Estado reactivo para acceso instantáneo en componentes
  const registry = reactive<Record<string, any>>({});

  // Carga inicial al arrancar el SO
  async function init() {
    const all = await db.systemSettings.toArray();
    all.forEach(item => {
      registry[item.key] = item.value;
    });
  }

  // Método universal para guardar ajustes
  async function set(key: string, value: any) {
    registry[key] = value; // Actualización inmediata en UI
    await db.systemSettings.put({ key, value }); // Persistencia
  }

  // Método para obtener (con valor por defecto)
  function get(key: string, defaultValue: any = null) {
    return registry[key] !== undefined ? registry[key] : defaultValue;
  }

  return { registry, set, get, init };
});