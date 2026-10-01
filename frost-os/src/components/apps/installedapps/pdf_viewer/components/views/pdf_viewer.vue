<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { usePdfViewerStore, type PdfDocument } from '../../pdf_viewer_store'
import type { WindowInstance } from '../../../../../data/app'

const props = defineProps<{
  win?: WindowInstance
}>()

const store = usePdfViewerStore()

// Estado LOCAL de visualización e interacción de esta ventana
const currentPdf = ref<PdfDocument | null>(store.SAMPLE_MANUAL)
const currentPage = ref<number>(1)
const zoom = ref<number>(100)
const rotation = ref<number>(0)
const sidebarOpen = ref<boolean>(true)

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDraggingOver = ref(false)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const openDoc = (doc: PdfDocument) => {
  currentPdf.value = doc
  currentPage.value = 1
  zoom.value = 100
  rotation.value = 0

  if (!store.recentPdfs.some(d => d.id === doc.id)) {
    store.recentPdfs.unshift(doc)
  }
}

const onFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const blobUrl = URL.createObjectURL(file)
  const doc: PdfDocument = {
    id: `local-${Date.now()}`,
    name: file.name,
    url: blobUrl,
    size: (file.size / 1024 > 1024 ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : (file.size / 1024).toFixed(1) + ' KB'),
    pageCount: 1,
    source: 'file'
  }
  openDoc(doc)
  target.value = ''
}

const onDropFile = (e: DragEvent) => {
  isDraggingOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file || !file.name.toLowerCase().endsWith('.pdf')) return

  const blobUrl = URL.createObjectURL(file)
  const doc: PdfDocument = {
    id: `dropped-${Date.now()}`,
    name: file.name,
    url: blobUrl,
    size: (file.size / 1024 > 1024 ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : (file.size / 1024).toFixed(1) + ' KB'),
    pageCount: 1,
    source: 'file'
  }
  openDoc(doc)
}

const printDocument = () => {
  window.print()
}

const downloadDocument = () => {
  if (!currentPdf.value) return
  if (currentPdf.value.url) {
    const a = document.createElement('a')
    a.href = currentPdf.value.url
    a.download = currentPdf.value.name
    a.click()
  } else {
    // Generar archivo de texto descargable con el contenido del PDF
    const textContent = (currentPdf.value.pages || [])
      .map(p => `=== ${p.title} (Página ${p.pageNum}) ===\n\n${p.content}\n\n` + (p.sections?.map(s => `${s.heading}\n${s.body}\n`).join('\n') || ''))
      .join('\n\n---------------------------------------------\n\n')
    
    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentPdf.value.name.replace(/\.pdf$/i, '') + '.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
}

const currentPageData = computed(() => {
  if (!currentPdf.value?.pages) return null
  return currentPdf.value.pages.find(p => p.pageNum === currentPage.value) || currentPdf.value.pages[0]
})

const nextPage = () => {
  if (currentPdf.value && currentPage.value < currentPdf.value.pageCount) {
    currentPage.value++
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const setPage = (p: number) => {
  if (currentPdf.value && p >= 1 && p <= currentPdf.value.pageCount) {
    currentPage.value = p
  }
}

const zoomIn = () => {
  if (zoom.value < 250) zoom.value += 15
}

const zoomOut = () => {
  if (zoom.value > 50) zoom.value -= 15
}

const resetZoom = () => {
  zoom.value = 100
}

const rotateClockwise = () => {
  rotation.value = (rotation.value + 90) % 360
}

const toggleSidebar = () => {
  sidebarOpen.value = !sidebarOpen.value
}

async function initWindowPdf() {
  const fileItem = props.win?.params?.fileItem
  if (fileItem) {
    const doc = await store.createPdfDocumentFromFile(fileItem)
    openDoc(doc)
    return
  }

  const doc = props.win?.params?.doc
  if (doc) {
    openDoc(doc)
    return
  }
}

watch(
  () => [props.win?.params?.fileItem, props.win?.params?.doc],
  () => {
    initWindowPdf()
  }
)

onMounted(() => {
  initWindowPdf()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (props.win && !props.win.isFocused) return
  if (e.key === 'ArrowUp' || e.key === 'PageUp') {
    prevPage()
  } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    nextPage()
  } else if (e.key === '+' || e.key === '=') {
    zoomIn()
  } else if (e.key === '-' || e.key === '_') {
    zoomOut()
  }
}
</script>

<template>
  <div 
    class="pdf-viewer-app"
    :class="{ 'drag-over': isDraggingOver }"
    @dragover.prevent="isDraggingOver = true"
    @dragleave.prevent="isDraggingOver = false"
    @drop.prevent="onDropFile"
  >
    <input 
      ref="fileInputRef" 
      type="file" 
      accept=".pdf,application/pdf" 
      class="hidden-file-input" 
      @change="onFileSelected" 
    />

    <!-- BARRA SUPERIOR DE HERRAMIENTAS (TOOLBAR) -->
    <header class="pdf-toolbar">
      <!-- Izquierda: Toggle Sidebar + Título -->
      <div class="toolbar-left">
        <button 
          class="toolbar-btn" 
          :class="{ active: sidebarOpen }"
          @click="toggleSidebar"
          title="Alternar panel lateral de miniaturas"
        >
          <i class="bi bi-layout-sidebar-inset"></i>
        </button>

        <div class="document-badge-title" v-if="currentPdf">
          <span class="pdf-tag">PDF</span>
          <span class="doc-title" :title="currentPdf.name">{{ currentPdf.name }}</span>
          <span class="doc-size" v-if="currentPdf.size">({{ currentPdf.size }})</span>
        </div>
      </div>

      <!-- Centro: Paginación y Zoom -->
      <div class="toolbar-center">
        <!-- Paginación -->
        <div class="tool-group pagination-group">
          <button 
            class="toolbar-btn icon-sm" 
            :disabled="currentPage <= 1"
            @click="prevPage"
            title="Página anterior"
          >
            <i class="bi bi-chevron-up"></i>
          </button>
          <div class="page-indicator">
            <span class="page-current">{{ currentPage }}</span>
            <span class="page-sep">/</span>
            <span class="page-total">{{ currentPdf?.pageCount || 1 }}</span>
          </div>
          <button 
            class="toolbar-btn icon-sm" 
            :disabled="currentPage >= (currentPdf?.pageCount || 1)"
            @click="nextPage"
            title="Página siguiente"
          >
            <i class="bi bi-chevron-down"></i>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Zoom -->
        <div class="tool-group zoom-group">
          <button 
            class="toolbar-btn icon-sm" 
            :disabled="zoom <= 50"
            @click="zoomOut"
            title="Reducir zoom (-)"
          >
            <i class="bi bi-dash-lg"></i>
          </button>
          <span class="zoom-text">{{ zoom }}%</span>
          <button 
            class="toolbar-btn icon-sm" 
            :disabled="zoom >= 250"
            @click="zoomIn"
            title="Aumentar zoom (+)"
          >
            <i class="bi bi-plus-lg"></i>
          </button>
          <button 
            class="toolbar-btn" 
            @click="resetZoom"
            title="Restablecer tamaño 100%"
          >
            <i class="bi bi-aspect-ratio"></i>
          </button>
        </div>

        <div class="toolbar-divider"></div>

        <!-- Rotación -->
        <button 
          class="toolbar-btn" 
          @click="rotateClockwise"
          title="Girar 90° hacia la derecha"
        >
          <i class="bi bi-arrow-clockwise"></i>
        </button>
      </div>

      <!-- Derecha: Acciones globales (Abrir, Imprimir, Descargar) -->
      <div class="toolbar-right">
        <button 
          class="toolbar-btn action-btn" 
          @click="triggerFileInput"
          title="Abrir un archivo PDF desde el equipo"
        >
          <i class="bi bi-folder2-open"></i>
          <span>Abrir</span>
        </button>

        <button 
          class="toolbar-btn" 
          @click="printDocument"
          title="Imprimir documento"
        >
          <i class="bi bi-printer"></i>
        </button>

        <button 
          class="toolbar-btn" 
          @click="downloadDocument"
          title="Descargar o exportar"
        >
          <i class="bi bi-download"></i>
        </button>
      </div>
    </header>

    <!-- ÁREA PRINCIPAL CON PANEL LATERAL Y VISOR -->
    <div class="pdf-main-content">
      <!-- SIDEBAR LATERAL (MINIATURAS Y DOCUMENTOS) -->
      <aside v-if="sidebarOpen" class="pdf-sidebar custom-pdf-scrollbar">
        <div class="sidebar-section-title">
          <i class="bi bi-file-earmark-text"></i>
          <span>Páginas ({{ currentPdf?.pageCount || 1 }})</span>
        </div>

        <!-- Lista de Miniaturas de Páginas -->
        <div class="thumbnails-container">
          <div 
            v-for="page in (currentPdf?.pages || [{ pageNum: 1, title: currentPdf?.name || 'Página 1' }])" 
            :key="page.pageNum"
            class="thumbnail-card"
            :class="{ active: currentPage === page.pageNum }"
            @click="setPage(page.pageNum)"
          >
            <div class="thumb-page-sheet">
              <div class="thumb-lines">
                <div class="thumb-line head"></div>
                <div class="thumb-line"></div>
                <div class="thumb-line"></div>
                <div class="thumb-line half"></div>
              </div>
            </div>
            <span class="thumb-number">Página {{ page.pageNum }}</span>
          </div>
        </div>

        <div class="sidebar-divider"></div>

        <!-- Documentos de muestra rápidos -->
        <div class="sidebar-section-title">
          <i class="bi bi-collection"></i>
          <span>Documentos Recientes</span>
        </div>
        <div class="recent-docs-list">
          <div 
            v-for="doc in store.recentPdfs" 
            :key="doc.id"
            class="recent-doc-item"
            :class="{ active: currentPdf?.id === doc.id }"
            @click="openDoc(doc)"
          >
            <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
            <div class="recent-doc-info">
              <span class="recent-doc-name" :title="doc.name">{{ doc.name }}</span>
              <span class="recent-doc-pages">{{ doc.pageCount }} pág • {{ doc.size || 'PDF' }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- VISOR DEL DOCUMENTO -->
      <main class="pdf-canvas-container custom-pdf-scrollbar">
        <!-- Overlay si se arrastra un archivo encima -->
        <div v-if="isDraggingOver" class="drop-overlay">
          <i class="bi bi-cloud-arrow-up-fill"></i>
          <span>Suelta el archivo PDF aquí para visualizarlo</span>
        </div>

        <!-- SI HAY UN ARCHIVO PDF REAL (Blob URL de archivo subido) -->
        <div 
          v-if="currentPdf?.url" 
          class="pdf-iframe-wrapper"
          :style="{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'top center'
          }"
        >
          <iframe 
            :src="currentPdf.url" 
            class="pdf-native-iframe"
            title="Visor PDF"
          ></iframe>
        </div>

        <!-- SI ES UN DOCUMENTO VECTORIAL / SIMULADO DE FROST-OS -->
        <div 
          v-else-if="currentPageData" 
          class="pdf-sheet-wrapper"
          :style="{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'top center'
          }"
        >
          <article class="pdf-page-sheet">
            <!-- Encabezado de página -->
            <header class="sheet-header">
              <div class="sheet-header-brand">
                <i class="bi bi-snow2"></i>
                <span>FROST-OS DOCUMENT SERVICES</span>
              </div>
              <div class="sheet-header-docname">{{ currentPdf?.name }}</div>
            </header>

            <!-- Contenido de la página -->
            <div class="sheet-content">
              <h1 class="sheet-title">{{ currentPageData.title }}</h1>
              <p class="sheet-subtitle" v-if="currentPageData.subtitle">{{ currentPageData.subtitle }}</p>

              <div class="sheet-divider"></div>

              <div class="sheet-body-text">
                {{ currentPageData.content }}
              </div>

              <!-- Secciones adicionales -->
              <div v-if="currentPageData.sections" class="sheet-sections">
                <div v-for="(sec, idx) in currentPageData.sections" :key="idx" class="sheet-section-block">
                  <h3 class="sheet-section-heading">{{ sec.heading }}</h3>
                  <p class="sheet-section-body">{{ sec.body }}</p>
                </div>
              </div>

              <!-- Marca de agua sutil -->
              <div class="sheet-watermark">
                <i class="bi bi-file-earmark-pdf"></i>
                <span>FROST OS DOCUMENT SYSTEM</span>
              </div>
            </div>

            <!-- Pie de página -->
            <footer class="sheet-footer">
              <span>Confidencial • Solo para uso autorizado</span>
              <span class="sheet-page-num">Página {{ currentPage }} de {{ currentPdf?.pageCount || 1 }}</span>
            </footer>
          </article>
        </div>

        <!-- ESTADO VACÍO SI NO HAY NINGÚN DOCUMENTO CARGADO -->
        <div v-else class="pdf-empty-state">
          <div class="empty-icon-circle">
            <i class="bi bi-file-earmark-pdf-fill"></i>
          </div>
          <h2>Ningún documento PDF seleccionado</h2>
          <p>Abre un archivo PDF desde el Explorador de Archivos, arrástralo aquí o abre una muestra.</p>
          <div class="empty-actions-row">
            <button class="empty-btn primary" @click="triggerFileInput">
              <i class="bi bi-folder2-open"></i>
              <span>Abrir archivo PDF</span>
            </button>
            <button class="empty-btn secondary" @click="openDoc(store.SAMPLE_MANUAL)">
              <i class="bi bi-book"></i>
              <span>Ver Manual de Frost OS</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.pdf-viewer-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgba(14, 18, 25, 0.82);
  backdrop-filter: var(--os-blur-heavy, blur(32px)) saturate(160%);
  -webkit-backdrop-filter: var(--os-blur-heavy, blur(32px)) saturate(160%);
  color: #e2e8f0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  overflow: hidden;
  user-select: none;
  position: relative;
}

.hidden-file-input {
  display: none;
}

/* BARRA DE HERRAMIENTAS (TOOLBAR) */
.pdf-toolbar {
  height: 44px;
  background-color: rgba(0, 0, 0, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.document-badge-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
  max-width: 280px;
}

.pdf-tag {
  background-color: #e11d48;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.doc-title {
  font-size: 13px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-size {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.tool-group {
  display: flex;
  align-items: center;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 2px;
}

.toolbar-divider {
  width: 1px;
  height: 18px;
  background-color: rgba(255, 255, 255, 0.15);
  margin: 0 4px;
}

.toolbar-btn {
  height: 28px;
  min-width: 28px;
  padding: 0 8px;
  border-radius: 5px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.toolbar-btn.active {
  background-color: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.toolbar-btn.action-btn {
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #ffffff;
}

.toolbar-btn.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.18);
}

.toolbar-btn.icon-sm {
  width: 24px;
  height: 24px;
  min-width: 24px;
  padding: 0;
  font-size: 11px;
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 0 6px;
  font-variant-numeric: tabular-nums;
}

.page-current {
  font-weight: 600;
  color: #ffffff;
}

.page-sep, .page-total {
  color: rgba(255, 255, 255, 0.5);
}

.zoom-text {
  font-size: 12px;
  font-weight: 500;
  padding: 0 6px;
  min-width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* MAIN CONTENT */
.pdf-main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* SIDEBAR */
.pdf-sidebar {
  width: 220px;
  background-color: rgba(10, 14, 20, 0.6);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  padding: 0 4px;
}

.thumbnails-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.thumbnail-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  background-color: transparent;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.thumbnail-card:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.thumbnail-card.active {
  background-color: rgba(225, 29, 72, 0.15);
  border-color: rgba(225, 29, 72, 0.4);
}

.thumb-page-sheet {
  width: 70px;
  height: 94px;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
}

.thumb-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.thumb-line {
  height: 3px;
  background-color: #cbd5e1;
  border-radius: 2px;
}

.thumb-line.head {
  height: 5px;
  background-color: #e11d48;
  margin-bottom: 4px;
}

.thumb-line.half {
  width: 60%;
}

.thumb-number {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
}

.sidebar-divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.08);
  margin: 16px 0;
}

.recent-docs-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recent-doc-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.recent-doc-item:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.recent-doc-item.active {
  background-color: rgba(255, 255, 255, 0.12);
}

.recent-doc-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recent-doc-name {
  font-size: 12px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-doc-pages {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

/* CANVAS DE VISUALIZACIÓN */
.pdf-canvas-container {
  flex: 1;
  background-color: rgba(0, 0, 0, 0.5);
  overflow: auto;
  display: flex;
  justify-content: center;
  padding: 30px;
  position: relative;
}

.drop-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(14, 18, 25, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 100;
  color: #38bdf8;
  font-size: 18px;
  font-weight: 600;
}

.drop-overlay i {
  font-size: 54px;
}

/* HOJA DE DOCUMENTO VECTORIAL */
.pdf-sheet-wrapper {
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  justify-content: center;
  padding-bottom: 40px;
}

.pdf-page-sheet {
  width: 680px;
  min-height: 880px;
  background-color: #ffffff;
  color: #1e293b;
  border-radius: 4px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  padding: 50px 60px;
  box-sizing: border-box;
  position: relative;
  user-select: text;
  -webkit-user-select: text;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 12px;
  margin-bottom: 30px;
  font-size: 11px;
  color: #64748b;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.sheet-header-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0284c7;
}

.sheet-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.sheet-title {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 8px 0;
  line-height: 1.25;
}

.sheet-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 20px 0;
}

.sheet-divider {
  width: 40px;
  height: 3px;
  background-color: #e11d48;
  margin-bottom: 24px;
  border-radius: 2px;
}

.sheet-body-text {
  font-size: 14px;
  line-height: 1.7;
  color: #334155;
  margin-bottom: 28px;
  white-space: pre-line;
}

.sheet-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sheet-section-block {
  background-color: #f8fafc;
  border-left: 3px solid #38bdf8;
  border-radius: 0 6px 6px 0;
  padding: 14px 18px;
}

.sheet-section-heading {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 6px 0;
}

.sheet-section-body {
  font-size: 13.5px;
  line-height: 1.6;
  color: #475569;
  margin: 0;
}

.sheet-watermark {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  font-size: 28px;
  font-weight: 800;
  color: rgba(0, 0, 0, 0.03);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.sheet-watermark i {
  font-size: 70px;
}

.sheet-footer {
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
  margin-top: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #94a3b8;
}

.sheet-page-num {
  font-weight: 600;
  color: #64748b;
}

/* NATIVE IFRAME WRAPPER */
.pdf-iframe-wrapper {
  width: 780px;
  height: 900px;
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.pdf-native-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* ESTADO VACÍO */
.pdf-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
  text-align: center;
  max-width: 420px;
  gap: 14px;
}

.empty-icon-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: rgba(225, 29, 72, 0.12);
  border: 1px solid rgba(225, 29, 72, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  color: #e11d48;
}

.pdf-empty-state h2 {
  font-size: 19px;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
}

.pdf-empty-state p {
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  margin: 0;
}

.empty-actions-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.empty-btn {
  padding: 9px 18px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s ease;
}

.empty-btn.primary {
  background-color: #e11d48;
  color: #ffffff;
  border: none;
  box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);
}

.empty-btn.primary:hover {
  background-color: #be123c;
}

.empty-btn.secondary {
  background-color: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.empty-btn.secondary:hover {
  background-color: rgba(255, 255, 255, 0.14);
}

/* SCROLLBAR PERSONALIZADA */
.custom-pdf-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-pdf-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-pdf-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 3px;
}
.custom-pdf-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.28);
}
</style>
