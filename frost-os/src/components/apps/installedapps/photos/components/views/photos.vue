<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePhotosStore, type PhotoItem } from '../../photos_store';
import { useFileSystemStore } from '../../../explorer/file_system_store';

const photosStore = usePhotosStore();
const fs = useFileSystemStore();

// Referencias
const fileInputRef = ref<HTMLInputElement | null>(null);
const currentImgRef = ref<HTMLImageElement | null>(null);
const imageNaturalWidth = ref<number>(0);
const imageNaturalHeight = ref<number>(0);

onMounted(async () => {
  await photosStore.loadAllPhotos();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  photosStore.stopSlideshow();
  window.removeEventListener('keydown', handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
  if (photosStore.currentView === 'viewer') {
    if (e.key === 'ArrowRight') {
      photosStore.nextPhoto();
    } else if (e.key === 'ArrowLeft') {
      photosStore.prevPhoto();
    } else if (e.key === '+' || e.key === '=') {
      photosStore.zoomIn();
    } else if (e.key === '-' || e.key === '_') {
      photosStore.zoomOut();
    } else if (e.key === 'Escape') {
      photosStore.currentView = 'gallery';
    }
  }
}

function onImageLoaded(e: Event) {
  const img = e.target as HTMLImageElement;
  if (img) {
    imageNaturalWidth.value = img.naturalWidth;
    imageNaturalHeight.value = img.naturalHeight;
  }
}

// Subir fotos desde el navegador a la biblioteca de imágenes
function triggerImport() {
  fileInputRef.value?.click();
}

async function onFilesSelected(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    // Las subimos a la carpeta 'pictures' mediante el file system store
    fs.currentFolderId = 'pictures';
    await fs.uploadFiles(target.files);
    await photosStore.loadAllPhotos();
    target.value = '';
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Desconocido';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Notificación temporal al establecer fondo
const showWallpaperToast = ref(false);
async function applyWallpaper(photo?: PhotoItem) {
  await photosStore.setAsWallpaper(photo);
  showWallpaperToast.value = true;
  setTimeout(() => {
    showWallpaperToast.value = false;
  }, 2500);
}

function handleDeleteCurrent() {
  if (confirm(`¿Deseas eliminar "${photosStore.activePhoto?.name}"?`)) {
    photosStore.deleteActivePhoto();
  }
}
</script>

<template>
  <div class="photos-app">
    <!-- Input oculto para importar fotos -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*"
      style="display: none"
      @change="onFilesSelected"
    />

    <!-- Toast de Wallpaper aplicado -->
    <Transition name="toast-fade">
      <div v-if="showWallpaperToast" class="wallpaper-toast">
        <i class="bi bi-check-circle-fill text-success"></i>
        <span>¡Fondo de pantalla actualizado con éxito!</span>
      </div>
    </Transition>

    <!-- 1. VISTA VISOR INDIVIDUAL (VIEWER MODE) -->
    <div v-if="photosStore.currentView === 'viewer'" class="viewer-layout">
      <!-- Barra Superior Estilo Windows Photos -->
      <header class="viewer-toolbar">
        <div class="toolbar-left">
          <button
            type="button"
            class="action-btn return-gallery-btn"
            title="Volver a todas las fotos"
            @click="photosStore.currentView = 'gallery'"
          >
            <i class="bi bi-arrow-left"></i>
            <span>Todas las fotos</span>
          </button>

          <div class="photo-info-header">
            <span class="photo-title" :title="photosStore.activePhoto?.name">
              {{ photosStore.activePhoto?.name }}
            </span>
            <span v-if="photosStore.photos.length > 0" class="photo-counter">
              {{ photosStore.activePhotoIndex + 1 }} de {{ photosStore.photos.length }}
            </span>
          </div>
        </div>

        <!-- Controles Centrales de Visualización -->
        <div class="toolbar-center">
          <button
            type="button"
            class="action-btn icon"
            title="Reducir zoom (-)"
            @click="photosStore.zoomOut"
          >
            <i class="bi bi-zoom-out"></i>
          </button>

          <span class="zoom-pill" title="Nivel de zoom" @click="photosStore.resetTransform">
            {{ Math.round(photosStore.zoom * 100) }}%
          </span>

          <button
            type="button"
            class="action-btn icon"
            title="Aumentar zoom (+)"
            @click="photosStore.zoomIn"
          >
            <i class="bi bi-zoom-in"></i>
          </button>

          <div class="toolbar-sep"></div>

          <button
            type="button"
            class="action-btn icon"
            title="Rotar 90°"
            @click="photosStore.rotate"
          >
            <i class="bi bi-arrow-clockwise"></i>
          </button>

          <button
            type="button"
            class="action-btn icon"
            title="Voltear horizontalmente"
            @click="photosStore.flip"
          >
            <i class="bi bi-symmetry-vertical"></i>
          </button>

          <button
            type="button"
            class="action-btn icon"
            :class="{ active: photosStore.isSlideshowActive }"
            :title="photosStore.isSlideshowActive ? 'Detener presentación' : 'Iniciar presentación'"
            @click="photosStore.toggleSlideshow"
          >
            <i class="bi" :class="photosStore.isSlideshowActive ? 'bi-pause-fill' : 'bi-play-fill'"></i>
          </button>
        </div>

        <!-- Controles Derechos -->
        <div class="toolbar-right">
          <button
            type="button"
            class="action-btn wallpaper-btn"
            title="Establecer como fondo de pantalla de Frost-OS"
            @click="applyWallpaper()"
          >
            <i class="bi bi-display"></i>
            <span>Fondo</span>
          </button>

          <button
            type="button"
            class="action-btn icon"
            title="Descargar imagen a tu equipo"
            @click="photosStore.downloadPhoto()"
          >
            <i class="bi bi-download"></i>
          </button>

          <button
            type="button"
            class="action-btn icon delete-action"
            title="Eliminar foto"
            @click="handleDeleteCurrent"
          >
            <i class="bi bi-trash3"></i>
          </button>

          <button
            type="button"
            class="action-btn icon"
            :class="{ active: photosStore.showInfoDrawer }"
            title="Información de la foto"
            @click="photosStore.showInfoDrawer = !photosStore.showInfoDrawer"
          >
            <i class="bi bi-info-circle"></i>
          </button>
        </div>
      </header>

      <!-- Lienzo Principal con Flechas Flotantes -->
      <main class="viewer-stage">
        <!-- Flecha Anterior -->
        <button
          type="button"
          class="nav-stage-arrow prev-arrow"
          title="Foto anterior (←)"
          @click="photosStore.prevPhoto"
        >
          <i class="bi bi-chevron-left"></i>
        </button>

        <!-- Contenedor de la Imagen Activa -->
        <div class="image-stage-wrap" @dblclick="photosStore.resetTransform">
          <img
            v-if="photosStore.activePhoto"
            ref="currentImgRef"
            :src="photosStore.activePhoto.url"
            :alt="photosStore.activePhoto.name"
            class="stage-image"
            :style="{
              transform: `scale(${photosStore.zoom}) rotate(${photosStore.rotation}deg) scaleX(${
                photosStore.isFlipped ? -1 : 1
              })`
            }"
            @load="onImageLoaded"
          />
          <div v-else class="empty-stage-msg">
            <i class="bi bi-image"></i>
            <span>No hay foto seleccionada</span>
          </div>
        </div>

        <!-- Flecha Siguiente -->
        <button
          type="button"
          class="nav-stage-arrow next-arrow"
          title="Foto siguiente (→)"
          @click="photosStore.nextPhoto"
        >
          <i class="bi bi-chevron-right"></i>
        </button>

        <!-- Panel Lateral de Información (Drawer) -->
        <Transition name="drawer-slide">
          <aside v-if="photosStore.showInfoDrawer && photosStore.activePhoto" class="info-drawer">
            <div class="drawer-header">
              <div class="drawer-title">
                <i class="bi bi-info-circle text-primary"></i>
                <span>Información</span>
              </div>
              <button class="action-btn icon close-drawer" @click="photosStore.showInfoDrawer = false">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <div class="drawer-content">
              <div class="info-section">
                <label>Nombre del archivo</label>
                <p>{{ photosStore.activePhoto.name }}</p>
              </div>

              <div class="info-section" v-if="imageNaturalWidth && imageNaturalHeight">
                <label>Dimensiones</label>
                <p>{{ imageNaturalWidth }} × {{ imageNaturalHeight }} px</p>
              </div>

              <div class="info-section">
                <label>Tamaño</label>
                <p>{{ formatBytes(photosStore.activePhoto.size) }}</p>
              </div>

              <div class="info-section">
                <label>Fecha</label>
                <p>{{ formatDate(photosStore.activePhoto.date) }}</p>
              </div>

              <div class="info-section">
                <label>Ubicación</label>
                <p>{{ photosStore.activePhoto.folderName || 'Fotos de Frost-OS' }}</p>
              </div>

              <div class="info-actions">
                <button class="drawer-btn primary" @click="applyWallpaper()">
                  <i class="bi bi-display"></i>
                  <span>Establecer como fondo</span>
                </button>
                <button class="drawer-btn" @click="photosStore.downloadPhoto()">
                  <i class="bi bi-download"></i>
                  <span>Descargar a mi PC</span>
                </button>
              </div>
            </div>
          </aside>
        </Transition>
      </main>

      <!-- Tira de Miniaturas Inferior (Filmstrip) -->
      <footer class="viewer-filmstrip">
        <div class="filmstrip-scroll">
          <div
            v-for="photo in photosStore.photos"
            :key="photo.id"
            class="filmstrip-thumb"
            :class="{ active: photosStore.activePhotoId === photo.id }"
            :title="photo.name"
            @click="photosStore.openPhoto(photo)"
          >
            <img :src="photo.url" :alt="photo.name" loading="lazy" />
          </div>
        </div>
      </footer>
    </div>

    <!-- 2. VISTA GALERÍA (GALLERY MODE) -->
    <div v-else class="gallery-layout">
      <!-- Cabecera de la Galería -->
      <header class="gallery-header">
        <div class="gallery-header-left">
          <div class="gallery-title-box">
            <i class="bi bi-images text-danger"></i>
            <h2>Fotos</h2>
          </div>
          <span class="gallery-count">
            {{ photosStore.filteredPhotos.length }} foto(s) encontradas
          </span>
        </div>

        <div class="gallery-header-right">
          <!-- Búsqueda en la galería -->
          <div class="gallery-search">
            <i class="bi bi-search"></i>
            <input
              v-model="photosStore.searchQuery"
              type="text"
              placeholder="Buscar fotos..."
              class="search-input"
            />
            <button
              v-if="photosStore.searchQuery"
              class="clear-search-btn"
              type="button"
              @click="photosStore.searchQuery = ''"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>

          <!-- Botón de Importar Fotos -->
          <button class="import-photos-btn" title="Subir fotos desde tu navegador" @click="triggerImport">
            <i class="bi bi-cloud-arrow-up-fill"></i>
            <span>Importar fotos</span>
          </button>
        </div>
      </header>

      <!-- Cuadrícula de Fotos -->
      <main class="gallery-grid-viewport">
        <div v-if="photosStore.filteredPhotos.length === 0" class="empty-gallery">
          <i class="bi bi-images empty-icon"></i>
          <h3>No se encontraron fotos</h3>
          <p>Importa imágenes desde tu computadora real para verlas aquí.</p>
          <button class="import-photos-btn" @click="triggerImport">
            <i class="bi bi-cloud-arrow-up-fill"></i>
            <span>Importar fotos</span>
          </button>
        </div>

        <div v-else class="gallery-grid">
          <div
            v-for="photo in photosStore.filteredPhotos"
            :key="photo.id"
            class="gallery-card"
            @click="photosStore.openPhoto(photo)"
          >
            <div class="card-thumb-wrap">
              <img :src="photo.url" :alt="photo.name" loading="lazy" />
              <div class="card-hover-overlay">
                <i class="bi bi-arrows-angle-expand"></i>
              </div>
            </div>
            <div class="card-caption">
              <span class="card-name" :title="photo.name">{{ photo.name }}</span>
              <div class="card-meta">
                <span>{{ formatBytes(photo.size) }}</span>
                <span>•</span>
                <span>{{ formatDate(photo.date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* APLICACIÓN FOTOS CON GLASS BLUR ACRÍLICO */
.photos-app {
  width: 100%;
  height: 100%;
  background: transparent;
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  font-family: 'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, sans-serif;
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  position: relative;
}

/* Toast de fondo actualizado */
.wallpaper-toast {
  position: absolute;
  top: 54px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(74, 222, 128, 0.4);
  color: #ffffff;
  padding: 8px 18px;
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  font-size: 12.5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -12px);
}

/* 1. VISTA VISOR INDIVIDUAL */
.viewer-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Barra de herramientas superior */
.viewer-toolbar {
  height: 48px;
  background: rgba(22, 27, 38, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  z-index: 20;
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-left {
  flex: 1;
  overflow: hidden;
}

.return-gallery-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #f1f5f9;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.return-gallery-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.photo-info-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-left: 10px;
  overflow: hidden;
  white-space: nowrap;
}

.photo-title {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.photo-counter {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

/* Botones de acción */
.action-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #cbd5e1;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12.5px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.15s ease;
  outline: none;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.09);
  color: #ffffff;
}

.action-btn.icon {
  width: 32px;
  height: 32px;
  padding: 0;
  justify-content: center;
  font-size: 14px;
}

.action-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
}

.action-btn.wallpaper-btn {
  background: rgba(2, 132, 199, 0.2);
  border-color: rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  font-weight: 600;
}

.action-btn.wallpaper-btn:hover {
  background: rgba(2, 132, 199, 0.35);
  color: #ffffff;
}

.action-btn.delete-action:hover {
  background: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}

.zoom-pill {
  font-size: 11.5px;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  font-variant-numeric: tabular-nums;
  color: #cbd5e1;
}

.zoom-pill:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.toolbar-sep {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.12);
  margin: 0 4px;
}

/* Lienzo Central de la Imagen */
.viewer-stage {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: rgba(10, 14, 22, 0.2);
}

.image-stage-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 24px;
}

.stage-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: center center;
}

.empty-stage-msg {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 15px;
}

.empty-stage-msg i {
  font-size: 48px;
}

/* Flechas de Navegación Flotantes */
.nav-stage-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 64px;
  background: rgba(15, 20, 30, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  outline: none;
}

.nav-stage-arrow.prev-arrow {
  left: 14px;
  border-radius: 8px 0 0 8px;
}

.nav-stage-arrow.next-arrow {
  right: 14px;
  border-radius: 0 8px 8px 0;
}

.nav-stage-arrow:hover {
  background: rgba(2, 132, 199, 0.4);
  border-color: #38bdf8;
  width: 50px;
}

/* Panel Lateral de Información (Drawer) */
.info-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 290px;
  background: rgba(22, 27, 38, 0.85);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border-left: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 25;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 600;
  color: #ffffff;
}

.drawer-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
}

.info-section label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 3px;
}

.info-section p {
  margin: 0;
  font-size: 12.5px;
  color: #f1f5f9;
  word-break: break-all;
}

.info-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.drawer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #ffffff;
  transition: all 0.15s ease;
}

.drawer-btn.primary {
  background: #0284c7;
  border-color: #38bdf8;
}

.drawer-btn:hover {
  filter: brightness(1.2);
}

/* Tira de Miniaturas Inferior (Filmstrip) */
.viewer-filmstrip {
  height: 72px;
  background: rgba(16, 20, 28, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
}

.filmstrip-scroll {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  width: 100%;
  padding: 4px 0;
}

.filmstrip-scroll::-webkit-scrollbar {
  height: 4px;
}

.filmstrip-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.filmstrip-thumb {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
  border: 2px solid transparent;
  opacity: 0.6;
  transition: all 0.15s ease;
}

.filmstrip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.filmstrip-thumb:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.filmstrip-thumb.active {
  opacity: 1;
  border-color: #38bdf8;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
}

/* 2. VISTA GALERÍA */
.gallery-layout {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gallery-header {
  padding: 12px 18px;
  background: rgba(22, 27, 38, 0.55);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.gallery-header-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.gallery-title-box {
  display: flex;
  align-items: center;
  gap: 10px;
}

.gallery-title-box i {
  font-size: 22px;
}

.gallery-title-box h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
}

.gallery-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.gallery-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.gallery-search {
  width: 220px;
  height: 32px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  position: relative;
  backdrop-filter: blur(8px);
}

.gallery-search i {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-right: 8px;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-size: 12px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.clear-search-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0;
}

.import-photos-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 6px;
  background: #0284c7;
  border: 1px solid #38bdf8;
  color: #ffffff;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 2px 8px rgba(2, 132, 199, 0.3);
}

.import-photos-btn:hover {
  background: #0369a1;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.5);
}

/* Cuadrícula de Galería */
.gallery-grid-viewport {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  background: rgba(10, 14, 22, 0.25);
}

.empty-gallery {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 60%;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  gap: 10px;
}

.empty-icon {
  font-size: 52px;
  opacity: 0.4;
}

.empty-gallery h3 {
  margin: 0;
  color: #ffffff;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.gallery-card {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.18s ease;
  backdrop-filter: blur(8px);
}

.gallery-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
}

.card-thumb-wrap {
  width: 100%;
  aspect-ratio: 16 / 10;
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.25);
}

.card-thumb-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.gallery-card:hover .card-thumb-wrap img {
  transform: scale(1.05);
}

.card-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  font-size: 20px;
  color: #ffffff;
}

.gallery-card:hover .card-hover-overlay {
  opacity: 1;
}

.card-caption {
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-name {
  font-size: 12px;
  font-weight: 600;
  color: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}
</style>
