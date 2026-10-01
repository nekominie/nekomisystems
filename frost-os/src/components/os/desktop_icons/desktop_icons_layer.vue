<script setup lang="ts">
import { inject, ref, watch, onMounted, onUnmounted, reactive, computed } from 'vue'
import DesktopIcon from './desktop_icon.vue'
import { useDesktopIcons } from './desktop_icons_manager.ts'
import { useContextMenu } from '../context_menu/context_menu.ts'
import { OS_KEY } from '../../api/os_api'
import { useFileSystemStore } from '../../apps/installedapps/explorer/file_system_store'
import { usePhotosStore } from '../../apps/installedapps/photos/photos_store'
import { usePdfViewerStore } from '../../apps/installedapps/pdf_viewer/pdf_viewer_store'
import { isImageFile } from '../../apps/installedapps/explorer/thumbnail_utils'
import type { FileItem } from '../../../database/db'
import { db } from '../../../database/db'

const os = inject(OS_KEY)
if (!os) throw new Error('OS API not found')

const fs = useFileSystemStore()
const photosStore = usePhotosStore()
const pdfViewerStore = usePdfViewerStore()
const { openMenu } = useContextMenu()

const desktopItems = computed<FileItem[]>(() => {
  return fs.allItems.filter((item) => item.parentId === 'desktop')
})

const icons = useDesktopIcons({
  cellW: 110,
  cellH: 110,
  padding: 12,
  storageKey: 'frost_desktop_icons_layout_v1',
})

const ready = ref(false)
const containerEl = icons.containerEl

// iconRects en coordenadas relativas al desktop (para marquee)
const iconRects = reactive<Record<string, { x: number; y: number; w: number; h: number }>>({})

function rebuildIconRects() {
  for (const item of desktopItems.value) {
    const cell = icons.layout[item.id]
    if (!cell) continue
    const pos = icons.cellToPx(cell)
    iconRects[item.id] = { x: pos.x, y: pos.y, w: 80, h: 96 }
  }
}

watch(
  [() => ready.value, () => desktopItems.value.map((a) => a.id).join('|')],
  async ([isReady]) => {
    if (!isReady) return
    const ids = desktopItems.value.map((a) => a.id)
    if (ids.length === 0) return

    // Migración de IDs antiguos si existen (ej: 'discord' -> 'shortcut-discord')
    for (const id of ids) {
      if (!icons.layout[id]) {
        const bareAppId = id.replace(/^shortcut-/, '')
        if (icons.layout[bareAppId]) {
          icons.layout[id] = { ...icons.layout[bareAppId] }
          delete icons.layout[bareAppId]
        }
      }
    }

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
  const ids = desktopItems.value.map((a) => a.id)
  if (ids.length === 0) return
  icons.syncLayoutWithPinned(ids)
  rebuildIconRects()
  icons.saveToDb().catch(console.error)
}

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await fs.loadAllFiles()
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

const onDblClick = (item: FileItem) => {
  const isShortcut = item.type === 'shortcut' || item.extension === 'lnk' || !!item.appId || !!item.shortcutTarget?.appId
  const appId = item.appId || item.shortcutTarget?.appId

  if (isShortcut && appId) {
    os.launchApp(appId)
    return
  }

  if (item.type === 'folder') {
    fs.navigateTo(item.id)
    os.launchApp('explorer')
    return
  }

  if (isImageFile(item)) {
    photosStore.openPhotoFromFile(item)
    os.launchApp('photos')
    return
  }

  const isPdf = item.extension?.toLowerCase() === 'pdf' || /\.pdf$/i.test(item.name) || item.mimeType === 'application/pdf'
  if (isPdf) {
    pdfViewerStore.openPdfFromFile(item)
    os.launchApp('pdf_viewer')
    return
  }

  // Texto u otro archivo
  fs.openItem(item)
  os.launchApp('explorer')
}

const contextMenuItem = (e: MouseEvent, item: FileItem) => {
  const isShortcut = item.type === 'shortcut' || item.extension === 'lnk' || !!item.appId || !!item.shortcutTarget?.appId
  const appId = item.appId || item.shortcutTarget?.appId
  const isFolder = item.type === 'folder'
  const isImg = isImageFile(item)
  const isPdf = item.extension?.toLowerCase() === 'pdf' || /\.pdf$/i.test(item.name) || item.mimeType === 'application/pdf'

  const menuItems: any[] = []

  if (isShortcut && appId) {
    menuItems.push({
      label: 'Abrir',
      icon: 'bi-box-arrow-up-right',
      action: () => os.launchApp(appId),
    })
    menuItems.push({ separator: true })
    menuItems.push({
      label: 'Eliminar acceso directo',
      icon: 'bi-trash3-fill text-danger',
      action: async () => {
        await fs.deleteItems([item.id])
        const app = os.state.apps.find((a) => a.manifest.id === appId)
        if (app) {
          app.user.isPinnedDesktop = false
          await db.appSettings.put({
            id: appId,
            isPinned: app.user.isPinned,
            isPinnedStart: app.user.isPinnedStart,
            isPinnedDesktop: false,
            overrides: app.user.overrides ? { ...app.user.overrides } : undefined,
          })
        }
      },
    })
  } else if (isFolder) {
    menuItems.push({
      label: 'Abrir',
      icon: 'bi-folder2-open',
      action: () => {
        fs.navigateTo(item.id)
        os.launchApp('explorer')
      },
    })
    menuItems.push({ separator: true })
    menuItems.push({
      label: 'Eliminar',
      icon: 'bi-trash3-fill text-danger',
      action: () => fs.deleteItems([item.id]),
    })
  } else {
    // Archivo normal
    if (isImg) {
      menuItems.push({
        label: 'Abrir con Fotos',
        icon: 'bi-images text-danger',
        action: () => {
          photosStore.openPhotoFromFile(item)
          os.launchApp('photos')
        },
      })
    } else if (isPdf) {
      menuItems.push({
        label: 'Abrir con PDF Viewer',
        icon: 'bi-file-earmark-pdf-fill text-danger',
        action: () => {
          pdfViewerStore.openPdfFromFile(item)
          os.launchApp('pdf_viewer')
        },
      })
    } else {
      menuItems.push({
        label: 'Abrir',
        icon: 'bi-box-arrow-up-right',
        action: () => {
          fs.openItem(item)
          os.launchApp('explorer')
        },
      })
    }
    menuItems.push({ separator: true })
    menuItems.push({
      label: 'Descargar',
      icon: 'bi-download',
      action: () => fs.downloadFile(item),
    })
    menuItems.push({
      label: 'Eliminar',
      icon: 'bi-trash3-fill text-danger',
      action: () => fs.deleteItems([item.id]),
    })
  }

  openMenu(e, menuItems)
}
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
      v-for="item in desktopItems"
      :key="item.id"
      class="icon-wrap"
      :class="{ 'is-dragged': icons.isIconDragged(item.id) }"
      :style="styleFor(item.id)"
      @pointerdown="(e) => icons.onIconPointerDown(e, item.id)"
      @pointermove="icons.onIconPointerMove"
      @pointerup="(e) => { icons.onIconPointerUp(e); rebuildIconRects() }"
      @pointercancel="(e) => { icons.onIconPointerUp(e); rebuildIconRects() }"
      @dblclick="() => onDblClick(item)"
      @contextmenu.stop.prevent="(e) => contextMenuItem(e, item)"
    >
      <DesktopIcon
        :id="item.appId || item.shortcutTarget?.appId || item.id"
        :name="item.name.replace(/\.lnk$/i, '')"
        :selected="icons.selected.has(item.id)"
        :isShortcut="item.type === 'shortcut' || item.extension === 'lnk' || !!item.appId"
        :isFolder="item.type === 'folder'"
        :iconClass="fs.getFileIcon(item)"
        :thumbnail="isImageFile(item) ? fs.getThumbnail(item) : null"
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
