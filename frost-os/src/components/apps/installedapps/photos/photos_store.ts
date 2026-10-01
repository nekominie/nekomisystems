import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, type FileItem } from '../../../../database/db';
import { useSettingsStore } from '../../coreapps/settings/store';
import { resolveSystemImageUrl, resolveSystemThumbnailUrl } from '../explorer/thumbnail_utils';
import { getOrCreateThumbnail, clearThumbnailCache } from './thumbnail_cache';

export interface PhotoItem {
  id: string;
  name: string;
  url: string;
  thumbUrl: string;
  size?: number;
  date?: number;
  source: 'file' | 'asset' | 'system';
  fileItem?: FileItem;
  assetId?: string;
  folderName?: string;
  width?: number;
  height?: number;
}

export const usePhotosStore = defineStore('photosStore', () => {
  const photos = ref<PhotoItem[]>([]);
  const activePhotoId = ref<string | null>(null);
  const currentView = ref<'viewer' | 'gallery'>('gallery');
  const searchQuery = ref<string>('');
  const trackedBlobUrls = new Set<string>();

  function revokeTrackedBlobUrls() {
    for (const url of trackedBlobUrls) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
    trackedBlobUrls.clear();
  }

  // Controles de transformación
  const zoom = ref<number>(1);
  const rotation = ref<number>(0);
  const isFlipped = ref<boolean>(false);
  const showInfoDrawer = ref<boolean>(false);

  // Presentación de diapositivas
  const isSlideshowActive = ref<boolean>(false);
  let slideshowTimer: number | null = null;

  // Foto activa computada
  const activePhoto = computed<PhotoItem | null>(() => {
    if (!activePhotoId.value) return photos.value[0] || null;
    return photos.value.find((p) => p.id === activePhotoId.value) || photos.value[0] || null;
  });

  const activePhotoIndex = computed(() => {
    if (!activePhoto.value) return -1;
    return photos.value.findIndex((p) => p.id === activePhoto.value!.id);
  });

  // Fotos filtradas para la galería
  const filteredPhotos = computed(() => {
    if (!searchQuery.value.trim()) return photos.value;
    const q = searchQuery.value.toLowerCase().trim();
    return photos.value.filter((p) => p.name.toLowerCase().includes(q));
  });

  // Cargar todas las fotos del sistema operativo
  async function loadAllPhotos() {
    const list: PhotoItem[] = [];
    const seenUrls = new Set<string>();

    // Liberar ObjectURLs anteriores para evitar fugas de memoria
    revokeTrackedBlobUrls();

    try {
      // 1. Cargar desde la tabla de archivos (db.files)
      const allFiles = await db.files.toArray();
      const imageFiles = allFiles.filter(
        (f) =>
          f.type === 'file' &&
          (f.mimeType?.startsWith('image/') ||
            /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(f.name))
      );

      for (const file of imageFiles) {
        let photoUrl = '';
        let thumbUrl = '';

        if (file.assetId) {
          const asset = await db.assets.get(file.assetId);
          if (asset && asset.data) {
            photoUrl = URL.createObjectURL(asset.data);
            trackedBlobUrls.add(photoUrl);
          }
        }

        // Si es archivo del sistema o wallpaper
        if (!photoUrl) {
          photoUrl = resolveSystemImageUrl(file.id, file.name) || '';
          thumbUrl = resolveSystemThumbnailUrl(file.id, file.name) || '';
        }

        if (photoUrl && !seenUrls.has(photoUrl)) {
          const item: PhotoItem = {
            id: `file-${file.id}`,
            name: file.name,
            url: photoUrl,
            thumbUrl: thumbUrl || photoUrl,
            size: file.size,
            date: file.updatedAt || file.createdAt,
            source: 'file',
            fileItem: file,
            assetId: file.assetId,
            folderName: file.parentId,
          };

          // Si es un asset de usuario sin thumbnail estático, generarlo en background
          if (!thumbUrl && file.assetId) {
            getOrCreateThumbnail(photoUrl).then((thumb) => {
              if (thumb) item.thumbUrl = thumb;
            });
          }

          list.push(item);
          seenUrls.add(photoUrl);
        }
      }

      // 2. Cargar fotos del sistema (Wallpapers preinstalados en Frost-OS) con miniaturas estáticas instantáneas
      const systemWallpapers: { name: string; url: string; thumbUrl: string }[] = [
        { name: 'Aurora_Nordica.jpg', url: '/wallpapers/default-wallpaper.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper.jpg' },
        { name: 'Nebulosa_Cosmica.jpg', url: '/wallpapers/default-wallpaper1.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper1.jpg' },
        { name: 'Horizonte_Ciberpunk.jpg', url: '/wallpapers/default-wallpaper2.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper2.jpg' },
        { name: 'Montanas_al_Atardecer.jpg', url: '/wallpapers/default-wallpaper3.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper3.jpg' },
        { name: 'Bosque_de_Niebla.jpg', url: '/wallpapers/default-wallpaper4.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper4.jpg' },
        { name: 'Oceano_Calmo.jpg', url: '/wallpapers/default-wallpaper5.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper5.jpg' },
        { name: 'Geometria_Abstracta.jpg', url: '/wallpapers/default-wallpaper6.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper6.jpg' },
        { name: 'Flor_de_Loto.jpg', url: '/wallpapers/default-wallpaper7.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper7.jpg' },
        { name: 'Luces_de_Neon.jpg', url: '/wallpapers/default-wallpaper8.jpg', thumbUrl: '/wallpapers/thumbs/default-wallpaper8.jpg' },
        { name: 'NekoDrive_Cosmos.png', url: '/wallpapers/nekodrive-bg.png', thumbUrl: '/wallpapers/thumbs/nekodrive-bg.jpg' },
      ];

      for (const sys of systemWallpapers) {
        if (!seenUrls.has(sys.url)) {
          list.push({
            id: `sys-${sys.name}`,
            name: sys.name,
            url: sys.url,
            thumbUrl: sys.thumbUrl,
            size: 1920 * 1080 * 3, // Tamaño estimado
            date: Date.now() - 86400000 * 5,
            source: 'system',
            folderName: 'Fondos de Frost-OS',
          });
          seenUrls.add(sys.url);
        }
      }

      photos.value = list;

      if (!activePhotoId.value && list.length > 0) {
        activePhotoId.value = list[0].id;
      }
    } catch (err) {
      console.error('Error al cargar fotos:', err);
    }
  }

  // Resolver o cargar una foto desde un FileItem sin forzar la vista global
  async function resolvePhotoFromFile(fileItem: FileItem): Promise<PhotoItem | null> {
    if (photos.value.length === 0) {
      await loadAllPhotos();
    }

    let target = photos.value.find((p) => p.fileItem?.id === fileItem.id);

    if (!target) {
      let photoUrl = '';
      if (fileItem.assetId) {
        const asset = await db.assets.get(fileItem.assetId);
        if (asset && asset.data) {
          photoUrl = URL.createObjectURL(asset.data);
          trackedBlobUrls.add(photoUrl);
        }
      }
      if (!photoUrl) {
        photoUrl = resolveSystemImageUrl(fileItem.id, fileItem.name) || '';
      }

      if (photoUrl) {
        target = {
          id: `file-${fileItem.id}`,
          name: fileItem.name,
          url: photoUrl,
          thumbUrl: photoUrl,
          size: fileItem.size,
          date: fileItem.updatedAt || fileItem.createdAt,
          source: 'file',
          fileItem: fileItem,
          assetId: fileItem.assetId,
          folderName: fileItem.parentId,
        };
        photos.value.unshift(target);
      }
    }

    return target || null;
  }

  // Abrir una foto específica desde el Navegador de Archivos (compatibilidad)
  async function openPhotoFromFile(fileItem: FileItem) {
    const target = await resolvePhotoFromFile(fileItem);
    if (target) {
      activePhotoId.value = target.id;
    }
    resetTransform();
    currentView.value = 'viewer';
  }

  function openPhoto(photo: PhotoItem) {
    activePhotoId.value = photo.id;
    resetTransform();
    currentView.value = 'viewer';
  }

  // Navegación siguiente / anterior
  function nextPhoto() {
    if (photos.value.length === 0) return;
    const currentIndex = activePhotoIndex.value;
    const nextIndex = (currentIndex + 1) % photos.value.length;
    activePhotoId.value = photos.value[nextIndex].id;
    resetTransform();
  }

  function prevPhoto() {
    if (photos.value.length === 0) return;
    const currentIndex = activePhotoIndex.value;
    const prevIndex = (currentIndex - 1 + photos.value.length) % photos.value.length;
    activePhotoId.value = photos.value[prevIndex].id;
    resetTransform();
  }

  // Controles de zoom y orientación
  function zoomIn() {
    zoom.value = Math.min(4, +(zoom.value + 0.25).toFixed(2));
  }

  function zoomOut() {
    zoom.value = Math.max(0.25, +(zoom.value - 0.25).toFixed(2));
  }

  function rotate() {
    rotation.value = (rotation.value + 90) % 360;
  }

  function flip() {
    isFlipped.value = !isFlipped.value;
  }

  function resetTransform() {
    zoom.value = 1;
    rotation.value = 0;
    isFlipped.value = false;
  }

  // Diapositivas
  function toggleSlideshow() {
    if (isSlideshowActive.value) {
      stopSlideshow();
    } else {
      startSlideshow();
    }
  }

  function startSlideshow() {
    if (photos.value.length <= 1) return;
    isSlideshowActive.value = true;
    currentView.value = 'viewer';
    slideshowTimer = window.setInterval(() => {
      nextPhoto();
    }, 3000);
  }

  function stopSlideshow() {
    isSlideshowActive.value = false;
    if (slideshowTimer) {
      clearInterval(slideshowTimer);
      slideshowTimer = null;
    }
  }

  // Establecer foto actual como Wallpaper del sistema
  async function setAsWallpaper(photo?: PhotoItem) {
    const target = photo || activePhoto.value;
    if (!target) return;

    const settingsStore = useSettingsStore();

    if (target.assetId) {
      const asset = await db.assets.get(target.assetId);
      if (asset && asset.data instanceof File) {
        await settingsStore.updateWallpaper(asset.data);
        return;
      }
    }

    // Si es una URL directa (como un wallpaper del sistema)
    try {
      const response = await fetch(target.url);
      const blob = await response.blob();
      const file = new File([blob], target.name, { type: blob.type || 'image/jpeg' });
      await settingsStore.updateWallpaper(file);
    } catch (e) {
      console.warn('Error al establecer fondo desde URL, aplicando directa:', e);
      settingsStore.wallpaperUrl = target.url;
      settingsStore.isCustomWallpaper = true;
    }
  }

  // Descargar foto
  async function downloadPhoto(photo?: PhotoItem) {
    const target = photo || activePhoto.value;
    if (!target) return;

    try {
      const response = await fetch(target.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = target.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error('Error al descargar foto:', err);
    }
  }

  // Eliminar foto específica
  async function deletePhoto(target: PhotoItem) {
    if (target.source === 'file' && target.fileItem) {
      await db.files.delete(target.fileItem.id);
      if (target.assetId) {
        await db.assets.delete(target.assetId);
      }
    }

    const idx = photos.value.findIndex((p) => p.id === target.id);
    if (idx !== -1) {
      photos.value.splice(idx, 1);
    }
  }

  // Eliminar foto activa
  async function deleteActivePhoto() {
    const target = activePhoto.value;
    if (!target) return;

    await deletePhoto(target);

    if (photos.value.length > 0) {
      const nextIdx = Math.min(0, photos.value.length - 1);
      activePhotoId.value = photos.value[nextIdx]?.id || null;
    } else {
      activePhotoId.value = null;
      currentView.value = 'gallery';
    }
  }

  return {
    photos,
    activePhotoId,
    activePhoto,
    activePhotoIndex,
    filteredPhotos,
    currentView,
    searchQuery,
    zoom,
    rotation,
    isFlipped,
    showInfoDrawer,
    isSlideshowActive,
    loadAllPhotos,
    openPhotoFromFile,
    resolvePhotoFromFile,
    openPhoto,
    nextPhoto,
    prevPhoto,
    zoomIn,
    zoomOut,
    rotate,
    flip,
    resetTransform,
    toggleSlideshow,
    stopSlideshow,
    setAsWallpaper,
    downloadPhoto,
    deleteActivePhoto,
    deletePhoto,
    revokeTrackedBlobUrls,
    clearThumbnailCache,
  };
});
