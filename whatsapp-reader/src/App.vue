<template>
  <div
    class="w-full h-screen h-[100dvh] flex flex-col overflow-hidden select-none transition-colors duration-200"
    :class="{ dark: isDark }"
  >
    <!-- Step 1: Upload Landing Page -->
    <LandingUploader
      v-if="currentStep === 'upload'"
      :is-loading="isLoading"
      :loading-status="loadingStatus"
      @file-selected="handleZipSelected"
      @load-demo="handleLoadDemo"
    />

    <!-- Step 2: Chat Interface -->
    <div
      v-else-if="currentStep === 'chat' && parsedChat"
      class="flex-1 flex flex-col h-full w-full max-w-6xl mx-auto md:my-3 md:rounded-3xl md:border md:border-black/10 md:dark:border-white/10 overflow-hidden shadow-2xl bg-[#efeae2] dark:bg-[#0c1317]"
    >
      <!-- Chat Header -->
      <ChatHeader
        :title="parsedChat.title"
        :participant-names="participantNames"
        :protagonist="protagonist"
        :media-count="parsedChat.stats.mediaCount"
        :is-dark="isDark"
        :is-search-open="isSearchOpen"
        @toggle-search="isSearchOpen = !isSearchOpen"
        @open-media="openMediaGallery"
        @change-protagonist="showProtagonistModal = true"
        @toggle-theme="isDark = !isDark"
        @reset="resetToUpload"
      />

      <!-- Search Bar -->
      <SearchBar
        v-if="isSearchOpen"
        v-model="searchQuery"
        v-model:selectedSender="filterSender"
        :participants="participantNames"
        :match-count="searchMatchCount"
        @close="isSearchOpen = false; searchQuery = ''; filterSender = ''"
      />

      <!-- Chat View Feed with dynamic virtual windowing -->
      <ChatView
        :messages="parsedChat.messages"
        :protagonist="protagonist"
        :search-query="searchQuery"
        :filter-sender="filterSender"
        @view-image="openImageViewer"
      />
    </div>

    <!-- Modals -->
    <!-- 1. Select Master TXT Modal -->
    <SelectTxtModal
      v-if="showTxtModal"
      :txt-files="detectedTxtFiles"
      @select="handleMasterTxtSelected"
      @cancel="showTxtModal = false"
    />

    <!-- 2. Select Protagonist Modal -->
    <SelectProtagonistModal
      v-if="showProtagonistModal && parsedChat"
      :participants="Array.from(parsedChat.participants.values())"
      :total-messages="parsedChat.stats.totalMessages"
      :initial-selected="protagonist"
      @select="handleProtagonistSelected"
      @cancel="showProtagonistModal = false"
    />

    <!-- 3. Image Lightbox Viewer Modal with carousel navigation -->
    <MediaViewerModal
      :is-open="isViewerOpen"
      :image-url="viewerImageUrl"
      :file-name="viewerFileName"
      :items="viewerItems"
      :initial-index="viewerInitialIndex"
      @close="isViewerOpen = false"
    />

    <!-- 4. Media Gallery Modal with lazy infinite scrolling -->
    <MediaGalleryModal
      :is-open="isGalleryOpen"
      :media-list="galleryMediaList"
      @close="isGalleryOpen = false"
      @view-image="handleGalleryViewImage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import type { ParsedChat, ZipTxtFile, Attachment } from './types/chat'
import { ZipReader } from './utils/zipReader'
import { parseWhatsAppChat } from './utils/parser'
import { MOCK_CHAT_TXT, MOCK_ASSETS } from './utils/mockData'
import { parseVCard } from './utils/vcard'
import type { MediaItem } from './components/GalleryItemCard.vue'

import LandingUploader from './components/LandingUploader.vue'
import SelectTxtModal from './components/SelectTxtModal.vue'
import SelectProtagonistModal from './components/SelectProtagonistModal.vue'
import ChatHeader from './components/ChatHeader.vue'
import ChatView from './components/ChatView.vue'
import SearchBar from './components/SearchBar.vue'
import MediaViewerModal from './components/MediaViewerModal.vue'
import MediaGalleryModal from './components/MediaGalleryModal.vue'

// App state
const currentStep = ref<'upload' | 'chat'>('upload')
const isLoading = ref(false)
const loadingStatus = ref('')
const isDark = ref(true)

// ZIP reader instance
const zipReader = new ZipReader()
const detectedTxtFiles = ref<ZipTxtFile[]>([])
const showTxtModal = ref(false)
const showProtagonistModal = ref(false)

// Chat state
const parsedChat = ref<ParsedChat | null>(null)
const protagonist = ref<string>('')
const isDemoMode = ref(false)

// Provide on-demand lazy attachment resolution to message bubbles
provide('resolveAttachment', async (attachment: Attachment) => {
  if (isDemoMode.value) {
    const assetUrl = (MOCK_ASSETS as any)[attachment.fileName]
    if (assetUrl) {
      attachment.url = assetUrl
      if (attachment.type === 'contact') {
        const rawVcard = (MOCK_ASSETS as any)['Esteban.vcf']
        const parsed = parseVCard(rawVcard)
        attachment.contactData = {
          name: parsed.name,
          phone: parsed.phone,
          email: parsed.email,
          org: parsed.org,
          rawVcard: parsed.rawVcard,
        }
      }
    }
    return
  }
  await zipReader.resolveAttachment(attachment)
})

// Provide lazy media URL resolver to gallery cards
provide('getMediaUrl', async (fileName: string) => {
  if (isDemoMode.value) {
    return (MOCK_ASSETS as any)[fileName] || null
  }
  return await zipReader.getMediaUrl(fileName)
})

// Search state
const isSearchOpen = ref(false)
const searchQuery = ref('')
const filterSender = ref('')

// Media gallery & lightbox state
const isViewerOpen = ref(false)
const viewerImageUrl = ref('')
const viewerFileName = ref('')
const viewerItems = ref<MediaItem[]>([])
const viewerInitialIndex = ref(0)

const isGalleryOpen = ref(false)
const galleryMediaList = ref<MediaItem[]>([])

const participantNames = computed(() => {
  if (!parsedChat.value) return []
  return Array.from(parsedChat.value.participants.keys())
})

const searchMatchCount = computed(() => {
  if (!parsedChat.value) return 0
  const q = searchQuery.value.toLowerCase().trim()
  const s = filterSender.value
  return parsedChat.value.messages.filter(m => {
    if (s && m.sender !== s && !m.isSystem) return false
    if (!q) return true
    return (
      m.content.toLowerCase().includes(q) ||
      m.sender.toLowerCase().includes(q) ||
      (m.attachment && m.attachment.fileName.toLowerCase().includes(q))
    )
  }).length
})

/**
 * Handle ZIP upload from file picker or drag & drop.
 */
async function handleZipSelected(file: File) {
  isLoading.value = true
  loadingStatus.value = 'Descomprimiendo y analizando archivo ZIP...'
  isDemoMode.value = false

  try {
    const txtFiles = await zipReader.loadZip(file)
    detectedTxtFiles.value = txtFiles

    if (txtFiles.length === 0) {
      alert('No se encontraron archivos de texto (.txt) dentro del ZIP proporcionado. Asegúrate de haber exportado el chat de WhatsApp correctamente.')
      isLoading.value = false
      return
    }

    showTxtModal.value = true
  } catch (err: any) {
    console.error('Error loading zip:', err)
    alert(`Error al leer el archivo ZIP: ${err.message || 'Archivo corrupto o no válido.'}`)
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle selection of master .txt file.
 */
async function handleMasterTxtSelected(relativePath: string) {
  showTxtModal.value = false
  isLoading.value = true
  loadingStatus.value = 'Leyendo y parseando mensajes del chat...'

  try {
    const rawText = await zipReader.readTxtFile(relativePath)
    const baseName = relativePath.split('/').pop() || relativePath
    const chat = parseWhatsAppChat(rawText, baseName)
    parsedChat.value = chat

    // Attachments resolve on demand as messages enter the visible viewport
    showProtagonistModal.value = true
  } catch (err: any) {
    console.error('Error reading chat:', err)
    alert(`Error al parsear el chat: ${err.message}`)
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle protagonist selection.
 */
function handleProtagonistSelected(selectedName: string) {
  protagonist.value = selectedName
  showProtagonistModal.value = false
  currentStep.value = 'chat'
}

/**
 * Load interactive demo chat mode.
 */
async function handleLoadDemo() {
  isDemoMode.value = true
  isLoading.value = true
  loadingStatus.value = 'Cargando conversación de demostración...'

  try {
    const chat = parseWhatsAppChat(MOCK_CHAT_TXT, 'K/ND (Demo).txt')
    parsedChat.value = chat
    showProtagonistModal.value = true
  } catch (err) {
    console.error('Error loading demo:', err)
  } finally {
    isLoading.value = false
  }
}

/**
 * Open image viewer modal for full screen view with list context.
 */
function openImageViewer(payload: {
  url: string
  name: string
  list?: MediaItem[]
  index?: number
}) {
  viewerImageUrl.value = payload.url
  viewerFileName.value = payload.name

  if (payload.list) {
    viewerItems.value = payload.list
    viewerInitialIndex.value = payload.index ?? 0
  } else {
    // If opened from a message bubble in chat, collect chat image attachments
    if (parsedChat.value) {
      const chatImages: MediaItem[] = parsedChat.value.messages
        .filter(m => m.attachment && (m.attachment.type === 'image' || m.attachment.type === 'sticker'))
        .map(m => ({
          name: m.attachment!.fileName,
          type: m.attachment!.type,
          url: m.attachment!.url,
        }))
      viewerItems.value = chatImages
      const idx = chatImages.findIndex(i => i.name.toLowerCase() === payload.name.toLowerCase())
      viewerInitialIndex.value = idx !== -1 ? idx : 0
    } else {
      viewerItems.value = [{ name: payload.name, type: 'image', url: payload.url }]
      viewerInitialIndex.value = 0
    }
  }

  isViewerOpen.value = true
}

function handleGalleryViewImage(payload: {
  url: string
  name: string
  list: MediaItem[]
  index: number
}) {
  openImageViewer(payload)
}

/**
 * Open Media Gallery modal.
 */
function openMediaGallery() {
  if (isDemoMode.value) {
    galleryMediaList.value = [
      { name: 'IMG-20190727-WA0015.jpg', type: 'image', url: MOCK_ASSETS['IMG-20190727-WA0015.jpg'] },
      { name: 'STK-20190224-WA0022.webp', type: 'sticker', url: MOCK_ASSETS['STK-20190224-WA0022.webp'] },
      { name: 'PTT-20190727-WA0034.opus', type: 'audio', url: MOCK_ASSETS['PTT-20190727-WA0034.opus'] },
      { name: 'Esteban.vcf', type: 'contact' },
    ]
  } else {
    // Instant synchronous indexing from zip
    galleryMediaList.value = zipReader.getAllMediaFiles()
  }
  isGalleryOpen.value = true
}

/**
 * Reset back to upload screen.
 */
function resetToUpload() {
  zipReader.cleanup()
  parsedChat.value = null
  protagonist.value = ''
  currentStep.value = 'upload'
  searchQuery.value = ''
  filterSender.value = ''
  isSearchOpen.value = false
}
</script>
