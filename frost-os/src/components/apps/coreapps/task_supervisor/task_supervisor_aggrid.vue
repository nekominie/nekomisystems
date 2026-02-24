<script setup lang="ts">
import { computed, ref } from 'vue'
import { AgGridVue } from 'ag-grid-vue3'

import { themeQuartz } from 'ag-grid-community';

// Definimos el tema de Frost OS usando la API
const frostTheme = themeQuartz.withParams({
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    foregroundColor: '#ffffff',
    headerBackgroundColor: 'rgba(255, 255, 255, 0.1)',
    //headerForegroundColor: '#ade8f4', // Azul hielo
    //rowBorderColor: 'rgba(255, 255, 255, 0.1)',
    fontSize: '13px',
    wrapperBorderRadius: '12px',
});

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

// asumiendo que inyectas os
import { inject } from 'vue'
import { OS_KEY } from '../../../api/os_api'
const os = inject(OS_KEY)!
if (!os) throw new Error('OS API not found')

const quickFilter = ref('')

const rowData = computed<ProcessRow[]>(() => {
  const now = Date.now()

  const apps = os.state.apps.map((a: any) => ({
    id: a.manifest.id,
    name: a.manifest.name,
    type: 'app' as const,
    state: a.runtime.isRunning ? (a.runtime.isMinimized ? 'Running (Minimized)' : 'Running') : 'Stopped',
    window: a.runtime.isWindowOpen ? 'Yes' : 'No',
    tray: a.runtime.isInTray ? 'Yes' : 'No',
    uptimeSec: a.runtime.stats?.startedAt ? Math.floor((now - a.runtime.stats.startedAt) / 1000) : 0,
    cpuMs5s: a.runtime.stats?.cpuMsLast5s ?? 0,
    memScore: a.runtime.stats?.memScore ?? 0,
  }))

  const snippets = (os.state.snippets ?? []).map((s: any) => ({
    id: s.manifest.id,
    name: s.manifest.name,
    type: 'snippet' as const,
    state: s.runtime.isRunning ? (s.runtime.isVisible ? 'Visible' : 'Hidden') : 'Stopped',
    window: '—',
    tray: s.runtime.isInTray ? 'Yes' : 'No',
    uptimeSec: s.runtime.stats?.startedAt ? Math.floor((now - s.runtime.stats.startedAt) / 1000) : 0,
    cpuMs5s: s.runtime.stats?.cpuMsLast5s ?? 0,
    memScore: s.runtime.stats?.memScore ?? 0,
  }))

  return [...apps, ...snippets]
})

const columnDefs = [
  { field: 'name', headerName: 'Process', flex: 1, sortable: true, filter: true },
  { field: 'type', headerName: 'Type', width: 110, sortable: true, filter: true },
  { field: 'state', headerName: 'Status', flex: 1, sortable: true, filter: true },
  { field: 'window', headerName: 'Window', width: 110, sortable: true, filter: true },
  { field: 'tray', headerName: 'Tray', width: 90, sortable: true, filter: true },

  {
    field: 'cpuMs5s',
    headerName: 'CPU (ms/5s)',
    width: 140,
    sortable: true,
    valueFormatter: (p: any) => `${Math.round(p.value)}`
  },
  {
    field: 'memScore',
    headerName: 'Memory (score)',
    width: 150,
    sortable: true,
    valueFormatter: (p: any) => `${Math.round(p.value)}`
  },
  {
    field: 'uptimeSec',
    headerName: 'Uptime',
    width: 110,
    sortable: true,
    valueFormatter: (p: any) => {
      const s = Number(p.value || 0)
      const m = Math.floor(s / 60)
      const ss = s % 60
      return `${m}:${String(ss).padStart(2, '0')}`
    }
  },
  {
    headerName: 'Actions',
    width: 220,
    cellRenderer: (params: any) => {
      const btn = (label: string) =>
        `<button class="tm-btn" data-act="${label}">${label}</button>`
      return `
        <div class="tm-actions">
          ${btn('Focus')}
          ${btn('End')}
          ${btn('Toggle Tray')}
        </div>
      `
    }
  }
]

const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: true,
}

function onCellClicked(e: any) {
  if (e.colDef.headerName !== 'Actions') return
  const act = e.event?.target?.getAttribute?.('data-act')
  if (!act) return

  const id = e.data.id
  const type = e.data.type

  if (act === 'Focus') {
    if (type === 'app') os.bringToFront(id)
    if (type === 'snippet') os.showSnippet(id)
  }

  if (act === 'End') {
    if (type === 'app') os.closeApp(id)
    if (type === 'snippet') os.hideSnippet(id) // o stopSnippet si lo separas
  }

  if (act === 'Toggle Tray') {
    if (type === 'app') {
      // ejemplo: lo implementas en OS
      //os.toggleTray?.(id)
    }
  }
}
</script>

<template>
  <div class="task-manager">
    <div class="tm-grid">
      <AgGridVue
        style="height: 100%;"
        :theme="frostTheme" 
        :rowData="rowData"
        :columnDefs="columnDefs"
        :defaultColDef="defaultColDef"
        :quickFilterText="quickFilter"
        @cell-clicked="onCellClicked"
        rowSelection="single"
        animateRows
      />
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
  display: flex;
  gap: 10px;
  padding: 10px;
}
.tm-search{
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(0,0,0,0.25);
  color: white;
  outline: none;
}
.tm-grid{
  flex: 1;
  min-height: 0;
  width: 100%;
  height: 100%; /* Fuerza a que ocupe el espacio del flex-grow */
  min-height: 200px; /* Evita que desaparezca si el flex falla */
}

/* botones dentro de celdas */
:global(.tm-actions){
  display: flex;
  gap: 6px;
}
:global(.tm-btn){
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.15);
  background: rgba(255,255,255,0.10);
  color: white;
  cursor: pointer;
}
:global(.tm-btn:hover){
  background: rgba(255,255,255,0.18);
}
</style>