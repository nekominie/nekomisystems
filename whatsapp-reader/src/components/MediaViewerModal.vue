<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md select-none animate-fade-in"
    tabindex="0"
    @keydown.left="prevImage"
    @keydown.right="nextImage"
    @keydown.esc="close"
    @click="close"
  >
    <!-- Top Toolbar -->
    <div
      class="absolute top-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent z-20 text-white"
      @click.stop
    >
      <div class="flex items-center gap-3 min-w-0">
        <i class="bi bi-image text-lg text-[#25d366] shrink-0"></i>
        <div class="min-w-0">
          <p class="text-sm font-semibold truncate max-w-xs sm:max-w-md">{{ activeFileName }}</p>
          <p v-if="totalCount > 1" class="text-[11px] text-gray-400">
            {{ activeIndex + 1 }} de {{ totalCount }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <!-- Download button -->
        <a
          v-if="activeImageUrl"
          :href="activeImageUrl"
          :download="activeFileName"
          class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title="Descargar imagen"
          @click.stop
        >
          <i class="bi bi-download text-sm"></i>
        </a>

        <!-- Zoom out -->
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title="Alejar"
          @click.stop="zoomOut"
        >
          <i class="bi bi-dash-lg text-sm"></i>
        </button>

        <!-- Zoom in -->
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
          title="Acercar"
          @click.stop="zoomIn"
        >
          <i class="bi bi-plus-lg text-sm"></i>
        </button>

        <!-- Reset zoom -->
        <button
          type="button"
          class="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all"
          title="Restablecer escala"
          @click.stop="resetZoom"
        >
          {{ Math.round(scale * 100) }}%
        </button>

        <!-- Close -->
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all ml-1 sm:ml-2"
          title="Cerrar (Esc)"
          @click="close"
        >
          <i class="bi bi-x-lg text-base"></i>
        </button>
      </div>
    </div>

    <!-- Left Navigation Arrow (Previous) -->
    <button
      v-if="hasPrev"
      type="button"
      class="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95 shadow-xl"
      title="Anterior (Flecha izquierda)"
      @click.stop="prevImage"
    >
      <i class="bi bi-chevron-left text-2xl"></i>
    </button>

    <!-- Right Navigation Arrow (Next) -->
    <button
      v-if="hasNext"
      type="button"
      class="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110 active:scale-95 shadow-xl"
      title="Siguiente (Flecha derecha)"
      @click.stop="nextImage"
    >
      <i class="bi bi-chevron-right text-2xl"></i>
    </button>

    <!-- Main Image Container -->
    <div
      class="max-w-[90vw] max-h-[85vh] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing transition-transform duration-100 relative"
      @click.stop
    >
      <div v-if="isLoading" class="flex flex-col items-center justify-center gap-2 text-white">
        <div class="w-10 h-10 rounded-full border-3 border-[#25d366]/30 border-t-[#25d366] animate-spin"></div>
        <span class="text-xs text-gray-400">Cargando imagen...</span>
      </div>

      <img
        v-else-if="activeImageUrl"
        :src="activeImageUrl"
        :alt="activeFileName"
        class="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl transition-transform duration-100 select-none"
        :style="{ transform: `scale(${scale})` }"
      />

      <div v-else class="text-center text-gray-400 py-12">
        <i class="bi bi-image text-4xl mb-2 block opacity-40"></i>
        <p class="text-sm">No se pudo cargar la imagen.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject, onMounted, onUnmounted } from 'vue'
import type { MediaItem } from './GalleryItemCard.vue'

const props = defineProps<{
  isOpen: boolean
  imageUrl: string
  fileName: string
  items?: MediaItem[]
  initialIndex?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const getMediaUrl = inject<((name: string) => Promise<string | null>) | null>('getMediaUrl', null)

const scale = ref(1)
const activeIndex = ref(props.initialIndex ?? 0)
const activeImageUrl = ref(props.imageUrl)
const activeFileName = ref(props.fileName)
const isLoading = ref(false)

const totalCount = computed(() => props.items?.length || 1)
const hasPrev = computed(() => (props.items && props.items.length > 1 && activeIndex.value > 0))
const hasNext = computed(() => (props.items && props.items.length > 1 && activeIndex.value < props.items.length - 1))

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      scale.value = 1
      activeIndex.value = props.initialIndex ?? 0
      activeImageUrl.value = props.imageUrl
      activeFileName.value = props.fileName
    }
  }
)

watch(
  () => [props.imageUrl, props.fileName, props.initialIndex],
  () => {
    activeImageUrl.value = props.imageUrl
    activeFileName.value = props.fileName
    if (props.initialIndex !== undefined) {
      activeIndex.value = props.initialIndex
    }
  }
)

async function updateActiveImage(index: number) {
  if (!props.items || index < 0 || index >= props.items.length) return
  activeIndex.value = index
  const item = props.items[index]
  activeFileName.value = item.name
  scale.value = 1

  if (item.url) {
    activeImageUrl.value = item.url
    isLoading.value = false
  } else if (getMediaUrl) {
    isLoading.value = true
    try {
      const resolved = await getMediaUrl(item.name)
      activeImageUrl.value = resolved || ''
      item.url = resolved || ''
    } catch (err) {
      console.warn('Error loading lightbox image:', item.name, err)
    } finally {
      isLoading.value = false
    }
  }
}

function prevImage() {
  if (hasPrev.value) {
    updateActiveImage(activeIndex.value - 1)
  }
}

function nextImage() {
  if (hasNext.value) {
    updateActiveImage(activeIndex.value + 1)
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.5)
}

function resetZoom() {
  scale.value = 1
}

function close() {
  emit('close')
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (!props.isOpen) return
  if (e.key === 'ArrowLeft') {
    prevImage()
  } else if (e.key === 'ArrowRight') {
    nextImage()
  } else if (e.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>
