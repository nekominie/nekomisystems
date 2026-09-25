<script setup lang="ts">
import { inject, onMounted, reactive, ref } from 'vue'
import { OS_KEY } from '../../../../../api/os_api'
import { useDesktopMikuStore, type MikuAction } from '../../store'

const os = inject(OS_KEY)
const mikuStore = useDesktopMikuStore()

// Preferencias de arranque y persistencia
const prefs = reactive({
  startOnBoot: true,
  startInTray: true,
  closeToTray: true,
})

// Citas interactivas de Miku
const quotes = [
  "¡Hola! ♪ Cuidaré de tu escritorio mientras navegas. (◕‿◕)✿",
  "39 = San-Kyu! ¡Muchas gracias por tenerme aquí! (≧◡≦)♡",
  "¡No olvides comer tus puerros hoy! 🥬✨",
  "¡Cantaré con todas mis fuerzas en tu pantalla! 🎤🎵",
  "¡Haciendo una pausa musical! Miku está lista. (⌒▽⌒)☆"
]
const currentQuote = ref(quotes[0])

function nextQuote() {
  const currentIndex = quotes.indexOf(currentQuote.value)
  const nextIndex = (currentIndex + 1) % quotes.length
  currentQuote.value = quotes[nextIndex]
}

function showBubble(msg: string) {
  currentQuote.value = msg
}

function loadPreferences() {
  if (!os) return
  const app = os.state.apps.find(a => a.manifest.id === 'desktopmiku')
  if (app) {
    prefs.startOnBoot = app.user.overrides?.startOnBoot ?? app.manifest.preferences?.startOnBoot ?? true
    prefs.startInTray = app.user.overrides?.startInTray ?? app.manifest.preferences?.startInTray ?? true
    prefs.closeToTray = app.user.overrides?.closeToTray ?? app.manifest.preferences?.closeToTray ?? true
  }
}

onMounted(() => {
  loadPreferences()
})

// Toggles de arranque con persistencia en Dexie IndexedDB
async function toggleStartOnBoot() {
  prefs.startOnBoot = !prefs.startOnBoot
  await os?.updateAppPreferences('desktopmiku', { startOnBoot: prefs.startOnBoot })
  showBubble(prefs.startOnBoot 
    ? "¡Yatta! ¡Despertaré contigo cuando inicies la computadora! (≧◡≦)♡" 
    : "Oh... Ya no me despertaré al iniciar. (｡•́︿•̀｡)"
  )
}

async function toggleStartInTray() {
  prefs.startInTray = !prefs.startInTray
  await os?.updateAppPreferences('desktopmiku', { startInTray: prefs.startInTray })
  showBubble(prefs.startInTray 
    ? "¡Iniciaré quietecita en la bandeja del sistema! (´｡• ᵕ •｡`)" 
    : "¡Apareceré en grande en la pantalla al inicio! (⌒▽⌒)☆"
  )
}

async function toggleCloseToTray() {
  prefs.closeToTray = !prefs.closeToTray
  await os?.updateAppPreferences('desktopmiku', { closeToTray: prefs.closeToTray })
  showBubble(prefs.closeToTray 
    ? "¡Al cerrar, seguiré viva en el System Tray! (b ᵔ▽ᵔ)b" 
    : "¡Al cerrar, me desconectaré por completo! (•_•)"
  )
}

// Disparadores de animación en tiempo real
function triggerMikuAnimation(action: MikuAction) {
  mikuStore.triggerAction(action)
  if (action === 'greeting') {
    showBubble("¡Konnichiwa! ¡Hola a todos! (◕‿◕)ノ♪")
  } else if (action === 'thinking') {
    showBubble("Hmm... ¿Qué canción deberíamos cantar ahora? (¬_¬)💭")
  } else {
    showBubble("Ah~ ¡Un merecido descansito relajante! (˘◡˘) zZ")
  }
}

// Alternar visibilidad de la mascota en el escritorio
function togglePetVisibility() {
  if (!os) return
  const mikuWin = os.state.windows.find(
    w => w.appId === 'desktopmiku' && (!w.view || w.view === 'Main')
  )
  if (mikuWin) {
    if (mikuWin.isMinimized) {
      mikuWin.isMinimized = false
      os.bringToFront(mikuWin.id)
      showBubble("¡Tadaa! ¡Aquí estoy en tu escritorio! (≧◡≦)✿")
    } else {
      os.minimizeWindow(mikuWin.id)
      showBubble("¡Me esconderé un momento! (•ㅅ•)")
    }
  } else {
    os.createWindow('desktopmiku', { hideFromTaskbar: true })
    showBubble("¡Mascota iniciada en el escritorio! (⌒▽⌒)☆")
  }
}
</script>

<template>
  <div class="miku-config-shell">
    <!-- BANNER DE ENCABEZADO ESTILO CARTOON HATSUNE MIKU -->
    <header class="miku-banner">
      <!-- Franja superior de acento Miku Pink -->
      <div class="miku-accent-stripe"></div>

      <div class="miku-header-inner">
        <!-- Avatar de Miku en marco circular de cómic -->
        <div class="miku-avatar-frame" @click="nextQuote">
          <img src="/desktopmiku/icon.jpg" alt="Hatsune Miku" class="miku-avatar-img" />
          <span class="miku-avatar-badge">01</span>
        </div>

        <div class="miku-header-text">
          <div class="miku-brand-row">
            <h1 class="miku-title">DESKTOP MIKU</h1>
            <span class="miku-tag">MASCOT V1.39</span>
          </div>
          <div class="miku-sub">初音ミク • Panel de Configuración</div>
        </div>

        <!-- Ecualizador musical animado de Miku -->
        <div class="miku-equalizer">
          <span class="bar bar-1"></span>
          <span class="bar bar-2"></span>
          <span class="bar bar-3"></span>
          <span class="bar bar-4"></span>
          <span class="bar bar-5"></span>
        </div>
      </div>
    </header>

    <!-- CUERPO DE CONFIGURACIÓN -->
    <div class="miku-body">
      <!-- GLOBO DE DIÁLOGO DE CÓMIC DE MIKU -->
      <div class="miku-bubble-wrap" @click="nextQuote" title="¡Haz clic para hablar con Miku!">
        <div class="miku-bubble">
          <i class="bi bi-chat-heart-fill bubble-icon"></i>
          <span class="bubble-text">{{ currentQuote }}</span>
        </div>
        <div class="bubble-tail"></div>
      </div>

      <!-- TARJETA 1: OPCIONES DE ARRANQUE -->
      <div class="miku-card">
        <div class="miku-card-title">
          <span class="card-icon-badge rocket">🚀</span>
          <div>
            <div class="title-main">Opciones de Arranque</div>
            <div class="title-sub">Comportamiento al iniciar y cerrar el sistema</div>
          </div>
        </div>

        <div class="miku-toggles-list">
          <!-- Toggle 1: Iniciar con el sistema -->
          <div class="miku-toggle-row">
            <div class="toggle-info">
              <span class="toggle-name">Iniciar junto con Frost OS</span>
              <span class="toggle-desc">Despierta a Miku automáticamente cuando enciendes la computadora.</span>
            </div>
            <button
              class="miku-switch"
              :class="{ active: prefs.startOnBoot }"
              type="button"
              :title="prefs.startOnBoot ? 'Desactivar arranque automático' : 'Activar arranque automático'"
              @click="toggleStartOnBoot"
            >
              <span class="miku-switch-knob"></span>
            </button>
          </div>

          <!-- Toggle 2: Iniciar en la bandeja (Tray) -->
          <div class="miku-toggle-row" :class="{ disabled: !prefs.startOnBoot }">
            <div class="toggle-info">
              <span class="toggle-name">Iniciar en la bandeja del sistema</span>
              <span class="toggle-desc">Inicia discretamente en el System Tray de la barra de tareas sin invadir el escritorio.</span>
            </div>
            <button
              class="miku-switch"
              :class="{ active: prefs.startInTray }"
              :disabled="!prefs.startOnBoot"
              type="button"
              :title="prefs.startInTray ? 'Inicia en la bandeja' : 'Inicia visible en escritorio'"
              @click="toggleStartInTray"
            >
              <span class="miku-switch-knob"></span>
            </button>
          </div>

          <!-- Toggle 3: Minimizar a la bandeja al cerrar -->
          <div class="miku-toggle-row">
            <div class="toggle-info">
              <span class="toggle-name">Minimizar a la bandeja al cerrar</span>
              <span class="toggle-desc">Al presionar la '✕' de la ventana, Miku continuará viva en la bandeja del sistema.</span>
            </div>
            <button
              class="miku-switch"
              :class="{ active: prefs.closeToTray }"
              type="button"
              :title="prefs.closeToTray ? 'Permanecer en la bandeja' : 'Cerrar por completo'"
              @click="toggleCloseToTray"
            >
              <span class="miku-switch-knob"></span>
            </button>
          </div>
        </div>
      </div>

      <!-- TARJETA 2: CONTROL DE LA MASCOTA Y ANIMACIONES -->
      <div class="miku-card">
        <div class="miku-card-title">
          <span class="card-icon-badge music">🎀</span>
          <div>
            <div class="title-main">Control de Mascota & Reacciones</div>
            <div class="title-sub">¡Haz interactuar a Miku en tu pantalla ahora mismo!</div>
          </div>
        </div>

        <div class="miku-actions-grid">
          <button
            class="miku-action-btn teal"
            type="button"
            @click="triggerMikuAnimation('greeting')"
          >
            <span class="btn-icon">🎵</span>
            <span class="btn-label">¡Saludar!</span>
          </button>

          <button
            class="miku-action-btn pink"
            type="button"
            @click="triggerMikuAnimation('thinking')"
          >
            <span class="btn-icon">💡</span>
            <span class="btn-label">¡Pensar!</span>
          </button>

          <button
            class="miku-action-btn yellow"
            type="button"
            @click="triggerMikuAnimation('idle')"
          >
            <span class="btn-icon">✨</span>
            <span class="btn-label">¡Reposo!</span>
          </button>

          <button
            class="miku-action-btn dark"
            type="button"
            @click="togglePetVisibility"
          >
            <span class="btn-icon">👁️</span>
            <span class="btn-label">Ver / Ocultar</span>
          </button>
        </div>
      </div>

      <!-- TARJETA 3: VOCALOID PROFILE STICKER -->
      <div class="miku-card sticker-card">
        <div class="sticker-header">
          <span class="sticker-chip">CHARACTER VOCAL SERIES 01</span>
          <span class="sticker-chip pink">VOCALOID™</span>
        </div>
        <div class="sticker-details">
          <div class="detail-row">
            <span class="dt-key">NOMBRE:</span>
            <span class="dt-val">Hatsune Miku (初音ミク)</span>
          </div>
          <div class="detail-row">
            <span class="dt-key">COLOR OFICIAL:</span>
            <span class="dt-val"><span class="color-dot"></span> #39C5BB (Miku Cyan)</span>
          </div>
          <div class="detail-row">
            <span class="dt-key">ÍTEM FAVORITO:</span>
            <span class="dt-val">Puerro / Negi 🥬 (Leek)</span>
          </div>
          <div class="detail-row">
            <span class="dt-key">NÚMERO CLAVE:</span>
            <span class="dt-val font-miku">01 • San-Kyu (39 = Muchas gracias!)</span>
          </div>
        </div>
      </div>
    </div>

    <!-- PIE DE VENTANA CARTOON -->
    <footer class="miku-footer">
      <div class="footer-left">
        <span class="status-dot-miku"></span>
        <span class="footer-status">Mascota Activa • Crypton Future Media</span>
      </div>
      <div class="footer-right">
        <span class="footer-badge">PIAPRO</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* CONTENEDOR PRINCIPAL: Estética de aplicación de terceros caricaturesca con colores Miku */
.miku-config-shell {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background-color: #161821;
  color: #f7fcfa;
  font-family: "Mplus 1p", "Segoe UI", Roboto, "Comic Sans MS", -apple-system, sans-serif;
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;
}

/* ENCABEZADO VIBRANTE */
.miku-banner {
  background: linear-gradient(135deg, #39c5bb 0%, #00b4d8 65%, #2a9d8f 100%);
  border-bottom: 3.5px solid #0e1017;
  position: relative;
  box-shadow: 0 4px 0px rgba(0, 0, 0, 0.45);
}

.miku-accent-stripe {
  height: 4px;
  background: #ff2a85;
  width: 100%;
}

.miku-header-inner {
  display: flex;
  align-items: center;
  padding: 12px 18px;
  gap: 14px;
}

/* AVATAR DE CÓMIC */
.miku-avatar-frame {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  border: 3px solid #0e1017;
  background: #ffffff;
  position: relative;
  box-shadow: 3px 3px 0px #0e1017;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.15s ease;
}

.miku-avatar-frame:hover {
  transform: rotate(-6deg) scale(1.06);
}

.miku-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  display: block;
}

.miku-avatar-badge {
  position: absolute;
  bottom: -4px;
  right: -6px;
  background: #ff2a85;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 999px;
  border: 2px solid #0e1017;
  box-shadow: 1px 1px 0px #0e1017;
}

/* TÍTULOS */
.miku-header-text {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.miku-brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.miku-title {
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.8px;
  color: #ffffff;
  text-shadow: 2px 2px 0px #0e1017;
}

.miku-tag {
  background: #ff2a85;
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px;
  border: 2px solid #0e1017;
  box-shadow: 2px 2px 0px #0e1017;
  letter-spacing: 0.5px;
}

.miku-sub {
  font-size: 11.5px;
  font-weight: 700;
  color: #0b2b28;
  margin-top: 2px;
}

/* ECUALIZADOR ANIMADO */
.miku-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 3.5px;
  height: 26px;
  padding-right: 4px;
}

.bar {
  width: 4.5px;
  border-radius: 3px;
  border: 1px solid #0e1017;
  animation: eqAnim 1.2s infinite ease-in-out alternate;
}

.bar-1 { height: 16px; background: #00f2fe; animation-delay: 0.1s; }
.bar-2 { height: 24px; background: #39c5bb; animation-delay: 0.4s; }
.bar-3 { height: 12px; background: #d4ff00; animation-delay: 0.2s; }
.bar-4 { height: 20px; background: #ff2a85; animation-delay: 0.5s; }
.bar-5 { height: 18px; background: #ffffff; animation-delay: 0.3s; }

@keyframes eqAnim {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1); }
}

/* CUERPO Y SCROLL */
.miku-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.miku-body::-webkit-scrollbar {
  width: 7px;
}

.miku-body::-webkit-scrollbar-thumb {
  background: #39c5bb;
  border-radius: 10px;
  border: 1.5px solid #0e1017;
}

/* GLOBO DE DIÁLOGO DE CÓMIC */
.miku-bubble-wrap {
  cursor: pointer;
  margin-bottom: 2px;
  transition: transform 0.15s ease;
}

.miku-bubble-wrap:hover {
  transform: translateY(-2px);
}

.miku-bubble {
  background: #202532;
  border: 2.5px solid #39c5bb;
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 4px 4px 0px #0e1017;
}

.bubble-icon {
  font-size: 16px;
  color: #ff2a85;
  flex-shrink: 0;
}

.bubble-text {
  font-size: 12.5px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.4;
}

.bubble-tail {
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #39c5bb;
  margin-left: 32px;
}

/* TARJETAS CARTOON */
.miku-card {
  background: #202532;
  border: 2.5px solid #0e1017;
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 4px 4px 0px #0e1017;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.miku-card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 2px dashed rgba(255, 255, 255, 0.12);
  padding-bottom: 8px;
}

.card-icon-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 2px solid #0e1017;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  box-shadow: 2px 2px 0px #0e1017;
  flex-shrink: 0;
}

.card-icon-badge.rocket { background: #39c5bb; }
.card-icon-badge.music { background: #ff2a85; }

.title-main {
  font-size: 13.5px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.3px;
}

.title-sub {
  font-size: 11px;
  font-weight: 500;
  color: #39c5bb;
}

/* LISTA DE TOGGLES */
.miku-toggles-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.miku-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #181c25;
  border: 1.5px solid #0e1017;
  transition: all 0.15s ease;
}

.miku-toggle-row:hover {
  background: #1c212d;
  border-color: #39c5bb;
}

.miku-toggle-row.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.toggle-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-name {
  font-size: 12.5px;
  font-weight: 800;
  color: #ffffff;
}

.toggle-desc {
  font-size: 11px;
  color: #9aa5b6;
  line-height: 1.3;
}

/* SWITCH CARTOON DE MIKU */
.miku-switch {
  width: 48px;
  height: 26px;
  border-radius: 999px;
  background: #2f3644;
  border: 2.5px solid #0e1017;
  position: relative;
  cursor: pointer;
  padding: 0;
  box-shadow: 2px 2px 0px #0e1017;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  outline: none;
  flex-shrink: 0;
}

.miku-switch.active {
  background: #39c5bb;
  box-shadow: 0 0 10px rgba(57, 197, 187, 0.5), 2px 2px 0px #0e1017;
}

.miku-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  border: 2px solid #0e1017;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.4);
}

.miku-switch.active .miku-switch-knob {
  transform: translateX(21px);
  background: #ffffff;
}

/* BOTONES DE ACCIÓN DE MASCOTA */
.miku-actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.miku-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  border: 2.5px solid #0e1017;
  cursor: pointer;
  font-weight: 800;
  font-size: 12.5px;
  box-shadow: 3px 3px 0px #0e1017;
  transition: all 0.12s ease;
  outline: none;
}

.miku-action-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px #0e1017;
}

.miku-action-btn:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0px #0e1017;
}

.miku-action-btn.teal {
  background: #39c5bb;
  color: #0e1017;
}

.miku-action-btn.pink {
  background: #ff2a85;
  color: #ffffff;
}

.miku-action-btn.yellow {
  background: #d4ff00;
  color: #0e1017;
}

.miku-action-btn.dark {
  background: #181c25;
  color: #39c5bb;
  border-color: #39c5bb;
}

.btn-icon {
  font-size: 14px;
}

/* STICKER CARD */
.sticker-card {
  background: #1a1e28;
  border-color: #39c5bb;
}

.sticker-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.sticker-chip {
  font-size: 9.5px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 6px;
  background: #39c5bb;
  color: #0e1017;
  border: 1.5px solid #0e1017;
}

.sticker-chip.pink {
  background: #ff2a85;
  color: #ffffff;
}

.sticker-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  display: flex;
  align-items: center;
  font-size: 11.5px;
  gap: 8px;
}

.dt-key {
  font-weight: 800;
  color: #7d899d;
  min-width: 105px;
  font-size: 10.5px;
}

.dt-val {
  font-weight: 700;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dt-val.font-miku {
  color: #39c5bb;
}

.color-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #39c5bb;
  border: 1.5px solid #0e1017;
  display: inline-block;
}

/* PIE DE VENTANA */
.miku-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #111319;
  border-top: 2.5px solid #0e1017;
  font-size: 11px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 7px;
}

.status-dot-miku {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #39c5bb;
  box-shadow: 0 0 8px #39c5bb;
  border: 1.5px solid #0e1017;
}

.footer-status {
  font-weight: 700;
  color: #8f9ba8;
}

.footer-badge {
  background: #ff2a85;
  color: #ffffff;
  font-weight: 900;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1.5px solid #0e1017;
  box-shadow: 1px 1px 0px #0e1017;
}
</style>