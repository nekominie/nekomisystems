<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref } from 'vue'
import TableLite from 'vue3-table-lite/ts'
import { OS_KEY } from '../../../api/os_api'
import IconManager from '../../../os/iconmanager.vue'

const os = inject(OS_KEY)!
if (!os) throw new Error('OS API not found')

const TableLiteAny = TableLite as any

type ProcessRow = {
  id: string
  name: string
  type: 'application' | 'snippet'
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
  sortable: { order: 'memScore', sort: 'desc' },
  columns: [
    { label: 'Process', field: 'name', width: '22%', sortable: true },
    { label: 'File', field: 'file', width: '18%', sortable: true },
    { label: 'Type', field: 'type', width: '10%', sortable: true },
    { label: 'Status', field: 'state', width: '10%', sortable: true },
    { label: 'Window', field: 'window', width: '10%', sortable: true },
    { label: 'Tray', field: 'tray', width: '8%', sortable: true },
    { label: 'CPU (ms/5s)', field: 'cpuMs5s', width: '10%', sortable: true },
    { label: 'Memory', field: 'memScore', width: '14%', sortable: true },
    { label: 'Uptime', field: 'uptimeSec', width: '7%', sortable: true },
    { label: 'Actions', field: 'actions', width: '15%' },
  ],
})

const rowsAll = computed<ProcessRow[]>(() => {
  const now = nowTick.value

  const apps: ProcessRow[] = os.state.apps.map((a: any) => ({
    id: a.manifest.id,
    name: a.manifest.name,
    type: 'application',
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

  const filtered = !q
    ? rowsAll.value
    : rowsAll.value.filter(r =>
        `${r.name} ${r.type} ${r.state} ${r.window} ${r.tray}`.toLowerCase().includes(q)
      )

  // orden por mayor memoria
  return [...filtered].sort((a, b) => (b.memScore ?? 0) - (a.memScore ?? 0))
})

function formatUptime(sec: number) {
  const s = Math.max(0, Math.floor(sec || 0))
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${m}:${String(ss).padStart(2, '0')}`
}

function handleAction(act: 'Focus' | 'End' | 'Toggle Tray', row: ProcessRow) {
  if (act === 'Focus') {
    if (row.type === 'application') os.bringToFront(row.id)
    else os.showSnippet(row.id)
  } else if (act === 'End') {
    if (row.type === 'application') os.closeApp(row.id)
    else os.hideSnippet(row.id)
  } else if (act === 'Toggle Tray') {
    // if (row.type === 'app') os.toggleTray?.(row.id)
  }
}
</script>

<template>
  <div class="frst-bg-normal d-flex flex-column" style="height: 100%; padding-top: 10px;">
    <ul class="nav nav-tabs" style="margin: 0 10px !important;" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="activity-tab" data-bs-toggle="tab" data-bs-target="#activity-tab-pane" type="button" role="tab" aria-controls="activity-tab-pane" aria-selected="true"><i class="bi bi-activity"></i>Actividad</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="resources-tab" data-bs-toggle="tab" data-bs-target="#resources-tab-pane" type="button" role="tab" aria-controls="resources-tab-pane" aria-selected="false"><i class="bi bi-clipboard-data-fill"></i>Recursos</button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="startup-tab" data-bs-toggle="tab" data-bs-target="#startup-tab-pane" type="button" role="tab" aria-controls="startup-tab-pane" aria-selected="false"><i class="bi bi-power"></i>Apps de inicio</button>
      </li>
    </ul>
    <div class="tab-content" id="myTabContent">
      <div class="tab-pane fade show active task-manager" id="activity-tab-pane" role="tabpanel" aria-labelledby="activity-tab" tabindex="0">
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
            :page-size="9999"
            :is-hide-paging="true"
            :key="rows.length + '-' + quickFilter"
            :page="1"
            :sortable="table.sortable"
          >
            <!-- Slots nombrados por field -->
            <template #state="{ value }">
              <span
                :class="{ 
                  running: value.state === 'Running' || value.state === 'Running (Minimized)',
                  stopped: value.state === 'Stopped'            
                }"
              >
                {{  value.state }}
              </span>
            </template>

            <template #name="{ value }">
              <div class="proc-cell d-flex align-items-center">
                <IconManager :id="value.id"></IconManager>
                <div>
                  <div style="color: white; font-size: 14px;">{{ value.name }}</div>
                </div>
              </div>
            </template>

            <template #file="{value}">
              <div style="font-size: 14px;">{{ value.id }}{{  value.type == "snippet" ? ".flk" : ".snw" }}</div>
            </template>

            <template #cpuMs5s="{ value }">
              <span class="stat-badge cpu">{{ Math.round(value.cpuMs5s) }}</span>
            </template>

            <template #memScore="{ value }">
              <span 
                class="mem-badge"
                :class="{
                  normal: value.memScore < 500,
                  low: value.memScore >= 1000 && value.memScore < 2500,
                  medium: value.memScore >= 2500 && value.memScore < 6000,
                  high: value.memScore >= 6000 && value.memScore < 10000,
                  extreme: value.memScore >= 10000
                }"
              >
                {{
                  new Intl.NumberFormat('en-US', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 2
                  }).format(value.memScore / 10)
                }} MB
              </span>
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
      <div class="tab-pane fade" id="resources-tab-pane" role="tabpanel" aria-labelledby="resources-tab" tabindex="0">...</div>
      <div class="tab-pane fade" id="startup-tab-pane" role="tabpanel" aria-labelledby="startup-tab" tabindex="0">...</div>
    </div>
  </div>
</template>

<style scoped>
.task-manager{
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  /*background-color: rgb(112 112 112 / 76%) !important;
  backdrop-filter: blur(68px) !important;*/
}

.iconmanager-icon{
  max-width: 15px;
  max-height: 100%;
  object-fit: contain;
  display: block;
  margin-right: 10px;
}

.tm-toolbar{
  padding: 10px;
  background: rgba(0, 0, 0, 0);
  align-self: flex-start;
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
  height: 100%;
  overflow: auto;
}

.running{
  color: rgba(114, 255, 114, 0.74);
  font-weight: 600;
}

.stopped{
  color: rgba(255, 124, 124, 0.863);
  font-weight: 600;
}

/* TableLite internal classes */
:deep(.vtl-table){
  border-collapse: separate;
  border-spacing: 0 6px;
  background: transparent !important;
}

:deep(.vtl-thead th){
  background: rgba(0, 0, 0, 0.295) !important;
  border: none !important;
  color: rgba(255,255,255,0.9) !important;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 12px !important;
}

:deep(.vtl-card){
  background-color: rgba(0, 0, 0, 0.171);
  /*height: 100%;*/
  border-radius: 10px;
}

:deep(.vtl-tbody tr){
  background: rgba(0, 0, 0, 0.05);
  transition: background 0.15s ease;
  color: rgba(255, 255, 255, 0.726);
}

:deep(.vtl-tbody tr:hover){
  background: rgba(0, 0, 0, 0.336) !important;
  color: white !important;
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
  border-radius: 6px;
  /**font-size: 16px;*/
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
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.06);
  color: rgba(255, 255, 255, 0.685);
  cursor: pointer;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  /*gap: 6px;*/
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

.nav-link.active{
  border:0;
  /*box-shadow:  
    0px -3px 10px -3px rgba(0, 0, 0, 0.336), 
    -8px 0 12px -6px rgba(0, 0, 0, 0.4), 
    8px 0 12px -6px rgba(0, 0, 0, 0.4);*/

  background-color: var(--frst-bg-light);
  color: var(--frst-font-normal);
  box-shadow: unset !important;
}

.nav-link{
  color: var(--frst-font-light);
  background-color: var(--frst-btn-main);
  margin: 0 2px;
  box-shadow: inset 0 -9px 14px -13px black;
}

.nav-tabs{
  border: 0;
  z-index: 1;
  --bs-nav-tabs-border-width: 0;
}

.tab-content{
  padding: 10px;
  background-color: var(--frst-bg-light);
  flex:1;
  /*box-shadow: 328px 4px 21px 0px black;*/
  z-index: 2;
}

.nav-link i {
  margin-right: 6px;
}

/* Base glass badge (úsalo junto con .low/.medium/.high/.extreme) */
.mem-badge{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 15.5px;
  letter-spacing: 0.2px;

  /* glass */
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  /* depth */
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.10),
    0 6px 14px rgba(0,0,0,0.22);

  color: rgba(255,255,255,0.92);
}

/* Tintes por nivel (mantienen el efecto vidrio) */
.low{
  background: linear-gradient(
    180deg,
    rgba(46, 204, 113, 0.26),
    rgba(46, 204, 113, 0.10)
  );
  border-color: rgba(46, 204, 113, 0.38);
  color: rgba(220, 255, 236, 0.95);
}

.medium{
  background: linear-gradient(
    180deg,
    rgba(241, 196, 15, 0.26),
    rgba(241, 196, 15, 0.10)
  );
  border-color: rgba(241, 196, 15, 0.38);
  color: rgba(255, 250, 210, 0.95);
}

.high{
  background: linear-gradient(
    180deg,
    rgba(230, 126, 34, 0.26),
    rgba(230, 126, 34, 0.10)
  );
  border-color: rgba(230, 126, 34, 0.38);
  color: rgba(255, 236, 220, 0.95);
}

.extreme{
  background: linear-gradient(
    180deg,
    rgba(231, 76, 60, 0.28),
    rgba(231, 76, 60, 0.10)
  );
  border-color: rgba(231, 76, 60, 0.40);
  color: rgba(255, 225, 225, 0.96);
}

/* Opcional: modo "focused" (si quieres que resalte en hover o selección) */
.mem-badge.is-hot{
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.14),
    0 10px 26px rgba(0,0,0,0.32);
  transform: translateY(-0.5px);
}

</style>