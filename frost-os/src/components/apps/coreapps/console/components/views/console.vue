<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

interface CommandEntry {
  id: number
  prompt: string
  command: string
  output?: string
  isError?: boolean
  isRawHtml?: boolean
}

const activeTab = ref(0)
const tabs = ref([
  { id: 1, title: 'Frost Shell' }
])

const inputRef = ref<HTMLInputElement | null>(null)
const scrollContainerRef = ref<HTMLElement | null>(null)

const currentCommand = ref('')
const commandHistory = ref<string[]>([])
const historyIndex = ref(-1)

const entries = ref<CommandEntry[]>([
  {
    id: 1,
    prompt: '',
    command: '',
    output: `Frost OS [Versión 1.0.24-x64]
(c) Frost Corporation. Todos los derechos reservados.

Escribe "help" para ver los comandos disponibles.`
  }
])

let entryCounter = 2

const focusInput = () => {
  inputRef.value?.focus()
}

const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = scrollContainerRef.value.scrollHeight
  }
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (commandHistory.value.length === 0) return
    if (historyIndex.value === -1) {
      historyIndex.value = commandHistory.value.length - 1
    } else if (historyIndex.value > 0) {
      historyIndex.value--
    }
    currentCommand.value = commandHistory.value[historyIndex.value] || ''
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (historyIndex.value !== -1) {
      if (historyIndex.value < commandHistory.value.length - 1) {
        historyIndex.value++
        currentCommand.value = commandHistory.value[historyIndex.value] || ''
      } else {
        historyIndex.value = -1
        currentCommand.value = ''
      }
    }
  }
}

const executeCommand = () => {
  const raw = currentCommand.value
  const trimmed = raw.trim()
  const promptText = 'PS C:\\FrostOS>'

  if (trimmed) {
    commandHistory.value.push(raw)
  }
  historyIndex.value = -1

  if (!trimmed) {
    entries.value.push({
      id: entryCounter++,
      prompt: promptText,
      command: ''
    })
    currentCommand.value = ''
    scrollToBottom()
    return
  }

  const parts = trimmed.split(' ')
  const cmd = parts[0].toLowerCase()
  const args = parts.slice(1).join(' ')

  let output = ''
  let isError = false

  switch (cmd) {
    case 'help':
    case 'ayuda':
      output = `Comandos disponibles en la consola de Frost OS:
  help / ayuda     - Muestra esta lista de comandos
  clear / cls      - Limpia la pantalla de la terminal
  ver / version    - Muestra la versión actual de Frost OS
  neofetch         - Muestra información visual del sistema
  echo <texto>     - Imprime el texto proporcionado
  date / time      - Muestra la fecha y hora actual del sistema
  whoami           - Muestra el usuario actual
  exit             - Cierra la sesión de consola`
      break

    case 'clear':
    case 'cls':
      entries.value = []
      currentCommand.value = ''
      scrollToBottom()
      return

    case 'version':
    case 'ver':
      output = `Frost OS [Versión 1.0.24-x64 Build 2026.10]
Entorno gráfico WebAssembly con aceleración por hardware y soporte de cristal acrílico.`
      break

    case 'whoami':
      output = `frost\\UsuarioDesarrollo`
      break

    case 'date':
    case 'time':
      output = `Fecha y hora del sistema: ${new Date().toLocaleString('es-ES')}`
      break

    case 'echo':
      output = args
      break

    case 'neofetch':
    case 'frostfetch':
      output = `       / \\         frost@frost-os
      /   \\        --------------
     /  /\\ \\       SO: Frost OS x64 [Dark Glass Acrylic]
    /  /  \\ \\      Host: Frost Virtual Subsystem
   /  / /\\ \\ \\     Kernel: 6.8.0-frost-generic
  /  / /  \\ \\ \\    Terminal: Consola de Frost OS v1.0
 /  /_/____\\_\\ \\   Shell: frost-sh (x86_64-pc-frost)
/_______________/  Memoria: 3,420 MB / 8,192 MB (41%)
                   Interfaz: Frost Acrylic Glass Blur`
      break

    case 'exit':
      output = `Sesión terminada. Puede cerrar la ventana de la consola.`
      break

    default:
      output = `'${cmd}' no se reconoce como un comando interno o externo, programa o archivo por lotes ejecutable.
Escriba "help" para ver la lista de comandos disponibles.`
      isError = true
      break
  }

  entries.value.push({
    id: entryCounter++,
    prompt: promptText,
    command: raw,
    output,
    isError
  })

  currentCommand.value = ''
  scrollToBottom()
}

const addTab = () => {
  const newId = tabs.value.length + 1
  tabs.value.push({ id: newId, title: `Frost Shell (${newId})` })
  activeTab.value = tabs.value.length - 1
}

const closeTab = (index: number) => {
  if (tabs.value.length === 1) return
  tabs.value.splice(index, 1)
  if (activeTab.value >= tabs.value.length) {
    activeTab.value = tabs.value.length - 1
  }
}

onMounted(() => {
  focusInput()
})
</script>

<template>
  <div class="terminal-wrapper" @click="focusInput">
    <!-- PESTAÑAS SUPERIORES ESTILO WINDOWS TERMINAL -->
    <div class="terminal-tabbar">
      <div class="tabs-list">
        <div 
          v-for="(tab, index) in tabs" 
          :key="tab.id"
          class="terminal-tab"
          :class="{ active: activeTab === index }"
          @click.stop="activeTab = index"
        >
          <i class="bi bi-terminal-fill tab-icon"></i>
          <span class="tab-title">{{ tab.title }}</span>
          <button 
            v-if="tabs.length > 1" 
            class="tab-close-btn" 
            @click.stop="closeTab(index)"
            title="Cerrar pestaña"
          >
            <i class="bi bi-x"></i>
          </button>
        </div>

        <!-- Botón Nueva Pestaña -->
        <button class="new-tab-btn" @click.stop="addTab" title="Nueva pestaña">
          <i class="bi bi-plus-lg"></i>
        </button>
      </div>

      <!-- Herramientas a la derecha -->
      <div class="tabbar-actions">
        <button class="tabbar-btn" @click.stop="executeCommand" title="Limpiar pantalla" @click="entries = []">
          <i class="bi bi-trash3"></i>
        </button>
      </div>
    </div>

    <!-- ÁREA DE COMANDOS / OUTPUT CON SCROLL -->
    <div ref="scrollContainerRef" class="terminal-body custom-terminal-scrollbar">
      <div v-for="entry in entries" :key="entry.id" class="terminal-entry">
        <!-- Línea de comando ejecutada -->
        <div v-if="entry.prompt" class="command-line">
          <span class="prompt-text">{{ entry.prompt }}</span>
          <span class="command-text">{{ entry.command }}</span>
        </div>

        <!-- Salida del comando -->
        <pre v-if="entry.output" class="command-output" :class="{ 'is-error': entry.isError }">{{ entry.output }}</pre>
      </div>

      <!-- LÍNEA DE ENTRADA ACTIVA -->
      <div class="active-command-line">
        <span class="prompt-text">PS C:\FrostOS&gt;</span>
        <div class="input-display-wrapper">
          <span class="user-typed-text">{{ currentCommand }}</span>
          <span class="cursor-block"></span>
          <input 
            ref="inputRef"
            v-model="currentCommand"
            class="hidden-input"
            type="text"
            autofocus
            spellcheck="false"
            autocomplete="off"
            @keydown.enter="executeCommand"
            @keydown="handleKeyDown"
          />
        </div>
      </div>
    </div>

    <!-- BARRA DE ESTADO INFERIOR -->
    <div class="terminal-statusbar">
      <div class="statusbar-left">
        <span class="status-indicator"></span>
        <span class="status-label">Listo</span>
        <span class="status-sep">|</span>
        <span>UTF-8</span>
      </div>
      <div class="statusbar-right">
        <span>Frost Shell 1.0 (x64)</span>
        <span class="status-sep">|</span>
        <span class="glass-indicator"><i class="bi bi-shield-shaded"></i> Vidrio Oscuro</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(9, 12, 17, 0.78);
  backdrop-filter: var(--os-blur-heavy, blur(32px)) saturate(160%);
  -webkit-backdrop-filter: var(--os-blur-heavy, blur(32px)) saturate(160%);
  color: #e2e8f0;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  user-select: text;
  -webkit-user-select: text;
  overflow: hidden;
  box-sizing: border-box;
}

/* BARRA DE PESTAÑAS TIPO TERMINAL MODERNA */
.terminal-tabbar {
  height: 38px;
  background-color: rgba(0, 0, 0, 0.35);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 10px;
  user-select: none;
  -webkit-user-select: none;
  flex-shrink: 0;
}

.tabs-list {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 100%;
}

.terminal-tab {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: rgba(255, 255, 255, 0.65);
  background-color: transparent;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  border-bottom: none;
  transition: all 0.15s ease;
}

.terminal-tab:hover {
  background-color: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
}

.terminal-tab.active {
  background-color: rgba(18, 24, 34, 0.85);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.12);
  border-bottom: 2px solid #38bdf8;
}

.tab-icon {
  font-size: 12px;
  color: #38bdf8;
}

.tab-title {
  white-space: nowrap;
  font-weight: 500;
}

.tab-close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 4px;
}

.tab-close-btn:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.new-tab-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
  font-size: 12px;
  transition: background-color 0.15s;
}

.new-tab-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.tabbar-actions {
  display: flex;
  align-items: center;
  height: 100%;
  gap: 4px;
}

.tabbar-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.55);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.tabbar-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

/* ÁREA DE CONTENIDO DE TERMINAL */
.terminal-body {
  flex: 1;
  padding: 14px 18px;
  overflow-y: auto;
  overflow-x: hidden;
  cursor: text;
}

.terminal-entry {
  margin-bottom: 8px;
}

.command-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 2px;
}

.prompt-text {
  color: #38bdf8;
  font-weight: 600;
  white-space: nowrap;
  user-select: none;
  -webkit-user-select: none;
}

.command-text {
  color: #f8fafc;
  word-break: break-all;
}

.command-output {
  margin: 0;
  padding: 2px 0 6px 0;
  color: #cbd5e1;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.command-output.is-error {
  color: #f87171;
}

/* ENTRADA ACTIVA CON CURSOR PARPADEANTE */
.active-command-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  position: relative;
  min-height: 22px;
}

.input-display-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 120px;
}

.user-typed-text {
  color: #ffffff;
  white-space: pre;
}

.cursor-block {
  display: inline-block;
  width: 8px;
  height: 16px;
  background-color: #38bdf8;
  vertical-align: middle;
  margin-left: 1px;
  animation: cursor-blink 1s step-end infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.hidden-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: auto;
  cursor: text;
  background: transparent;
  border: none;
  outline: none;
  color: transparent;
  caret-color: transparent;
}

/* BARRA DE ESTADO INFERIOR */
.terminal-statusbar {
  height: 24px;
  background-color: rgba(0, 0, 0, 0.45);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-size: 11px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: rgba(255, 255, 255, 0.55);
  user-select: none;
  -webkit-user-select: none;
  flex-shrink: 0;
}

.statusbar-left, .statusbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 6px #10b981;
}

.status-sep {
  opacity: 0.3;
}

.glass-indicator {
  color: rgba(255, 255, 255, 0.65);
}

/* SCROLLBAR PERSONALIZADA */
.custom-terminal-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-terminal-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-terminal-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}
.custom-terminal-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>
