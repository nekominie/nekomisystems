<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";
import { useSettingsStore } from "../../store";
import { useLockStore } from "../../../../../os/lock/lock_store";

const settings = useSettingsStore();
const lockStore = useLockStore();

const newPinInput = ref("");
const confirmPinInput = ref("");
const pinSaveSuccess = ref(false);
const pinSaveError = ref("");

const toggleLockOnStartup = async () => {
  await lockStore.saveSettings({ lockOnStartup: !lockStore.lockOnStartup });
};

const toggleRequirePin = async () => {
  await lockStore.saveSettings({ requirePin: !lockStore.requirePin });
};

const handleTimeoutChange = async (event: Event) => {
  const val = Number((event.target as HTMLSelectElement).value);
  await lockStore.saveSettings({ timeoutMinutes: val });
};

const handleLockBgModeChange = async (mode: 'desktop' | 'custom') => {
  await lockStore.saveSettings({ lockBgMode: mode });
};

const handleCustomLockBgUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  await lockStore.saveSettings({ customBgUrl: url, lockBgMode: 'custom' });
};

const saveNewPin = async () => {
  pinSaveError.value = "";
  pinSaveSuccess.value = false;

  if (!newPinInput.value) {
    pinSaveError.value = "Ingresa un PIN válido";
    return;
  }
  if (newPinInput.value !== confirmPinInput.value) {
    pinSaveError.value = "Los PINs no coinciden";
    return;
  }

  await lockStore.saveSettings({ pin: newPinInput.value });
  pinSaveSuccess.value = true;
  newPinInput.value = "";
  confirmPinInput.value = "";

  setTimeout(() => {
    pinSaveSuccess.value = false;
  }, 3000);
};

const lockNow = () => {
  lockStore.lock();
};

const handleWallpaperChange = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    await settings.updateWallpaper(file);
    selectedWallpaper.value = "custom";
    console.log("Wallpaper actualizado con éxito");
  } catch (err) {
    console.error("Error al guardar el wallpaper:", err);
  }
};

const restoreDefaultWallpaper = async () => {
  try {
    await settings.resetWallpaperToDefault();
    selectedWallpaper.value = "default";
  } catch (err) {
    console.error("Error al restaurar el wallpaper predeterminado:", err);
  }
};

type SettingsSection =
  | "system"
  | "bluetooth"
  | "network"
  | "personalization"
  | "lockscreen"
  | "apps"
  | "accounts"
  | "update";

const activeSection = ref<SettingsSection>("system");
const searchQuery = ref("");
const selectedWallpaper = ref("default");

onMounted(() => {
  if (settings.isCustomWallpaper) {
    selectedWallpaper.value = "custom";
  }
});

const sections = [
  { id: "system", label: "Sistema", icon: "bi-display" },
  { id: "bluetooth", label: "Bluetooth y Dispositivos", icon: "bi-bluetooth" },
  { id: "network", label: "Red e Internet", icon: "bi-wifi" },
  { id: "personalization", label: "Personalización", icon: "bi-palette2" },
  { id: "lockscreen", label: "Pantalla de bloqueo", icon: "bi-lock" },
  { id: "apps", label: "Apps", icon: "bi-grid" },
  { id: "accounts", label: "Cuentas", icon: "bi-person-circle" },
  { id: "update", label: "Actualización", icon: "bi-arrow-repeat" },
] as const;

const wallpapers = [
  { id: "aurora", name: "Aurora Lake", className: "wall-aurora" },
  { id: "dusk", name: "Dusk Horizon", className: "wall-dusk" },
  { id: "nord", name: "Nord Summit", className: "wall-nord" },
  { id: "sunset", name: "Sunset Flow", className: "wall-sunset" },
  { id: "matrix", name: "Neon Grid", className: "wall-matrix" },
  { id: "clouds", name: "Cloud Drift", className: "wall-clouds" },
];

const activeMeta = computed(() => sections.find((s) => s.id === activeSection.value) ?? sections[0]);

const filteredSections = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return sections;
  return sections.filter((s) => s.label.toLowerCase().includes(query));
});
</script>

<template>
  <div class="settings-shell frst-bg-dark">
    <aside class="sidebar">
      <div class="profile-card glass-card">
        <div class="avatar">
          <i class="bi bi-person-fill"></i>
        </div>
        <div class="profile-meta">
          <strong>Nekomi User</strong>
          <small>Local account</small>
        </div>
      </div>

      <label class="search-box glass-card">
        <i class="bi bi-search"></i>
        <input class="" v-model="searchQuery" type="text" placeholder="Buscar ajustes..." />
      </label>

      <nav class="section-list">
        <button
          v-for="section in filteredSections"
          :key="section.id"
          class="section-btn"
          :class="{ active: activeSection === section.id }"
          @click="activeSection = section.id"
        >
          <i class="bi" :class="section.icon"></i>
          <span>{{ section.label }}</span>
          <i class="bi bi-chevron-right"></i>
        </button>
      </nav>
    </aside>

    <main class="main-area">
      <header class="main-header glass-card">
        <div>
          <h1>{{ activeMeta.label }}</h1>
          <p>Manage your mini OS preferences.</p>
        </div>
        <button class="quick-action">
          <i class="bi bi-magic"></i>
          <span>Quick assist</span>
        </button>
      </header>

      <section v-if="activeSection === 'system'" class="section-content">
        <div class="grid two">
          <article class="setting-card glass-card">
            <h3><i class="bi bi-cpu"></i> Device Specs</h3>
            <ul>
              <li>CPU: FrostCore v4</li>
              <li>RAM: 8 GB</li>
              <li>Storage: 256 GB SSD</li>
              <li>System type: 64-bit</li>
            </ul>
          </article>
          <article class="setting-card glass-card">
            <h3><i class="bi bi-battery-charging"></i> Power</h3>
            <div class="option-row"><span>Battery saver</span><div class="fake-switch on"></div></div>
            <div class="option-row"><span>Sleep after 15 minutes</span><i class="bi bi-chevron-right"></i></div>
            <div class="option-row"><span>Performance mode: Balanced</span><i class="bi bi-chevron-right"></i></div>
          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'bluetooth'" class="section-content">
        <div class="grid one">
          <article class="setting-card glass-card">
            <h3><i class="bi bi-bluetooth"></i> Bluetooth & devices</h3>
            <div class="option-row"><span>Bluetooth</span><div class="fake-switch on"></div></div>
            <div class="option-row"><span>Mouse - Connected</span><span class="state-pill ok">Connected</span></div>
            <div class="option-row"><span>Keyboard - Connected</span><span class="state-pill ok">Connected</span></div>
            <div class="option-row"><span>Add device</span><i class="bi bi-plus-circle"></i></div>
          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'network'" class="section-content">
        <div class="grid two">
          <article class="setting-card glass-card">
            <h3><i class="bi bi-wifi"></i> Wi-Fi</h3>
            <div class="option-row"><span>Wi-Fi</span><div class="fake-switch on"></div></div>
            <div class="option-row"><span>Connected network: NekomiNet</span><span class="state-pill ok">Secured</span></div>
            <div class="option-row"><span>Show available networks</span><i class="bi bi-chevron-right"></i></div>
          </article>
          <article class="setting-card glass-card">
            <h3><i class="bi bi-shield-lock"></i> VPN & Proxy</h3>
            <div class="option-row"><span>VPN</span><span class="state-pill">Off</span></div>
            <div class="option-row"><span>Manual proxy setup</span><span class="state-pill">Off</span></div>
            <div class="option-row"><span>Metered connection</span><div class="fake-switch"></div></div>
          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'personalization'" class="section-content">
        <div class="grid one">
          <article class="setting-card glass-card wallpaper-card">
            <h3><i class="bi bi-image"></i>Wallpaper</h3>
            <p class="sub">Selecciona el fondo del escritorio</p>

            <div class="wallpaper-preview-current" :style="{ backgroundImage: `url(${settings.wallpaperUrl})` }">
              <span class="preview-label">Vista previa</span>
            </div>

            <div class="wallpaper-grid">
              <button
                v-for="wall in wallpapers"
                :key="wall.id"
                class="wallpaper-item"
                :class="[wall.className, { selected: selectedWallpaper === wall.id }]"
                @click="selectedWallpaper = wall.id"
                :title="wall.name"
              >
                <span>{{ wall.name }}</span>
                <i v-if="selectedWallpaper === wall.id" class="bi bi-check-circle-fill"></i>
              </button>

              <button
                class="wallpaper-item wallpaper-default"
                :class="{ selected: selectedWallpaper === 'default' }"
                @click="restoreDefaultWallpaper()"
                title="Predeterminado del sistema"
              >
                <span>Predeterminado</span>
                <i v-if="selectedWallpaper === 'default'" class="bi bi-check-circle-fill"></i>
              </button>

              <button
                v-if="settings.isCustomWallpaper"
                class="wallpaper-item wallpaper-custom"
                :class="{ selected: selectedWallpaper === 'custom' }"
                :style="{ backgroundImage: `url(${settings.wallpaperUrl})` }"
                @click="selectedWallpaper = 'custom'"
                title="Personalizado"
              >
                <span>Personalizado</span>
                <i v-if="selectedWallpaper === 'custom'" class="bi bi-check-circle-fill"></i>
              </button>
            </div>

            <div class="wallpaper-actions">
              <input
                id="wallpaper-upload"
                type="file"
                accept="image/*"
                @change="handleWallpaperChange"
              />
              <label for="wallpaper-upload" class="wallpaper-upload-btn">
                <i class="bi bi-upload"></i>
                Subir imagen personalizada
              </label>

              <button
                v-if="settings.isCustomWallpaper"
                class="wallpaper-reset-btn"
                @click="restoreDefaultWallpaper()"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
                Restaurar predeterminado
              </button>
            </div>
          </article>

          <article class="setting-card glass-card">
            <h3><i class="bi bi-palette"></i>Tema</h3>
            <div class="theme-swatches">
              <button class="swatch sw1"></button>
              <button class="swatch sw2"></button>
              <button class="swatch sw3"></button>
              <button class="swatch sw4"></button>
              <button class="swatch sw5"></button>
            </div>

            <p class="sub">Color de interfaz</p>

            <input type="color" v-model="settings.themeColor">

            <p class="sub">Intensidad del difuminado</p>

            <input type="range" v-model="settings.accentColor">


          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'lockscreen'" class="section-content">
        <div class="grid two">
          <!-- Tarjeta 1: Comportamiento y Persistencia -->
          <article class="setting-card glass-card">
            <h3><i class="bi bi-shield-lock"></i> Comportamiento de Bloqueo</h3>
            <p class="sub">Configura la persistencia y el inicio del sistema</p>

            <div class="option-row">
              <div class="option-info">
                <span>Bloquear al iniciar el sistema</span>
                <small class="option-desc">Exigir desbloqueo al encender o recargar Frost OS</small>
              </div>
              <div 
                class="interactive-switch" 
                :class="{ on: lockStore.lockOnStartup }" 
                @click="toggleLockOnStartup"
              ></div>
            </div>

            <div class="option-row">
              <div class="option-info">
                <span>Requerir PIN para desbloquear</span>
                <small class="option-desc">Solicitar código de seguridad en lugar de clic simple</small>
              </div>
              <div 
                class="interactive-switch" 
                :class="{ on: lockStore.requirePin }" 
                @click="toggleRequirePin"
              ></div>
            </div>

            <div class="option-row">
              <div class="option-info">
                <span>Bloqueo por inactividad</span>
                <small class="option-desc">Tiempo antes de bloquear la pantalla automáticamente</small>
              </div>
              <select 
                class="setting-select" 
                :value="lockStore.timeoutMinutes" 
                @change="handleTimeoutChange"
              >
                <option :value="0">Nunca</option>
                <option :value="1">1 minuto</option>
                <option :value="3">3 minutos</option>
                <option :value="5">5 minutos</option>
                <option :value="15">15 minutos</option>
                <option :value="30">30 minutos</option>
              </select>
            </div>

            <div class="lock-test-action" style="margin-top: 14px;">
              <button class="lock-now-btn" @click="lockNow">
                <i class="bi bi-lock-fill"></i>
                <span>Bloquear el sistema ahora</span>
              </button>
            </div>
          </article>

          <!-- Tarjeta 2: Configuración de PIN y Seguridad -->
          <article class="setting-card glass-card">
            <h3><i class="bi bi-key"></i> Código PIN de Acceso</h3>
            <p class="sub">Establece tu código de acceso para desbloquear</p>

            <div class="pin-config-box">
              <div class="current-pin-indicator">
                <span>Estado del PIN:</span>
                <span class="state-pill" :class="{ ok: lockStore.requirePin }">
                  {{ lockStore.requirePin ? 'Activo' : 'Desactivado' }}
                </span>
              </div>

              <div class="pin-inputs-row">
                <label>Nuevo PIN:</label>
                <input 
                  type="password" 
                  class="setting-input" 
                  v-model="newPinInput" 
                  placeholder="Ej. 1234" 
                  maxlength="20"
                />
              </div>

              <div class="pin-inputs-row">
                <label>Confirmar PIN:</label>
                <input 
                  type="password" 
                  class="setting-input" 
                  v-model="confirmPinInput" 
                  placeholder="Repetir PIN" 
                  maxlength="20"
                />
              </div>

              <div v-if="pinSaveError" class="pin-feedback-msg error">
                <i class="bi bi-exclamation-circle"></i>
                <span>{{ pinSaveError }}</span>
              </div>

              <div v-if="pinSaveSuccess" class="pin-feedback-msg success">
                <i class="bi bi-check-circle"></i>
                <span>¡PIN actualizado correctamente!</span>
              </div>

              <button class="save-pin-btn" @click="saveNewPin">
                <i class="bi bi-shield-check"></i>
                <span>Guardar nuevo PIN</span>
              </button>
            </div>
          </article>

          <!-- Tarjeta 3: Fondo de Pantalla de Bloqueo -->
          <article class="setting-card glass-card" style="grid-column: span 2;">
            <h3><i class="bi bi-image"></i> Fondo de la Pantalla de Bloqueo</h3>
            <p class="sub">Elige la imagen para el fondo de bloqueo ambiental</p>

            <div class="lock-bg-options">
              <label class="lock-bg-radio" :class="{ selected: lockStore.lockBgMode === 'desktop' }">
                <input 
                  type="radio" 
                  name="lockBgMode" 
                  value="desktop" 
                  :checked="lockStore.lockBgMode === 'desktop'"
                  @change="handleLockBgModeChange('desktop')"
                />
                <div class="radio-content">
                  <strong>Usar fondo de escritorio actual</strong>
                  <small>La pantalla de bloqueo coincidirá automáticamente con tu fondo</small>
                </div>
              </label>

              <label class="lock-bg-radio" :class="{ selected: lockStore.lockBgMode === 'custom' }">
                <input 
                  type="radio" 
                  name="lockBgMode" 
                  value="custom" 
                  :checked="lockStore.lockBgMode === 'custom'"
                  @change="handleLockBgModeChange('custom')"
                />
                <div class="radio-content">
                  <strong>Fondo personalizado</strong>
                  <small>Utiliza una imagen independiente para la pantalla de bloqueo</small>
                </div>
              </label>
            </div>

            <div v-if="lockStore.lockBgMode === 'custom'" class="custom-lock-bg-controls" style="margin-top: 12px;">
              <input 
                id="custom-lock-upload" 
                type="file" 
                accept="image/*" 
                @change="handleCustomLockBgUpload"
                style="display: none;"
              />
              <label for="custom-lock-upload" class="wallpaper-upload-btn">
                <i class="bi bi-upload"></i>
                <span>Seleccionar imagen para pantalla de bloqueo</span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'apps'" class="section-content">
        <div class="grid two">
          <article class="setting-card glass-card">
            <h3><i class="bi bi-grid"></i> Installed apps</h3>
            <div class="option-row"><span>Default apps</span><i class="bi bi-chevron-right"></i></div>
            <div class="option-row"><span>Startup apps</span><i class="bi bi-chevron-right"></i></div>
            <div class="option-row"><span>Optional features</span><i class="bi bi-chevron-right"></i></div>
          </article>
          <article class="setting-card glass-card">
            <h3><i class="bi bi-bell"></i> App permissions</h3>
            <div class="option-row"><span>Notifications</span><div class="fake-switch on"></div></div>
            <div class="option-row"><span>Background apps</span><div class="fake-switch"></div></div>
            <div class="option-row"><span>File system access</span><div class="fake-switch on"></div></div>
          </article>
        </div>
      </section>

      <section v-else-if="activeSection === 'accounts'" class="section-content">
        <div class="grid two">
          <article class="setting-card glass-card">
            <h3><i class="bi bi-person-badge"></i> Your info</h3>
            <div class="option-row"><span>Name: Nekomi User</span><i class="bi bi-pencil-square"></i></div>
            <div class="option-row"><span>Password</span><i class="bi bi-chevron-right"></i></div>
            <div class="option-row"><span>Security options</span><i class="bi bi-chevron-right"></i></div>
          </article>
          <article class="setting-card glass-card">
            <h3><i class="bi bi-people"></i> Family & other users</h3>
            <div class="option-row"><span>Add account</span><i class="bi bi-plus-circle"></i></div>
            <div class="option-row"><span>Sync settings</span><div class="fake-switch on"></div></div>
          </article>
        </div>
      </section>

      <section v-else class="section-content">
        <div class="grid one">
          <article class="setting-card glass-card">
            <h3><i class="bi bi-arrow-repeat"></i> Updates</h3>
            <div class="option-row"><span>Last checked: Today, 10:24 AM</span><span class="state-pill ok">Up to date</span></div>
            <div class="option-row"><span>Pause updates</span><div class="fake-switch"></div></div>
            <div class="option-row"><span>Advanced options</span><i class="bi bi-chevron-right"></i></div>
            <button class="cta">
              <i class="bi bi-download"></i>
              <span>Check for updates</span>
            </button>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.wallpaper-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wallpaper-preview-current {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  position: relative;
  overflow: hidden;
}

.preview-label {
  position: absolute;
  bottom: 10px;
  left: 10px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  color: rgba(255, 255, 255, 0.92);
}

.wallpaper-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.wallpaper-actions input[type="file"] {
  display: none;
}

.wallpaper-upload-btn,
.wallpaper-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.wallpaper-upload-btn {
  background: linear-gradient(140deg, rgba(91, 170, 255, 0.45), rgba(125, 109, 255, 0.45));
  color: rgba(255, 255, 255, 0.95);
}

.wallpaper-upload-btn:hover {
  background: linear-gradient(140deg, rgba(91, 170, 255, 0.55), rgba(125, 109, 255, 0.55));
}

.wallpaper-reset-btn {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

.wallpaper-reset-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.wallpaper-upload-btn:active,
.wallpaper-reset-btn:active {
  transform: translateY(1px);
}

.settings-shell {
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-columns: 300px 1fr;
  /*background:
    radial-gradient(120% 100% at 0% 0%, rgba(255, 255, 255, 0.11), transparent 60%),
    linear-gradient(155deg, rgba(33, 36, 46, 0.52), rgba(18, 20, 28, 0.72));*/
  color: rgba(255, 255, 255, 0.92);
}

.glass-card {
  background: var(--frst-bg-light) /*rgba(255, 255, 255, 0.08)*/;
  backdrop-filter: var(--frst-blur-normal);
  -webkit-backdrop-filter: blur(18px);
  border-radius: 6px;
}

.sidebar {
  padding: 12px;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.profile-card {
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: linear-gradient(140deg, rgba(102, 189, 255, 0.65), rgba(132, 109, 255, 0.72));
  display: grid;
  place-items: center;
}

.profile-meta {
  display: flex;
  flex-direction: column;
}

.profile-meta strong {
  font-size: 13px;
}

.profile-meta small {
  color: rgba(255, 255, 255, 0.7);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0 10px;
  height: 38px;
}

.search-box i {
  color: rgba(255, 255, 255, 0.72);
}

.search-box input {
  flex: 1;
  margin-left: 8px;
  border: 0;
  background: transparent;
  color: inherit;
  outline: none;
}

.section-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow: auto;
  min-height: 0;
  padding-right: 2px;
}

.section-btn {
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  color: inherit;
  display: grid;
  grid-template-columns: 18px 1fr 12px;
  gap: 10px;
  align-items: center;
  height: 40px;
  text-align: left;
  padding: 0 12px;
  cursor: pointer;
}

.section-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.section-btn.active {
  background: linear-gradient(140deg, rgba(118, 193, 255, 0.28), rgba(144, 123, 255, 0.28));
  border-color: rgba(149, 205, 255, 0.6);
}

.main-area {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.main-header {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.main-header h1 {
  margin: 0;
  font-size: 24px;
}

.main-header p {
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
}

.quick-action {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  border-radius: 10px;
  height: 34px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.section-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.grid {
  display: grid;
  gap: 10px;
}

.grid.one {
  grid-template-columns: 1fr;
}

.grid.two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.setting-card {
  padding: 14px;
}

.setting-card h3 {
  margin: 0 0 10px;
  font-size: 15px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.setting-card .sub {
  margin: -3px 0 10px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
}

.option-row {
  min-height: 40px;
  padding: 0 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 8px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.fake-switch {
  width: 40px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.14);
  position: relative;
}

.fake-switch::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
}

.fake-switch.on {
  background: rgba(97, 179, 255, 0.45);
  border-color: rgba(159, 213, 255, 0.8);
}

.fake-switch.on::before {
  left: 20px;
}

.state-pill {
  font-size: 11px;
  border-radius: 999px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.12);
}

.state-pill.ok {
  background: rgba(56, 201, 138, 0.3);
  border: 1px solid rgba(96, 228, 166, 0.4);
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.wallpaper-item {
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 11px;
  height: 88px;
  position: relative;
  color: white;
  text-align: left;
  padding: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  cursor: pointer;
  overflow: hidden;
}

.wallpaper-item span {
  font-size: 12px;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.wallpaper-item i {
  font-size: 15px;
}

.wallpaper-item.selected {
  border-color: rgba(156, 214, 255, 0.95);
  box-shadow: inset 0 0 0 1px rgba(156, 214, 255, 0.95);
}

.wall-aurora {
  background: linear-gradient(140deg, #0e345f, #1d6fb1 40%, #3bc7a3);
}

.wall-dusk {
  background: linear-gradient(145deg, #2c1f54, #7446b8 45%, #ff8199);
}

.wall-nord {
  background: linear-gradient(140deg, #27303f, #5b6f87 42%, #9ec3d6);
}

.wall-sunset {
  background: linear-gradient(145deg, #3e1f12, #b45f2e 46%, #ffcf67);
}

.wall-matrix {
  background:
    radial-gradient(circle at 20% 20%, rgba(89, 255, 186, 0.4), transparent 35%),
    linear-gradient(145deg, #0e1b23, #0f2d2e 50%, #12413f);
}

.wall-clouds {
  background: linear-gradient(145deg, #5d79a3, #8ab0d2 48%, #d4e7f5);
}

.wallpaper-default {
  background-image: url('/wallpapers/default-wallpaper.jpg');
  background-size: cover;
  background-position: center;
}

.wallpaper-custom {
  background-size: cover;
  background-position: center;
  border-color: rgba(156, 214, 255, 0.5);
}

.theme-swatches {
  display: flex;
  gap: 8px;
}

.swatch {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
}

.sw1 {
  background: #4ca5ff;
}

.sw2 {
  background: #8f63ff;
}

.sw3 {
  background: #08b08d;
}

.sw4 {
  background: #ff9b41;
}

.sw5 {
  background: #ec5d86;
}

.cta {
  margin-top: 10px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: linear-gradient(140deg, rgba(91, 170, 255, 0.4), rgba(125, 109, 255, 0.45));
  color: inherit;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .settings-shell {
    grid-template-columns: 250px 1fr;
  }

  .grid.two {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .settings-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  .section-list {
    max-height: 200px;
  }

  .wallpaper-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* --- Controles de Pantalla de Bloqueo --- */
.interactive-switch {
  width: 42px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(255, 255, 255, 0.14);
  position: relative;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.interactive-switch::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.interactive-switch.on {
  background: #3b82f6;
  border-color: #60a5fa;
}

.interactive-switch.on::before {
  left: 22px;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-desc {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}

.setting-select {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #ffffff;
  padding: 5px 10px;
  font-size: 12px;
  outline: none;
  cursor: pointer;
}

.setting-select option {
  background: #1e2330;
  color: #ffffff;
}

.setting-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  color: #ffffff;
  padding: 8px 12px;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
}

.setting-input:focus {
  border-color: #60a5fa;
  background: rgba(255, 255, 255, 0.12);
}

.lock-now-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.45) 0%, rgba(37, 99, 235, 0.35) 100%);
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lock-now-btn:hover {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(37, 99, 235, 0.5) 100%);
  border-color: rgba(96, 165, 250, 0.7);
  transform: translateY(-1px);
}

.pin-config-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.current-pin-indicator {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  font-size: 12px;
}

.pin-inputs-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pin-inputs-row label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.save-pin-btn {
  margin-top: 4px;
  padding: 9px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.save-pin-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.35);
}

.pin-feedback-msg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
}

.pin-feedback-msg.error {
  color: #f87171;
  background: rgba(239, 68, 68, 0.15);
}

.pin-feedback-msg.success {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.15);
}

.lock-bg-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lock-bg-radio {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.lock-bg-radio:hover {
  background: rgba(255, 255, 255, 0.08);
}

.lock-bg-radio.selected {
  border-color: #60a5fa;
  background: rgba(59, 130, 246, 0.12);
}

.lock-bg-radio .radio-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lock-bg-radio .radio-content strong {
  font-size: 13px;
  color: #ffffff;
}

.lock-bg-radio .radio-content small {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}
</style>
