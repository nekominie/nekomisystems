<template>
  <div
    class="group bg-[#111b21] border border-white/5 hover:border-[#25d366]/40 rounded-2xl p-2.5 transition-all flex flex-col justify-between select-none shadow-xs"
  >
    <!-- Preview Thumbnail / Interactive Container -->
    <div
      class="w-full h-28 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden relative cursor-pointer"
      @click="handleClick"
    >
      <!-- Image or Sticker -->
      <template v-if="item.type === 'image' || item.type === 'sticker'">
        <img
          v-if="url"
          :src="url"
          :alt="item.name"
          loading="lazy"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          @error="handleImageError"
        />

        <!-- Loading spinner placeholder -->
        <div v-else-if="isLoading" class="flex flex-col items-center justify-center gap-1.5 text-gray-400">
          <div class="w-5 h-5 rounded-full border-2 border-[#25d366]/30 border-t-[#25d366] animate-spin"></div>
          <span class="text-[9px]">Cargando...</span>
        </div>

        <!-- Missing / Error fallback -->
        <div v-else class="flex flex-col items-center justify-center text-gray-500">
          <i class="bi bi-image text-2xl opacity-40"></i>
        </div>

        <!-- Hover zoom icon overlay -->
        <div
          v-if="url"
          class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
        >
          <i class="bi bi-zoom-in text-xl drop-shadow-md"></i>
        </div>
      </template>

      <!-- Audio -->
      <div v-else-if="item.type === 'audio'" class="flex flex-col items-center justify-center text-emerald-400">
        <i class="bi bi-mic-fill text-3xl group-hover:scale-110 transition-transform"></i>
        <span class="text-[9px] text-gray-400 mt-1">Audio</span>
      </div>

      <!-- Video -->
      <div v-else-if="item.type === 'video'" class="flex flex-col items-center justify-center text-rose-400">
        <i class="bi bi-play-btn-fill text-3xl group-hover:scale-110 transition-transform"></i>
        <span class="text-[9px] text-gray-400 mt-1">Video</span>
      </div>

      <!-- Contact -->
      <div v-else-if="item.type === 'contact'" class="flex flex-col items-center justify-center text-purple-400">
        <i class="bi bi-person-lines-fill text-3xl group-hover:scale-110 transition-transform"></i>
        <span class="text-[9px] text-gray-400 mt-1">Contacto</span>
      </div>

      <!-- Generic Document -->
      <div v-else class="flex flex-col items-center justify-center text-blue-400">
        <i class="bi bi-file-earmark-arrow-down text-3xl group-hover:scale-110 transition-transform"></i>
        <span class="text-[9px] text-gray-400 mt-1">Documento</span>
      </div>
    </div>

    <!-- Metadata & Download Action -->
    <div class="mt-2 flex items-center justify-between gap-1.5 min-w-0">
      <div class="min-w-0 flex-1">
        <span class="text-[11px] font-medium text-gray-200 truncate block" :title="item.name">
          {{ item.name }}
        </span>
        <span v-if="item.size" class="text-[9px] text-gray-500 font-mono block">
          {{ formatSize(item.size) }}
        </span>
      </div>

      <!-- Download Button -->
      <button
        type="button"
        class="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white flex items-center justify-center shrink-0 transition-all text-xs disabled:opacity-30"
        title="Descargar archivo"
        :disabled="!url && isLoading"
        @click.stop="triggerDownload"
      >
        <i class="bi bi-download"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, inject, onMounted } from 'vue'

export interface MediaItem {
  name: string
  type: string
  size?: number
  url?: string
}

const props = defineProps<{
  item: MediaItem
}>()

const emit = defineEmits<{
  (e: 'select', payload: { item: MediaItem; url: string }): void
}>()

const getMediaUrl = inject<((name: string) => Promise<string | null>) | null>('getMediaUrl', null)

const url = ref(props.item.url || '')
const isLoading = ref(!props.item.url)

onMounted(async () => {
  if (!url.value && getMediaUrl) {
    try {
      const resolved = await getMediaUrl(props.item.name)
      url.value = resolved || ''
    } catch (err) {
      console.warn('Error resolving gallery card url:', props.item.name, err)
    } finally {
      isLoading.value = false
    }
  } else {
    isLoading.value = false
  }
})

function handleImageError() {
  url.value = ''
  isLoading.value = false
}

function handleClick() {
  emit('select', { item: props.item, url: url.value })
}

function triggerDownload() {
  if (!url.value) return
  const a = document.createElement('a')
  a.href = url.value
  a.download = props.item.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>
