import { computed, onMounted, reactive, ref } from 'vue'
import { db } from '../../../database/db.ts'

export type DesktopCell = { col: number; row: number }
export type DesktopIconLayout = Record<string, DesktopCell>

export type Rect = { x: number; y: number; w: number; h: number }

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
  const cellW = options.cellW ?? 110
  const cellH = options.cellH ?? 110
  const padding = options.padding ?? 12
  const storageKey = options.storageKey ?? 'frost_desktop_icons_layout_v1'

  const containerEl = ref<HTMLElement | null>(null)

  // Layout: appId -> cell
  const layout = reactive<DesktopIconLayout>({})

  // Carga síncrona inmediata desde localStorage para evitar flashes y reseteos
  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && typeof parsed === 'object') {
          for (const [id, cell] of Object.entries(parsed)) {
            const c = cell as DesktopCell
            if (typeof c.col === 'number' && typeof c.row === 'number') {
              layout[id] = { col: c.col, row: c.row }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[DesktopIcons] Error al cargar layout desde localStorage:', err)
    }
  }

  // Cargar inmediatamente
  loadFromStorage()

  // Estado de selección
  const selected = reactive(new Set<string>())

  // Estado de arrastre (compatible con arrastre múltiple en grupo)
  const isDragging = ref(false)
  const draggingId = ref<string | null>(null)
  const draggedIds = ref<string[]>([])
  const dragOffsetPx = reactive({ x: 0, y: 0 })
  const dragStart = reactive({ x: 0, y: 0 })
  const initialCells = new Map<string, DesktopCell>()

  let capturedEl: HTMLElement | null = null
  let capturedPointerId: number | null = null

  // Estado de selección rectangular (marquee)
  const marqueeActive = ref(false)
  const marquee = reactive<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const marqueeStart = reactive({ x: 0, y: 0 })
  const marqueeAdditive = ref(false)

  // Columnas y filas dinámicas con fallback a dimensiones de ventana
  const cols = computed(() => {
    const el = containerEl.value
    const width = el && el.clientWidth > 0 ? el.clientWidth : window.innerWidth
    return Math.max(1, Math.floor((width - padding * 2) / cellW))
  })

  const rows = computed(() => {
    const el = containerEl.value
    const height = el && el.clientHeight > 0 ? el.clientHeight : Math.max(200, window.innerHeight - 48)
    return Math.max(1, Math.floor((height - padding * 2) / cellH))
  })

  function cellToPx(cell: DesktopCell) {
    return {
      x: padding + cell.col * cellW,
      y: padding + cell.row * cellH,
    }
  }

  function pxToCell(clientX: number, clientY: number) {
    const el = containerEl.value
    const r = el ? el.getBoundingClientRect() : { left: 0, top: 0 }

    const localX = clientX - r.left - padding
    const localY = clientY - r.top - padding

    const col = clamp(Math.floor(localX / cellW), 0, cols.value - 1)
    const row = clamp(Math.floor(localY / cellH), 0, rows.value - 1)
    return { col, row }
  }

  function isCellTaken(col: number, row: number, ignoreIds: string[] = []) {
    const ignoreSet = new Set(ignoreIds)
    return Object.entries(layout).some(([id, c]) => !ignoreSet.has(id) && c.col === col && c.row === row)
  }

  function findNearestFreeCellForSet(target: DesktopCell, occupiedSet: Set<string>): DesktopCell {
    const key = `${target.col},${target.row}`
    if (!occupiedSet.has(key)) return target

    const maxC = Math.max(0, cols.value - 1)
    const maxR = Math.max(0, rows.value - 1)
    const maxRadius = Math.max(maxC, maxR)

    let best = target
    let bestScore = Infinity

    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dc = -radius; dc <= radius; dc++) {
        for (let dr = -radius; dr <= radius; dr++) {
          if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue
          const col = clamp(target.col + dc, 0, maxC)
          const row = clamp(target.row + dr, 0, maxR)
          const testKey = `${col},${row}`
          if (occupiedSet.has(testKey)) continue

          const score = dc * dc + dr * dr
          if (score < bestScore) {
            bestScore = score
            best = { col, row }
          }
        }
      }
      if (bestScore < Infinity) {
        return best
      }
    }

    // Fallback: primera celda libre
    for (let c = 0; c <= maxC; c++) {
      for (let r = 0; r <= maxR; r++) {
        if (!occupiedSet.has(`${c},${r}`)) {
          return { col: c, row: r }
        }
      }
    }

    return target
  }

  function findFirstFreeCell(ignoreId?: string): DesktopCell {
    const maxC = Math.max(0, cols.value - 1)
    const maxR = Math.max(0, rows.value - 1)
    for (let col = 0; col <= maxC; col++) {
      for (let row = 0; row <= maxR; row++) {
        if (!isCellTaken(col, row, ignoreId ? [ignoreId] : [])) return { col, row }
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
    loadFromStorage()
    try {
      const rowsDb = await db.desktopIcons.toArray()
      if (rowsDb.length > 0) {
        for (const r of rowsDb) {
          layout[r.id] = { col: r.col, row: r.row }
        }
        localStorage.setItem(storageKey, JSON.stringify(layout))
      } else if (Object.keys(layout).length > 0) {
        await saveToDb()
      }
    } catch (err) {
      console.warn('[DesktopIcons] Error al cargar desde IndexedDB:', err)
    }
  }

  async function saveToDb() {
    try {
      // 1. Guardar síncronamente en localStorage
      localStorage.setItem(storageKey, JSON.stringify(layout))

      // 2. Guardar en IndexedDB
      const payload = Object.entries(layout).map(([id, cell]) => ({
        id,
        col: cell.col,
        row: cell.row,
      }))
      if (payload.length > 0) {
        await db.desktopIcons.bulkPut(payload)
      }
    } catch (err) {
      console.error('[DesktopIcons] Error al guardar layout en DB:', err)
    }
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

  function isIconDragged(id: string): boolean {
    return isDragging.value && (draggedIds.value.includes(id) || draggingId.value === id)
  }

  // --- Handlers de puntero sobre iconos ---
  function onIconPointerDown(e: PointerEvent, id: string) {
    if (e.button !== 0) return
    e.stopPropagation()

    const additive = e.ctrlKey || e.metaKey || e.shiftKey
    if (additive) {
      toggleSelect(id)
    } else if (!selected.has(id)) {
      selectOne(id)
    }

    draggingId.value = id
    isDragging.value = false
    dragOffsetPx.x = 0
    dragOffsetPx.y = 0
    dragStart.x = e.clientX
    dragStart.y = e.clientY

    // Si el icono tocado forma parte de la selección múltiple, mover toda la selección junta
    if (selected.has(id)) {
      draggedIds.value = Array.from(selected)
    } else {
      draggedIds.value = [id]
    }

    // Guardar las celdas iniciales de todos los iconos arrastrados
    initialCells.clear()
    for (const appId of draggedIds.value) {
      const c = layout[appId]
      initialCells.set(appId, c ? { col: c.col, row: c.row } : { col: 0, row: 0 })
    }
  }

  function onIconPointerMove(e: PointerEvent) {
    if (!draggingId.value) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    dragOffsetPx.x = dx
    dragOffsetPx.y = dy

    if (!isDragging.value && Math.hypot(dx, dy) >= 4) {
      isDragging.value = true
    }
  }

  function onIconPointerUp(e: PointerEvent) {
    if (!draggingId.value) return

    try {
      if (capturedEl && capturedPointerId !== null) {
        capturedEl.releasePointerCapture(capturedPointerId)
      }
    } catch {
      /* noop */
    }
    capturedEl = null
    capturedPointerId = null

    const didDrag = isDragging.value && Math.hypot(dragOffsetPx.x, dragOffsetPx.y) >= 4
    const additive = e.ctrlKey || e.metaKey || e.shiftKey

    if (!didDrag) {
      // Si fue solo un clic sin arrastrar sobre un elemento que ya estaba seleccionado
      if (!additive && selected.size > 1) {
        selectOne(draggingId.value)
      }
    } else {
      // Se realizó un arrastre: calcular desplazamiento de celda (col, row)
      const dCol = Math.round(dragOffsetPx.x / cellW)
      const dRow = Math.round(dragOffsetPx.y / cellH)

      if (dCol !== 0 || dRow !== 0) {
        let deltaCol = dCol
        let deltaRow = dRow

        let minCol = Infinity
        let maxCol = -Infinity
        let minRow = Infinity
        let maxRow = -Infinity

        for (const appId of draggedIds.value) {
          const init = initialCells.get(appId)
          if (!init) continue
          const tc = init.col + deltaCol
          const tr = init.row + deltaRow
          if (tc < minCol) minCol = tc
          if (tc > maxCol) maxCol = tc
          if (tr < minRow) minRow = tr
          if (tr > maxRow) maxRow = tr
        }

        const maxAllowedCol = Math.max(0, cols.value - 1)
        const maxAllowedRow = Math.max(0, rows.value - 1)

        // Limitar dentro de la pantalla manteniendo la forma del grupo
        if (minCol < 0) {
          deltaCol += -minCol
        }
        const proposedMaxCol = maxCol + (minCol < 0 ? -minCol : 0)
        if (proposedMaxCol > maxAllowedCol) {
          deltaCol -= (proposedMaxCol - maxAllowedCol)
        }

        if (minRow < 0) {
          deltaRow += -minRow
        }
        const proposedMaxRow = maxRow + (minRow < 0 ? -minRow : 0)
        if (proposedMaxRow > maxAllowedRow) {
          deltaRow -= (proposedMaxRow - maxAllowedRow)
        }

        // Celdas ocupadas por iconos que no se movieron
        const occupied = new Set<string>()
        for (const [appId, cell] of Object.entries(layout)) {
          if (!draggedIds.value.includes(appId)) {
            occupied.add(`${cell.col},${cell.row}`)
          }
        }

        // Asignar nuevas posiciones a los iconos arrastrados
        for (const appId of draggedIds.value) {
          const init = initialCells.get(appId)
          if (!init) continue
          const targetCol = clamp(init.col + deltaCol, 0, maxAllowedCol)
          const targetRow = clamp(init.row + deltaRow, 0, maxAllowedRow)
          const resolved = findNearestFreeCellForSet({ col: targetCol, row: targetRow }, occupied)
          layout[appId] = resolved
          occupied.add(`${resolved.col},${resolved.row}`)
        }

        saveToDb().catch(console.error)
      }
    }

    isDragging.value = false
    draggingId.value = null
    draggedIds.value = []
    dragOffsetPx.x = 0
    dragOffsetPx.y = 0
    initialCells.clear()
  }

  // --- Handlers de selección rectangular en el fondo ---
  function onDesktopPointerDown(e: PointerEvent) {
    if (e.button !== 0) return

    const el = containerEl.value
    if (!el) return
    const target = e.target as HTMLElement | null
    if (target && target.closest('.icon-wrap')) return

    marqueeActive.value = true
    marqueeAdditive.value = e.ctrlKey || e.metaKey || e.shiftKey

    const r = el.getBoundingClientRect()
    marqueeStart.x = e.clientX - r.left
    marqueeStart.y = e.clientY - r.top
    const rect = normalizeRect(marqueeStart.x, marqueeStart.y, marqueeStart.x, marqueeStart.y)
    Object.assign(marquee, rect)

    if (!marqueeAdditive.value) selected.clear()

    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }

  function onDesktopPointerMove(e: PointerEvent, iconRects: Record<string, Rect>) {
    if (!marqueeActive.value || !containerEl.value) return
    const r = containerEl.value.getBoundingClientRect()
    const x2 = e.clientX - r.left
    const y2 = e.clientY - r.top
    Object.assign(marquee, normalizeRect(marqueeStart.x, marqueeStart.y, x2, y2))

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
    if (!pinnedIds || pinnedIds.length === 0) return

    const pinnedSet = new Set(pinnedIds)

    // 1) Eliminar apps desancladas
    for (const id of Object.keys(layout)) {
      if (!pinnedSet.has(id)) delete layout[id]
    }

    // 2) Reubicar colisiones y asegurar ubicación para todas las apps ancladas
    const seen = new Set<string>()

    for (const id of pinnedIds) {
      if (!layout[id]) continue
      const c = layout[id]
      const key = `${c.col},${c.row}`
      if (seen.has(key)) {
        layout[id] = findFirstFreeCell(id)
      }
      seen.add(`${layout[id].col},${layout[id].row}`)
    }

    for (const id of pinnedIds) {
      if (!layout[id]) {
        layout[id] = findFirstFreeCell(id)
        seen.add(`${layout[id].col},${layout[id].row}`)
      }
    }
  }

  // Ubicar iconos en una posición de pantalla específica (Drag & Drop desde explorador o recolocación)
  function placeIconsAt(ids: string[], clientX: number, clientY: number) {
    if (!ids || ids.length === 0) return
    const startCell = pxToCell(clientX, clientY)
    const maxAllowedCol = Math.max(0, cols.value - 1)
    const maxAllowedRow = Math.max(0, rows.value - 1)

    // Celdas ocupadas por iconos que no están en `ids`
    const occupied = new Set<string>()
    for (const [id, cell] of Object.entries(layout)) {
      if (!ids.includes(id)) {
        occupied.add(`${cell.col},${cell.row}`)
      }
    }

    let offsetRow = 0
    let offsetCol = 0
    for (const id of ids) {
      const targetCol = clamp(startCell.col + offsetCol, 0, maxAllowedCol)
      const targetRow = clamp(startCell.row + offsetRow, 0, maxAllowedRow)

      const freeCell = findNearestFreeCellForSet({ col: targetCol, row: targetRow }, occupied)
      layout[id] = freeCell
      occupied.add(`${freeCell.col},${freeCell.row}`)

      offsetRow++
      if (startCell.row + offsetRow > maxAllowedRow) {
        offsetRow = 0
        offsetCol++
      }
    }

    saveToDb().catch(console.error)
  }

  // Eliminar icono del layout cuando se traslada fuera del escritorio
  function removeIconLayout(id: string) {
    if (layout[id]) {
      delete layout[id]
      selected.delete(id)
      saveToDb().catch(console.error)
    }
  }

  onMounted(() => {
    loadFromDb().catch(console.error)
  })

  return {
    containerEl,
    cellW,
    cellH,
    padding,
    layout,
    selected,
    cols,
    rows,
    cellToPx,
    pxToCell,
    ensureInitialPlacement,
    saveToDb,
    syncLayoutWithPinned,
    findFirstFreeCell,
    placeIconsAt,
    removeIconLayout,

    // Arrastre simple y múltiple
    isDragging,
    draggingId,
    draggedIds,
    dragOffsetPx,
    isIconDragged,
    onIconPointerDown,
    onIconPointerMove,
    onIconPointerUp,

    // Selección por marco (Marquee)
    marqueeActive,
    marquee,
    onDesktopPointerDown,
    onDesktopPointerMove,
    onDesktopPointerUp,

    // Helpers de selección
    clearSelection,
    selectOne,
    toggleSelect,

    loadFromDb,
  }
}
