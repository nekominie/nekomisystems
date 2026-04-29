<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref } from 'vue'
import { OS_KEY } from '../../../../../api/os_api'
import IconManager from '../../../../../os/iconmanager.vue'

const os = inject(OS_KEY)!
if (!os) throw new Error('OS API not found')

// Sincronizador de tiempo para el Uptime
const nowTick = ref(Date.now())
let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => (nowTick.value = Date.now()), 1000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

const quickFilter = ref('')

// --- LÓGICA DE AGRUPACIÓN (ESTILO WINDOWS) ---
const processGroups = computed(() => {
  const now = nowTick.value
  const query = quickFilter.value.toLowerCase()

  // 1. Mapeamos las Apps y buscamos sus ventanas abiertas
  const groups = os.state.apps.map((app: any) => {
    const appWindows = os.state.windows.filter((w: any) => w.appId === app.manifest.id)
    
    return {
      id: app.manifest.id,
      name: app.manifest.name,
      type: app.manifest.snippet ? 'snippet' : 'application',
      isRunning: app.runtime.isRunning,
      uptimeSec: app.runtime.stats?.startedAt ? Math.floor((now - app.runtime.stats.startedAt) / 1000) : 0,
      cpuMs5s: app.runtime.stats?.cpuMsLast5s ?? 0,
      memScore: app.runtime.stats?.memScore ?? 0,
      windows: appWindows.map((w: any) => ({
        id: w.id,
        title: w.title,
        view: w.view,
        pid: w.pid,
        isFocused: w.isFocused
      }))
    }
  })

  // 2. Filtramos por búsqueda
  return groups.filter(g => 
    g.name.toLowerCase().includes(query) || 
    g.id.toLowerCase().includes(query)
  ).sort((a, b) => b.memScore - a.memScore)
})

function formatUptime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

const killProcess = (appId: string) => {
  os.closeApp(appId)
}

const focusWindow = (winId: string) => {
  os.bringToFront(winId)
}
</script>

<template>
  <div class="tm-container frst-bg-normal">
    <ul class="nav nav-tabs" role="tablist">
      <li class="nav-item">
        <button class="nav-link active"><i class="bi bi-activity"></i> Procesos</button>
      </li>
      <li class="nav-item">
        <button class="nav-link"><i class="bi bi-clipboard-data-fill"></i> Recursos</button>
      </li>
    </ul>

    <div class="tm-content-wrapper">
      <div class="tm-toolbar">
        <div class="search-container">
          <i class="bi bi-search"></i>
          <input v-model="quickFilter" class="tm-search" placeholder="Buscar proceso o ID..." />
        </div>
      </div>

      <div class="tm-scroll-area">
        <table class="tm-table">
          <thead>
            <tr>
              <th style="width: 40%">Nombre / ID</th>
              <th style="width: 15%">Estado</th>
              <th style="width: 15%">CPU</th>
              <th style="width: 15%">Memoria</th>
              <th style="width: 15%">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="proc in processGroups" :key="proc.id">
              <tr class="proc-row" :class="{ 'inactive': !proc.isRunning }">
                <td>
                  <div class="d-flex align-items-center">
                    <IconManager :id="proc.id" class="tm-icon" />
                    <div class="proc-info">
                      <span class="proc-name">{{ proc.name }}</span>
                      <span class="proc-id">{{ proc.id }}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="status-dot" :class="{ 'online': proc.isRunning }"></span>
                  {{ proc.isRunning ? 'Ejecutando' : 'Suspendido' }}
                </td>
                <td><span class="tm-badge">{{ Math.round(proc.cpuMs5s) }}ms</span></td>
                <td>
                  <span class="mem-badge" :class="getMemClass(proc.memScore)">
                    {{ (proc.memScore / 10).toFixed(1) }} MB
                  </span>
                </td>
                <td>
                  <button v-if="proc.isRunning" class="btn-end" @click="killProcess(proc.id)">Finalizar</button>
                </td>
              </tr>

              <tr v-for="win in proc.windows" :key="win.id" class="win-row" @click="focusWindow(win.id)">
                <td colspan="4">
                  <div class="win-item">
                    <i class="bi bi-arrow-return-right"></i>
                    <i class="bi bi-window-stack"></i>
                    <span class="win-title">{{ win.title || 'Ventana sin título' }}</span>
                    <span class="win-meta">Vista: {{ win.view }} | PID: {{ win.pid }}</span>
                    <span v-if="win.isFocused" class="focus-tag">FOCUSED</span>
                  </div>
                </td>
                <td>
                  <button class="btn-focus">Ir a</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
// Función auxiliar para clases de memoria
function getMemClass(score: number) {
  if (score < 500) return 'low'
  if (score < 2500) return 'medium'
  if (score < 6000) return 'high'
  return 'extreme'
}
</script>

<style scoped>
.tm-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Evita scroll doble */
}

.tm-content-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--frst-bg-light);
  min-height: 0; /* Fix para scroll en flex */
}

.tm-toolbar {
  padding: 12px;
  background: rgba(0,0,0,0.1);
}

.tm-scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.tm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.tm-table th {
  position: sticky;
  top: 0;
  background: #1a1c1e;
  padding: 10px;
  text-align: left;
  z-index: 10;
  color: #888;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.proc-row td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.02);
}

.proc-row:hover { background: rgba(255,255,255,0.05); }

.proc-info {
  display: flex;
  flex-direction: column;
}

.proc-name { color: #fff; font-weight: 500; }
.proc-id { font-size: 11px; color: #666; }

.tm-icon {
  width: 24px;
  height: 24px;
  margin-right: 12px;
}

/* Agrupación de Ventanas */
.win-row td {
  padding: 4px 10px 4px 40px;
  background: rgba(0,0,0,0.15);
  cursor: pointer;
}

.win-row:hover { background: rgba(72, 202, 228, 0.1); }

.win-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #aaa;
}

.win-title { color: #ddd; font-size: 12px; }
.win-meta { font-size: 10px; color: #555; }

.focus-tag {
  font-size: 9px;
  background: #48cae4;
  color: #000;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: bold;
}

/* Estilos de Badges */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  margin-right: 5px;
}
.status-dot.online { background: #2ecc71; box-shadow: 0 0 5px #2ecc71; }

.mem-badge {
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255,255,255,0.05);
  font-family: monospace;
}
.mem-badge.high { color: #e67e22; }
.mem-badge.extreme { color: #e74c3c; font-weight: bold; }

/* Botones */
.btn-end {
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}
.btn-end:hover { background: #e74c3c; color: white; }

.btn-focus {
  background: transparent;
  border: 1px solid #444;
  color: #888;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}

/* Scrollbar Custom */
.tm-scroll-area::-webkit-scrollbar { width: 6px; }
.tm-scroll-area::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
}

.search-container {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.3);
  border-radius: 6px;
  padding: 4px 12px;
}
.tm-search {
  background: transparent;
  border: none;
  color: white;
  margin-left: 10px;
  flex: 1;
  outline: none;
}
</style>