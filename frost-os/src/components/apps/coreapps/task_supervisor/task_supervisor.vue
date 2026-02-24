<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref } from 'vue'
import TableLite from 'vue3-table-lite/ts'
import { OS_KEY } from '../../../api/os_api'

const os = inject(OS_KEY)!
if (!os) throw new Error('OS API not found')

// 🔧 workaround TS (slots quedan en any)
const TableLiteAny = TableLite as any

type ProcessRow = {
  id: string
  name: string
  type: 'app' | 'snippet'
  state: string
  window: string
  tray: string
  uptimeSec: number
  cpuMs5s: number
  memScore: number
}

const nowTick = ref(Date.now())
let timer: number | undefined
onMounted(() => {
  timer = window.setInterval(() => (nowTick.value = Date.now()), 1000)
})
onUnmounted(() => {
  if (timer) window.clearInterval(timer)
})

const quickFilter = ref('')

const table = reactive({
  isLoading: false,
  columns: [
    { label: 'Process', field: 'name', width: '22%', sortable: true },
    { label: 'Type', field: 'type', width: '10%', sortable: true },
    { label: 'Status', field: 'state', width: '18%', sortable: true },
    { label: 'Window', field: 'window', width: '10%', sortable: true },
    { label: 'Tray', field: 'tray', width: '8%', sortable: true },
    { label: 'CPU (ms/5s)', field: 'cpuMs5s', width: '10%', sortable: true },
    { label: 'Memory (score)', field: 'memScore', width: '10%', sortable: true },
    { label: 'Uptime', field: 'uptimeSec', width: '7%', sortable: true },
    { label: 'Actions', field: 'actions', width: '15%' },
  ],
})

const rowsAll = computed<ProcessRow[]>(() => {
  const now = nowTick.value

  const apps: ProcessRow[] = os.state.apps.map((a: any) => ({
    id: a.manifest.id,
    name: a.manifest.name,
    type: 'app',
    state: a.runtime.isRunning ? (a.runtime.isMinimized ? 'Running (Minimized)' : 'Running') : 'Stopped',
    window: a.runtime.isWindowOpen ? 'Yes' : 'No',
    tray: a.runtime.isInTray ? 'Yes' : 'No',
    uptimeSec: a.runtime.stats?.startedAt ? Math.floor((now - a.runtime.stats.startedAt) / 1000) : 0,
    cpuMs5s: a.runtime.stats?.cpuMsLast5s ?? 0,
    memScore: a.runtime.stats?.memScore ?? 0,
  }))

  const snippets: ProcessRow[] = (os.state.snippets ?? []).map((s: any) => ({
    id: s.manifest.id,
    name: s.manifest.name,
    type: 'snippet',
    state: s.runtime.isRunning ? (s.runtime.isVisible ? 'Visible' : 'Hidden') : 'Stopped',
    window: '—',
    tray: s.runtime.isInTray ? 'Yes' : 'No',
    uptimeSec: s.runtime.stats?.startedAt ? Math.floor((now - s.runtime.stats.startedAt) / 1000) : 0,
    cpuMs5s: s.runtime.stats?.cpuMsLast5s ?? 0,
    memScore: s.runtime.stats?.memScore ?? 0,
  }))

  return [...apps, ...snippets]
})

const rows = computed(() => {
  const q = quickFilter.value.trim().toLowerCase()
  if (!q) return rowsAll.value
  return rowsAll.value.filter(r =>
    `${r.name} ${r.type} ${r.state} ${r.window} ${r.tray}`.toLowerCase().includes(q)
  )
})

function formatUptime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

function handleAction(act: 'Focus' | 'End' | 'Toggle Tray', row: ProcessRow) {
  if (act === 'Focus') {
    if (row.type === 'app') os.bringToFront(row.id)
    else os.showSnippet(row.id)
  } else if (act === 'End') {
    if (row.type === 'app') os.closeApp(row.id)
    else os.hideSnippet(row.id)
  } else if (act === 'Toggle Tray') {
    // if (row.type === 'app') os.toggleTray?.(row.id)
  }
}
</script>

<template>
  <div class="task-manager">
    <div class="tm-toolbar">
      <div class="search-container">
        <i class="bi bi-search"></i>
        <input v-model="quickFilter" class="tm-search" placeholder="Search..." />
      </div>
    </div>

    <div class="tm-grid">
      <TableLiteAny
        :is-slot-mode="true"
        :is-static-mode="true"
        :columns="table.columns"
        :rows="rows"
        :total="rows.length"
      >
        <!-- Slots nombrados por field -->
        <template #cpuMs5s="{ value }">
          <span class="stat-badge cpu">{{ Math.round(value.cpuMs5s) }}</span>
        </template>

        <template #memScore="{ value }">
          <span class="stat-badge mem">{{ Math.round(value.memScore) }}</span>
        </template>

        <template #uptimeSec="{ value }">
          {{ formatUptime(value.uptimeSec) }}
        </template>

        <template #actions="{ value }">
          <div class="tm-actions">
            <button class="tm-btn focus" @click.stop="handleAction('Focus', value)">
              <i class="bi bi-eye"></i>
            </button>
            <button class="tm-btn end" @click.stop="handleAction('End', value)">
              End
            </button>
            <button class="tm-btn" @click.stop="handleAction('Toggle Tray', value)">
              Tray
            </button>
          </div>
        </template>
      </TableLiteAny>
    </div>
  </div>
</template>

<style scoped>
.task-manager{
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.tm-toolbar{
  padding: 10px;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.search-container{
  position: relative;
  display: flex;
  align-items: center;
}

.search-container i{
  position: absolute;
  left: 12px;
  opacity: 0.8;
}

.tm-search{
  width: 100%;
  padding: 8px 10px 8px 34px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0,0,0,0.25);
  color: white;
  outline: none;
}

.tm-grid{
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  padding: 10px;
}

/* TableLite internal classes */
:deep(.vtl-table){
  border-collapse: separate;
  border-spacing: 0 6px;
  background: transparent !important;
}

:deep(.vtl-thead th){
  background: rgba(255, 255, 255, 0.10) !important;
  border: none !important;
  color: rgba(255,255,255,0.9) !important;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 12px !important;
}

:deep(.vtl-tbody tr){
  background: rgba(255, 255, 255, 0.05);
  transition: background 0.15s ease;
}

:deep(.vtl-tbody tr:hover){
  background: rgba(255, 255, 255, 0.09) !important;
}

:deep(.vtl-tbody td){
  border: none !important;
  padding: 10px 12px !important;
  vertical-align: middle;
}

/* Badges + actions */
.stat-badge{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.06);
}

.tm-actions{
  display: flex;
  gap: 6px;
  justify-content: flex-start;
}

.tm-btn{
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: white;
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tm-btn:hover{
  background: rgba(255,255,255,0.12);
}

.tm-btn.focus:hover{
  background: rgba(72, 202, 228, 0.30);
  border-color: rgba(72, 202, 228, 0.45);
}

.tm-btn.end:hover{
  background: rgba(255, 82, 82, 0.20);
  border-color: rgba(255, 82, 82, 0.45);
}
</style>