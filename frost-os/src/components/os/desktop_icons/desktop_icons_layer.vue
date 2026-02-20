<script setup lang="ts">
import { inject, ref, watch, onMounted, reactive, nextTick } from 'vue'
import DesktopIcon from './desktop_icon.vue'
import { useDesktopIcons } from './desktop_icons_manager.ts'
import { App } from '../../data/app'
import { useContextMenu } from '../context_menu/context_menu.ts'
import { OS_KEY } from '../../api/os_api'

const os = inject(OS_KEY)
if(!os) throw new Error('OS API not found')

const { openMenu } = useContextMenu()

const contextMenuApps = (e: MouseEvent, app: App) => {
    openMenu(e, [
        { 
            label: 'Abrir', icon: '', action: () => os.launchApp(app.manifest.id) 
        },
        {
            label: 'Eliminar acceso directo', icon: 'bi-trash', action: () => os.togglePinAppDesktop(app.manifest.id)
        }
    ])
}

const icons = useDesktopIcons({
  cellW: 110,
  cellH: 110,
  padding: 12,
  storageKey: 'desktop_layout_v1',
})

const ready = ref(false)

onMounted(async () => {
  await nextTick()
  await icons.loadFromDb()
  ready.value = true
})

const props = defineProps<{
  pinnedApps: App[]
}>()

const containerEl = icons.containerEl

watch(
  [() => ready.value, () => props.pinnedApps.map(a => a.manifest.id).join('|')],
  async ([isReady]) => {
    if (!isReady) return
    await nextTick()

    const ids = props.pinnedApps.map(a => a.manifest.id)

    icons.syncLayoutWithPinned(ids)

    // clamp por responsividad
    for (const id of ids) {
      const cell = icons.layout[id]
      if (!cell) continue
      if (cell.col >= icons.cols.value || cell.row >= icons.rows.value) {
        icons.layout[id] = icons.findFirstFreeCell(id)
      }
    }

    rebuildIconRects()
    icons.saveToDb().catch(console.error)
  },
  { immediate: true }
)

window.addEventListener('resize', () => {
  const ids = props.pinnedApps.map(a => a.manifest.id)
  icons.syncLayoutWithPinned(ids)
  icons.saveToDb().catch(console.error)
})

// iconRects en coords relativas al desktop (para marquee)
const iconRects = reactive<Record<string, { x: number; y: number; w: number; h: number }>>({})

function rebuildIconRects() {
  // rect basado en celda (rápido y suficiente)
  for (const app of props.pinnedApps) {
    const cell = icons.layout[app.manifest.id]
    if (!cell) continue
    const pos = icons.cellToPx(cell)
    iconRects[app.manifest.id] = { x: pos.x, y: pos.y, w: 80, h: 96 } // aprox: icon width + label
  }
}

const handleDesktopMove = (e: PointerEvent) => {
  icons.onDesktopPointerMove(e, iconRects)
}

const handleDesktopUp = () => {
  icons.onDesktopPointerUp()
}

const styleFor = (id: string) => {
  const cell = icons.layout[id]
  const base = icons.cellToPx(cell ?? { col: 0, row: 0 })

  const isDragging = icons.draggingId.value === id
  const dx = isDragging ? icons.dragOffsetPx.x : 0
  const dy = isDragging ? icons.dragOffsetPx.y : 0

  // transform para drag suave sin recalcular top/left
  return {
    left: `${base.x}px`,
    top: `${base.y}px`,
    transform: `translate(${dx}px, ${dy}px)`,
    zIndex: isDragging ? 9999 : 1,
  }
}

const onDblClick = (id: string) => os.launchApp(id)
</script>

<template>
  <!-- OJO: este div ES el fondo para marquee: ref + handlers -->
  <div
    ref="containerEl"
    class="desktop-icons-layer"
    @pointerdown="icons.onDesktopPointerDown"
    @pointermove="handleDesktopMove"
    @pointerup="handleDesktopUp"
    @pointercancel="handleDesktopUp"
  >
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

    <div
      v-for="app in props.pinnedApps"
      :key="app.manifest.id"
      class="icon-wrap"
      :style="styleFor(app.manifest.id)"
      @pointerdown="(e) => { icons.onIconPointerDown(e, app.manifest.id) }"
      @pointermove="icons.onIconPointerMove"
      @pointerup="(e) => { icons.onIconPointerUp(e); rebuildIconRects() }"
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
.desktop-icons-layer{
  position: absolute;
  inset: 0;
  /* por defecto debajo de ventanas; si lo quieres arriba cambia z-index */
  z-index: 0;
}

.icon-wrap{
  position: absolute;
  width: 80px;
  will-change: transform;
}

.marquee{
  position: absolute;
  pointer-events: none;
  z-index: 2;

  /*background: rgba(0, 120, 215, 0.15);
  border: 1px solid rgba(0, 120, 215, 0.55);*/

  background: rgb(125 214 255 / 31%);
  border: 1px solid rgb(58 118 177 / 68%);
  /*border-radius: 8px;*/
  backdrop-filter: blur(2px);
  /*box-shadow: 0 0 10px white;*/

}
</style>
