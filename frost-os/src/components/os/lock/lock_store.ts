import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../../../database/db';
import { getUserProfile } from '../../../database/user_profile';

export interface LockSettings {
  lockOnStartup: boolean;
  requirePin: boolean;
  pin: string;
  timeoutMinutes: number;
  lockBgMode: 'desktop' | 'custom';
  customBgAssetId?: string;
  customBgUrl: string;
}

export const useLockStore = defineStore('lock', () => {
  // Estado de bloqueo sincronizado inicialmente desde localStorage
  const savedState = localStorage.getItem('frost_lock_state');
  const savedLockOnStartup = localStorage.getItem('frost_lock_on_startup') === 'true';

  const isLocked = ref<boolean>(savedState === 'locked' || savedLockOnStartup || !savedState);
  const isChallengeVisible = ref<boolean>(false);

  // Configuraciones de bloqueo
  const lockOnStartup = ref<boolean>(savedLockOnStartup);
  const requirePin = ref<boolean>(localStorage.getItem('frost_lock_require_pin') === 'true');
  const pin = ref<string>(localStorage.getItem('frost_lock_pin') || '1234');
  const timeoutMinutes = ref<number>(Number(localStorage.getItem('frost_lock_timeout') || '0'));
  const lockBgMode = ref<'desktop' | 'custom'>((localStorage.getItem('frost_lock_bg_mode') as any) || 'desktop');
  const customBgAssetId = ref<string>(localStorage.getItem('frost_lock_custom_bg_id') || '');
  const customBgUrl = ref<string>(
    localStorage.getItem('frost_lock_custom_bg') && !localStorage.getItem('frost_lock_custom_bg')?.startsWith('blob:')
      ? localStorage.getItem('frost_lock_custom_bg')!
      : ''
  );

  // Datos del usuario para la pantalla de inicio de sesión
  const userName = ref<string>('Nekomi User');
  const userAvatarUrl = ref<string>('');

  let inactivityInterval: number | null = null;
  let lastActivityTime = Date.now();

  function registerActivity() {
    lastActivityTime = Date.now();
  }

  function startInactivityTracker() {
    if (inactivityInterval) clearInterval(inactivityInterval);

    window.addEventListener('mousemove', registerActivity, { passive: true });
    window.addEventListener('keydown', registerActivity, { passive: true });
    window.addEventListener('pointerdown', registerActivity, { passive: true });

    inactivityInterval = window.setInterval(() => {
      if (isLocked.value || timeoutMinutes.value <= 0) return;
      const elapsed = (Date.now() - lastActivityTime) / 60000;
      if (elapsed >= timeoutMinutes.value) {
        lock();
      }
    }, 15000);
  }

  async function loadUserProfile() {
    try {
      const profile = await getUserProfile();

      if (profile) {
        if (profile.name) userName.value = profile.name;
        if (profile.avatar && profile.avatar instanceof Blob) {
          if (userAvatarUrl.value && userAvatarUrl.value.startsWith('blob:')) {
            URL.revokeObjectURL(userAvatarUrl.value);
          }
          userAvatarUrl.value = URL.createObjectURL(profile.avatar);
        }
      }
    } catch (e) {
      console.error('Error cargando perfil en lock_store:', e);
    }
  }

  async function loadSettings() {
    try {
      const setting = await db.systemSettings.get('os.lock_settings');
      if (setting && setting.value) {
        const v = setting.value as LockSettings;
        if (typeof v.lockOnStartup === 'boolean') lockOnStartup.value = v.lockOnStartup;
        if (typeof v.requirePin === 'boolean') requirePin.value = v.requirePin;
        if (v.pin) pin.value = v.pin;
        if (typeof v.timeoutMinutes === 'number') timeoutMinutes.value = v.timeoutMinutes;
        if (v.lockBgMode) lockBgMode.value = v.lockBgMode;
        if (v.customBgAssetId) customBgAssetId.value = v.customBgAssetId;
        if (v.customBgUrl && !v.customBgUrl.startsWith('blob:')) {
          customBgUrl.value = v.customBgUrl;
        }
      }

      // Cargar la imagen real (Blob) desde Dexie si hay un assetId guardado
      const assetIdToLoad = customBgAssetId.value || localStorage.getItem('frost_lock_custom_bg_id');
      if (assetIdToLoad) {
        const asset = await db.assets.get(assetIdToLoad);
        if (asset && asset.data) {
          if (customBgUrl.value && customBgUrl.value.startsWith('blob:')) {
            URL.revokeObjectURL(customBgUrl.value);
          }
          customBgUrl.value = URL.createObjectURL(asset.data);
          customBgAssetId.value = assetIdToLoad;
        } else {
          // El asset ya no existe en Dexie
          customBgAssetId.value = '';
          customBgUrl.value = '';
        }
      }
    } catch (e) {
      console.warn('No se pudieron leer los ajustes de bloqueo de DB:', e);
    }

    await loadUserProfile();
    startInactivityTracker();
  }

  async function saveSettings(newSettings: Partial<LockSettings>) {
    if (newSettings.lockOnStartup !== undefined) {
      lockOnStartup.value = newSettings.lockOnStartup;
      localStorage.setItem('frost_lock_on_startup', String(newSettings.lockOnStartup));
    }
    if (newSettings.requirePin !== undefined) {
      requirePin.value = newSettings.requirePin;
      localStorage.setItem('frost_lock_require_pin', String(newSettings.requirePin));
    }
    if (newSettings.pin !== undefined) {
      pin.value = newSettings.pin;
      localStorage.setItem('frost_lock_pin', newSettings.pin);
    }
    if (newSettings.timeoutMinutes !== undefined) {
      timeoutMinutes.value = newSettings.timeoutMinutes;
      localStorage.setItem('frost_lock_timeout', String(newSettings.timeoutMinutes));
    }
    if (newSettings.lockBgMode !== undefined) {
      lockBgMode.value = newSettings.lockBgMode;
      localStorage.setItem('frost_lock_bg_mode', newSettings.lockBgMode);
    }
    if (newSettings.customBgAssetId !== undefined) {
      customBgAssetId.value = newSettings.customBgAssetId;
      if (newSettings.customBgAssetId) {
        localStorage.setItem('frost_lock_custom_bg_id', newSettings.customBgAssetId);
      } else {
        localStorage.removeItem('frost_lock_custom_bg_id');
      }
    }
    if (newSettings.customBgUrl !== undefined) {
      customBgUrl.value = newSettings.customBgUrl;
      if (newSettings.customBgUrl && !newSettings.customBgUrl.startsWith('blob:')) {
        localStorage.setItem('frost_lock_custom_bg', newSettings.customBgUrl);
      } else {
        localStorage.removeItem('frost_lock_custom_bg');
      }
    }

    try {
      await db.systemSettings.put({
        key: 'os.lock_settings',
        value: {
          lockOnStartup: lockOnStartup.value,
          requirePin: requirePin.value,
          pin: pin.value,
          timeoutMinutes: timeoutMinutes.value,
          lockBgMode: lockBgMode.value,
          customBgAssetId: customBgAssetId.value,
          customBgUrl: customBgUrl.value && !customBgUrl.value.startsWith('blob:') ? customBgUrl.value : ''
        }
      });
    } catch (e) {
      console.error('Error guardando ajustes de bloqueo en DB:', e);
    }
  }

  async function setCustomLockBg(file: File) {
    const assetId = `lock-bg-${Date.now()}`;

    // 1. Guardar el archivo real (Blob) en Dexie assets
    await db.assets.put({
      id: assetId,
      name: file.name,
      data: file,
      type: 'lock_wallpaper'
    });

    // 2. Limpiar asset anterior de bloqueo si existía
    if (customBgAssetId.value && customBgAssetId.value.startsWith('lock-bg-')) {
      try {
        await db.assets.delete(customBgAssetId.value);
      } catch (e) {
        console.warn('Error eliminando asset anterior de bloqueo:', e);
      }
    }

    // 3. Revocar URL anterior si era blob
    if (customBgUrl.value && customBgUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(customBgUrl.value);
    }

    // 4. Crear nueva URL reactiva para la interfaz
    const objectUrl = URL.createObjectURL(file);
    customBgUrl.value = objectUrl;
    customBgAssetId.value = assetId;
    lockBgMode.value = 'custom';

    localStorage.setItem('frost_lock_bg_mode', 'custom');
    localStorage.setItem('frost_lock_custom_bg_id', assetId);

    // 5. Guardar configuración en DB
    await saveSettings({
      lockBgMode: 'custom',
      customBgAssetId: assetId,
      customBgUrl: objectUrl
    });
  }

  async function resetCustomLockBg() {
    if (customBgAssetId.value && customBgAssetId.value.startsWith('lock-bg-')) {
      try {
        await db.assets.delete(customBgAssetId.value);
      } catch (e) {
        console.warn('Error eliminando asset de bloqueo:', e);
      }
    }

    if (customBgUrl.value && customBgUrl.value.startsWith('blob:')) {
      URL.revokeObjectURL(customBgUrl.value);
    }

    customBgUrl.value = '';
    customBgAssetId.value = '';
    lockBgMode.value = 'desktop';

    localStorage.setItem('frost_lock_bg_mode', 'desktop');
    localStorage.removeItem('frost_lock_custom_bg_id');
    localStorage.removeItem('frost_lock_custom_bg');

    await saveSettings({
      lockBgMode: 'desktop',
      customBgAssetId: '',
      customBgUrl: ''
    });
  }

  // Cargar inmediatamente desde DB
  loadSettings();

  function lock() {
    isLocked.value = true;
    isChallengeVisible.value = false;
    localStorage.setItem('frost_lock_state', 'locked');
  }

  function unlock() {
    isLocked.value = false;
    isChallengeVisible.value = false;
    localStorage.setItem('frost_lock_state', 'unlocked');
    registerActivity();
  }

  function showChallenge() {
    isChallengeVisible.value = true;
  }

  function hideChallenge() {
    isChallengeVisible.value = false;
  }

  function validatePin(enteredPin: string): boolean {
    if (!requirePin.value) {
      unlock();
      return true;
    }
    if (enteredPin === pin.value) {
      unlock();
      return true;
    }
    return false;
  }

  return {
    isLocked,
    isChallengeVisible,
    lockOnStartup,
    requirePin,
    pin,
    timeoutMinutes,
    lockBgMode,
    customBgAssetId,
    customBgUrl,
    userName,
    userAvatarUrl,
    lock,
    unlock,
    showChallenge,
    hideChallenge,
    validatePin,
    loadSettings,
    saveSettings,
    setCustomLockBg,
    resetCustomLockBg,
    loadUserProfile
  };
});
