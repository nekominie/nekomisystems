import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../../../database/db';

export interface LockSettings {
  lockOnStartup: boolean;
  requirePin: boolean;
  pin: string;
  timeoutMinutes: number;
  lockBgMode: 'desktop' | 'custom';
  customBgUrl: string;
}

export const useLockStore = defineStore('lock', () => {
  // Estado de bloqueo sincronizado inicialmente desde localStorage
  const savedState = localStorage.getItem('frost_lock_state');
  const savedLockOnStartup = localStorage.getItem('frost_lock_on_startup') === 'true';

  const isLocked = ref<boolean>(savedState === 'locked' || savedLockOnStartup);
  const isChallengeVisible = ref<boolean>(false);

  // Configuraciones de bloqueo
  const lockOnStartup = ref<boolean>(savedLockOnStartup);
  const requirePin = ref<boolean>(localStorage.getItem('frost_lock_require_pin') === 'true');
  const pin = ref<string>(localStorage.getItem('frost_lock_pin') || '1234');
  const timeoutMinutes = ref<number>(Number(localStorage.getItem('frost_lock_timeout') || '0'));
  const lockBgMode = ref<'desktop' | 'custom'>((localStorage.getItem('frost_lock_bg_mode') as any) || 'desktop');
  const customBgUrl = ref<string>(localStorage.getItem('frost_lock_custom_bg') || '');

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
      const profile = await new Promise<any>((resolve) => {
        const req = indexedDB.open('NekomiOS_DB', 1);
        req.onsuccess = (e: any) => {
          const idb = e.target.result;
          if (!idb.objectStoreNames.contains('user_data')) return resolve(null);
          const tx = idb.transaction('user_data', 'readonly');
          const store = tx.objectStore('user_data');
          const getReq = store.get('profile');
          getReq.onsuccess = () => resolve(getReq.result || null);
          getReq.onerror = () => resolve(null);
        };
        req.onerror = () => resolve(null);
      });

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
        if (v.customBgUrl) customBgUrl.value = v.customBgUrl;
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
    if (newSettings.customBgUrl !== undefined) {
      customBgUrl.value = newSettings.customBgUrl;
      localStorage.setItem('frost_lock_custom_bg', newSettings.customBgUrl);
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
          customBgUrl: customBgUrl.value
        }
      });
    } catch (e) {
      console.error('Error guardando ajustes de bloqueo en DB:', e);
    }
  }

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
    loadUserProfile
  };
});
