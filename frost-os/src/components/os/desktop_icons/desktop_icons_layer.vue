<script setup lang="ts">
import { inject, ref, watch, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import DesktopIcon from './desktop_icon.vue'
import { useDesktopIcons } from './desktop_icons_manager.ts'
import { App } from '../../data/app'
import { useContextMenu } from '../context_menu/context_menu.ts'
import { OS_KEY } from '../../api/os_api'

const os = inject(OS_KEY)
if (!os) throw new Error('OS API not found')

const { openMenu } = useContextMenu()

const contextMenuApps = (e: MouseEvent, app: App) => {
  openMenu(e, [
    {
      label: 'Abrir',
      icon: 'bi-box-arrow-up-right',
      action: () => os.launchApp(app.manifest.id),
    },
    {
      label: 'Eliminar acceso directo',
      icon: 'bi-trash',
      action: () => os.togglePinAppDesktop(app.manifest.id),
    },
  ])
}

const icons = useDesktopIcons({
  cellW: 110,
  cellH: 110,
  padding: 12,
  storageKey: 'frost_desktop_icons_layout_v1',
})

const ready = ref(false)

const props = defineProps<{
  pinnedApps: App[]
}>()

const containerEl = icons.containerEl

// iconRects en coordenadas relativas al desktop (para marquee)
const iconRects = reactive<Record<string, { x: number; y: number; w: number; h: number }>>({})

function rebuildIconRects() {
  for (const app of props.pinnedApps) {
    const cell = icons.layout[app.manifest.id]
    if (!cell) continue
    const pos = icons.cellToPx(cell)
    iconRects[app.manifest.id] = { x: pos.x, y: pos.y, w: 80, h: 96 }
  }
}

watch(
  [() => ready.value, () => props.pinnedApps.map((a) => a.manifest.id).join('|')],
  async ([isReady]) => {
    if (!isReady) return
    const ids = props.pinnedApps.map((a) => a.manifest.id)
    if (ids.length === 0) return

    icons.syncLayoutWithPinned(ids)

    // Limitar dentro de la pantalla sin resetear celdas
    const maxC = Math.max(0, icons.cols.value - 1)
    const maxR = Math.max(0, icons.rows.value - 1)
    for (const id of ids) {
      const cell = icons.layout[id]
      if (!cell) continue
      if (cell.col > maxC || cell.row > maxR) {
        cell.col = Math.min(cell.col, maxC)
        cell.row = Math.min(cell.row, maxR)
      }
    }

    rebuildIconRects()
    icons.saveToDb().catch(console.error)
  },
  { immediate: true }
)

const handleResize = () => {
  const ids = props.pinnedApps.map((a) => a.manifest.id)
  if (ids.length === 0) return
  icons.syncLayoutWithPinned(ids)
  rebuildIconRects()
  icons.saveToDb().catch(console.error)
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await icons.loadFromDb()
  ready.value = true
  rebuildIconRects()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const handleDesktopMove = (e: PointerEvent) => {
  icons.onDesktopPointerMove(e, iconRects)
}

const handleDesktopUp = () => {
  icons.onDesktopPointerUp()
}

const styleFor = (id: string) => {
  const cell = icons.layout[id]
  const base = icons.cellToPx(cell ?? { col: 0, row: 0 })

  const isDraggingThis = icons.isIconDragged(id)
  const dx = isDraggingThis ? icons.dragOffsetPx.x : 0
  const dy = isDraggingThis ? icons.dragOffsetPx.y : 0

  return {
    left: `${base.x}px`,
    top: `${base.y}px`,
    transform: `translate3d(${dx}px, ${dy}px, 0)`,
    zIndex: isDraggingThis ? 9999 : 1,
    transition: isDraggingThis
      ? 'none'
      : 'transform 0.16s cubic-bezier(0.2, 0.9, 0.3, 1.2), left 0.16s ease, top 0.16s ease',
  }
}

const onDblClick = (id: string) => os.launchApp(id)
</script>

<template>
  <div
    ref="containerEl"
    class="desktop-icons-layer"
    :class="{ 'is-dragging-layer': icons.isDragging.value }"
    @pointerdown="icons.onDesktopPointerDown"
    @pointermove="handleDesktopMove"
    @pointerup="handleDesktopUp"
    @pointercancel="handleDesktopUp"
  >
    <!-- Marco de selección rectangular (Marquee) -->
    <div
      v-if="icons.marqueeActive"
      class="marquee"
      :style="{
        left: icons.marquee.x + 'px',
        top: icons.marquee.y + 'px',
        width: icons.marquee.w + 'px',
        height: icons.marquee.h + 'px',
      }"
    />

    <!-- Iconos del escritorio -->
    <div
      v-for="app in props.pinnedApps"
      :key="app.manifest.id"
      class="icon-wrap"
      :class="{ 'is-dragged': icons.isIconDragged(app.manifest.id) }"
      :style="styleFor(app.manifest.id)"
      @pointerdown="(e) => icons.onIconPointerDown(e, app.manifest.id)"
      @pointermove="icons.onIconPointerMove"
      @pointerup="(e) => { icons.onIconPointerUp(e); rebuildIconRects() }"
      @pointercancel="(e) => { icons.onIconPointerUp(e); rebuildIconRects() }"
      @dblclick="() => onDblClick(app.manifest.id)"
      @contextmenu.stop.prevent="(e) => contextMenuApps(e, app)"
    >
      <DesktopIcon
        :id="app.manifest.id"
        :name="app.manifest.name"
        :icon="app.manifest.icon"
        :selected="icons.selected.has(app.manifest.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.desktop-icons-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  user-select: none;
}

.desktop-icons-layer.is-dragging-layer,
.desktop-icons-layer.is-dragging-layer * {
  cursor: grabbing !important;
}

.icon-wrap {
  position: absolute;
  width: 80px;
  will-change: transform, left, top;
  touch-action: none;
}

.icon-wrap.is-dragged {
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.45));
}

.marquee {
  position: absolute;
  pointer-events: none;
  z-index: 2;
  background: rgba(125, 214, 255, 0.28);
  border: 1px solid rgba(58, 118, 177, 0.75);
  border-radius: 2px;
  backdrop-filter: blur(1.5px);
}
</style>
