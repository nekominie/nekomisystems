import { computed, onMounted, reactive, ref } from 'vue'
import { db } from '../../../database/db.ts'

export type DesktopCell = { col: number; row: number }
export type DesktopIconLayout = Record<string, DesktopCell>

type Rect = { x: number; y: number; w: number; h: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normalizeRect(x1: number, y1: number, x2: number, y2: number): Rect {
  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  return { x, y, w: Math.abs(x1 - x2), h: Math.abs(y1 - y2) }
}

function rectsIntersect(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function useDesktopIcons(options: {
  cellW?: number
  cellH?: number
  padding?: number
  storageKey?: string
}) {
  const cellW = options.cellW ?? 96
  const cellH = options.cellH ?? 96
  const padding = options.padding ?? 12
  const storageKey = options.storageKey ?? 'desktop_layout_v1'

  const containerEl = ref<HTMLElement | null>(null)

  // Layout: appId -> cell
  const layout = reactive<DesktopIconLayout>({})

  // UI state
  const selected = reactive(new Set<string>())
  const draggingId = ref<string | null>(null)
  const dragOffsetPx = reactive({ x: 0, y: 0 })
  const dragStart = reactive({ x: 0, y: 0 })
  const dragStartCell = reactive<DesktopCell>({ col: 0, row: 0 })

  const marqueeActive = ref(false)
  const marquee = reactive<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const marqueeStart = reactive({ x: 0, y: 0 })
  const marqueeAdditive = ref(false) // ctrl/meta mientras marquee

  const cols = computed(() => {
    const el = containerEl.value
    if (!el) return 1
    return Math.max(1, Math.floor((el.clientWidth - padding * 2) / cellW))
  })

  const rows = computed(() => {
    const el = containerEl.value
    if (!el) return 1
    return Math.max(1, Math.floor((el.clientHeight - padding * 2) / cellH))
  })

  function cellToPx(cell: DesktopCell) {
    return {
      x: padding + cell.col * cellW,
      y: padding + cell.row * cellH,
    }
  }

  function pxToCell(clientX: number, clientY: number) {
  const el = containerEl.value
    if (!el) return { col: 0, row: 0 }
    const r = el.getBoundingClientRect()

    // posición del puntero relativa al desktop
    const localX = clientX - r.left - padding
    const localY = clientY - r.top - padding

    // HOTSPOT: centro del icono (ajusta 40/48 según tu icon size real)
    const hotspotX = localX + 1
    const hotspotY = localY + 1

    const col = clamp(Math.floor(hotspotX / cellW), 0, cols.value - 1)
    const row = clamp(Math.floor(hotspotY / cellH), 0, rows.value - 1)
    return { col, row }
  }

  function isCellTaken(col: number, row: number, ignoreId?: string) {
    return Object.entries(layout).some(([id, c]) => id !== ignoreId && c.col === col && c.row === row)
  }

  function findNearestFreeCell(target: DesktopCell, ignoreId?: string): DesktopCell {
    if (!isCellTaken(target.col, target.row, ignoreId)) return target

    let best = target
    let bestScore = Infinity

    const maxC = cols.value - 1
    const maxR = rows.value - 1
    const radius = 6

    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        const col = clamp(target.col + dc, 0, maxC)
        const row = clamp(target.row + dr, 0, maxR)
        if (isCellTaken(col, row, ignoreId)) continue

        const score = dc * dc + dr * dr
        if (score < bestScore) {
          bestScore = score
          best = { col, row }
        }
      }
    }

    return best
  }

  function findFirstFreeCell(ignoreId?: string): DesktopCell {
    for (let col = 0; col < cols.value; col++) {
      for (let row = 0; row < rows.value; row++) {
        if (!isCellTaken(col, row, ignoreId)) return { col, row }
      }
    }
    return { col: 0, row: 0 }
  }

  function ensureInitialPlacement(appIds: string[]) {
    for (const id of appIds) {
      if (layout[id]) continue
      layout[id] = findFirstFreeCell(id)
    }
  }
  async function loadFromDb() {
    const rows = await db.desktopIcons.toArray()
    for (const k of Object.keys(layout)) delete layout[k]
    for (const r of rows) {
      layout[r.id] = { col: r.col, row: r.row }
    }
  }

  async function saveToDb() {
    // upsert por id (bulkPut)
    const payload = Object.entries(layout).map(([id, cell]) => ({
      id,
      col: cell.col,
      row: cell.row,
    }))
    await db.desktopIcons.bulkPut(payload)
  }

  function clearSelection() {
    selected.clear()
  }

  function selectOne(id: string) {
    selected.clear()
    selected.add(id)
  }

  function toggleSelect(id: string) {
    if (selected.has(id)) selected.delete(id)
    else selected.add(id)
  }

  // --- Icon pointer handlers ---
  function onIconPointerDown(e: PointerEvent, id: string) {
    // que no dispare marquee del fondo:
    e.stopPropagation()

    const additive = e.ctrlKey || e.metaKey
    if (additive) toggleSelect(id)
    else if (!selected.has(id)) selectOne(id)

    draggingId.value = id
    dragOffsetPx.x = 0
    dragOffsetPx.y = 0
    dragStart.x = e.clientX
    dragStart.y = e.clientY
    dragStartCell.col = layout[id]?.col ?? 0
    dragStartCell.row = layout[id]?.row ?? 0

    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onIconPointerMove(e: PointerEvent) {
    if (!draggingId.value) return
    dragOffsetPx.x = e.clientX - dragStart.x
    dragOffsetPx.y = e.clientY - dragStart.y
  }

  function onIconPointerUp(e: PointerEvent) {
    const id = draggingId.value
    if (!id) return

    // Commit snap
    const target = pxToCell(e.clientX, e.clientY)
    const free = findNearestFreeCell(target, id)
    layout[id] = free
    saveToDb().catch(console.error)

    draggingId.value = null
    dragOffsetPx.x = 0
    dragOffsetPx.y = 0
  }

  // --- Desktop (background) marquee selection ---
  function onDesktopPointerDown(e: PointerEvent) {
    // solo fondo
    const el = containerEl.value
    if (!el) return
    // si diste click en algo que no sea el fondo:
    if (e.target !== el) return

    marqueeActive.value = true
    marqueeAdditive.value = e.ctrlKey || e.metaKey

    const r = el.getBoundingClientRect()
    marqueeStart.x = e.clientX - r.left
    marqueeStart.y = e.clientY - r.top
    const rect = normalizeRect(marqueeStart.x, marqueeStart.y, marqueeStart.x, marqueeStart.y)
    Object.assign(marquee, rect)

    if (!marqueeAdditive.value) selected.clear()

    el.setPointerCapture(e.pointerId)
  }

  function onDesktopPointerMove(e: PointerEvent, iconRects: Record<string, Rect>) {
    if (!marqueeActive.value || !containerEl.value) return
    const r = containerEl.value.getBoundingClientRect()
    const x2 = e.clientX - r.left
    const y2 = e.clientY - r.top
    Object.assign(marquee, normalizeRect(marqueeStart.x, marqueeStart.y, x2, y2))

    // seleccionar por intersección
    for (const [id, rect] of Object.entries(iconRects)) {
      if (rectsIntersect(marquee, rect)) selected.add(id)
      else if (!marqueeAdditive.value) selected.delete(id)
    }
  }

  function onDesktopPointerUp() {
    marqueeActive.value = false
    marquee.w = 0
    marquee.h = 0
  }

  function syncLayoutWithPinned(pinnedIds: string[]) {
  const pinnedSet = new Set(pinnedIds)

  // 1) elimina fantasmas
  for (const id of Object.keys(layout)) {
    if (!pinnedSet.has(id)) delete layout[id]
  }

  // 2) reubica colisiones (dos en misma celda) y agrega faltantes
  const seen = new Set<string>() // key "c,r"

  for (const id of pinnedIds) {
    if (!layout[id]) {
      layout[id] = findFirstFreeCell(id)
    }

    const c = layout[id]
    const key = `${c.col},${c.row}`

    if (seen.has(key)) {
      layout[id] = findFirstFreeCell(id)
    }
    seen.add(`${layout[id].col},${layout[id].row}`)
  }
  }

  onMounted(() => {
    loadFromDb().catch(console.error)
  })

  return {
    containerEl,
    cellW, cellH, padding,
    layout,
    selected,
    cols, rows,
    cellToPx,
    ensureInitialPlacement,
    saveToDb,
    syncLayoutWithPinned,
    findFirstFreeCell,

    // drag
    draggingId,
    dragOffsetPx,
    onIconPointerDown,
    onIconPointerMove,
    onIconPointerUp,

    // marquee
    marqueeActive,
    marquee,
    onDesktopPointerDown,
    onDesktopPointerMove,
    onDesktopPointerUp,

    // selection helpers
    clearSelection,
    selectOne,
    toggleSelect,

    loadFromDb
  }
}
