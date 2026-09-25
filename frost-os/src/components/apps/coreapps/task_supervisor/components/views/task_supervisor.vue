<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { OS_KEY } from '../../../../../api/os_api'
import { useOsStore } from "../../../../../os/os_store"
import IconManager from '../../../../../os/iconmanager.vue'

const os = inject(OS_KEY)!
if (!os) throw new Error('OS API not found')
const osstore = useOsStore()

// Tabs de navegación: 'processes' | 'performance' | 'startup'
const activeTab = ref<'processes' | 'performance' | 'startup'>('processes')

// Temporizador en tiempo real
const nowTick = ref(Date.now())
const bootTime = ref(Date.now() - 1000 * 60 * 15) // Tiempo simulado de inicio del sistema
let timer: number | undefined

// Histórico de uso de CPU para la gráfica
const cpuHistory = ref<number[]>([12, 16, 14, 10, 18, 22, 19, 15, 25, 20, 16, 18, 24, 19, 14, 12, 17, 21, 15, 18, 14, 19, 23, 16, 18, 14, 15, 20, 17, 16])

onMounted(() => {
  timer = window.setInterval(() => {
    nowTick.value = Date.now()
    const currentCpu = cpuPercent.value
    cpuHistory.value.push(currentCpu)
    if (cpuHistory.value.length > 30) cpuHistory.value.shift()
  }, 1000)
})

onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

// Filtros de búsqueda
const quickFilter = ref('')
const startupFilter = ref('')

// Estado de selección de filas
const selectedItemId = ref<string | null>(null)
const selectedItemType = ref<'process' | 'window' | null>(null)
const selectedParentProcId = ref<string | null>(null)

// Conjunto de procesos expandidos (árbol de ventanas / instancias)
const expandedProcesses = ref<Set<string>>(new Set())

// Ordenamiento de tabla
type SortField = 'name' | 'file' | 'type' | 'state' | 'cpuMs5s' | 'memScore' | 'uptimeSec'
const sortBy = ref<SortField>('memScore')
const sortOrder = ref<'asc' | 'desc'>('desc')

function setSort(field: SortField) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'desc'
  }
}

// Estructuras de datos
export type WindowItem = {
  id: string
  title: string
  view: string
  pid: string
  isFocused: boolean
  isMinimized: boolean
  isMaximized: boolean
}

export type ProcessGroup = {
  id: string
  name: string
  file: string // .snw para apps normales y .flk para snippets
  type: 'application' | 'snippet' | 'core'
  isRunning: boolean
  isMinimized: boolean
  isInTray: boolean
  uptimeSec: number
  cpuMs5s: number
  memScore: number
  windows: WindowItem[]
}

const CORE_APP_IDS = ['task_supervisor', 'settings', 'run']

// Procesos y snippets unificados
const processGroups = computed<ProcessGroup[]>(() => {
  const now = nowTick.value

  const apps: ProcessGroup[] = os.state.apps.map((a: any) => {
    const appWindows = os.state.windows.filter((w: any) => w.appId === a.manifest.id)
    const isCore = CORE_APP_IDS.includes(a.manifest.id)
    return {
      id: a.manifest.id,
      name: a.manifest.name,
      file: `${a.manifest.id}.snw`,
      type: isCore ? 'core' : (a.manifest.snippet ? 'snippet' : 'application'),
      isRunning: a.runtime.isRunning,
      isMinimized: a.runtime.isMinimized,
      isInTray: a.runtime.isInTray,
      uptimeSec: a.runtime.stats?.startedAt ? Math.floor((now - a.runtime.stats.startedAt) / 1000) : 0,
      cpuMs5s: a.runtime.stats?.cpuMsLast5s ?? 0,
      memScore: a.runtime.stats?.memScore ?? 0,
      windows: appWindows.map((w: any) => ({
        id: w.id,
        title: w.title || a.manifest.name,
        view: w.view || 'Main',
        pid: w.pid || w.id,
        isFocused: !!w.isFocused,
        isMinimized: !!w.isMinimized,
        isMaximized: !!w.isMaximized
      }))
    }
  })

  const snippets: ProcessGroup[] = (os.state.snippets ?? []).map((s: any) => ({
    id: s.manifest.id,
    name: s.manifest.name,
    file: `${s.manifest.id}.flk`,
    type: 'snippet',
    isRunning: s.runtime.isRunning,
    isMinimized: false,
    isInTray: s.runtime.isInTray,
    uptimeSec: s.runtime.stats?.startedAt ? Math.floor((now - s.runtime.stats.startedAt) / 1000) : 0,
    cpuMs5s: s.runtime.stats?.cpuMsLast5s ?? 0,
    memScore: s.runtime.stats?.memScore ?? 0,
    windows: []
  }))

  return [...apps, ...snippets]
})

// Auto-expandir procesos con ventanas al inicio
const initExpandDone = ref(false)
if (!initExpandDone.value) {
  processGroups.value.forEach(p => {
    if (p.windows.length > 0) expandedProcesses.value.add(p.id)
  })
  initExpandDone.value = true
}

// Procesos filtrados y ordenados
const filteredProcesses = computed(() => {
  const q = quickFilter.value.trim().toLowerCase()
  let list = processGroups.value

  if (q) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.file.toLowerCase().includes(q) ||
      p.windows.some(w => w.title.toLowerCase().includes(q) || w.view.toLowerCase().includes(q) || w.pid.toLowerCase().includes(q))
    )
  }

  return [...list].sort((a, b) => {
    let diff = 0
    if (sortBy.value === 'memScore') diff = b.memScore - a.memScore
    else if (sortBy.value === 'cpuMs5s') diff = b.cpuMs5s - a.cpuMs5s
    else if (sortBy.value === 'name') diff = a.name.localeCompare(b.name)
    else if (sortBy.value === 'file') diff = a.file.localeCompare(b.file)
    else if (sortBy.value === 'type') diff = a.type.localeCompare(b.type)
    else if (sortBy.value === 'state') diff = (b.isRunning ? 1 : 0) - (a.isRunning ? 1 : 0)
    else if (sortBy.value === 'uptimeSec') diff = b.uptimeSec - a.uptimeSec
    return sortOrder.value === 'desc' ? diff : -diff
  })
})

// Utilidades de formato
function formatUptime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

function formatSystemUptime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m ${ss}s`
  if (h > 0) return `${h}h ${m}m ${ss}s`
  return `${m}m ${ss}s`
}

function getMemClass(score: number) {
  if (score < 500) return 'low'
  if (score < 2500) return 'medium'
  if (score < 6000) return 'high'
  return 'extreme'
}

// Expansión / Contracción de procesos
function toggleExpand(procId: string) {
  if (expandedProcesses.value.has(procId)) {
    expandedProcesses.value.delete(procId)
  } else {
    expandedProcesses.value.add(procId)
  }
}

function expandAll() {
  processGroups.value.forEach(p => {
    if (p.windows.length > 0) expandedProcesses.value.add(p.id)
  })
}

function collapseAll() {
  expandedProcesses.value.clear()
}

// Selección de fila
function selectProcess(proc: ProcessGroup) {
  selectedItemId.value = proc.id
  selectedItemType.value = 'process'
  selectedParentProcId.value = null
}

function selectWindow(win: WindowItem, procId: string) {
  selectedItemId.value = win.id
  selectedItemType.value = 'window'
  selectedParentProcId.value = procId
}

// Acciones principales
function focusItem(id?: string, type?: 'process' | 'window') {
  const targetId = id || selectedItemId.value
  const targetType = type || selectedItemType.value
  if (!targetId) return

  if (targetType === 'window') {
    os.bringToFront(targetId)
  } else {
    const proc = processGroups.value.find(p => p.id === targetId)
    if (!proc) return
    if (proc.type === 'snippet') {
      os.showSnippet(proc.id)
    } else if (proc.windows.length > 0) {
      os.bringToFront(proc.windows[0].id)
    } else {
      os.launchApp(proc.id)
    }
  }
}

function endTask(id?: string, type?: 'process' | 'window') {
  const targetId = id || selectedItemId.value
  const targetType = type || selectedItemType.value
  if (!targetId) return

  if (targetType === 'window') {
    os.closeWindow(targetId)
    if (selectedItemId.value === targetId) {
      selectedItemId.value = null
      selectedItemType.value = null
    }
  } else {
    const proc = processGroups.value.find(p => p.id === targetId)
    if (!proc) return
    if (proc.type === 'snippet') {
      os.hideSnippet(proc.id)
    } else {
      os.closeApp(proc.id)
    }
    if (selectedItemId.value === targetId) {
      selectedItemId.value = null
      selectedItemType.value = null
    }
  }
}

function isSingleInstanceApp(appId: string) {
  const app = os.state.apps.find(a => a.manifest.id === appId)
  return !!app?.manifest.capabilities?.singleInstance
}

function createNewInstance(procId?: string) {
  const targetId = procId || (selectedItemType.value === 'window' ? selectedParentProcId.value : selectedItemId.value)
  if (targetId && !CORE_APP_IDS.includes(targetId)) {
    const app = os.state.apps.find(a => a.manifest.id === targetId)
    if (app?.manifest.capabilities?.singleInstance) {
      showToast(`⚠️ ${app.manifest.name} solo permite una instancia a la vez`)
      const existing = os.state.windows.find(w => w.appId === targetId)
      if (existing) {
        existing.isMinimized = false
        os.bringToFront(existing.id)
      }
      return
    }
    os.createWindow(targetId)
    expandedProcesses.value.add(targetId)
    showToast(`🪟 Nueva instancia iniciada: ${targetId}`)
  } else {
    os.launchApp('run')
  }
}

function minimizeRestoreWindow(win: WindowItem) {
  if (win.isMinimized) {
    os.bringToFront(win.id)
  } else {
    os.minimizeWindow(win.id)
  }
}

// ----------------- APPS DE INICIO (Startup Apps) -----------------
export type StartupAppItem = {
  id: string
  name: string
  file: string
  author: string
  impact: 'Alto' | 'Medio' | 'Bajo'
  canTray: boolean
  startOnBoot: boolean
  startInTray: boolean
}

const startupApps = computed<StartupAppItem[]>(() => {
  return os.state.apps
    .filter((a: any) => a.manifest.id !== 'task_supervisor' && a.manifest.id !== 'run')
    .map((a: any) => {
      const overrides = a.user?.overrides ?? {}
      const prefs = a.manifest?.preferences ?? {}
      const startOnBoot = overrides.startOnBoot !== undefined ? overrides.startOnBoot : (prefs.startOnBoot ?? false)
      const startInTray = overrides.startInTray !== undefined ? overrides.startInTray : (prefs.startInTray ?? false)
      const canTray = !!a.manifest?.capabilities?.tray?.canUse

      let author = 'Nekomi Systems'
      if (a.manifest.id === 'discord') author = 'Discord Inc.'
      else if (a.manifest.id === 'spotify') author = 'Spotify AB'
      else if (a.manifest.id === 'doomgame') author = 'id Software'
      else if (a.manifest.id === 'mikurig') author = 'Crypton Future Media'
      else if (a.manifest.id === 'bibootaxgame') author = 'Cover Corp'
      else if (a.manifest.id === 'settings') author = 'Frost OS'
      else if (['notepad', 'mspaint', 'calculator'].includes(a.manifest.id)) author = 'Frost OS'

      let impact: 'Alto' | 'Medio' | 'Bajo' = 'Bajo'
      if (['discord', 'spotify', 'doomgame'].includes(a.manifest.id)) impact = 'Alto'
      else if (['manga_reader', 'mikurig'].includes(a.manifest.id)) impact = 'Medio'

      return {
        id: a.manifest.id,
        name: a.manifest.name,
        file: `${a.manifest.id}.snw`,
        author,
        impact,
        canTray,
        startOnBoot,
        startInTray
      }
    })
})

const filteredStartupApps = computed(() => {
  const q = startupFilter.value.trim().toLowerCase()
  if (!q) return startupApps.value
  return startupApps.value.filter(a =>
    a.name.toLowerCase().includes(q) ||
    a.id.toLowerCase().includes(q) ||
    a.file.toLowerCase().includes(q) ||
    a.author.toLowerCase().includes(q)
  )
})

const enabledStartupCount = computed(() => startupApps.value.filter(a => a.startOnBoot).length)

// Feedback toast
const toastMsg = ref('')
let toastTimer: number | undefined
function showToast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastMsg.value = ''), 2500)
}

async function toggleStartup(appId: string) {
  const item = startupApps.value.find(a => a.id === appId)
  if (!item) return
  const newVal = !item.startOnBoot
  await os.updateAppPreferences(appId, { startOnBoot: newVal })
  showToast(newVal ? `✅ ${item.name} se iniciará con el sistema` : `❌ ${item.name} deshabilitado al inicio`)
}

async function toggleStartupTray(appId: string) {
  const item = startupApps.value.find(a => a.id === appId)
  if (!item) return
  const newVal = !item.startInTray
  await os.updateAppPreferences(appId, { startInTray: newVal })
  showToast(newVal ? `📥 ${item.name} iniciará en la bandeja` : `🪟 ${item.name} iniciará con ventana normal`)
}

// ----------------- RENDIMIENTO / RECURSOS -----------------
const totalCpuMs = computed(() => {
  return processGroups.value.reduce((acc, p) => acc + (p.cpuMs5s || 0), 0)
})

const cpuPercent = computed(() => {
  const calculated = Math.min(100, Math.round((totalCpuMs.value / 350) * 100))
  return Math.max(4, calculated)
})

const totalMemMB = computed(() => {
  const procMem = processGroups.value.reduce((acc, p) => acc + (p.memScore / 10), 0)
  return Math.round((312.4 + procMem) * 10) / 10
})

const totalSystemRAM = 8192 // 8 GB simulado
const memPercent = computed(() => Math.min(100, Math.round((totalMemMB.value / totalSystemRAM) * 100)))

const runningProcessCount = computed(() => processGroups.value.filter(p => p.isRunning).length)
const totalWindowsCount = computed(() => os.state.windows.length)
const systemUptimeSec = computed(() => Math.floor((nowTick.value - bootTime.value) / 1000))

// Generador de trayectoria SVG para la gráfica de CPU
const chartPoints = computed(() => {
  const data = cpuHistory.value
  if (!data.length) return ''
  const w = 360
  const h = 100
  const step = w / (data.length - 1 || 1)
  return data
    .map((val, idx) => {
      const x = Math.round(idx * step)
      const y = Math.round(h - (val / 100) * (h - 10) - 5)
      return `${x},${y}`
    })
    .join(' ')
})

const chartAreaPath = computed(() => {
  const pts = chartPoints.value
  if (!pts) return ''
  return `M 0,100 L ${pts} L 360,100 Z`
})

const chartLinePath = computed(() => {
  const pts = chartPoints.value
  if (!pts) return ''
  return `M ${pts}`
})

// Top de aplicaciones por consumo de memoria
const topMemoryApps = computed(() => {
  return [...processGroups.value]
    .filter(p => p.isRunning)
    .sort((a, b) => b.memScore - a.memScore)
    .slice(0, 4)
})
</script>

<template>
  <div class="tm-container frst-bg-normal">
    <!-- Barra superior de navegación y pestañas -->
    <header class="tm-header">
      <div class="tm-brand">
        <i class="bi bi-speedometer2 tm-brand-icon"></i>
        <div class="tm-brand-txt">
          <span class="tm-title">Supervisor de tareas</span>
          <span class="tm-subtitle">Frost OS Kernel Management</span>
        </div>
      </div>

      <nav class="tm-tabs">
        <button
          class="tm-tab-btn"
          :class="{ active: activeTab === 'processes' }"
          type="button"
          @click="activeTab = 'processes'"
        >
          <i class="bi bi-activity"></i>
          <span>Procesos</span>
        </button>

        <button
          class="tm-tab-btn"
          :class="{ active: activeTab === 'performance' }"
          type="button"
          @click="activeTab = 'performance'"
        >
          <i class="bi bi-cpu"></i>
          <span>Rendimiento</span>
        </button>

        <button
          class="tm-tab-btn"
          :class="{ active: activeTab === 'startup' }"
          type="button"
          @click="activeTab = 'startup'"
        >
          <i class="bi bi-power"></i>
          <span>Apps de inicio</span>
        </button>
      </nav>
    </header>

    <!-- Barra de acciones contextuales -->
    <div class="tm-actions-bar">
      <div class="tm-search-box">
        <i class="bi bi-search"></i>
        <input
          v-if="activeTab === 'processes'"
          v-model="quickFilter"
          class="tm-input"
          placeholder="Buscar proceso o archivo (.snw, .flk)..."
        />
        <input
          v-else-if="activeTab === 'startup'"
          v-model="startupFilter"
          class="tm-input"
          placeholder="Buscar apps de inicio..."
        />
        <span v-else class="perf-status-badge">Telemetría de recursos en tiempo real</span>
        <button
          v-if="(activeTab === 'processes' && quickFilter) || (activeTab === 'startup' && startupFilter)"
          class="clear-btn"
          type="button"
          @click="activeTab === 'processes' ? (quickFilter = '') : (startupFilter = '')"
        >
          ✕
        </button>
      </div>

      <div class="tm-cmd-group">
        <!-- Nueva instancia / tarea -->
        <button
          class="cmd-btn primary"
          type="button"
          title="Abrir nueva instancia de ventana"
          @click="createNewInstance()"
        >
          <i class="bi bi-plus-lg"></i>
          <span>{{ selectedItemId ? 'Nueva instancia' : 'Nueva tarea...' }}</span>
        </button>

        <!-- Traer al frente -->
        <button
          v-if="activeTab === 'processes'"
          class="cmd-btn"
          :disabled="!selectedItemId"
          type="button"
          title="Traer al frente la ventana seleccionada"
          @click="focusItem()"
        >
          <i class="bi bi-box-arrow-up-right"></i>
          <span>Traer al frente</span>
        </button>

        <!-- Finalizar tarea -->
        <button
          v-if="activeTab === 'processes'"
          class="cmd-btn danger"
          :disabled="!selectedItemId"
          type="button"
          title="Finalizar el proceso o cerrar la ventana seleccionada"
          @click="endTask()"
        >
          <i class="bi bi-stop-circle"></i>
          <span>Finalizar tarea</span>
        </button>

        <!-- Expandir / Contraer todo -->
        <button
          v-if="activeTab === 'processes'"
          class="cmd-btn icon-only"
          type="button"
          title="Expandir / Contraer instancias"
          @click="expandedProcesses.size > 0 ? collapseAll() : expandAll()"
        >
          <i class="bi" :class="expandedProcesses.size > 0 ? 'bi-arrows-collapse' : 'bi-arrows-expand'"></i>
        </button>
      </div>
    </div>

    <!-- Contenido principal según pestaña -->
    <main class="tm-content">
      <!-- PESTAÑA 1: PROCESOS (FUSIÓN VISTA 1 Y VISTA 2) -->
      <section v-if="activeTab === 'processes'" class="tab-pane active">
        <div class="tm-table-wrap">
          <table class="tm-table">
            <thead>
              <tr>
                <th class="th-expand"></th>
                <th class="th-name" @click="setSort('name')">
                  Nombre
                  <i v-if="sortBy === 'name'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-file" @click="setSort('file')">
                  Archivo
                  <i v-if="sortBy === 'file'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-type" @click="setSort('type')">
                  Tipo
                  <i v-if="sortBy === 'type'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-status" @click="setSort('state')">
                  Estado
                  <i v-if="sortBy === 'state'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-cpu" @click="setSort('cpuMs5s')">
                  CPU
                  <i v-if="sortBy === 'cpuMs5s'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-mem" @click="setSort('memScore')">
                  Memoria
                  <i v-if="sortBy === 'memScore'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-uptime" @click="setSort('uptimeSec')">
                  Tiempo
                  <i v-if="sortBy === 'uptimeSec'" class="bi sort-icon" :class="sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down'"></i>
                </th>
                <th class="th-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="proc in filteredProcesses" :key="proc.id">
                <!-- Fila padre: Proceso -->
                <tr
                  class="proc-row"
                  :class="{
                    selected: selectedItemId === proc.id && selectedItemType === 'process',
                    inactive: !proc.isRunning
                  }"
                  @click="selectProcess(proc)"
                  @dblclick="focusItem(proc.id, 'process')"
                >
                  <td class="td-expand" @click.stop="proc.windows.length > 0 ? toggleExpand(proc.id) : null">
                    <button
                      v-if="proc.windows.length > 0"
                      class="btn-expand"
                      :class="{ open: expandedProcesses.has(proc.id) }"
                      title="Alternar instancias"
                      type="button"
                    >
                      <i class="bi" :class="expandedProcesses.has(proc.id) ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
                    </button>
                  </td>

                  <td class="td-name">
                    <div class="name-cell">
                      <IconManager :id="proc.id" class="app-icon" />
                      <div class="name-info">
                        <span class="proc-name">{{ proc.name }}</span>
                        <span v-if="proc.windows.length > 1" class="instance-badge" title="Múltiples instancias abiertas">
                          {{ proc.windows.length }} instancias
                        </span>
                        <span v-else-if="proc.windows.length === 1" class="instance-badge-single">
                          1 ventana
                        </span>
                      </div>
                    </div>
                  </td>

                  <td class="td-file">
                    <span class="file-pill" :class="proc.type">
                      <i class="bi" :class="proc.type === 'snippet' ? 'bi-code-square' : 'bi-file-earmark-code'"></i>
                      {{ proc.file }}
                    </span>
                  </td>

                  <td class="td-type">
                    <span class="type-badge" :class="proc.type">
                      {{ proc.type === 'snippet' ? 'Snippet' : (proc.type === 'core' ? 'Sistema' : 'App') }}
                    </span>
                  </td>

                  <td class="td-status">
                    <div class="status-cell">
                      <span
                        class="status-indicator"
                        :class="{
                          online: proc.isRunning && !proc.isMinimized && !proc.isInTray,
                          tray: proc.isRunning && proc.isInTray,
                          minimized: proc.isRunning && proc.isMinimized,
                          offline: !proc.isRunning
                        }"
                      ></span>
                      <span class="status-text">
                        {{
                          !proc.isRunning
                            ? 'Detenido'
                            : proc.isInTray
                            ? 'En bandeja'
                            : proc.isMinimized
                            ? 'Minimizado'
                            : 'En ejecución'
                        }}
                      </span>
                    </div>
                  </td>

                  <td class="td-cpu">
                    <span class="stat-badge cpu" :class="{ active: proc.cpuMs5s > 10 }">
                      {{ Math.round(proc.cpuMs5s) }} ms
                    </span>
                  </td>

                  <td class="td-mem">
                    <span class="mem-badge" :class="getMemClass(proc.memScore)">
                      {{ (proc.memScore / 10).toFixed(1) }} MB
                    </span>
                  </td>

                  <td class="td-uptime">
                    <span class="uptime-text">{{ formatUptime(proc.uptimeSec) }}</span>
                  </td>

                  <td class="td-actions">
                    <div class="row-actions" @click.stop>
                      <button
                        v-if="proc.type !== 'snippet' && !isSingleInstanceApp(proc.id)"
                        class="tm-btn icon-btn"
                        title="Nueva instancia"
                        type="button"
                        @click="createNewInstance(proc.id)"
                      >
                        <i class="bi bi-window-plus"></i>
                      </button>

                      <button
                        v-if="proc.windows.length > 0 || proc.type === 'snippet'"
                        class="tm-btn icon-btn focus"
                        title="Traer al frente"
                        type="button"
                        @click="focusItem(proc.id, 'process')"
                      >
                        <i class="bi bi-eye"></i>
                      </button>

                      <button
                        v-if="proc.isRunning"
                        class="tm-btn icon-btn end"
                        title="Finalizar proceso"
                        type="button"
                        @click="endTask(proc.id, 'process')"
                      >
                        <i class="bi bi-x-octagon"></i>
                      </button>
                    </div>
                  </td>
                </tr>

                <!-- Filas hijas: Multi-instancias de ventana -->
                <template v-if="expandedProcesses.has(proc.id) && proc.windows.length > 0">
                  <tr
                    v-for="win in proc.windows"
                    :key="win.id"
                    class="win-row"
                    :class="{ selected: selectedItemId === win.id && selectedItemType === 'window' }"
                    @click="selectWindow(win, proc.id)"
                    @dblclick="focusItem(win.id, 'window')"
                  >
                    <td class="td-expand">
                      <span class="tree-line">↳</span>
                    </td>

                    <td class="td-name">
                      <div class="win-item">
                        <i class="bi bi-window-stack win-icon"></i>
                        <span class="win-title">{{ win.title }}</span>
                        <span v-if="win.isFocused" class="tag focused">ACTIVA</span>
                        <span v-if="win.isMinimized" class="tag minimized">MIN</span>
                        <span v-if="win.isMaximized" class="tag maximized">MAX</span>
                      </div>
                    </td>

                    <td class="td-file">
                      <span class="win-meta-tag mono">PID: {{ win.pid }}</span>
                    </td>

                    <td class="td-type">
                      <span class="win-meta-tag">Vista: {{ win.view }}</span>
                    </td>

                    <td class="td-status">
                      <span class="status-text muted">
                        {{ win.isMinimized ? 'Minimizada' : (win.isFocused ? 'En primer plano' : 'Segundo plano') }}
                      </span>
                    </td>

                    <td class="td-cpu">
                      <span class="dash">—</span>
                    </td>

                    <td class="td-mem">
                      <span class="dash">—</span>
                    </td>

                    <td class="td-uptime">
                      <span class="dash">—</span>
                    </td>

                    <td class="td-actions">
                      <div class="row-actions" @click.stop>
                        <button
                          class="tm-btn sub-btn"
                          title="Traer al frente"
                          type="button"
                          @click="focusItem(win.id, 'window')"
                        >
                          <i class="bi bi-arrow-up-right-square"></i> Traer
                        </button>

                        <button
                          class="tm-btn sub-btn"
                          title="Minimizar o restaurar ventana"
                          type="button"
                          @click="minimizeRestoreWindow(win)"
                        >
                          <i class="bi" :class="win.isMinimized ? 'bi-window-fullscreen' : 'bi-dash-square'"></i>
                        </button>

                        <button
                          class="tm-btn sub-btn win-close"
                          title="Cerrar esta ventana"
                          type="button"
                          @click="endTask(win.id, 'window')"
                        >
                          <i class="bi bi-x-lg"></i> Cerrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>
              </template>
            </tbody>
          </table>
        </div>
      </section>

      <!-- PESTAÑA 2: RENDIMIENTO / RECURSOS -->
      <section v-else-if="activeTab === 'performance'" class="tab-pane active">
        <div class="perf-container">
          <div class="perf-grid">
            <!-- Tarjeta CPU -->
            <div class="perf-card">
              <div class="perf-card-header">
                <div class="perf-card-title">
                  <i class="bi bi-cpu"></i>
                  <span>Procesador (CPU)</span>
                </div>
                <div class="perf-card-metric">{{ cpuPercent }}%</div>
              </div>

              <div class="perf-chart-box">
                <svg viewBox="0 0 360 100" class="perf-svg" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#48cae4" stop-opacity="0.40" />
                      <stop offset="100%" stop-color="#48cae4" stop-opacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path :d="chartAreaPath" fill="url(#cpuGrad)" />
                  <path :d="chartLinePath" fill="none" stroke="#48cae4" stroke-width="2.5" stroke-linejoin="round" />
                </svg>
              </div>

              <div class="perf-details-grid">
                <div class="detail-item">
                  <span class="lbl">Actividad CPU</span>
                  <span class="val">{{ Math.round(totalCpuMs) }} ms/5s</span>
                </div>
                <div class="detail-item">
                  <span class="lbl">Procesos activos</span>
                  <span class="val">{{ runningProcessCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="lbl">Ventanas abiertas</span>
                  <span class="val">{{ totalWindowsCount }}</span>
                </div>
                <div class="detail-item">
                  <span class="lbl">Arquitectura</span>
                  <span class="val">FrostKernel x64</span>
                </div>
              </div>
            </div>

            <!-- Tarjeta Memoria RAM -->
            <div class="perf-card">
              <div class="perf-card-header">
                <div class="perf-card-title">
                  <i class="bi bi-memory"></i>
                  <span>Memoria RAM</span>
                </div>
                <div class="perf-card-metric">{{ (totalMemMB / 1024).toFixed(2) }} / 8.00 GB</div>
              </div>

              <div class="perf-bar-box">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" :style="{ width: memPercent + '%' }"></div>
                </div>
                <div class="progress-labels">
                  <span>{{ memPercent }}% en uso</span>
                  <span>{{ (8192 - totalMemMB).toFixed(0) }} MB disponible</span>
                </div>
              </div>

              <div class="top-apps-list">
                <div class="top-apps-title">Mayor consumo de memoria:</div>
                <div v-for="app in topMemoryApps" :key="app.id" class="top-app-item">
                  <IconManager :id="app.id" class="top-app-icon" />
                  <span class="top-app-name">{{ app.name }}</span>
                  <span class="top-app-mem">{{ (app.memScore / 10).toFixed(1) }} MB</span>
                </div>
              </div>
            </div>

            <!-- Tarjeta Sistema / Uptime -->
            <div class="perf-card full-width">
              <div class="perf-card-header">
                <div class="perf-card-title">
                  <i class="bi bi-shield-check"></i>
                  <span>Estado general de Frost OS</span>
                </div>
                <div class="perf-card-metric success">En línea</div>
              </div>

              <div class="system-specs-row">
                <div class="spec-col">
                  <span class="spec-label">Tiempo de actividad del sistema</span>
                  <span class="spec-value mono">{{ formatSystemUptime(systemUptimeSec) }}</span>
                </div>
                <div class="spec-col">
                  <span class="spec-label">Total de aplicaciones registradas</span>
                  <span class="spec-value">{{ processGroups.length }}</span>
                </div>
                <div class="spec-col">
                  <span class="spec-label">Persistencia de estado</span>
                  <span class="spec-value success"><i class="bi bi-check-circle-fill"></i> Dexie IndexedDB activa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PESTAÑA 3: APPS DE INICIO (STARTUP APPS) -->
      <section v-else-if="activeTab === 'startup'" class="tab-pane active">
        <div class="startup-container">
          <div class="startup-banner">
            <div class="banner-info">
              <div class="banner-title">
                <i class="bi bi-rocket-takeoff"></i>
                <span>Aplicaciones de arranque</span>
              </div>
              <div class="banner-subtitle">
                Habilita o deshabilita las aplicaciones que se inician automáticamente al arrancar Frost OS. Las configuraciones son persistentes.
              </div>
            </div>
            <div class="banner-stats">
              <div class="stat-box">
                <span class="stat-num">{{ enabledStartupCount }}</span>
                <span class="stat-desc">Habilitadas</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ startupApps.length }}</span>
                <span class="stat-desc">Total</span>
              </div>
            </div>
          </div>

          <div class="startup-table-wrap">
            <table class="tm-table startup-table">
              <thead>
                <tr>
                  <th style="width: 26%">Aplicación</th>
                  <th style="width: 18%">Archivo</th>
                  <th style="width: 18%">Editor / Fabricante</th>
                  <th style="width: 16%">Estado al inicio</th>
                  <th style="width: 10%">Impacto</th>
                  <th style="width: 12%">Bandeja</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="app in filteredStartupApps" :key="app.id" class="startup-row">
                  <td>
                    <div class="name-cell">
                      <IconManager :id="app.id" class="app-icon" />
                      <div class="name-info">
                        <span class="proc-name">{{ app.name }}</span>
                        <span class="proc-id">{{ app.id }}</span>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span class="file-pill application">
                      <i class="bi bi-file-earmark-code"></i>
                      {{ app.file }}
                    </span>
                  </td>

                  <td>
                    <span class="author-text">{{ app.author }}</span>
                  </td>

                  <td>
                    <div class="switch-container">
                      <button
                        class="tm-switch"
                        :class="{ active: app.startOnBoot }"
                        type="button"
                        :title="app.startOnBoot ? 'Deshabilitar de inicio' : 'Habilitar al inicio'"
                        @click="toggleStartup(app.id)"
                      >
                        <span class="tm-switch-knob"></span>
                      </button>
                      <span class="switch-label" :class="{ active: app.startOnBoot }">
                        {{ app.startOnBoot ? 'Habilitado' : 'Deshabilitado' }}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span class="impact-badge" :class="app.impact.toLowerCase()">
                      {{ app.impact }}
                    </span>
                  </td>

                  <td>
                    <div v-if="app.canTray" class="tray-toggle-cell">
                      <button
                        class="tm-switch small"
                        :class="{ active: app.startInTray, disabled: !app.startOnBoot }"
                        type="button"
                        :disabled="!app.startOnBoot"
                        :title="app.startInTray ? 'Inicia en bandeja' : 'Inicia con ventana'"
                        @click="toggleStartupTray(app.id)"
                      >
                        <span class="tm-switch-knob"></span>
                      </button>
                      <span class="tray-label">{{ app.startInTray ? 'En bandeja' : 'Ventana' }}</span>
                    </div>
                    <span v-else class="dash">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>

    <!-- Barra de estado inferior -->
    <footer class="tm-status-bar">
      <div class="status-left">
        <span><i class="bi bi-activity"></i> {{ runningProcessCount }} procesos en ejecución</span>
        <span class="status-sep">•</span>
        <span><i class="bi bi-window-stack"></i> {{ totalWindowsCount }} ventanas activas</span>
      </div>
      <div class="status-right">
        <span>CPU: <strong>{{ cpuPercent }}%</strong></span>
        <span class="status-sep">•</span>
        <span>RAM: <strong>{{ (totalMemMB / 1024).toFixed(2) }} GB ({{ memPercent }}%)</strong></span>
      </div>
    </footer>

    <!-- Notificación emergente Toast -->
    <transition name="fade">
      <div v-if="toastMsg" class="tm-toast">{{ toastMsg }}</div>
    </transition>
  </div>
</template>

<style scoped>
.tm-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  color: var(--frst-font-normal, #ffffff);
  background-color: var(--frst-bg-normal, rgba(20, 24, 30, 0.75));
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  user-select: none;
}

/* Header & Tabs */
.tm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.15);
}

.tm-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tm-brand-icon {
  font-size: 20px;
  color: #48cae4;
}

.tm-brand-txt {
  display: flex;
  flex-direction: column;
}

.tm-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.3px;
  color: #ffffff;
}

.tm-subtitle {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.45);
}

.tm-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.25);
  padding: 3px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.tm-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tm-tab-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.06);
}

.tm-tab-btn.active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.tm-tab-btn.active i {
  color: #48cae4;
}

/* Actions Toolbar */
.tm-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.10);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  gap: 12px;
}

.tm-search-box {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 5px 10px;
  width: 320px;
  max-width: 45%;
  position: relative;
}

.tm-search-box i {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-right: 8px;
}

.tm-input {
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 12px;
  width: 100%;
}

.tm-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.clear-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  font-size: 11px;
}

.perf-status-badge {
  font-size: 12px;
  color: #48cae4;
  font-weight: 500;
}

.tm-cmd-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.cmd-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  transition: all 0.15s ease;
}

.cmd-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.cmd-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cmd-btn.primary {
  background: rgba(72, 202, 228, 0.20);
  border-color: rgba(72, 202, 228, 0.35);
  color: #bbf2fc;
}

.cmd-btn.primary:hover:not(:disabled) {
  background: rgba(72, 202, 228, 0.32);
}

.cmd-btn.danger {
  color: #ff9999;
}

.cmd-btn.danger:hover:not(:disabled) {
  background: rgba(255, 82, 82, 0.22);
  border-color: rgba(255, 82, 82, 0.40);
  color: #ffc4c4;
}

.cmd-btn.icon-only {
  padding: 5px 8px;
}

/* Main Content Area */
.tm-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--frst-bg-light, rgba(0, 0, 0, 0.2));
}

.tab-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Table styling */
.tm-table-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.tm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  text-align: left;
}

.tm-table thead {
  position: sticky;
  top: 0;
  background: rgba(18, 22, 28, 0.95);
  backdrop-filter: blur(12px);
  z-index: 10;
  border-bottom: 1px solid rgba(255, 255, 255, 0.10);
}

.tm-table th {
  padding: 9px 12px;
  color: rgba(255, 255, 255, 0.65);
  font-weight: 600;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  cursor: pointer;
  white-space: nowrap;
}

.tm-table th:hover {
  color: #ffffff;
}

.sort-icon {
  margin-left: 4px;
  font-size: 11px;
  color: #48cae4;
}

.th-expand { width: 34px; padding: 0 !important; cursor: default; }
.th-name { width: 25%; }
.th-file { width: 15%; }
.th-type { width: 10%; }
.th-status { width: 14%; }
.th-cpu { width: 9%; }
.th-mem { width: 11%; }
.th-uptime { width: 8%; }
.th-actions { width: 8%; text-align: right; padding-right: 16px; cursor: default; }

.proc-row td {
  padding: 7px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
  transition: background 0.1s ease;
}

.proc-row:hover {
  background: rgba(255, 255, 255, 0.05);
}

.proc-row.selected {
  background: rgba(72, 202, 228, 0.16) !important;
  border-color: rgba(72, 202, 228, 0.35);
}

.proc-row.inactive {
  opacity: 0.65;
}

.td-expand {
  text-align: center;
  padding: 0 4px !important;
}

.btn-expand {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 4px;
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, color 0.15s ease;
}

.btn-expand:hover {
  color: #ffffff;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.app-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  flex-shrink: 0;
}

.name-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.proc-name {
  font-weight: 600;
  color: #ffffff;
}

.instance-badge {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(72, 202, 228, 0.22);
  border: 1px solid rgba(72, 202, 228, 0.40);
  color: #bbf2fc;
  font-weight: 600;
}

.instance-badge-single {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

/* File pill */
.file-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 7px;
  border-radius: 5px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: rgba(255, 255, 255, 0.85);
}

.file-pill.snippet {
  background: rgba(155, 89, 182, 0.15);
  border-color: rgba(155, 89, 182, 0.30);
  color: #e8d7f7;
}

.file-pill.core {
  background: rgba(52, 152, 219, 0.15);
  border-color: rgba(52, 152, 219, 0.30);
  color: #d1ecf1;
}

/* Type badge */
.type-badge {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.7);
}

.type-badge.snippet { color: #d7bde2; background: rgba(155, 89, 182, 0.2); }
.type-badge.core { color: #aed6f1; background: rgba(52, 152, 219, 0.2); }

/* Status cell */
.status-cell {
  display: flex;
  align-items: center;
  gap: 7px;
}

.status-indicator {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-indicator.online {
  background: #2ecc71;
  box-shadow: 0 0 6px #2ecc71;
}

.status-indicator.tray {
  background: #48cae4;
  box-shadow: 0 0 6px #48cae4;
}

.status-indicator.minimized {
  background: #f39c12;
  box-shadow: 0 0 5px #f39c12;
}

.status-indicator.offline {
  background: #7f8c8d;
}

.status-text {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.85);
}

.status-text.muted {
  color: rgba(255, 255, 255, 0.45);
  font-size: 11px;
}

/* Stat badges */
.stat-badge {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11.5px;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75);
}

.stat-badge.cpu.active {
  background: rgba(72, 202, 228, 0.18);
  border-color: rgba(72, 202, 228, 0.35);
  color: #bbf2fc;
}

.mem-badge {
  display: inline-flex;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11.5px;
  font-family: monospace;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.mem-badge.low {
  background: rgba(46, 204, 113, 0.16);
  border-color: rgba(46, 204, 113, 0.35);
  color: #a3f7c5;
}

.mem-badge.medium {
  background: rgba(241, 196, 15, 0.16);
  border-color: rgba(241, 196, 15, 0.35);
  color: #faebb0;
}

.mem-badge.high {
  background: rgba(230, 126, 34, 0.20);
  border-color: rgba(230, 126, 34, 0.40);
  color: #fed8b1;
}

.mem-badge.extreme {
  background: rgba(231, 76, 60, 0.25);
  border-color: rgba(231, 76, 60, 0.45);
  color: #ffb8b8;
  font-weight: 700;
}

.uptime-text {
  font-family: monospace;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.65);
}

.dash {
  color: rgba(255, 255, 255, 0.25);
}

/* Row Actions */
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
}

.tm-btn.icon-btn {
  width: 26px;
  height: 26px;
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: all 0.15s ease;
}

.tm-btn.icon-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.tm-btn.icon-btn.focus:hover {
  background: rgba(72, 202, 228, 0.25);
  border-color: rgba(72, 202, 228, 0.45);
  color: #bbf2fc;
}

.tm-btn.icon-btn.end:hover {
  background: rgba(255, 82, 82, 0.25);
  border-color: rgba(255, 82, 82, 0.45);
  color: #ff9999;
}

/* Multi-instance window subrows */
.win-row td {
  padding: 5px 12px;
  background: rgba(0, 0, 0, 0.18);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  font-size: 12px;
  transition: background 0.1s ease;
}

.win-row:hover {
  background: rgba(72, 202, 228, 0.08);
}

.win-row.selected {
  background: rgba(72, 202, 228, 0.22) !important;
}

.tree-line {
  color: rgba(255, 255, 255, 0.35);
  font-size: 14px;
  margin-left: 8px;
}

.win-item {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: 12px;
}

.win-icon {
  color: #48cae4;
  font-size: 12px;
}

.win-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
}

.tag {
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.tag.focused {
  background: #48cae4;
  color: #001219;
}

.tag.minimized {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.7);
}

.tag.maximized {
  background: rgba(155, 89, 182, 0.35);
  color: #e8d7f7;
}

.win-meta-tag {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.45);
}

.win-meta-tag.mono {
  font-family: monospace;
}

.tm-btn.sub-btn {
  padding: 3px 8px;
  font-size: 11px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.75);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s ease;
}

.tm-btn.sub-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.tm-btn.sub-btn.win-close:hover {
  background: rgba(255, 82, 82, 0.22);
  border-color: rgba(255, 82, 82, 0.4);
  color: #ff9999;
}

/* ---------------- RENDIMIENTO (PERFORMANCE) STYLES ---------------- */
.perf-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.perf-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.perf-card {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.perf-card.full-width {
  grid-column: span 2;
}

.perf-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.perf-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.perf-card-title i {
  color: #48cae4;
  font-size: 16px;
}

.perf-card-metric {
  font-size: 20px;
  font-weight: 700;
  font-family: monospace;
  color: #ffffff;
}

.perf-card-metric.success {
  font-size: 13px;
  color: #2ecc71;
  background: rgba(46, 204, 113, 0.15);
  padding: 2px 8px;
  border-radius: 12px;
}

.perf-chart-box {
  height: 100px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  margin-bottom: 14px;
}

.perf-svg {
  width: 100%;
  height: 100%;
  display: block;
}

.perf-details-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-item .lbl {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.detail-item .val {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  font-family: monospace;
}

.perf-bar-box {
  margin-bottom: 14px;
}

.progress-bar-bg {
  height: 12px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #48cae4, #0077b6);
  border-radius: 6px;
  transition: width 0.4s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-family: monospace;
}

.top-apps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  padding: 10px;
}

.top-apps-title {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  margin-bottom: 2px;
}

.top-app-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.top-app-icon {
  width: 16px;
  height: 16px;
}

.top-app-name {
  flex: 1;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top-app-mem {
  font-family: monospace;
  color: #48cae4;
  font-weight: 600;
}

.system-specs-row {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.spec-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spec-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.spec-value {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
}

.spec-value.mono {
  font-family: monospace;
  color: #bbf2fc;
}

.spec-value.success {
  color: #2ecc71;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* ---------------- STARTUP APPS STYLES ---------------- */
.startup-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.startup-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: rgba(0, 0, 0, 0.15);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.banner-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14.5px;
  font-weight: 700;
  color: #ffffff;
}

.banner-title i {
  color: #48cae4;
}

.banner-subtitle {
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.55);
  margin-top: 3px;
}

.banner-stats {
  display: flex;
  gap: 12px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 8px;
  padding: 6px 14px;
  min-width: 65px;
}

.stat-num {
  font-size: 16px;
  font-weight: 700;
  color: #48cae4;
  font-family: monospace;
}

.stat-desc {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.startup-table-wrap {
  flex: 1;
  overflow-y: auto;
}

.startup-table th {
  padding: 10px 14px;
}

.startup-row td {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  vertical-align: middle;
}

.startup-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.proc-id {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.4);
}

.author-text {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

/* Switches */
.switch-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tm-switch {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  position: relative;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.tm-switch.active {
  background: #00b4d8;
  border-color: #48cae4;
  box-shadow: 0 0 10px rgba(0, 180, 216, 0.35);
}

.tm-switch.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.tm-switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.35);
}

.tm-switch.active .tm-switch-knob {
  transform: translateX(20px);
}

.tm-switch.small {
  width: 36px;
  height: 20px;
}

.tm-switch.small .tm-switch-knob {
  width: 14px;
  height: 14px;
  top: 2px;
  left: 2px;
}

.tm-switch.small.active .tm-switch-knob {
  transform: translateX(16px);
}

.switch-label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  transition: color 0.15s ease;
}

.switch-label.active {
  color: #bbf2fc;
}

.tray-toggle-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tray-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
}

.impact-badge {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 600;
}

.impact-badge.alto {
  color: #ff9999;
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.35);
}

.impact-badge.medio {
  color: #faebb0;
  background: rgba(241, 196, 15, 0.2);
  border: 1px solid rgba(241, 196, 15, 0.35);
}

.impact-badge.bajo {
  color: #a3f7c5;
  background: rgba(46, 204, 113, 0.2);
  border: 1px solid rgba(46, 204, 113, 0.35);
}

/* Footer Status Bar */
.tm-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: rgba(14, 17, 22, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.6);
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-sep {
  opacity: 0.3;
}

.status-right strong {
  color: #48cae4;
  font-family: monospace;
}

/* Toast */
.tm-toast {
  position: absolute;
  bottom: 38px;
  right: 18px;
  background: rgba(25, 32, 45, 0.94);
  border: 1px solid rgba(72, 202, 228, 0.45);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 500;
  z-index: 99;
  backdrop-filter: blur(12px);
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* Custom Scrollbar */
.tm-table-wrap::-webkit-scrollbar,
.perf-container::-webkit-scrollbar,
.startup-table-wrap::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.tm-table-wrap::-webkit-scrollbar-thumb,
.perf-container::-webkit-scrollbar-thumb,
.startup-table-wrap::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
}

.tm-table-wrap::-webkit-scrollbar-thumb:hover,
.perf-container::-webkit-scrollbar-thumb:hover,
.startup-table-wrap::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}
</style>