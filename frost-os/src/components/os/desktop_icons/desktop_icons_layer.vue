<script setup lang="ts">
import { ref, watch, computed, onMounted, reactive, nextTick } from 'vue'
import DesktopIcon from './desktop_icon.vue'
import { useDesktopIcons } from './desktop_icons_manager.ts'

type InstalledApp = {
  id: string
  name: string
  icon: string
  isPinnedDesktop?: boolean
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
  pinnedApps: InstalledApp[]
}>()

const emit = defineEmits<{
  (e: 'open', appId: string): void
}>()

const containerEl = icons.containerEl

watch(
  [() => ready.value, () => props.pinnedApps.map(a => a.id).join('|')],
  async ([isReady]) => {
    if (!isReady) return
    await nextTick()

    const ids = props.pinnedApps.map(a => a.id)

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
  const ids = props.pinnedApps.map(a => a.id)
  icons.syncLayoutWithPinned(ids)
  icons.saveToDb().catch(console.error)
})

// iconRects en coords relativas al desktop (para marquee)
const iconRects = reactive<Record<string, { x: number; y: number; w: number; h: number }>>({})

function rebuildIconRects() {
  // rect basado en celda (rápido y suficiente)
  for (const app of props.pinnedApps) {
    const cell = icons.layout[app.id]
    if (!cell) continue
    const pos = icons.cellToPx(cell)
    iconRects[app.id] = { x: pos.x, y: pos.y, w: 80, h: 96 } // aprox: icon width + label
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

const onDblClick = (id: string) => emit('open', id)
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
      :key="app.id"
      class="icon-wrap"
      :style="styleFor(app.id)"
      @pointerdown="(e) => { icons.onIconPointerDown(e, app.id) }"
      @pointermove="icons.onIconPointerMove"
      @pointerup="(e) => { icons.onIconPointerUp(e); rebuildIconRects() }"
      @dblclick="() => onDblClick(app.id)"
    >
      <DesktopIcon
        :id="app.id"
        :name="app.name"
        :icon="app.icon"
        :selected="icons.selected.has(app.id)"
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
