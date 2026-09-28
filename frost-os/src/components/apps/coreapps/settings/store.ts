import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../../../../database/db'; // Tu archivo de Dexie

export const useSettingsStore = defineStore('settings', () => {
  const DEFAULT_WALLPAPER_URL = '/wallpapers/default-wallpaper.jpg';
  const DEFAULT_ACCENT_COLOR = '#38bdf8';
  const DEFAULT_BLUR_INTENSITY = 24;

  const wallpaperUrl = ref<string>(DEFAULT_WALLPAPER_URL);
  const isCustomWallpaper = ref(false);
  const targetSection = ref<string>('system');

  const accentColor = ref<string>(localStorage.getItem('frost_accent_color') || DEFAULT_ACCENT_COLOR);
  const blurIntensity = ref<number>(
    localStorage.getItem('frost_blur_intensity') !== null
      ? Number(localStorage.getItem('frost_blur_intensity'))
      : DEFAULT_BLUR_INTENSITY
  );

  function hexToRgb(hex: string) {
    let c = hex.replace('#', '');
    if (c.length === 3) {
      c = c.split('').map((x) => x + x).join('');
    }
    const num = parseInt(c, 16);
    if (isNaN(num)) return { r: 56, g: 189, b: 248 };
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function adjustBrightness(hex: string, percent: number) {
    const { r, g, b } = hexToRgb(hex);
    const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
    const factor = percent / 100;
    const newR = factor > 0 ? r + (255 - r) * factor : r + r * factor;
    const newG = factor > 0 ? g + (255 - g) * factor : g + g * factor;
    const newB = factor > 0 ? b + (255 - b) * factor : b + b * factor;
    const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  }

  function applyThemeToDom() {
    if (typeof document === 'undefined') return;
    const rgb = hexToRgb(accentColor.value);
    const root = document.documentElement;

    root.style.setProperty('--os-accent-color', accentColor.value);
    root.style.setProperty('--os-accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    root.style.setProperty('--os-accent-dark', adjustBrightness(accentColor.value, -25));
    root.style.setProperty('--os-accent-light', adjustBrightness(accentColor.value, 25));

    const blurVal = blurIntensity.value;
    root.style.setProperty('--os-blur-val', `${blurVal}px`);
    root.style.setProperty('--os-blur', `blur(${blurVal}px)`);
    root.style.setProperty('--os-blur-heavy', `blur(${Math.round(blurVal * 1.5)}px)`);
    root.style.setProperty('--os-blur-light', `blur(${Math.max(2, Math.round(blurVal * 0.4))}px)`);
    root.style.setProperty('--frst-blur-normal', `blur(${blurVal}px)`);
    root.style.setProperty('--os-frame-blur', `blur(${blurVal}px)`);
  }

  // Aplicar inmediatamente al instanciar el store con los valores iniciales
  applyThemeToDom();

  function setTargetSection(section: string) {
    targetSection.value = section;
  }

  async function setAccentColor(color: string) {
    accentColor.value = color;
    localStorage.setItem('frost_accent_color', color);
    applyThemeToDom();
    try {
      await db.systemSettings.put({ key: 'ui.accent_color', value: color });
    } catch (e) {
      console.error('Error guardando color de acento:', e);
    }
  }

  async function setBlurIntensity(val: number) {
    blurIntensity.value = val;
    localStorage.setItem('frost_blur_intensity', String(val));
    applyThemeToDom();
    try {
      await db.systemSettings.put({ key: 'ui.blur_intensity', value: val });
    } catch (e) {
      console.error('Error guardando intensidad de blur:', e);
    }
  }

  async function resetThemeToDefault() {
    await setAccentColor(DEFAULT_ACCENT_COLOR);
    await setBlurIntensity(DEFAULT_BLUR_INTENSITY);
  }

  function revokeIfCustom(url: string) {
    if (url && url !== DEFAULT_WALLPAPER_URL) {
      URL.revokeObjectURL(url);
    }
  }

  // Cargar el wallpaper y tema guardado al iniciar
  async function loadSettings() {
    try {
      const setting = await db.systemSettings.get('ui.wallpaper');
      if (setting) {
        const asset = await db.assets.get(setting.value);
        if (asset) {
          revokeIfCustom(wallpaperUrl.value);
          wallpaperUrl.value = URL.createObjectURL(asset.data);
          isCustomWallpaper.value = true;
        } else {
          await db.systemSettings.delete('ui.wallpaper');
          revokeIfCustom(wallpaperUrl.value);
          wallpaperUrl.value = DEFAULT_WALLPAPER_URL;
          isCustomWallpaper.value = false;
        }
      } else {
        revokeIfCustom(wallpaperUrl.value);
        wallpaperUrl.value = DEFAULT_WALLPAPER_URL;
        isCustomWallpaper.value = false;
      }

      // Cargar color de acento guardado
      const savedAccent = await db.systemSettings.get('ui.accent_color');
      if (savedAccent && savedAccent.value) {
        accentColor.value = savedAccent.value;
      }
      // Cargar blur guardado
      const savedBlur = await db.systemSettings.get('ui.blur_intensity');
      if (savedBlur && savedBlur.value !== undefined) {
        blurIntensity.value = Number(savedBlur.value);
      }
    } catch (e) {
      console.warn('Error al cargar ajustes del sistema desde Dexie:', e);
    }

    applyThemeToDom();
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
    revokeIfCustom(wallpaperUrl.value);
    wallpaperUrl.value = URL.createObjectURL(file);
    isCustomWallpaper.value = true;
  }

  async function resetWallpaperToDefault() {
    const setting = await db.systemSettings.get('ui.wallpaper');
    if (setting) {
      await db.assets.delete(setting.value);
      await db.systemSettings.delete('ui.wallpaper');
    }
    revokeIfCustom(wallpaperUrl.value);
    wallpaperUrl.value = DEFAULT_WALLPAPER_URL;
    isCustomWallpaper.value = false;
  }

  return { 
    wallpaperUrl, 
    isCustomWallpaper, 
    updateWallpaper, 
    resetWallpaperToDefault, 
    loadSettings, 
    targetSection, 
    setTargetSection,
    accentColor,
    blurIntensity,
    setAccentColor,
    setBlurIntensity,
    resetThemeToDefault,
    applyThemeToDom,
    DEFAULT_ACCENT_COLOR,
    DEFAULT_BLUR_INTENSITY
  };
});
