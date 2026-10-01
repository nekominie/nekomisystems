<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, inject } from 'vue';
import { useFileSystemStore } from '../../file_system_store';
import { useContextMenu } from '../../../../../os/context_menu/context_menu';
import { usePhotosStore } from '../../../photos/photos_store';
import { usePdfViewerStore } from '../../../pdf_viewer/pdf_viewer_store';
import { OS_KEY } from '../../../../../api/os_api';
import IconManager from '../../../../../os/iconmanager.vue';
import type { FileItem } from '../../../../../../database/db';

const fs = useFileSystemStore();
const os = inject(OS_KEY);
const photosStore = usePhotosStore();
const pdfViewerStore = usePdfViewerStore();
const { openMenu } = useContextMenu();

// Referencias del DOM
const fileInputRef = ref<HTMLInputElement | null>(null);
const mainViewportRef = ref<HTMLElement | null>(null);

// Estado de Drag & Drop
const isDraggingOver = ref(false);
let dragCounter = 0;

// Estado de renombrado
const renamingItemId = ref<string | null>(null);
const renamingItemName = ref('');

// Menús desplegables de la barra de comandos
const showNewMenu = ref(false);
const showSortMenu = ref(false);
const showViewMenu = ref(false);

onMounted(async () => {
  await fs.loadAllFiles();
  window.addEventListener('click', closeAllPopups);
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('click', closeAllPopups);
  window.removeEventListener('keydown', handleGlobalKeydown);
});

function closeAllPopups() {
  showNewMenu.value = false;
  showSortMenu.value = false;
  showViewMenu.value = false;
}

function handleGlobalKeydown(e: KeyboardEvent) {
  // Tecla Supr / Delete -> Eliminar seleccionados
  if (e.key === 'Delete' && fs.selectedIds.length > 0 && !renamingItemId.value && !fs.showTextEditor) {
    if (confirm(`¿Deseas eliminar los ${fs.selectedIds.length} elemento(s) seleccionado(s)?`)) {
      fs.deleteItems(fs.selectedIds);
    }
  }

  // Ctrl + A -> Seleccionar todo
  if (e.ctrlKey && e.key.toLowerCase() === 'a' && !fs.showTextEditor) {
    e.preventDefault();
    fs.selectAll();
  }

  // Ctrl + C -> Copiar
  if (e.ctrlKey && e.key.toLowerCase() === 'c' && !fs.showTextEditor) {
    e.preventDefault();
    fs.copySelected();
  }

  // Ctrl + X -> Cortar
  if (e.ctrlKey && e.key.toLowerCase() === 'x' && !fs.showTextEditor) {
    e.preventDefault();
    fs.cutSelected();
  }

  // Ctrl + V -> Pegar
  if (e.ctrlKey && e.key.toLowerCase() === 'v' && !fs.showTextEditor) {
    e.preventDefault();
    fs.paste();
  }

  // F2 -> Renombrar seleccionado
  if (e.key === 'F2' && fs.selectedIds.length === 1) {
    e.preventDefault();
    startRename(fs.selectedIds[0]);
  }

  // Escape -> Cancelar renombrado o selección
  if (e.key === 'Escape') {
    if (renamingItemId.value) {
      cancelRename();
    } else {
      fs.clearSelection();
    }
  }
}

// Cargar archivos (Browser File Picker)
function triggerUpload() {
  closeAllPopups();
  fileInputRef.value?.click();
}

function onFileInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    fs.uploadFiles(target.files);
    target.value = ''; // Reset input
  }
}

// Drag & Drop handlers
function onDragEnter(e: DragEvent) {
  e.preventDefault();
  dragCounter++;
  if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
    isDraggingOver.value = true;
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
}

function onDragLeave(e: DragEvent) {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    isDraggingOver.value = false;
    dragCounter = 0;
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  isDraggingOver.value = false;
  dragCounter = 0;
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    fs.uploadFiles(e.dataTransfer.files);
  }
}

// Manejadores de clics en archivos/carpetas
function onItemClick(e: MouseEvent, item: FileItem) {
  e.stopPropagation();
  closeAllPopups();

  if (renamingItemId.value === item.id) return;

  if (e.ctrlKey || e.metaKey) {
    fs.selectItem(item.id, true);
  } else if (e.shiftKey && fs.selectedIds.length > 0) {
    const items = fs.currentItems;
    const lastSelectedId = fs.selectedIds[fs.selectedIds.length - 1];
    const idx1 = items.findIndex((i) => i.id === lastSelectedId);
    const idx2 = items.findIndex((i) => i.id === item.id);
    if (idx1 !== -1 && idx2 !== -1) {
      const [start, end] = [Math.min(idx1, idx2), Math.max(idx1, idx2)];
      fs.selectedIds = items.slice(start, end + 1).map((i) => i.id);
    }
  } else {
    fs.selectItem(item.id, false);
  }
}

function isImageFile(item: FileItem): boolean {
  return (
    item.type === 'file' &&
    (!!item.mimeType?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(item.name))
  );
}

function isPdfFile(item: FileItem): boolean {
  return (
    item.type === 'file' &&
    (item.extension?.toLowerCase() === 'pdf' ||
      /\.pdf$/i.test(item.name) ||
      item.mimeType === 'application/pdf')
  );
}

function onItemDblClick(item: FileItem) {
  if (renamingItemId.value) return;

  if (item.type === 'shortcut' || item.extension === 'lnk' || item.appId || item.shortcutTarget?.appId) {
    const appId = item.appId || item.shortcutTarget?.appId;
    if (appId && os) {
      os.launchApp(appId);
      return;
    }
  }

  if (isImageFile(item)) {
    photosStore.openPhotoFromFile(item);
    if (os) os.launchApp('photos');
    return;
  }

  if (isPdfFile(item)) {
    pdfViewerStore.openPdfFromFile(item);
    if (os) os.launchApp('pdf_viewer');
    return;
  }

  fs.openItem(item);
}

function onBackgroundClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.file-item') && !target.closest('.command-btn')) {
    fs.clearSelection();
    if (renamingItemId.value) cancelRename();
  }
}

// MENÚ CONTEXTUAL GLOBAL DE FROST-OS
function onContextMenu(e: MouseEvent, item?: FileItem) {
  e.preventDefault();
  e.stopPropagation();
  closeAllPopups();

  if (item) {
    if (!fs.selectedIds.includes(item.id)) {
      fs.selectItem(item.id, false);
    }

    if (item.type === 'shortcut' || item.extension === 'lnk' || item.appId || item.shortcutTarget?.appId) {
      const appId = item.appId || item.shortcutTarget?.appId;
      openMenu(e, [
        {
          label: 'Abrir',
          icon: 'bi-box-arrow-up-right',
          action: () => {
            if (appId && os) os.launchApp(appId);
          },
        },
        { separator: true },
        {
          label: 'Eliminar acceso directo',
          icon: 'bi-trash3-fill text-danger',
          action: () => fs.deleteItems([item.id]),
        },
      ]);
      return;
    }

    const isMultiple = fs.selectedIds.length > 1;
    const isImg = isImageFile(item);
    const isPdf = isPdfFile(item);

    openMenu(e, [
      ...(isImg
        ? [
            {
              label: isMultiple ? `Abrir con Fotos (${fs.selectedIds.length})` : 'Abrir con Fotos',
              icon: 'bi-images text-danger',
              action: () => {
                photosStore.openPhotoFromFile(item);
                if (os) os.launchApp('photos');
              },
            },
          ]
        : isPdf
        ? [
            {
              label: isMultiple ? `Abrir con PDF Viewer (${fs.selectedIds.length})` : 'Abrir con PDF Viewer',
              icon: 'bi-file-earmark-pdf-fill text-danger',
              action: () => {
                pdfViewerStore.openPdfFromFile(item);
                if (os) os.launchApp('pdf_viewer');
              },
            },
          ]
        : [
            {
              label: isMultiple ? `Abrir (${fs.selectedIds.length} elementos)` : 'Abrir',
              icon: 'bi-box-arrow-up-right',
              action: () => fs.openItem(item),
            },
          ]),
      { separator: true },
      {
        label: 'Cortar',
        icon: 'bi-scissors',
        action: () => fs.cutSelected(),
      },
      {
        label: 'Copiar',
        icon: 'bi-copy',
        action: () => fs.copySelected(),
      },
      ...(item.type === 'file'
        ? [
            {
              label: 'Descargar a mi PC',
              icon: 'bi-download',
              action: () => fs.downloadFile(item),
            },
          ]
        : []),
      { separator: true },
      {
        label: 'Cambiar nombre',
        icon: 'bi-input-cursor-text',
        disabled: item.isSystem || isMultiple,
        action: () => startRename(item.id),
      },
      {
        label: isMultiple ? `Eliminar (${fs.selectedIds.length} elementos)` : 'Eliminar',
        icon: 'bi-trash3 text-danger',
        disabled: item.isSystem,
        action: () => handleDeleteSelected(),
      },
      { separator: true },
      {
        label: 'Propiedades',
        icon: 'bi-info-circle',
        action: () => handleShowProperties(item),
      },
    ]);
    return;
  }

  // Clic derecho en espacio vacío
  openMenu(e, [
    {
      label: 'Cargar archivos aquí',
      icon: 'bi-cloud-arrow-up-fill text-sky',
      action: () => triggerUpload(),
    },
    { separator: true },
    {
      label: 'Nueva carpeta',
      icon: 'bi-folder-plus text-warning',
      action: () => handleCreateFolder(),
    },
    {
      label: 'Nuevo archivo de texto',
      icon: 'bi-file-earmark-text text-info',
      action: () => handleCreateTextFile(),
    },
    {
      label: 'Nuevo documento Markdown',
      icon: 'bi-markdown text-primary',
      action: () => handleCreateMarkdownFile(),
    },
    { separator: true },
    {
      label: 'Pegar',
      icon: 'bi-clipboard',
      disabled: !fs.clipboard || fs.clipboard.itemIds.length === 0,
      action: () => fs.paste(),
    },
    { separator: true },
    {
      label: 'Ver: Cuadrícula',
      icon: 'bi-grid-fill',
      action: () => (fs.viewMode = 'grid'),
    },
    {
      label: 'Ver: Detalles',
      icon: 'bi-list-columns',
      action: () => (fs.viewMode = 'details'),
    },
    {
      label: 'Ver: Lista compacta',
      icon: 'bi-list',
      action: () => (fs.viewMode = 'list'),
    },
    { separator: true },
    {
      label: 'Seleccionar todo',
      icon: 'bi-check2-all',
      action: () => fs.selectAll(),
    },
    {
      label: 'Actualizar',
      icon: 'bi-arrow-clockwise',
      action: () => fs.loadAllFiles(),
    },
  ]);
}

// Renombrado
function startRename(id: string) {
  closeAllPopups();
  const item = fs.allItems.find((i) => i.id === id);
  if (!item || item.isSystem) return;
  renamingItemId.value = id;
  renamingItemName.value = item.name;
}

async function confirmRename() {
  if (renamingItemId.value && renamingItemName.value.trim()) {
    await fs.renameItem(renamingItemId.value, renamingItemName.value);
  }
  renamingItemId.value = null;
  renamingItemName.value = '';
}

function cancelRename() {
  renamingItemId.value = null;
  renamingItemName.value = '';
}

// Acciones desde barra o menú contextual
async function handleCreateFolder() {
  closeAllPopups();
  const folder = await fs.createFolder();
  startRename(folder.id);
}

async function handleCreateTextFile() {
  closeAllPopups();
  const file = await fs.createTextFile();
  startRename(file.id);
}

async function handleCreateMarkdownFile() {
  closeAllPopups();
  const file = await fs.createTextFile('Nuevo documento', '# Título\n\nEscribe tu contenido aquí.');
  startRename(file.id);
}

function handleDeleteSelected() {
  closeAllPopups();
  const count = fs.selectedIds.length;
  if (count === 0) return;
  if (confirm(`¿Estás seguro de que deseas eliminar ${count} elemento(s)?`)) {
    fs.deleteItems(fs.selectedIds);
  }
}

function handleDownloadSelected() {
  closeAllPopups();
  const selectedItems = fs.allItems.filter((i) => fs.selectedIds.includes(i.id) && i.type === 'file');
  for (const item of selectedItems) {
    fs.downloadFile(item);
  }
}

function handleShowProperties(item?: FileItem) {
  closeAllPopups();
  const target = item || fs.allItems.find((i) => i.id === fs.selectedIds[0]);
  if (target) {
    fs.previewItem = target;
    fs.showPropertiesModal = true;
  }
}

// Información de estado
const statusSelectedInfo = computed(() => {
  const count = fs.selectedIds.length;
  if (count === 0) return '';
  const selectedItems = fs.allItems.filter((i) => fs.selectedIds.includes(i.id));
  const totalBytes = selectedItems.reduce((acc, curr) => acc + (curr.size || 0), 0);
  return `${count} seleccionado(s) ${totalBytes > 0 ? `(${fs.formatSize(totalBytes)})` : ''}`;
});
</script>

<template>
  <div class="explorer-window" @click="onBackgroundClick">
    <!-- Input oculto para carga de archivos reales -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display: none"
      @change="onFileInputChange"
    />

    <!-- 1. BARRA DE COMANDOS ESTILO WINDOWS 11 (ACRYLIC GLASS) -->
    <header class="explorer-command-bar">
      <!-- Botón + Nuevo -->
      <div class="command-group relative">
        <button
          type="button"
          class="command-btn primary-new-btn"
          @click.stop="showNewMenu = !showNewMenu; showSortMenu = false; showViewMenu = false"
        >
          <i class="bi bi-plus-lg"></i>
          <span>Nuevo</span>
          <i class="bi bi-chevron-down chevron-mini"></i>
        </button>

        <Transition name="fade-drop">
          <div v-if="showNewMenu" class="dropdown-flyout glass-acrylic" @click.stop>
            <button class="dropdown-item" @click="handleCreateFolder">
              <i class="bi bi-folder-plus text-warning"></i>
              <span>Carpeta</span>
            </button>
            <button class="dropdown-item" @click="handleCreateTextFile">
              <i class="bi bi-file-earmark-text text-info"></i>
              <span>Documento de texto (.txt)</span>
            </button>
            <button class="dropdown-item" @click="handleCreateMarkdownFile">
              <i class="bi bi-markdown text-primary"></i>
              <span>Documento Markdown (.md)</span>
            </button>
          </div>
        </Transition>
      </div>

      <div class="command-divider"></div>

      <!-- BOTÓN PRINCIPAL DE SUBIR ARCHIVOS (REQUERIMIENTO DEL USUARIO) -->
      <button
        type="button"
        class="command-btn upload-highlight-btn"
        title="Cargar archivos desde tu navegador en la carpeta actual"
        @click.stop="triggerUpload"
      >
        <i class="bi bi-cloud-arrow-up-fill text-sky"></i>
        <span>Cargar archivos</span>
      </button>

      <div class="command-divider"></div>

      <!-- Cortar, Copiar, Pegar, Renombrar, Eliminar -->
      <div class="command-group">
        <button
          type="button"
          class="command-btn icon-only"
          title="Cortar (Ctrl+X)"
          :disabled="!fs.selectedIds?.length"
          @click.stop="fs.cutSelected"
        >
          <i class="bi bi-scissors"></i>
        </button>

        <button
          type="button"
          class="command-btn icon-only"
          title="Copiar (Ctrl+C)"
          :disabled="!fs.selectedIds?.length"
          @click.stop="fs.copySelected"
        >
          <i class="bi bi-copy"></i>
        </button>

        <button
          type="button"
          class="command-btn icon-only"
          title="Pegar (Ctrl+V)"
          :disabled="!fs.clipboard?.itemIds?.length"
          @click.stop="fs.paste"
        >
          <i class="bi bi-clipboard"></i>
        </button>

        <button
          type="button"
          class="command-btn icon-only"
          title="Cambiar nombre (F2)"
          :disabled="fs.selectedIds?.length !== 1"
          @click.stop="fs.selectedIds?.[0] && startRename(fs.selectedIds[0])"
        >
          <i class="bi bi-input-cursor-text"></i>
        </button>

        <button
          type="button"
          class="command-btn icon-only delete-btn"
          title="Eliminar (Supr)"
          :disabled="!fs.selectedIds?.length"
          @click.stop="handleDeleteSelected"
        >
          <i class="bi bi-trash3"></i>
        </button>

        <button
          type="button"
          class="command-btn icon-only"
          title="Descargar archivo a tu equipo"
          :disabled="!fs.selectedIds?.length"
          @click.stop="handleDownloadSelected"
        >
          <i class="bi bi-download"></i>
        </button>
      </div>

      <div class="command-divider"></div>

      <!-- Ordenar -->
      <div class="command-group relative">
        <button
          type="button"
          class="command-btn"
          @click.stop="showSortMenu = !showSortMenu; showNewMenu = false; showViewMenu = false"
        >
          <i class="bi bi-arrow-down-up"></i>
          <span>Ordenar</span>
          <i class="bi bi-chevron-down chevron-mini"></i>
        </button>

        <Transition name="fade-drop">
          <div v-if="showSortMenu" class="dropdown-flyout glass-acrylic" @click.stop>
            <button
              class="dropdown-item"
              :class="{ active: fs.sortBy === 'name' }"
              @click="fs.sortBy = 'name'; showSortMenu = false"
            >
              <i class="bi bi-check" :style="{ opacity: fs.sortBy === 'name' ? 1 : 0 }"></i>
              <span>Nombre</span>
            </button>
            <button
              class="dropdown-item"
              :class="{ active: fs.sortBy === 'updatedAt' }"
              @click="fs.sortBy = 'updatedAt'; showSortMenu = false"
            >
              <i class="bi bi-check" :style="{ opacity: fs.sortBy === 'updatedAt' ? 1 : 0 }"></i>
              <span>Fecha de modificación</span>
            </button>
            <button
              class="dropdown-item"
              :class="{ active: fs.sortBy === 'type' }"
              @click="fs.sortBy = 'type'; showSortMenu = false"
            >
              <i class="bi bi-check" :style="{ opacity: fs.sortBy === 'type' ? 1 : 0 }"></i>
              <span>Tipo</span>
            </button>
            <button
              class="dropdown-item"
              :class="{ active: fs.sortBy === 'size' }"
              @click="fs.sortBy = 'size'; showSortMenu = false"
            >
              <i class="bi bi-check" :style="{ opacity: fs.sortBy === 'size' ? 1 : 0 }"></i>
              <span>Tamaño</span>
            </button>
            <div class="dropdown-separator"></div>
            <button
              class="dropdown-item"
              :class="{ active: fs.sortOrder === 'asc' }"
              @click="fs.sortOrder = 'asc'; showSortMenu = false"
            >
              <i class="bi bi-check" :style="{ opacity: fs.sortOrder === 'asc' ? 1 : 0 }"></i>
              <span>Ascendente</span>
            </button>
            <button
              class="dropdown-item"
              :class="{ active: fs.sortOrder === 'desc' }"
              @click="fs.sortOrder = 'desc'; showSortMenu = false"
            >
              <i class="bi bi-check" :style="{ opacity: fs.sortOrder === 'desc' ? 1 : 0 }"></i>
              <span>Descendente</span>
            </button>
          </div>
        </Transition>
      </div>

      <!-- Ver (Modo de vista) -->
      <div class="command-group relative">
        <button
          type="button"
          class="command-btn"
          @click.stop="showViewMenu = !showViewMenu; showNewMenu = false; showSortMenu = false"
        >
          <i
            class="bi"
            :class="
              fs.viewMode === 'grid'
                ? 'bi-grid-fill'
                : fs.viewMode === 'details'
                ? 'bi-list-ul'
                : 'bi-list'
            "
          ></i>
          <span>Ver</span>
          <i class="bi bi-chevron-down chevron-mini"></i>
        </button>

        <Transition name="fade-drop">
          <div v-if="showViewMenu" class="dropdown-flyout glass-acrylic" @click.stop>
            <button
              class="dropdown-item"
              :class="{ active: fs.viewMode === 'grid' }"
              @click="fs.viewMode = 'grid'; showViewMenu = false"
            >
              <i class="bi bi-grid-fill"></i>
              <span>Iconos grandes (Cuadrícula)</span>
            </button>
            <button
              class="dropdown-item"
              :class="{ active: fs.viewMode === 'details' }"
              @click="fs.viewMode = 'details'; showViewMenu = false"
            >
              <i class="bi bi-list-columns"></i>
              <span>Detalles</span>
            </button>
            <button
              class="dropdown-item"
              :class="{ active: fs.viewMode === 'list' }"
              @click="fs.viewMode = 'list'; showViewMenu = false"
            >
              <i class="bi bi-list"></i>
              <span>Lista compacta</span>
            </button>
          </div>
        </Transition>
      </div>
    </header>

    <!-- 2. BARRA DE NAVEGACIÓN Y DIRECCIONES (ACRYLIC GLASS) -->
    <nav class="explorer-address-bar">
      <!-- Controles Atrás / Adelante / Arriba -->
      <div class="nav-arrows">
        <button
          type="button"
          class="nav-btn"
          title="Atrás"
          :disabled="!fs.canNavigateBack"
          @click.stop="fs.navigateBack"
        >
          <i class="bi bi-arrow-left"></i>
        </button>
        <button
          type="button"
          class="nav-btn"
          title="Adelante"
          :disabled="!fs.canNavigateForward"
          @click.stop="fs.navigateForward"
        >
          <i class="bi bi-arrow-right"></i>
        </button>
        <button
          type="button"
          class="nav-btn"
          title="Subir de nivel"
          :disabled="!fs.canNavigateUp"
          @click.stop="fs.navigateUp"
        >
          <i class="bi bi-arrow-up"></i>
        </button>
        <button
          type="button"
          class="nav-btn"
          title="Actualizar"
          @click.stop="fs.loadAllFiles"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <!-- Barra de rutas interactiva (Breadcrumbs) -->
      <div class="breadcrumb-container">
        <i class="bi bi-folder-fill folder-icon-indicator"></i>
        <div class="breadcrumbs-list">
          <template v-for="(crumb, idx) in fs.breadcrumbs" :key="crumb.id">
            <button
              type="button"
              class="crumb-btn"
              :class="{ 'current-crumb': idx === fs.breadcrumbs.length - 1 }"
              @click.stop="fs.navigateTo(crumb.id)"
            >
              <i v-if="crumb.icon" class="bi" :class="crumb.icon" style="margin-right: 4px;"></i>
              <span>{{ crumb.name }}</span>
            </button>
            <i
              v-if="idx < fs.breadcrumbs.length - 1"
              class="bi bi-chevron-right crumb-arrow"
            ></i>
          </template>
        </div>
      </div>

      <!-- Barra de búsqueda en tiempo real -->
      <div class="search-box">
        <i class="bi bi-search search-icon"></i>
        <input
          v-model="fs.searchQuery"
          type="text"
          :placeholder="`Buscar en ${fs.currentFolder?.name || 'carpeta'}...`"
          class="search-input"
        />
        <button
          v-if="fs.searchQuery"
          class="search-clear-btn"
          type="button"
          @click="fs.searchQuery = ''"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
    </nav>

    <!-- 3. CUERPO PRINCIPAL: PANEL LATERAL + VISTA DE ARCHIVOS -->
    <div class="explorer-body">
      <!-- SIDEBAR LATERAL (Acceso Rápido y Este Equipo) -->
      <aside class="explorer-sidebar">
        <!-- Acceso Rápido -->
        <div class="sidebar-section">
          <div class="sidebar-title">Acceso rápido</div>
          <div class="sidebar-items">
            <button
              v-for="folder in fs.systemFolders"
              :key="folder.id"
              type="button"
              class="sidebar-item"
              :class="{ active: fs.currentFolderId === folder.id }"
              @click="fs.navigateTo(folder.id)"
            >
              <i class="bi" :class="folder.icon"></i>
              <span>{{ folder.name }}</span>
            </button>
          </div>
        </div>

        <!-- Este Equipo -->
        <div class="sidebar-section">
          <div class="sidebar-title">Este equipo</div>
          <div class="sidebar-items">
            <button
              type="button"
              class="sidebar-item"
              :class="{ active: fs.currentFolderId === 'root' }"
              @click="fs.navigateTo('root')"
            >
              <i class="bi bi-pc-display"></i>
              <span>Este equipo (PC)</span>
            </button>

            <!-- Disco C: -->
            <div class="drive-card">
              <div class="drive-header">
                <i class="bi bi-hdd-fill"></i>
                <div class="drive-texts">
                  <span class="drive-name">Disco Local (C:)</span>
                  <span class="drive-stats">
                    {{ fs.formatSize(fs.totalUsedStorage) }} usados de 100 GB
                  </span>
                </div>
              </div>
              <div class="drive-progress-bar">
                <div
                  class="drive-progress-fill"
                  :style="{
                    width: `${Math.min(100, Math.max(8, (fs.totalUsedStorage / (100 * 1024 * 1024 * 1024)) * 100))}%`
                  }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- ÁREA DE CONTENIDO / VISTA DE ARCHIVOS (GLASS BLUR) -->
      <main
        ref="mainViewportRef"
        class="explorer-viewport"
        :class="{ 'dragging-over': isDraggingOver }"
        @dragenter="onDragEnter"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @contextmenu="onContextMenu($event)"
      >
        <!-- Overlay al arrastrar archivos (Drag & Drop) -->
        <div v-if="isDraggingOver" class="drag-drop-overlay">
          <div class="drop-modal-box glass-acrylic">
            <i class="bi bi-cloud-arrow-up-fill drop-icon"></i>
            <h3>Soltar para cargar archivos</h3>
            <p>Se guardarán en <strong>{{ fs.currentFolder?.name || 'la carpeta actual' }}</strong></p>
          </div>
        </div>

        <!-- Notificación de subida -->
        <div v-if="fs.isUploading" class="upload-toast glass-acrylic">
          <span class="mini-spinner"></span>
          <span>{{ fs.uploadStatus }}</span>
        </div>

        <!-- VISTA VACÍA -->
        <div v-if="fs.currentItems.length === 0" class="empty-folder-box">
          <i class="bi bi-folder2-open empty-icon"></i>
          <h4>Esta carpeta está vacía</h4>
          <p>Puedes crear nuevas carpetas o cargar archivos desde tu ordenador.</p>
          <div class="empty-actions">
            <button class="empty-action-btn primary" @click="triggerUpload">
              <i class="bi bi-cloud-arrow-up-fill"></i>
              <span>Cargar archivos</span>
            </button>
            <button class="empty-action-btn" @click="handleCreateFolder">
              <i class="bi bi-folder-plus"></i>
              <span>Nueva carpeta</span>
            </button>
          </div>
        </div>

        <!-- 1. VISTA CUADRÍCULA (GRID VIEW) -->
        <div v-else-if="fs.viewMode === 'grid'" class="items-grid">
          <div
            v-for="item in fs.currentItems"
            :key="item.id"
            class="file-item grid-item"
            :class="{
              selected: fs.selectedIds?.includes(item.id),
              'is-cut': fs.clipboard?.action === 'cut' && fs.clipboard?.itemIds?.includes(item.id)
            }"
            @click="onItemClick($event, item)"
            @dblclick="onItemDblClick(item)"
            @contextmenu="onContextMenu($event, item)"
          >
            <!-- Icono o Thumbnail -->
            <div class="grid-icon-wrap" :class="{ 'has-thumbnail': isImageFile(item) && fs.getThumbnail(item) }">
              <div v-if="item.appId || item.shortcutTarget?.appId" class="shortcut-thumb-frame">
                <IconManager :id="item.appId || item.shortcutTarget?.appId" class="shortcut-app-icon" />
                <div class="shortcut-arrow-badge">
                  <i class="bi bi-arrow-up-right-square-fill"></i>
                </div>
              </div>
              <div v-else-if="isImageFile(item) && fs.getThumbnail(item)" class="file-thumbnail-frame">
                <img
                  :src="fs.getThumbnail(item)!"
                  :alt="item.name"
                  class="file-thumbnail-img"
                  loading="lazy"
                  @error="fs.handleThumbnailError(item.id)"
                />
                <div class="file-thumbnail-badge">
                  {{ (item.extension || 'IMG').toUpperCase() }}
                </div>
              </div>
              <i v-else class="bi" :class="fs.getFileIcon(item)"></i>
            </div>

            <!-- Nombre (con renombrado inline) -->
            <div class="grid-name-wrap">
              <input
                v-if="renamingItemId === item.id"
                v-model="renamingItemName"
                type="text"
                class="rename-input"
                autofocus
                @click.stop
                @keydown.enter.prevent="confirmRename"
                @keydown.esc.prevent="cancelRename"
                @blur="confirmRename"
              />
              <span v-else class="item-name" :title="item.name">
                {{ (item.type === 'shortcut' || item.extension === 'lnk') ? item.name.replace(/\.lnk$/i, '') : item.name }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. VISTA DETALLES (DETAILS VIEW) -->
        <div v-else-if="fs.viewMode === 'details'" class="items-details">
          <div class="details-header">
            <div class="col col-name" @click="fs.sortBy = 'name'; fs.sortOrder = fs.sortOrder === 'asc' ? 'desc' : 'asc'">
              <span>Nombre</span>
              <i v-if="fs.sortBy === 'name'" class="bi" :class="fs.sortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </div>
            <div class="col col-date" @click="fs.sortBy = 'updatedAt'; fs.sortOrder = fs.sortOrder === 'asc' ? 'desc' : 'asc'">
              <span>Fecha de modificación</span>
              <i v-if="fs.sortBy === 'updatedAt'" class="bi" :class="fs.sortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </div>
            <div class="col col-type" @click="fs.sortBy = 'type'; fs.sortOrder = fs.sortOrder === 'asc' ? 'desc' : 'asc'">
              <span>Tipo</span>
              <i v-if="fs.sortBy === 'type'" class="bi" :class="fs.sortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </div>
            <div class="col col-size" @click="fs.sortBy = 'size'; fs.sortOrder = fs.sortOrder === 'asc' ? 'desc' : 'asc'">
              <span>Tamaño</span>
              <i v-if="fs.sortBy === 'size'" class="bi" :class="fs.sortOrder === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            </div>
          </div>

          <div class="details-body">
            <div
              v-for="item in fs.currentItems"
              :key="item.id"
              class="file-item details-row"
              :class="{
                selected: fs.selectedIds?.includes(item.id),
                'is-cut': fs.clipboard?.action === 'cut' && fs.clipboard?.itemIds?.includes(item.id)
              }"
              @click="onItemClick($event, item)"
              @dblclick="onItemDblClick(item)"
              @contextmenu="onContextMenu($event, item)"
            >
              <div class="col col-name">
                <div class="details-thumb-wrap">
                  <div v-if="item.appId || item.shortcutTarget?.appId" class="shortcut-list-thumb">
                    <IconManager :id="item.appId || item.shortcutTarget?.appId" class="mini-app-icon" />
                    <i class="bi bi-arrow-up-right-square-fill mini-shortcut-badge"></i>
                  </div>
                  <img
                    v-else-if="isImageFile(item) && fs.getThumbnail(item)"
                    :src="fs.getThumbnail(item)!"
                    :alt="item.name"
                    class="mini-thumb-img"
                    loading="lazy"
                    @error="fs.handleThumbnailError(item.id)"
                  />
                  <i v-else class="bi item-icon-mini" :class="fs.getFileIcon(item)"></i>
                </div>
                <input
                  v-if="renamingItemId === item.id"
                  v-model="renamingItemName"
                  type="text"
                  class="rename-input"
                  autofocus
                  @click.stop
                  @keydown.enter.prevent="confirmRename"
                  @keydown.esc.prevent="cancelRename"
                  @blur="confirmRename"
                />
                <span v-else class="item-name" :title="item.name">
                  {{ (item.type === 'shortcut' || item.extension === 'lnk') ? item.name.replace(/\.lnk$/i, '') : item.name }}
                </span>
              </div>
              <div class="col col-date">{{ fs.formatDate(item.updatedAt) }}</div>
              <div class="col col-type">
                {{ item.type === 'folder' ? 'Carpeta de archivos' : (item.type === 'shortcut' || item.extension === 'lnk' ? 'Acceso directo' : (item.extension?.toUpperCase() || 'Archivo')) }}
              </div>
              <div class="col col-size">
                {{ item.type === 'folder' ? '' : (item.type === 'shortcut' || item.extension === 'lnk' ? '1 KB' : fs.formatSize(item.size)) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 3. VISTA LISTA (LIST VIEW) -->
        <div v-else class="items-list">
          <div
            v-for="item in fs.currentItems"
            :key="item.id"
            class="file-item list-row"
            :class="{
              selected: fs.selectedIds?.includes(item.id),
              'is-cut': fs.clipboard?.action === 'cut' && fs.clipboard?.itemIds?.includes(item.id)
            }"
            @click="onItemClick($event, item)"
            @dblclick="onItemDblClick(item)"
            @contextmenu="onContextMenu($event, item)"
          >
            <div class="details-thumb-wrap">
              <div v-if="item.appId || item.shortcutTarget?.appId" class="shortcut-list-thumb">
                <IconManager :id="item.appId || item.shortcutTarget?.appId" class="mini-app-icon" />
                <i class="bi bi-arrow-up-right-square-fill mini-shortcut-badge"></i>
              </div>
              <img
                v-else-if="isImageFile(item) && fs.getThumbnail(item)"
                :src="fs.getThumbnail(item)!"
                :alt="item.name"
                class="mini-thumb-img"
                loading="lazy"
                @error="fs.handleThumbnailError(item.id)"
              />
              <i v-else class="bi item-icon-mini" :class="fs.getFileIcon(item)"></i>
            </div>
            <input
              v-if="renamingItemId === item.id"
              v-model="renamingItemName"
              type="text"
              class="rename-input"
              autofocus
              @click.stop
              @keydown.enter.prevent="confirmRename"
              @keydown.esc.prevent="cancelRename"
              @blur="confirmRename"
            />
            <span v-else class="item-name" :title="item.name">
              {{ (item.type === 'shortcut' || item.extension === 'lnk') ? item.name.replace(/\.lnk$/i, '') : item.name }}
            </span>
          </div>
        </div>
      </main>
    </div>

    <!-- 4. BARRA DE ESTADO (STATUS BAR ACRYLIC) -->
    <footer class="explorer-status-bar">
      <div class="status-left">
        <span>{{ fs.currentItems.length }} elemento(s)</span>
        <span v-if="statusSelectedInfo" class="status-selected-pill">
          {{ statusSelectedInfo }}
        </span>
      </div>

      <div class="status-right">
        <button
          type="button"
          class="status-view-btn"
          :class="{ active: fs.viewMode === 'details' }"
          title="Vista Detalles"
          @click="fs.viewMode = 'details'"
        >
          <i class="bi bi-list-columns"></i>
        </button>
        <button
          type="button"
          class="status-view-btn"
          :class="{ active: fs.viewMode === 'grid' }"
          title="Vista Cuadrícula"
          @click="fs.viewMode = 'grid'"
        >
          <i class="bi bi-grid-fill"></i>
        </button>
      </div>
    </footer>

    <!-- 5. MODAL VISOR DE IMÁGENES (GLASS ACRYLIC) -->
    <div v-if="fs.showImagePreview" class="preview-modal-backdrop" @click="fs.closeModals">
      <div class="image-preview-modal glass-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title">
            <i class="bi bi-image text-danger"></i>
            <span>{{ fs.previewItem?.name }}</span>
          </div>
          <div class="modal-actions">
            <button
              v-if="fs.previewItem"
              class="modal-btn"
              title="Descargar"
              @click="fs.downloadFile(fs.previewItem)"
            >
              <i class="bi bi-download"></i>
            </button>
            <button class="modal-btn close" title="Cerrar" @click="fs.closeModals">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="image-modal-body">
          <img
            v-if="fs.previewBlobUrl"
            :src="fs.previewBlobUrl"
            :alt="fs.previewItem?.name"
            class="full-image-preview"
          />
        </div>
      </div>
    </div>

    <!-- 6. MODAL EDITOR / VISOR DE TEXTO (GLASS ACRYLIC) -->
    <div v-if="fs.showTextEditor" class="preview-modal-backdrop" @click="fs.closeModals">
      <div class="text-editor-modal glass-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title">
            <i class="bi bi-file-earmark-text text-info"></i>
            <span>{{ fs.previewItem?.name }}</span>
          </div>
          <div class="modal-actions">
            <button
              class="modal-btn primary-save"
              title="Guardar cambios"
              @click="fs.saveTextDraft"
            >
              <i class="bi bi-floppy"></i>
              <span>Guardar</span>
            </button>
            <button
              v-if="fs.previewItem"
              class="modal-btn"
              title="Descargar archivo"
              @click="fs.downloadFile(fs.previewItem)"
            >
              <i class="bi bi-download"></i>
            </button>
            <button class="modal-btn close" title="Cerrar" @click="fs.closeModals">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="text-editor-body">
          <textarea
            v-model="fs.textEditorDraft"
            class="text-editor-area"
            spellcheck="false"
            placeholder="Escribe aquí tu contenido..."
          ></textarea>
        </div>
        <div class="text-editor-footer">
          <span>Caracteres: {{ fs.textEditorDraft.length }}</span>
          <span>Líneas: {{ fs.textEditorDraft.split('\n').length }}</span>
          <span>Codificación: UTF-8</span>
        </div>
      </div>
    </div>

    <!-- 7. MODAL DE PROPIEDADES (GLASS ACRYLIC) -->
    <div v-if="fs.showPropertiesModal" class="preview-modal-backdrop" @click="fs.closeModals">
      <div class="properties-modal glass-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title">
            <i class="bi bi-info-circle text-primary"></i>
            <span>Propiedades de {{ fs.previewItem?.name }}</span>
          </div>
          <button class="modal-btn close" @click="fs.closeModals">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="properties-body">
          <div class="prop-icon-row">
            <div
              v-if="fs.previewItem && isImageFile(fs.previewItem) && fs.getThumbnail(fs.previewItem)"
              class="prop-thumb-preview"
            >
              <img
                :src="fs.getThumbnail(fs.previewItem)!"
                :alt="fs.previewItem.name"
                class="prop-thumb-img"
              />
            </div>
            <i
              v-else
              class="bi prop-big-icon"
              :class="fs.previewItem ? fs.getFileIcon(fs.previewItem) : 'bi-file-earmark'"
            ></i>
            <div class="prop-title-box">
              <strong>{{ fs.previewItem?.name }}</strong>
              <small>{{ fs.previewItem?.type === 'folder' ? 'Carpeta de archivos' : fs.previewItem?.mimeType }}</small>
            </div>
          </div>
          <div class="prop-divider"></div>
          <div class="prop-row">
            <span class="prop-label">Tipo:</span>
            <span class="prop-val">{{ fs.previewItem?.type === 'folder' ? 'Carpeta' : `${fs.previewItem?.extension?.toUpperCase()} (${fs.previewItem?.mimeType})` }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Tamaño:</span>
            <span class="prop-val">{{ fs.previewItem?.type === 'folder' ? '-' : `${fs.formatSize(fs.previewItem?.size || 0)} (${fs.previewItem?.size?.toLocaleString()} bytes)` }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Ubicación:</span>
            <span class="prop-val">{{ fs.currentFolder?.name || 'Sistema' }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Creado:</span>
            <span class="prop-val">{{ fs.formatDate(fs.previewItem?.createdAt || 0) }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">Modificado:</span>
            <span class="prop-val">{{ fs.formatDate(fs.previewItem?.updatedAt || 0) }}</span>
          </div>
        </div>
        <div class="properties-footer">
          <button
            v-if="fs.previewItem?.type === 'file'"
            class="modal-btn primary-save"
            @click="fs.previewItem && fs.downloadFile(fs.previewItem)"
          >
            <i class="bi bi-download"></i> Descargar
          </button>
          <button class="modal-btn" @click="fs.closeModals">Aceptar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CONTENEDOR PRINCIPAL EXPLORADOR CON GLASS BLUR ACRÍLICO */
.explorer-window {
  width: 100%;
  height: 100%;
  background: transparent;
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
  user-select: none;
  position: relative;
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
}

/* Efecto Glass Acrylic reutilizable */
.glass-acrylic {
  background: rgba(22, 26, 36, 0.78) !important;
  backdrop-filter: blur(24px) !important;
  -webkit-backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5) !important;
}

/* 1. BARRA DE COMANDOS (COMMAND BAR) */
.explorer-command-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(25, 30, 42, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.command-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.command-divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 4px;
}

.command-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  height: 32px;
  border-radius: 6px;
  background: transparent;
  border: 1px solid transparent;
  color: #f1f5f9;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
}

.command-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.14);
}

.command-btn:active:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.command-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.command-btn.icon-only {
  padding: 5px 8px;
  font-size: 14px;
}

.command-btn.primary-new-btn {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.14);
}

.command-btn.primary-new-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

/* BOTÓN DESTACADO DE SUBIR ARCHIVOS */
.command-btn.upload-highlight-btn {
  background: rgba(2, 132, 199, 0.2);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  font-weight: 600;
}

.command-btn.upload-highlight-btn:hover {
  background: rgba(2, 132, 199, 0.35);
  border-color: #38bdf8;
  color: #ffffff;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
}

.chevron-mini {
  font-size: 10px;
  opacity: 0.7;
}

/* Menús Desplegables de la Barra de Comandos */
.relative {
  position: relative;
}

.dropdown-flyout {
  position: absolute;
  top: 38px;
  left: 0;
  min-width: 200px;
  border-radius: 8px;
  padding: 4px;
  z-index: 50;
  display: flex;
  flex-direction: column;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  font-size: 12.5px;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.dropdown-item.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  font-weight: 600;
}

.dropdown-separator {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

/* 2. BARRA DE NAVEGACIÓN Y DIRECCIONES */
.explorer-address-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(18, 22, 32, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.nav-arrows {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: #f1f5f9;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.breadcrumb-container {
  flex: 1;
  height: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  overflow: hidden;
  backdrop-filter: blur(8px);
}

.folder-icon-indicator {
  color: #eab308;
  font-size: 14px;
  margin-right: 6px;
}

.breadcrumbs-list {
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  white-space: nowrap;
}

.crumb-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.crumb-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.crumb-btn.current-crumb {
  font-weight: 600;
  color: #ffffff;
}

.crumb-arrow {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.4);
}

/* Caja de búsqueda */
.search-box {
  width: 200px;
  height: 28px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 8px;
  position: relative;
  backdrop-filter: blur(8px);
}

.search-icon {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-right: 6px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 11.5px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-clear-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}

.search-clear-btn:hover {
  color: #ffffff;
}

/* 3. CUERPO PRINCIPAL */
.explorer-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* SIDEBAR LATERAL (TRANSLUCENT ACRYLIC) */
.explorer-sidebar {
  width: 210px;
  background: rgba(14, 18, 26, 0.35);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 12px 8px;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  padding: 0 8px 6px 8px;
  letter-spacing: 0.5px;
}

.sidebar-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.12s ease;
  text-align: left;
  width: 100%;
}

.sidebar-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.sidebar-item.active {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.3);
}

.sidebar-item i {
  font-size: 15px;
}

/* Indicador de Disco C: */
.drive-card {
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 6px;
}

.drive-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drive-header i {
  font-size: 18px;
  color: #38bdf8;
}

.drive-texts {
  display: flex;
  flex-direction: column;
}

.drive-name {
  font-size: 11.5px;
  font-weight: 600;
  color: #ffffff;
}

.drive-stats {
  font-size: 9.5px;
  color: rgba(255, 255, 255, 0.5);
}

.drive-progress-bar {
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
  margin-top: 6px;
  overflow: hidden;
}

.drive-progress-fill {
  height: 100%;
  background: #0284c7;
  border-radius: 2px;
}

/* VISTA DE ARCHIVOS (VIEWPORT TRANSLÚCIDO) */
.explorer-viewport {
  flex: 1;
  background: rgba(10, 14, 22, 0.2);
  padding: 12px;
  overflow-y: auto;
  position: relative;
}

.explorer-viewport.dragging-over {
  background: rgba(2, 132, 199, 0.12);
}

/* Drag & Drop Overlay */
.drag-drop-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 40;
  pointer-events: none;
}

.drop-modal-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 2px dashed #38bdf8 !important;
  border-radius: 14px;
  padding: 30px 40px;
}

.drop-icon {
  font-size: 48px;
  color: #38bdf8;
  animation: bounce 1s infinite alternate ease-in-out;
}

@keyframes bounce {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-8px);
  }
}

/* Toast de subida */
.upload-toast {
  position: absolute;
  bottom: 12px;
  right: 12px;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 30;
}

.mini-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Carpeta Vacía */
.empty-folder-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 70%;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  gap: 8px;
}

.empty-icon {
  font-size: 48px;
  opacity: 0.4;
  margin-bottom: 4px;
}

.empty-folder-box h4 {
  margin: 0;
  color: #ffffff;
  font-size: 16px;
}

.empty-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.15s ease;
  backdrop-filter: blur(8px);
}

.empty-action-btn.primary {
  background: #0284c7;
  border-color: #38bdf8;
}

.empty-action-btn:hover {
  filter: brightness(1.2);
}

/* 1. ESTILO VISTA CUADRÍCULA (GRID) */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.file-item.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 10px 6px;
  min-height: 108px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.14s ease;
  text-align: center;
}

.file-item.grid-item:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
}

.file-item.grid-item.selected {
  background: rgba(56, 189, 248, 0.22);
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.15);
}

.file-item.is-cut {
  opacity: 0.45;
}

.grid-icon-wrap {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  margin-bottom: 6px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  position: relative;
  transition: width 0.15s ease, height 0.15s ease;
}

.grid-icon-wrap.has-thumbnail {
  width: 82px;
  height: 64px;
  filter: none;
}

.shortcut-thumb-frame {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcut-app-icon {
  width: 42px;
  height: 42px;
  display: block;
}

.shortcut-arrow-badge {
  position: absolute;
  bottom: 0px;
  left: 0px;
  font-size: 11px;
  color: #38bdf8;
  line-height: 1;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 2px;
  padding: 1px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shortcut-list-thumb {
  position: relative;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mini-app-icon {
  width: 18px;
  height: 18px;
}

.mini-shortcut-badge {
  position: absolute;
  bottom: -2px;
  left: -2px;
  font-size: 9px;
  color: #38bdf8;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 1px;
}

.file-thumbnail-frame {
  width: 100%;
  height: 100%;
  border-radius: 7px;
  overflow: hidden;
  position: relative;
  background: rgba(10, 14, 22, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.file-thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  background: #111827;
}

.file-item.grid-item:hover .file-thumbnail-frame {
  border-color: rgba(56, 189, 248, 0.5);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.55), 0 0 10px rgba(56, 189, 248, 0.3);
}

.file-item.grid-item:hover .file-thumbnail-img {
  transform: scale(1.08);
}

.file-item.grid-item.selected .file-thumbnail-frame {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px #38bdf8, 0 6px 14px rgba(56, 189, 248, 0.35);
}

.file-thumbnail-badge {
  position: absolute;
  bottom: 3px;
  right: 3px;
  font-size: 7.5px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: #e0f2fe;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 1px 4px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  pointer-events: none;
  line-height: 1.1;
}

/* MINI THUMBNAILS EN DETALLES Y LISTA */
.details-thumb-wrap {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 8px;
  position: relative;
}

.mini-thumb-img {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  background: #1e293b;
}

.grid-name-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
}

.item-name {
  font-size: 11.5px;
  color: #f1f5f9;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-word;
  line-height: 1.25;
}

.rename-input {
  width: 95%;
  background: rgba(17, 24, 39, 0.9);
  border: 1px solid #38bdf8;
  border-radius: 4px;
  color: #ffffff;
  font-size: 11.5px;
  padding: 2px 4px;
  text-align: center;
  outline: none;
}

/* 2. ESTILO VISTA DETALLES (DETAILS) */
.items-details {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.details-header {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.details-header .col {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.details-header .col:hover {
  color: #ffffff;
}

.col-name {
  flex: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.col-date {
  flex: 2;
}

.col-type {
  flex: 1.5;
}

.col-size {
  flex: 1;
  text-align: right;
}

.details-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 4px;
}

.details-row {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.12s ease;
}

.details-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

.details-row.selected {
  background: rgba(56, 189, 248, 0.22);
  border-color: rgba(56, 189, 248, 0.45);
}

.item-icon-mini {
  font-size: 16px;
  flex-shrink: 0;
}

/* 3. ESTILO VISTA LISTA (LIST) */
.items-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 5px;
  font-size: 12px;
  cursor: pointer;
  min-width: 180px;
  border: 1px solid transparent;
}

.list-row:hover {
  background: rgba(255, 255, 255, 0.08);
}

.list-row.selected {
  background: rgba(56, 189, 248, 0.22);
  border-color: rgba(56, 189, 248, 0.45);
}

/* 4. BARRA DE ESTADO (STATUS BAR) */
.explorer-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: rgba(16, 20, 28, 0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-selected-pill {
  color: #38bdf8;
  font-weight: 500;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.status-view-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-view-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.status-view-btn.active {
  background: rgba(255, 255, 255, 0.16);
  color: #ffffff;
}

/* 5. MODALES Y VISORES EN GLASS ACRYLIC */
.preview-modal-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.glass-modal {
  background: rgba(22, 27, 38, 0.85) !important;
  backdrop-filter: blur(30px) !important;
  -webkit-backdrop-filter: blur(30px) !important;
  border: 1px solid rgba(255, 255, 255, 0.18) !important;
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7) !important;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.image-preview-modal {
  max-width: 80vw;
  max-height: 85vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
}

.modal-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modal-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.16);
}

.modal-btn.primary-save {
  background: #0284c7;
  border-color: #38bdf8;
}

.modal-btn.close:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.5);
}

.image-modal-body {
  padding: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.full-image-preview {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 6px;
}

/* Editor de Texto */
.text-editor-modal {
  width: 680px;
  height: 480px;
}

.text-editor-body {
  flex: 1;
  padding: 10px;
  background: rgba(12, 16, 24, 0.6);
}

.text-editor-area {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #f1f5f9;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
}

.text-editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* Modal de Propiedades */
.properties-modal {
  width: 360px;
}

.properties-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 12px;
}

.prop-icon-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.prop-thumb-preview {
  width: 58px;
  height: 58px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  flex-shrink: 0;
  background: #111827;
}

.prop-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.prop-big-icon {
  font-size: 38px;
}

.prop-title-box {
  display: flex;
  flex-direction: column;
}

.prop-title-box strong {
  font-size: 13px;
  color: #ffffff;
}

.prop-title-box small {
  color: rgba(255, 255, 255, 0.5);
}

.prop-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 4px 0;
}

.prop-row {
  display: flex;
  align-items: center;
}

.prop-label {
  width: 90px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.prop-val {
  flex: 1;
  color: #ffffff;
  word-break: break-all;
}

.properties-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* Colores de ayuda */
.text-warning {
  color: #eab308 !important;
}

.text-danger {
  color: #ef4444 !important;
}

.text-primary {
  color: #3b82f6 !important;
}

.text-info {
  color: #38bdf8 !important;
}

.text-success {
  color: #22c55e !important;
}

.text-purple {
  color: #a855f7 !important;
}

.text-sky {
  color: #0ea5e9 !important;
}
</style>
