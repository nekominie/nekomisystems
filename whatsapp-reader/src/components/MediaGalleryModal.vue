<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none"
    @click="close"
  >
    <div
      class="w-full max-w-4xl bg-[#202c33] text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
      @click.stop
    >
      <!-- Header -->
      <div class="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-[#111b21] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#25d366] to-[#128c7e] text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-[#25d366]/20">
            <i class="bi bi-collection-play"></i>
          </div>
          <div>
            <h3 class="font-bold text-base text-white">Galería Multimedia del Chat</h3>
            <p class="text-xs text-gray-400">
              Total: {{ mediaList.length.toLocaleString() }} archivo{{ mediaList.length !== 1 ? 's' : '' }} en el ZIP
            </p>
          </div>
        </div>

        <button
          type="button"
          class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
          @click="close"
        >
          <i class="bi bi-x-lg text-sm"></i>
        </button>
      </div>

      <!-- Controls Strip: Search & Tabs -->
      <div class="px-4 py-3 border-b border-white/5 bg-[#111b21]/70 flex flex-col gap-2.5 shrink-0">
        <!-- Search bar inside gallery -->
        <div class="relative w-full">
          <i class="bi bi-search absolute left-3 top-2.5 text-gray-400 text-xs"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar por nombre de archivo (ej: IMG, sticker, .opus)..."
            class="w-full pl-8 pr-8 py-2 rounded-xl bg-[#202c33] text-xs text-white placeholder-gray-400 border border-white/5 focus:outline-hidden focus:border-[#25d366] transition-all"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-2.5 top-2 text-gray-400 hover:text-white text-xs"
            @click="searchQuery = ''"
          >
            <i class="bi bi-x-circle-fill"></i>
          </button>
        </div>

        <!-- Category Filter Tabs -->
        <div class="flex items-center gap-2 overflow-x-auto text-xs pb-1">
          <button
            type="button"
            class="px-3 py-1 rounded-full font-semibold transition-all shrink-0"
            :class="[
              currentTab === 'all'
                ? 'bg-[#25d366] text-[#111b21] shadow-xs'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            ]"
            @click="selectTab('all')"
          >
            Todos ({{ mediaList.length.toLocaleString() }})
          </button>
          <button
            v-if="imageCount > 0"
            type="button"
            class="px-3 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5"
            :class="[
              currentTab === 'images'
                ? 'bg-[#25d366] text-[#111b21] shadow-xs'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            ]"
            @click="selectTab('images')"
          >
            <i class="bi bi-image"></i>
            Fotos ({{ imageCount.toLocaleString() }})
          </button>
          <button
            v-if="stickerCount > 0"
            type="button"
            class="px-3 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5"
            :class="[
              currentTab === 'stickers'
                ? 'bg-[#25d366] text-[#111b21] shadow-xs'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            ]"
            @click="selectTab('stickers')"
          >
            <i class="bi bi-sticky"></i>
            Stickers ({{ stickerCount.toLocaleString() }})
          </button>
          <button
            v-if="audioCount > 0"
            type="button"
            class="px-3 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5"
            :class="[
              currentTab === 'audio'
                ? 'bg-[#25d366] text-[#111b21] shadow-xs'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            ]"
            @click="selectTab('audio')"
          >
            <i class="bi bi-mic"></i>
            Audios ({{ audioCount.toLocaleString() }})
          </button>
          <button
            v-if="videoCount > 0"
            type="button"
            class="px-3 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5"
            :class="[
              currentTab === 'video'
                ? 'bg-[#25d366] text-[#111b21] shadow-xs'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            ]"
            @click="selectTab('video')"
          >
            <i class="bi bi-play-btn"></i>
            Videos ({{ videoCount.toLocaleString() }})
          </button>
          <button
            v-if="docCount > 0"
            type="button"
            class="px-3 py-1 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5"
            :class="[
              currentTab === 'docs'
                ? 'bg-[#25d366] text-[#111b21] shadow-xs'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            ]"
            @click="selectTab('docs')"
          >
            <i class="bi bi-file-earmark-text"></i>
            Documentos ({{ docCount.toLocaleString() }})
          </button>
        </div>
      </div>

      <!-- Media Items Grid with Virtual Infinite Scroll -->
      <div
        ref="scrollContainerRef"
        class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4"
        @scroll="handleScroll"
      >
        <!-- Empty state -->
        <div v-if="filteredMedia.length === 0" class="py-16 text-center text-gray-400 text-sm">
          <i class="bi bi-folder-x text-4xl mb-2 block opacity-40"></i>
          <p class="font-semibold text-gray-300">No se encontraron archivos</p>
          <p class="text-xs text-gray-500 mt-1">Prueba seleccionando otra categoría o cambiando la búsqueda.</p>
        </div>

        <!-- Grid of Visible Items -->
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <GalleryItemCard
            v-for="item in visibleMedia"
            :key="item.name"
            :item="item"
            @select="handleCardSelect"
          />
        </div>

        <!-- Infinite Scroll Sentinel & Load More Indicator -->
        <div
          v-if="visibleLimit < filteredMedia.length"
          class="flex flex-col items-center justify-center py-4 gap-2"
        >
          <div class="text-xs text-gray-400 font-medium">
            Mostrando <strong>{{ visibleMedia.length.toLocaleString() }}</strong> de <strong>{{ filteredMedia.length.toLocaleString() }}</strong> archivos
          </div>
          <button
            type="button"
            class="px-5 py-2 rounded-full text-xs font-semibold bg-white/10 hover:bg-[#25d366] hover:text-[#111b21] text-gray-300 transition-all flex items-center gap-2 border border-white/10"
            @click="loadMore"
          >
            <i class="bi bi-arrow-down-circle"></i>
            <span>Cargar más archivos (+{{ batchSize }})</span>
          </button>
        </div>
      </div>

      <!-- Footer Info Strip -->
      <div class="px-5 py-3 border-t border-white/10 bg-[#111b21] flex items-center justify-between text-xs text-gray-400 shrink-0">
        <span class="flex items-center gap-1.5">
          <i class="bi bi-lightning-charge text-amber-400"></i>
          Carga perezosa activa (Lazy loading)
        </span>
        <span>{{ visibleMedia.length.toLocaleString() }} / {{ filteredMedia.length.toLocaleString() }} visibles</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import GalleryItemCard, { type MediaItem } from './GalleryItemCard.vue'

const props = defineProps<{
  isOpen: boolean
  mediaList: MediaItem[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'view-image', payload: { url: string; name: string; list: MediaItem[]; index: number }): void
}>()

const currentTab = ref<'all' | 'images' | 'stickers' | 'audio' | 'video' | 'docs'>('all')
const searchQuery = ref('')
const scrollContainerRef = ref<HTMLDivElement | null>(null)

// Paging configuration
const batchSize = 32
const visibleLimit = ref(batchSize)

// Counts
const imageCount = computed(() => props.mediaList.filter(m => m.type === 'image').length)
const stickerCount = computed(() => props.mediaList.filter(m => m.type === 'sticker').length)
const audioCount = computed(() => props.mediaList.filter(m => m.type === 'audio').length)
const videoCount = computed(() => props.mediaList.filter(m => m.type === 'video').length)
const docCount = computed(() => props.mediaList.filter(m => m.type === 'document' || m.type === 'contact').length)

// Filtered items based on active tab and search query
const filteredMedia = computed(() => {
  let list = props.mediaList

  if (currentTab.value === 'images') {
    list = list.filter(m => m.type === 'image')
  } else if (currentTab.value === 'stickers') {
    list = list.filter(m => m.type === 'sticker')
  } else if (currentTab.value === 'audio') {
    list = list.filter(m => m.type === 'audio')
  } else if (currentTab.value === 'video') {
    list = list.filter(m => m.type === 'video')
  } else if (currentTab.value === 'docs') {
    list = list.filter(m => m.type === 'document' || m.type === 'contact')
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(m => m.name.toLowerCase().includes(q))
  }

  return list
})

// Only slice the visible window to keep the DOM light and fast!
const visibleMedia = computed(() => {
  return filteredMedia.value.slice(0, visibleLimit.value)
})

function selectTab(tab: 'all' | 'images' | 'stickers' | 'audio' | 'video' | 'docs') {
  currentTab.value = tab
  visibleLimit.value = batchSize
  nextTick(() => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTop = 0
    }
  })
}

function loadMore() {
  visibleLimit.value = Math.min(filteredMedia.value.length, visibleLimit.value + batchSize)
}

function handleScroll() {
  if (!scrollContainerRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.value
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight

  if (distanceFromBottom < 250 && visibleLimit.value < filteredMedia.value.length) {
    loadMore()
  }
}

function handleCardSelect(payload: { item: MediaItem; url: string }) {
  if ((payload.item.type === 'image' || payload.item.type === 'sticker') && payload.url) {
    // Collect all viewable images in current filtered view
    const viewableList = filteredMedia.value.filter(m => m.type === 'image' || m.type === 'sticker')
    const index = viewableList.findIndex(m => m.name === payload.item.name)
    emit('view-image', {
      url: payload.url,
      name: payload.item.name,
      list: viewableList,
      index: index !== -1 ? index : 0,
    })
  }
}

function close() {
  emit('close')
}

// Reset limit when modal opens or search query changes
watch(
  () => [props.isOpen, searchQuery.value],
  () => {
    visibleLimit.value = batchSize
  }
)
</script>
