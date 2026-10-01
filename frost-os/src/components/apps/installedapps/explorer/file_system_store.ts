import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { db, type FileItem, type Asset } from '../../../../database/db';
import { isImageFile, resolveSystemImageUrl, resolveSystemThumbnailUrl, SYSTEM_WALLPAPERS_MAP } from './thumbnail_utils';

export interface BreadcrumbItem {
  id: string;
  name: string;
  icon?: string;
}

export type ViewMode = 'grid' | 'details' | 'list';
export type SortField = 'name' | 'updatedAt' | 'type' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface ClipboardState {
  action: 'copy' | 'cut';
  itemIds: string[];
}

export const useFileSystemStore = defineStore('fileSystem', () => {
  const currentFolderId = ref<string>('documents');
  const allItems = ref<FileItem[]>([]);
  const selectedIds = ref<string[]>([]);
  const history = ref<string[]>(['documents']);
  const historyIndex = ref<number>(0);
  const searchQuery = ref<string>('');
  const viewMode = ref<ViewMode>('grid');
  const sortBy = ref<SortField>('name');
  const sortOrder = ref<SortOrder>('asc');
  const clipboard = ref<ClipboardState | null>(null);

  // Modales y vistas previas
  const previewItem = ref<FileItem | null>(null);
  const previewTextContent = ref<string>('');
  const previewBlobUrl = ref<string | null>(null);
  const showTextEditor = ref<boolean>(false);
  const showImagePreview = ref<boolean>(false);
  const showPropertiesModal = ref<boolean>(false);
  const isEditingText = ref<boolean>(false);
  const textEditorDraft = ref<string>('');

  // Cache reactivo de vistas previas (Thumbnails)
  const thumbnailUrls = ref<Record<string, string>>({});
  const thumbnailErrors = ref<Set<string>>(new Set());
  const pendingAssetLoads = new Set<string>();

  function getThumbnail(item: FileItem): string | null {
    if (!isImageFile(item) || thumbnailErrors.value.has(item.id)) return null;

    if (thumbnailUrls.value[item.id]) {
      return thumbnailUrls.value[item.id];
    }

    // Resolver síncrono si es wallpaper/foto del sistema usando miniatura ultraligera
    const sysUrl = resolveSystemThumbnailUrl(item.id, item.name);
    if (sysUrl) {
      thumbnailUrls.value[item.id] = sysUrl;
      return sysUrl;
    }

    // Si tiene contenido directo data:image
    if (item.textContent && (item.textContent.startsWith('data:image/') || item.textContent.startsWith('blob:'))) {
      thumbnailUrls.value[item.id] = item.textContent;
      return item.textContent;
    }

    // Si tiene assetId, cargar asíncronamente
    if (item.assetId && !pendingAssetLoads.has(item.id)) {
      pendingAssetLoads.add(item.id);
      db.assets.get(item.assetId).then((asset) => {
        pendingAssetLoads.delete(item.id);
        if (asset && asset.data) {
          thumbnailUrls.value[item.id] = URL.createObjectURL(asset.data);
        }
      }).catch((err) => {
        pendingAssetLoads.delete(item.id);
        console.warn('Error al cargar thumbnail del asset:', item.name, err);
      });
    }

    return null;
  }

  function handleThumbnailError(itemId: string) {
    thumbnailErrors.value.add(itemId);
    if (thumbnailUrls.value[itemId]) {
      if (thumbnailUrls.value[itemId].startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailUrls.value[itemId]);
      }
      delete thumbnailUrls.value[itemId];
    }
  }

  async function loadThumbnailsForItems(items: FileItem[]) {
    for (const item of items) {
      if (!isImageFile(item) || thumbnailErrors.value.has(item.id) || thumbnailUrls.value[item.id]) {
        continue;
      }
      getThumbnail(item);
    }
  }

  // Estado de subida de archivos
  const isUploading = ref<boolean>(false);
  const uploadStatus = ref<string>('');

  // Carpetas del sistema predefinidas
  const systemFolders: { id: string; name: string; icon: string; path: string }[] = [
    { id: 'desktop', name: 'Escritorio', icon: 'bi-display', path: 'Este equipo > Escritorio' },
    { id: 'documents', name: 'Documentos', icon: 'bi-folder2', path: 'Este equipo > Documentos' },
    { id: 'downloads', name: 'Descargas', icon: 'bi-download', path: 'Este equipo > Descargas' },
    { id: 'pictures', name: 'Imágenes', icon: 'bi-image', path: 'Este equipo > Imágenes' },
    { id: 'music', name: 'Música', icon: 'bi-music-note-beamed', path: 'Este equipo > Música' },
    { id: 'videos', name: 'Videos', icon: 'bi-camera-video', path: 'Este equipo > Videos' },
  ];

  // Cargar todos los archivos desde Dexie
  async function loadAllFiles() {
    try {
      let items = await db.files.toArray();
      if (items.length === 0) {
        await seedDefaultFileSystem();
        items = await db.files.toArray();
      } else {
        // Asegurar que existan fotos de muestra para previsualizar en Imágenes y Fondos de Pantalla
        const hasExtraPictures = items.some((i) => i.id === 'file-sample-pic-2' || i.name === 'aurora_nordica.jpg');
        if (!hasExtraPictures) {
          const now = Date.now();
          const extraPics: FileItem[] = [
            {
              id: 'file-sample-pic-2',
              name: 'aurora_nordica.jpg',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'jpg',
              size: 680031,
              mimeType: 'image/jpeg',
              createdAt: now - 48000000,
              updatedAt: now - 48000000,
            },
            {
              id: 'file-sample-pic-3',
              name: 'horizonte_ciberpunk.jpg',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'jpg',
              size: 1935350,
              mimeType: 'image/jpeg',
              createdAt: now - 46000000,
              updatedAt: now - 46000000,
            },
            {
              id: 'file-sample-pic-4',
              name: 'montanas_atardecer.jpg',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'jpg',
              size: 1561314,
              mimeType: 'image/jpeg',
              createdAt: now - 44000000,
              updatedAt: now - 44000000,
            },
            {
              id: 'file-sample-pic-5',
              name: 'bosque_niebla.jpg',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'jpg',
              size: 803680,
              mimeType: 'image/jpeg',
              createdAt: now - 42000000,
              updatedAt: now - 42000000,
            },
            {
              id: 'file-sample-pic-6',
              name: 'oceano_calmo.jpg',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'jpg',
              size: 1654842,
              mimeType: 'image/jpeg',
              createdAt: now - 40000000,
              updatedAt: now - 40000000,
            },
            {
              id: 'file-sample-pic-7',
              name: 'flor_de_loto.jpg',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'jpg',
              size: 4876882,
              mimeType: 'image/jpeg',
              createdAt: now - 38000000,
              updatedAt: now - 38000000,
            },
            {
              id: 'file-sample-pic-8',
              name: 'nekodrive_space.png',
              parentId: 'pic-wallpapers',
              type: 'file',
              extension: 'png',
              size: 221087,
              mimeType: 'image/png',
              createdAt: now - 36000000,
              updatedAt: now - 36000000,
            },
            {
              id: 'file-sample-pic-9',
              name: 'foto_vacaciones_playa.jpg',
              parentId: 'pictures',
              type: 'file',
              extension: 'jpg',
              size: 808602,
              mimeType: 'image/jpeg',
              createdAt: now - 34000000,
              updatedAt: now - 34000000,
            },
            {
              id: 'file-sample-pic-10',
              name: 'sesion_fotografica.jpg',
              parentId: 'pictures',
              type: 'file',
              extension: 'jpg',
              size: 854211,
              mimeType: 'image/jpeg',
              createdAt: now - 32000000,
              updatedAt: now - 32000000,
            },
            {
              id: 'file-sample-pic-11',
              name: 'paisaje_urbano.jpg',
              parentId: 'pictures',
              type: 'file',
              extension: 'jpg',
              size: 2006140,
              mimeType: 'image/jpeg',
              createdAt: now - 30000000,
              updatedAt: now - 30000000,
            },
          ];
          await db.files.bulkPut(extraPics);
          items = await db.files.toArray();
        }
      }
      allItems.value = items;
      loadThumbnailsForItems(items);
    } catch (err) {
      console.error('Error al cargar sistema de archivos:', err);
    }
  }

  // Inicializar sistema con datos predeterminados
  async function seedDefaultFileSystem() {
    const now = Date.now();
    const defaults: FileItem[] = [
      // Raíces del sistema
      { id: 'desktop', name: 'Escritorio', parentId: 'root', type: 'folder', size: 0, createdAt: now, updatedAt: now, isSystem: true },
      { id: 'documents', name: 'Documentos', parentId: 'root', type: 'folder', size: 0, createdAt: now, updatedAt: now, isSystem: true },
      { id: 'downloads', name: 'Descargas', parentId: 'root', type: 'folder', size: 0, createdAt: now, updatedAt: now, isSystem: true },
      { id: 'pictures', name: 'Imágenes', parentId: 'root', type: 'folder', size: 0, createdAt: now, updatedAt: now, isSystem: true },
      { id: 'music', name: 'Música', parentId: 'root', type: 'folder', size: 0, createdAt: now, updatedAt: now, isSystem: true },
      { id: 'videos', name: 'Videos', parentId: 'root', type: 'folder', size: 0, createdAt: now, updatedAt: now, isSystem: true },

      // Subcarpetas en Documentos
      { id: 'doc-projects', name: 'Proyectos Frost-OS', parentId: 'documents', type: 'folder', size: 0, createdAt: now - 3600000, updatedAt: now - 3600000 },
      { id: 'doc-notes', name: 'Notas Rápidas', parentId: 'documents', type: 'folder', size: 0, createdAt: now - 7200000, updatedAt: now - 7200000 },

      // Archivos en Documentos
      {
        id: 'file-welcome',
        name: 'Bienvenido_a_FrostOS.txt',
        parentId: 'documents',
        type: 'file',
        extension: 'txt',
        size: 428,
        mimeType: 'text/plain',
        textContent: `¡Bienvenido al Explorador de Archivos de Frost-OS! 📁✨\n\nAquí tienes el control total sobre tus archivos:\n- Crea nuevas carpetas y archivos con el botón "+ Nuevo"\n- Sube archivos desde tu equipo real con el botón "Cargar archivos" o simplemente arrastrándolos y soltándolos aquí (Drag & Drop).\n- Haz doble clic para ver imágenes y editar archivos de texto.\n- Organiza, copia, corta, pega, renombra o descarga archivos.\n\nDesarrollado para Nekomi Systems.`,
        createdAt: now - 1800000,
        updatedAt: now - 1800000,
      },
      {
        id: 'file-arch',
        name: 'Arquitectura_Sistema.md',
        parentId: 'doc-projects',
        type: 'file',
        extension: 'md',
        size: 1024,
        mimeType: 'text/markdown',
        textContent: `# Arquitectura de Frost-OS ❄️\n\n## Tecnologías Clave\n- **Vue 3 + Composition API**: Interfaz reactiva fluida y desacoplada.\n- **Pinia**: Gestión global y persistente de estados del sistema.\n- **Dexie.js (IndexedDB)**: Almacenamiento local persistente con soporte para Blobs binarios.\n- **Fluent Acrylic CSS**: Efectos visuales translúcidos estilo Windows 11.\n\n## Novedades v2.4\n- Sistema de archivos completo con soporte de carga desde navegador.\n- Gestión de portapapeles y previsualizaciones en vivo.`,
        createdAt: now - 86400000,
        updatedAt: now - 86400000,
      },
      {
        id: 'file-ideas',
        name: 'ideas_futuras.txt',
        parentId: 'doc-notes',
        type: 'file',
        extension: 'txt',
        size: 210,
        mimeType: 'text/plain',
        textContent: `Ideas para las próximas actualizaciones:\n1. Reproductor de música integrado en la barra.\n2. Lector de PDFs interactivo.\n3. Temas de color personalizables avanzados.\n4. Integración de nube NekomiDrive.`,
        createdAt: now - 43200000,
        updatedAt: now - 43200000,
      },

      // Archivos en Imágenes
      { id: 'pic-wallpapers', name: 'Fondos de Pantalla', parentId: 'pictures', type: 'folder', size: 0, createdAt: now - 10000000, updatedAt: now - 10000000 },
      {
        id: 'file-sample-pic',
        name: 'nekomi_wallpaper.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 3768399,
        mimeType: 'image/jpeg',
        createdAt: now - 50000000,
        updatedAt: now - 50000000,
      },
      {
        id: 'file-sample-pic-2',
        name: 'aurora_nordica.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 680031,
        mimeType: 'image/jpeg',
        createdAt: now - 48000000,
        updatedAt: now - 48000000,
      },
      {
        id: 'file-sample-pic-3',
        name: 'horizonte_ciberpunk.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 1935350,
        mimeType: 'image/jpeg',
        createdAt: now - 46000000,
        updatedAt: now - 46000000,
      },
      {
        id: 'file-sample-pic-4',
        name: 'montanas_atardecer.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 1561314,
        mimeType: 'image/jpeg',
        createdAt: now - 44000000,
        updatedAt: now - 44000000,
      },
      {
        id: 'file-sample-pic-5',
        name: 'bosque_niebla.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 803680,
        mimeType: 'image/jpeg',
        createdAt: now - 42000000,
        updatedAt: now - 42000000,
      },
      {
        id: 'file-sample-pic-6',
        name: 'oceano_calmo.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 1654842,
        mimeType: 'image/jpeg',
        createdAt: now - 40000000,
        updatedAt: now - 40000000,
      },
      {
        id: 'file-sample-pic-7',
        name: 'flor_de_loto.jpg',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'jpg',
        size: 4876882,
        mimeType: 'image/jpeg',
        createdAt: now - 38000000,
        updatedAt: now - 38000000,
      },
      {
        id: 'file-sample-pic-8',
        name: 'nekodrive_space.png',
        parentId: 'pic-wallpapers',
        type: 'file',
        extension: 'png',
        size: 221087,
        mimeType: 'image/png',
        createdAt: now - 36000000,
        updatedAt: now - 36000000,
      },
      {
        id: 'file-sample-pic-9',
        name: 'foto_vacaciones_playa.jpg',
        parentId: 'pictures',
        type: 'file',
        extension: 'jpg',
        size: 808602,
        mimeType: 'image/jpeg',
        createdAt: now - 34000000,
        updatedAt: now - 34000000,
      },
      {
        id: 'file-sample-pic-10',
        name: 'sesion_fotografica.jpg',
        parentId: 'pictures',
        type: 'file',
        extension: 'jpg',
        size: 854211,
        mimeType: 'image/jpeg',
        createdAt: now - 32000000,
        updatedAt: now - 32000000,
      },
      {
        id: 'file-sample-pic-11',
        name: 'paisaje_urbano.jpg',
        parentId: 'pictures',
        type: 'file',
        extension: 'jpg',
        size: 2006140,
        mimeType: 'image/jpeg',
        createdAt: now - 30000000,
        updatedAt: now - 30000000,
      },

      // Archivos en Descargas
      {
        id: 'file-dl-zip',
        name: 'FrostOS_Assets_Pack_v2.zip',
        parentId: 'downloads',
        type: 'file',
        extension: 'zip',
        size: 19450000,
        mimeType: 'application/zip',
        createdAt: now - 90000000,
        updatedAt: now - 90000000,
      },
      {
        id: 'file-dl-manual',
        name: 'Manual_Usuario_FrostOS.pdf',
        parentId: 'downloads',
        type: 'file',
        extension: 'pdf',
        size: 2450000,
        mimeType: 'application/pdf',
        createdAt: now - 60000000,
        updatedAt: now - 60000000,
      },

      // Archivos en Música
      {
        id: 'file-music-1',
        name: 'Synthwave_NightCity_Mix.mp3',
        parentId: 'music',
        type: 'file',
        extension: 'mp3',
        size: 6840000,
        mimeType: 'audio/mpeg',
        createdAt: now - 120000000,
        updatedAt: now - 120000000,
      },
      {
        id: 'file-music-2',
        name: 'Nekomi_LoFi_Study_Session.mp3',
        parentId: 'music',
        type: 'file',
        extension: 'mp3',
        size: 4950000,
        mimeType: 'audio/mpeg',
        createdAt: now - 110000000,
        updatedAt: now - 110000000,
      },

      // Archivos en Escritorio
      {
        id: 'file-desktop-note',
        name: 'recordatorio_importante.txt',
        parentId: 'desktop',
        type: 'file',
        extension: 'txt',
        size: 165,
        mimeType: 'text/plain',
        textContent: `Recuerda:\nPuedes subir cualquier imagen, canción o documento desde tu equipo utilizando el botón "Cargar archivos" en la barra superior.`,
        createdAt: now - 20000000,
        updatedAt: now - 20000000,
      },
    ];

    await db.files.bulkPut(defaults);
  }

  // Elementos de la carpeta actual con filtro de búsqueda y orden
  const currentItems = computed(() => {
    let list = allItems.value.filter((item) => item.parentId === currentFolderId.value);

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      list = allItems.value.filter(
        (item) =>
          item.name.toLowerCase().includes(q) &&
          (isDescendantOf(item.parentId, currentFolderId.value) || item.parentId === currentFolderId.value)
      );
    }

    // Ordenar: primero carpetas, luego archivos
    list.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      let valA: any = a[sortBy.value];
      let valB: any = b[sortBy.value];

      if (sortBy.value === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      }

      if (valA < valB) return sortOrder.value === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder.value === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  });

  // Cargar thumbnails automáticamente cada vez que cambien los elementos mostrados
  watch(
    () => currentItems.value,
    (items) => {
      loadThumbnailsForItems(items);
    },
    { immediate: true, deep: true }
  );

  // Carpeta actual
  const currentFolder = computed(() => {
    if (currentFolderId.value === 'root') {
      return { id: 'root', name: 'Este equipo', parentId: '', type: 'folder', size: 0, createdAt: 0, updatedAt: 0 };
    }
    return allItems.value.find((i) => i.id === currentFolderId.value) || null;
  });

  // Migas de pan (Breadcrumbs)
  const breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const crumbs: BreadcrumbItem[] = [];
    if (currentFolderId.value === 'root') {
      return [{ id: 'root', name: 'Este equipo', icon: 'bi-pc-display' }];
    }

    let curr: string | undefined = currentFolderId.value;
    while (curr && curr !== 'root') {
      const found = allItems.value.find((i) => i.id === curr);
      if (found) {
        crumbs.unshift({ id: found.id, name: found.name });
        curr = found.parentId;
      } else {
        break;
      }
    }

    crumbs.unshift({ id: 'root', name: 'Este equipo', icon: 'bi-pc-display' });
    return crumbs;
  });

  // Saber si un folder es descendiente de otro
  function isDescendantOf(childParentId: string, targetFolderId: string): boolean {
    if (targetFolderId === 'root') return true;
    let curr = childParentId;
    let depth = 0;
    while (curr && curr !== 'root' && depth < 20) {
      if (curr === targetFolderId) return true;
      const found = allItems.value.find((i) => i.id === curr);
      if (!found) break;
      curr = found.parentId;
      depth++;
    }
    return false;
  }

  // Navegación
  function navigateTo(folderId: string) {
    if (currentFolderId.value === folderId) return;

    // Truncar historial si estábamos en medio
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }

    history.value.push(folderId);
    historyIndex.value = history.value.length - 1;
    currentFolderId.value = folderId;
    selectedIds.value = [];
    searchQuery.value = '';
  }

  function navigateBack() {
    if (historyIndex.value > 0) {
      historyIndex.value--;
      currentFolderId.value = history.value[historyIndex.value];
      selectedIds.value = [];
      searchQuery.value = '';
    }
  }

  function navigateForward() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++;
      currentFolderId.value = history.value[historyIndex.value];
      selectedIds.value = [];
      searchQuery.value = '';
    }
  }

  function navigateUp() {
    if (currentFolderId.value === 'root') return;
    const current = currentFolder.value;
    if (current && current.parentId) {
      navigateTo(current.parentId);
    } else {
      navigateTo('root');
    }
  }

  const canNavigateBack = computed(() => historyIndex.value > 0);
  const canNavigateForward = computed(() => historyIndex.value < history.value.length - 1);
  const canNavigateUp = computed(() => currentFolderId.value !== 'root');

  // Selección
  function selectItem(id: string, multi = false) {
    if (multi) {
      const idx = selectedIds.value.indexOf(id);
      if (idx >= 0) {
        selectedIds.value.splice(idx, 1);
      } else {
        selectedIds.value.push(id);
      }
    } else {
      selectedIds.value = [id];
    }
  }

  function clearSelection() {
    selectedIds.value = [];
  }

  function selectAll() {
    selectedIds.value = currentItems.value.map((i) => i.id);
  }

  // Operaciones de Archivos: Crear Carpeta
  async function createFolder(customName?: string) {
    const parent = currentFolderId.value === 'root' ? 'documents' : currentFolderId.value;
    let baseName = customName || 'Nueva carpeta';
    let finalName = baseName;
    let count = 1;

    while (allItems.value.some((i) => i.parentId === parent && i.name.toLowerCase() === finalName.toLowerCase())) {
      count++;
      finalName = `${baseName} (${count})`;
    }

    const newFolder: FileItem = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: finalName,
      parentId: parent,
      type: 'folder',
      size: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.files.put(newFolder);
    await loadAllFiles();
    selectedIds.value = [newFolder.id];
    return newFolder;
  }

  // Operaciones de Archivos: Crear Archivo de Texto
  async function createTextFile(customName?: string, content = '') {
    const parent = currentFolderId.value === 'root' ? 'documents' : currentFolderId.value;
    let baseName = customName || 'Nuevo documento de texto';
    let extension = 'txt';
    let finalName = `${baseName}.${extension}`;
    let count = 1;

    while (allItems.value.some((i) => i.parentId === parent && i.name.toLowerCase() === finalName.toLowerCase())) {
      count++;
      finalName = `${baseName} (${count}).${extension}`;
    }

    const newFile: FileItem = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: finalName,
      parentId: parent,
      type: 'file',
      extension,
      size: new Blob([content]).size,
      mimeType: 'text/plain',
      textContent: content,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.files.put(newFile);
    await loadAllFiles();
    selectedIds.value = [newFile.id];
    return newFile;
  }

  // Carga de Archivos desde el Navegador (Upload)
  async function uploadFiles(files: FileList | File[]) {
    if (!files || files.length === 0) return;

    isUploading.value = true;
    uploadStatus.value = `Subiendo ${files.length} archivo(s)...`;
    const targetFolder = currentFolderId.value === 'root' ? 'documents' : currentFolderId.value;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const assetId = `asset-file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        // Guardar el Blob en Dexie assets
        await db.assets.put({
          id: assetId,
          name: file.name,
          data: file,
          type: file.type || 'application/octet-stream',
        });

        // Si es texto, leer su contenido
        let textContent: string | undefined = undefined;
        const isText =
          file.type.startsWith('text/') ||
          /\.(txt|md|json|js|ts|html|css|csv|xml|log|py|vue|yaml|yml)$/i.test(file.name);

        if (isText && file.size < 5 * 1024 * 1024) {
          try {
            textContent = await file.text();
          } catch (e) {
            console.warn('No se pudo leer texto del archivo:', file.name, e);
          }
        }

        const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';

        // Comprobar si ya existe con ese nombre en la carpeta
        let finalName = file.name;
        let count = 1;
        const nameParts = file.name.lastIndexOf('.') > 0 ? file.name.substring(0, file.name.lastIndexOf('.')) : file.name;
        const extensionPart = ext ? `.${ext}` : '';

        while (allItems.value.some((it) => it.parentId === targetFolder && it.name.toLowerCase() === finalName.toLowerCase())) {
          count++;
          finalName = `${nameParts} (${count})${extensionPart}`;
        }

        const newFileItem: FileItem = {
          id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: finalName,
          parentId: targetFolder,
          type: 'file',
          extension: ext,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          assetId: assetId,
          textContent: textContent,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name)) {
          thumbnailUrls.value[newFileItem.id] = URL.createObjectURL(file);
        }

        await db.files.put(newFileItem);
      }

      await loadAllFiles();
      uploadStatus.value = `¡${files.length} archivo(s) subidos con éxito!`;
    } catch (err) {
      console.error('Error al subir archivos:', err);
      uploadStatus.value = 'Error al subir archivos.';
    } finally {
      setTimeout(() => {
        isUploading.value = false;
        uploadStatus.value = '';
      }, 2000);
    }
  }

  // Renombrar elemento
  async function renameItem(id: string, newName: string) {
    const item = allItems.value.find((i) => i.id === id);
    if (!item || !newName.trim()) return false;

    const trimmed = newName.trim();
    if (trimmed === item.name) return true;

    // Verificar colisión en la misma carpeta
    const collision = allItems.value.some(
      (i) => i.parentId === item.parentId && i.id !== id && i.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (collision) return false;

    item.name = trimmed;
    if (item.type === 'file' && trimmed.includes('.')) {
      item.extension = trimmed.split('.').pop()?.toLowerCase();
    }
    item.updatedAt = Date.now();

    await db.files.put(item);
    await loadAllFiles();
    return true;
  }

  // Eliminar elementos
  async function deleteItems(ids: string[]) {
    if (!ids || ids.length === 0) return;

    const toDeleteIds = new Set<string>();

    function collectRecursive(id: string) {
      toDeleteIds.add(id);
      const children = allItems.value.filter((i) => i.parentId === id);
      for (const child of children) {
        collectRecursive(child.id);
      }
    }

    for (const id of ids) {
      const item = allItems.value.find((i) => i.id === id);
      if (item && !item.isSystem) {
        collectRecursive(id);
      }
    }

    // Eliminar assets y thumbnails asociados
    for (const delId of toDeleteIds) {
      const item = allItems.value.find((i) => i.id === delId);
      if (item?.assetId) {
        await db.assets.delete(item.assetId);
      }
      if (thumbnailUrls.value[delId]) {
        if (thumbnailUrls.value[delId].startsWith('blob:')) {
          URL.revokeObjectURL(thumbnailUrls.value[delId]);
        }
        delete thumbnailUrls.value[delId];
      }
    }

    await db.files.bulkDelete(Array.from(toDeleteIds));
    selectedIds.value = [];
    await loadAllFiles();
  }

  // Portapapeles: Copiar / Cortar
  function copySelected() {
    if (selectedIds.value.length === 0) return;
    clipboard.value = { action: 'copy', itemIds: [...selectedIds.value] };
  }

  function cutSelected() {
    if (selectedIds.value.length === 0) return;
    clipboard.value = { action: 'cut', itemIds: [...selectedIds.value] };
  }

  // Pegar en la carpeta actual
  async function paste() {
    if (!clipboard.value || clipboard.value.itemIds.length === 0) return;

    const targetFolder = currentFolderId.value === 'root' ? 'documents' : currentFolderId.value;
    const { action, itemIds } = clipboard.value;

    if (action === 'cut') {
      for (const id of itemIds) {
        const item = allItems.value.find((i) => i.id === id);
        // Evitar mover una carpeta dentro de sí misma
        if (item && item.id !== targetFolder && !isDescendantOf(targetFolder, item.id)) {
          item.parentId = targetFolder;
          item.updatedAt = Date.now();
          await db.files.put(item);
        }
      }
      clipboard.value = null; // Limpiar al cortar
    } else if (action === 'copy') {
      for (const id of itemIds) {
        const item = allItems.value.find((i) => i.id === id);
        if (item) {
          await duplicateItem(item, targetFolder);
        }
      }
    }

    await loadAllFiles();
  }

  // Duplicar elemento recursivamente para copy-paste
  async function duplicateItem(source: FileItem, targetParentId: string) {
    let newName = source.name;
    const ext = source.extension ? `.${source.extension}` : '';
    const baseName = source.extension ? source.name.slice(0, -(source.extension.length + 1)) : source.name;
    let count = 1;

    while (allItems.value.some((i) => i.parentId === targetParentId && i.name.toLowerCase() === newName.toLowerCase())) {
      newName = `${baseName} - copia${count > 1 ? ` (${count})` : ''}${ext}`;
      count++;
    }

    let newAssetId: string | undefined = undefined;
    if (source.assetId) {
      const originalAsset = await db.assets.get(source.assetId);
      if (originalAsset) {
        newAssetId = `asset-copy-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        await db.assets.put({
          id: newAssetId,
          name: newName,
          data: originalAsset.data,
          type: originalAsset.type,
        });
      }
    }

    const newItem: FileItem = {
      id: `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newName,
      parentId: targetParentId,
      type: source.type,
      extension: source.extension,
      size: source.size,
      mimeType: source.mimeType,
      assetId: newAssetId,
      textContent: source.textContent,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.files.put(newItem);

    // Si es carpeta, duplicar también sus hijos
    if (source.type === 'folder') {
      const children = allItems.value.filter((i) => i.parentId === source.id);
      for (const child of children) {
        await duplicateItem(child, newItem.id);
      }
    }
  }

  // Descargar archivo a la computadora real
  async function downloadFile(item: FileItem) {
    if (item.type === 'folder') {
      alert('Solo se pueden descargar archivos individuales.');
      return;
    }

    let blob: Blob | null = null;

    if (item.assetId) {
      const asset = await db.assets.get(item.assetId);
      if (asset) blob = asset.data;
    }

    if (!blob && item.textContent !== undefined) {
      blob = new Blob([item.textContent], { type: item.mimeType || 'text/plain;charset=utf-8' });
    }

    if (!blob) {
      blob = new Blob([`Archivo de Frost-OS: ${item.name}`], { type: 'text/plain' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // Abrir elemento (Doble clic)
  async function openItem(item: FileItem) {
    if (item.type === 'folder') {
      navigateTo(item.id);
      return;
    }

    // Si es archivo
    previewItem.value = item;

    // 1. Imagen
    if (
      item.mimeType?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(item.name)
    ) {
      if (previewBlobUrl.value) {
        URL.revokeObjectURL(previewBlobUrl.value);
        previewBlobUrl.value = null;
      }

      if (thumbnailUrls.value[item.id]) {
        previewBlobUrl.value = thumbnailUrls.value[item.id];
      } else if (item.assetId) {
        const asset = await db.assets.get(item.assetId);
        if (asset) {
          previewBlobUrl.value = URL.createObjectURL(asset.data);
        }
      } else {
        // Imagen predeterminada o wallpaper del sistema
        previewBlobUrl.value = resolveSystemImageUrl(item.id, item.name) || '/wallpapers/default-wallpaper.jpg';
      }

      showImagePreview.value = true;
      return;
    }

    // 2. Texto o Código
    const isText =
      item.mimeType?.startsWith('text/') ||
      /\.(txt|md|json|js|ts|html|css|csv|xml|log|py|vue|yaml|yml|sql|sh)$/i.test(item.name);

    if (isText || item.textContent !== undefined) {
      let content = item.textContent || '';
      if (!content && item.assetId) {
        const asset = await db.assets.get(item.assetId);
        if (asset && asset.data instanceof Blob) {
          content = await asset.data.text();
        }
      }
      previewTextContent.value = content;
      textEditorDraft.value = content;
      showTextEditor.value = true;
      isEditingText.value = false;
      return;
    }

    // 3. Otro archivo: mostrar modal de propiedades y descarga
    showPropertiesModal.value = true;
  }

  // Guardar cambios de texto desde el editor
  async function saveTextDraft() {
    if (!previewItem.value) return;

    previewItem.value.textContent = textEditorDraft.value;
    previewItem.value.size = new Blob([textEditorDraft.value]).size;
    previewItem.value.updatedAt = Date.now();

    // Actualizar asset si existe
    if (previewItem.value.assetId) {
      const blob = new Blob([textEditorDraft.value], { type: previewItem.value.mimeType || 'text/plain' });
      await db.assets.put({
        id: previewItem.value.assetId,
        name: previewItem.value.name,
        data: blob,
        type: previewItem.value.mimeType || 'text/plain',
      });
    }

    await db.files.put(previewItem.value);
    previewTextContent.value = textEditorDraft.value;
    isEditingText.value = false;
    await loadAllFiles();
  }

  function closeModals() {
    if (previewBlobUrl.value) {
      URL.revokeObjectURL(previewBlobUrl.value);
      previewBlobUrl.value = null;
    }
    showImagePreview.value = false;
    showTextEditor.value = false;
    showPropertiesModal.value = false;
    previewItem.value = null;
  }

  // Helpers de visualización
  function formatSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function formatDate(timestamp: number): string {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
  }

  function getFileIcon(item: FileItem): string {
    if (item.type === 'folder') {
      if (item.isSystem) {
        if (item.id === 'desktop') return 'bi-display text-primary';
        if (item.id === 'documents') return 'bi-folder-fill text-warning';
        if (item.id === 'downloads') return 'bi-arrow-down-circle-fill text-info';
        if (item.id === 'pictures') return 'bi-images text-danger';
        if (item.id === 'music') return 'bi-music-note-list text-success';
        if (item.id === 'videos') return 'bi-film text-purple';
      }
      return 'bi-folder-fill text-warning';
    }

    const ext = (item.extension || '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      return 'bi-file-earmark-image text-danger';
    }
    if (['txt', 'log'].includes(ext)) {
      return 'bi-file-earmark-text text-light';
    }
    if (['md'].includes(ext)) {
      return 'bi-markdown text-info';
    }
    if (['pdf'].includes(ext)) {
      return 'bi-file-earmark-pdf-fill text-danger';
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return 'bi-file-earmark-zip-fill text-warning';
    }
    if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
      return 'bi-file-earmark-music-fill text-success';
    }
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
      return 'bi-file-earmark-play-fill text-primary';
    }
    if (['js', 'ts', 'json', 'html', 'css', 'vue', 'py'].includes(ext)) {
      return 'bi-file-earmark-code text-info';
    }
    if (['doc', 'docx'].includes(ext)) {
      return 'bi-file-earmark-word text-primary';
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
      return 'bi-file-earmark-excel text-success';
    }
    return 'bi-file-earmark text-secondary';
  }

  // Calcular espacio total usado
  const totalUsedStorage = computed(() => {
    return allItems.value.reduce((acc, curr) => acc + (curr.size || 0), 0);
  });

  return {
    currentFolderId,
    allItems,
    selectedIds,
    searchQuery,
    viewMode,
    sortBy,
    sortOrder,
    clipboard,
    systemFolders,
    currentItems,
    currentFolder,
    breadcrumbs,
    canNavigateBack,
    canNavigateForward,
    canNavigateUp,
    previewItem,
    previewTextContent,
    previewBlobUrl,
    showTextEditor,
    showImagePreview,
    showPropertiesModal,
    isEditingText,
    textEditorDraft,
    isUploading,
    uploadStatus,
    totalUsedStorage,
    loadAllFiles,
    navigateTo,
    navigateBack,
    navigateForward,
    navigateUp,
    selectItem,
    clearSelection,
    selectAll,
    createFolder,
    createTextFile,
    uploadFiles,
    renameItem,
    deleteItems,
    copySelected,
    cutSelected,
    paste,
    downloadFile,
    openItem,
    saveTextDraft,
    closeModals,
    formatSize,
    formatDate,
    getFileIcon,
    thumbnailUrls,
    getThumbnail,
    handleThumbnailError,
    loadThumbnailsForItems,
    isImageFile,
  };
});
