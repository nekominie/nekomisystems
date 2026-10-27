<template>
  <div
    class="chat-message-row flex w-full mb-1.5 px-3 sm:px-6 transition-all"
    :class="[isProtagonist ? 'justify-end' : 'justify-start']"
  >
    <div
      class="relative max-w-[85%] sm:max-w-[70%] md:max-w-[60%] rounded-2xl p-2.5 sm:p-3 bubble-shadow transition-all group"
      :class="[
        isProtagonist
          ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-xs'
          : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-xs'
      ]"
    >
      <!-- Sender name (only shown for non-protagonist messages in group chats) -->
      <div
        v-if="!isProtagonist && sender"
        class="text-xs font-bold mb-1 select-none flex items-center justify-between gap-2"
        :style="{ color: senderColor }"
      >
        <span>{{ sender }}</span>
      </div>

      <!-- Attachment Rendering -->
      <div v-if="attachment" class="mb-1.5">
        <!-- 1. IMAGE -->
        <div v-if="attachment.type === 'image'" class="rounded-xl overflow-hidden cursor-pointer relative group/img max-w-sm">
          <img
            v-if="attachment.url"
            :src="attachment.url"
            :alt="attachment.fileName"
            loading="lazy"
            class="max-h-72 w-auto object-cover rounded-xl hover:scale-[1.01] transition-transform"
            @click="$emit('view-image', { url: attachment.url, name: attachment.fileName })"
          />
          <div
            v-else-if="attachment.isMissing"
            class="p-4 rounded-xl bg-black/10 dark:bg-black/30 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400"
          >
            <i class="bi bi-image text-lg"></i>
            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300">{{ attachment.fileName }}</p>
              <p class="text-[10px] text-amber-600 dark:text-amber-400">Archivo no encontrado en el ZIP</p>
            </div>
          </div>
          <!-- Loading placeholder while resolving -->
          <div
            v-else
            class="w-48 h-36 rounded-xl bg-black/10 dark:bg-black/30 flex flex-col items-center justify-center gap-2 text-xs text-gray-400 animate-pulse"
          >
            <div class="w-5 h-5 rounded-full border-2 border-[#25d366]/40 border-t-[#25d366] animate-spin"></div>
            <span class="text-[10px]">Cargando imagen...</span>
          </div>
        </div>

        <!-- 2. STICKER -->
        <div v-else-if="attachment.type === 'sticker'" class="p-1">
          <img
            v-if="attachment.url"
            :src="attachment.url"
            :alt="attachment.fileName"
            loading="lazy"
            class="w-32 h-32 object-contain cursor-pointer hover:scale-105 transition-transform"
            @click="$emit('view-image', { url: attachment.url, name: attachment.fileName })"
          />
          <div
            v-else-if="attachment.isMissing"
            class="p-3 rounded-xl bg-black/10 dark:bg-black/30 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
          >
            <i class="bi bi-sticky text-xl"></i>
            <span>{{ attachment.fileName }} (Sticker)</span>
          </div>
          <div
            v-else
            class="w-24 h-24 rounded-xl bg-black/10 dark:bg-black/30 flex items-center justify-center text-[10px] text-gray-400 animate-pulse"
          >
            <i class="bi bi-sticky text-xl opacity-40"></i>
          </div>
        </div>

        <!-- 3. AUDIO / VOICE NOTE -->
        <div
          v-else-if="attachment.type === 'audio'"
          class="p-2 sm:p-2.5 rounded-xl bg-black/5 dark:bg-black/25 flex flex-col gap-2 min-w-[220px] sm:min-w-[260px]"
        >
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="w-10 h-10 rounded-full bg-[#25d366] text-white flex items-center justify-center shrink-0 shadow-md hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              :disabled="!attachment.url"
              @click="toggleAudio"
            >
              <i :class="isPlaying ? 'bi bi-pause-fill text-xl' : 'bi bi-play-fill text-xl ml-0.5'"></i>
            </button>
            <div class="flex-1 min-w-0">
              <div class="h-1.5 w-full bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer" @click="seekAudio">
                <div
                  class="h-full bg-[#25d366] transition-all"
                  :style="{ width: `${audioProgress}%` }"
                ></div>
              </div>
              <div class="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                <span class="flex items-center gap-1">
                  <i class="bi bi-mic-fill text-xs text-gray-400"></i>
                  Nota de voz
                </span>
                <span>{{ formatTime(audioCurrentTime) }} / {{ formatTime(audioDuration) }}</span>
              </div>
            </div>
          </div>
          <audio
            ref="audioRef"
            v-if="attachment.url"
            :src="attachment.url"
            class="hidden"
            @timeupdate="onAudioTimeUpdate"
            @loadedmetadata="onAudioLoaded"
            @ended="onAudioEnded"
          ></audio>
        </div>

        <!-- 4. VIDEO -->
        <div v-else-if="attachment.type === 'video'" class="rounded-xl overflow-hidden max-w-sm">
          <video
            v-if="attachment.url"
            :src="attachment.url"
            controls
            class="max-h-72 w-full rounded-xl bg-black"
          ></video>
          <div
            v-else
            class="p-4 rounded-xl bg-black/10 dark:bg-black/30 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400"
          >
            <i class="bi bi-camera-video text-xl"></i>
            <div>
              <p class="font-semibold text-gray-700 dark:text-gray-300">{{ attachment.fileName }}</p>
              <p class="text-[10px] text-amber-600 dark:text-amber-400">Video no incluido en el ZIP</p>
            </div>
          </div>
        </div>

        <!-- 5. CONTACT (VCF) -->
        <div
          v-else-if="attachment.type === 'contact'"
          class="p-3 rounded-2xl bg-black/5 dark:bg-black/30 border border-black/5 dark:border-white/5 min-w-[220px] sm:min-w-[260px]"
        >
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center text-xl shrink-0 shadow">
              <i class="bi bi-person-fill"></i>
            </div>
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-sm text-[#111b21] dark:text-white truncate">
                {{ attachment.contactData?.name || cleanContactName(attachment.fileName) }}
              </h4>
              <p v-if="attachment.contactData?.phone" class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ attachment.contactData.phone }}
              </p>
              <p v-else class="text-[11px] text-gray-400 truncate">Tarjeta de contacto (vCard)</p>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Contacto</span>
            <a
              v-if="attachment.url"
              :href="attachment.url"
              :download="attachment.fileName"
              class="text-xs font-bold text-[#00a884] dark:text-[#25d366] hover:underline flex items-center gap-1"
            >
              <i class="bi bi-download"></i>
              Guardar contacto
            </a>
          </div>
        </div>

        <!-- 6. GENERIC DOCUMENT -->
        <div
          v-else
          class="p-3 rounded-xl bg-black/5 dark:bg-black/25 flex items-center gap-3 min-w-[200px]"
        >
          <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center text-xl shrink-0">
            <i class="bi bi-file-earmark-arrow-down"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-bold text-xs truncate text-[#111b21] dark:text-white">{{ attachment.fileName }}</p>
            <p v-if="attachment.size" class="text-[10px] text-gray-500 dark:text-gray-400">
              {{ formatSize(attachment.size) }}
            </p>
          </div>
          <a
            v-if="attachment.url"
            :href="attachment.url"
            :download="attachment.fileName"
            class="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs transition-all"
            title="Descargar"
          >
            <i class="bi bi-download"></i>
          </a>
        </div>
      </div>

      <!-- Text content -->
      <div v-if="content" class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
        <span v-html="formattedContent"></span>
      </div>

      <!-- Timestamp & Status Checkmarks -->
      <div class="flex items-center justify-end gap-1 mt-1 select-none float-right ml-3 -mb-0.5">
        <span class="text-[10px] text-gray-500 dark:text-[#8696a0] font-sans">
          {{ rawTime }}
        </span>
        <span v-if="isProtagonist" class="text-[#53bdeb] text-xs leading-none">
          <i class="bi bi-check2-all"></i>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted, watch } from 'vue'
import type { Attachment } from '../types/chat'
import { getParticipantColor } from '../utils/colors'

const props = defineProps<{
  sender: string
  content: string
  rawTime: string
  isProtagonist: boolean
  attachment?: Attachment
}>()

defineEmits<{
  (e: 'view-image', payload: { url: string; name: string }): void
}>()

// Injected lazy resolver for attachments
const resolveAttachment = inject<((att: Attachment) => Promise<void>) | null>('resolveAttachment', null)

function triggerLazyResolution() {
  if (props.attachment && !props.attachment.url && !props.attachment.isMissing && resolveAttachment) {
    resolveAttachment(props.attachment)
  }
}

onMounted(() => {
  triggerLazyResolution()
})

watch(
  () => props.attachment,
  () => {
    triggerLazyResolution()
  }
)

const senderColor = computed(() => getParticipantColor(props.sender))

// Audio player state
const audioRef = ref<HTMLAudioElement | null>(null)
const isPlaying = ref(false)
const audioProgress = ref(0)
const audioCurrentTime = ref(0)
const audioDuration = ref(0)

function toggleAudio() {
  if (!audioRef.value) return
  if (isPlaying.value) {
    audioRef.value.pause()
    isPlaying.value = false
  } else {
    audioRef.value.play().then(() => {
      isPlaying.value = true
    }).catch(err => {
      console.warn('Audio play error:', err)
    })
  }
}

function onAudioTimeUpdate() {
  if (!audioRef.value) return
  audioCurrentTime.value = audioRef.value.currentTime
  if (audioDuration.value > 0) {
    audioProgress.value = (audioRef.value.currentTime / audioDuration.value) * 100
  }
}

function onAudioLoaded() {
  if (audioRef.value) {
    audioDuration.value = audioRef.value.duration || 0
  }
}

function onAudioEnded() {
  isPlaying.value = false
  audioProgress.value = 0
  audioCurrentTime.value = 0
}

function seekAudio(e: MouseEvent) {
  if (!audioRef.value || !audioDuration.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const clickX = e.clientX - rect.left
  const ratio = Math.max(0, Math.min(1, clickX / rect.width))
  audioRef.value.currentTime = ratio * audioDuration.value
  audioProgress.value = ratio * 100
}

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function cleanContactName(fileName: string): string {
  return fileName.replace(/\.vcf$/i, '').trim()
}

function formatSize(bytes: number): string {
  if (!bytes) return ''
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Convert links in text to clickable anchors safely
const formattedContent = computed(() => {
  if (!props.content) return ''
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const escaped = props.content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline hover:opacity-80">${url}</a>`
  })
})
</script>
