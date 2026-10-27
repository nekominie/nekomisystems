<template>
  <div class="flex-1 flex flex-col min-h-0 relative wa-chat-pattern">
    <!-- Top dynamic window info strip (only when total messages exceed batch size) -->
    <div
      v-if="totalCount > batchSize"
      class="px-4 py-1.5 bg-[#f0f2f5]/95 dark:bg-[#111b21]/95 backdrop-blur-sm border-b border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 select-none z-10"
    >
      <div class="flex items-center gap-1.5">
        <i class="bi bi-layers-half text-xs text-[#25d366]"></i>
        <span>
          Mostrando <strong>{{ (startIndex + 1).toLocaleString() }}</strong> - <strong>{{ Math.min(endIndex, totalCount).toLocaleString() }}</strong> de <strong>{{ totalCount.toLocaleString() }}</strong> mensajes
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="startIndex > 0"
          type="button"
          class="hover:text-white px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-1"
          title="Saltar al primer mensaje del chat"
          @click="jumpToBeginning"
        >
          <i class="bi bi-chevron-double-up text-[10px]"></i>
          <span>Inicio</span>
        </button>

        <button
          v-if="endIndex < totalCount"
          type="button"
          class="hover:text-white px-2 py-0.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-1"
          title="Saltar al mensaje más reciente"
          @click="jumpToEnd"
        >
          <span>Final</span>
          <i class="bi bi-chevron-double-down text-[10px]"></i>
        </button>

        <button
          v-if="startIndex > 0 || endIndex < totalCount"
          type="button"
          class="text-[#00a884] dark:text-[#25d366] font-semibold hover:underline ml-1"
          title="Cargar todos los mensajes en el DOM de golpe"
          @click="loadAllMessages"
        >
          Ver todos
        </button>
      </div>
    </div>

    <!-- Chat messages list container -->
    <div
      ref="scrollContainerRef"
      class="flex-1 overflow-y-auto py-4 px-1 sm:px-4 space-y-1 relative"
      @scroll="handleScroll"
    >
      <!-- If no messages found after search filter -->
      <div v-if="filteredMessages.length === 0" class="py-16 text-center text-gray-500 dark:text-gray-400">
        <i class="bi bi-chat-square-dots text-3xl mb-2 block opacity-40"></i>
        <p class="text-sm font-semibold">No se encontraron mensajes</p>
        <p class="text-xs text-gray-400">Intenta con otro término de búsqueda</p>
      </div>

      <!-- Top Sentinel / Load Older Messages Banner -->
      <div v-if="startIndex > 0" class="flex flex-col items-center justify-center my-3 gap-2">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/90 dark:bg-[#202c33] text-gray-700 dark:text-gray-200 border border-black/5 dark:border-white/10 shadow-xs hover:bg-[#25d366] hover:text-[#111b21] dark:hover:bg-[#25d366] dark:hover:text-[#111b21] transition-all flex items-center gap-1.5"
            :disabled="isLoadingOlder"
            @click="loadOlderMessages(batchSize)"
          >
            <i v-if="isLoadingOlder" class="bi bi-arrow-repeat animate-spin text-xs"></i>
            <i v-else class="bi bi-arrow-up text-xs"></i>
            <span>Cargar anteriores ({{ startIndex.toLocaleString() }} restantes)</span>
          </button>
        </div>
        <p class="text-[10px] text-gray-400">Desplaza hacia arriba para cargar automáticamente</p>
      </div>

      <!-- Beginning of conversation pill (when at the absolute top) -->
      <div v-else-if="filteredMessages.length > 0 && startIndex === 0" class="flex justify-center my-4">
        <div class="px-3.5 py-1 rounded-full bg-white/60 dark:bg-black/30 border border-black/5 dark:border-white/5 text-[10px] text-gray-400 flex items-center gap-1.5">
          <i class="bi bi-chat-quote-fill"></i>
          <span>Inicio del historial de la conversación</span>
        </div>
      </div>

      <!-- Messages Grouped by Date (Rendered from visible dynamic slice only!) -->
      <template v-for="group in groupedVisibleMessages" :key="group.date">
        <!-- Date Badge / Pill -->
        <div class="flex justify-center my-3 sticky top-2 z-10 select-none">
          <span
            class="px-3 py-1 rounded-lg text-[11px] font-semibold shadow-xs bg-white/90 text-gray-600 dark:bg-[#182229]/90 dark:text-[#8696a0] border border-black/5 dark:border-white/5 backdrop-blur-xs"
          >
            {{ group.date }}
          </span>
        </div>

        <!-- Messages in this group -->
        <template v-for="msg in group.messages" :key="msg.id">
          <!-- System event -->
          <SystemMessage
            v-if="msg.isSystem"
            :content="msg.content"
          />

          <!-- Normal user message -->
          <MessageBubble
            v-else
            :sender="msg.sender"
            :content="msg.content"
            :raw-time="msg.rawTime"
            :is-protagonist="msg.sender === protagonist"
            :attachment="msg.attachment"
            @view-image="$emit('view-image', $event)"
          />
        </template>
      </template>

      <!-- Bottom Sentinel if endIndex < totalCount -->
      <div v-if="endIndex < totalCount" class="flex justify-center my-4">
        <button
          type="button"
          class="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/90 dark:bg-[#202c33] text-gray-700 dark:text-gray-200 border border-black/5 dark:border-white/10 shadow-xs hover:bg-[#25d366] hover:text-[#111b21] dark:hover:bg-[#25d366] dark:hover:text-[#111b21] transition-all flex items-center gap-1.5"
          :disabled="isLoadingNewer"
          @click="loadNewerMessages(batchSize)"
        >
          <i v-if="isLoadingNewer" class="bi bi-arrow-repeat animate-spin text-xs"></i>
          <i v-else class="bi bi-arrow-down text-xs"></i>
          <span>Cargar siguientes ({{ (totalCount - endIndex).toLocaleString() }} mensajes)</span>
        </button>
      </div>

      <!-- Bottom anchor for auto-scroll -->
      <div ref="bottomAnchorRef" class="h-2"></div>
    </div>

    <!-- Floating Scroll-to-Bottom Button -->
    <button
      v-if="showScrollBottomBtn"
      type="button"
      class="absolute right-5 bottom-16 z-20 w-10 h-10 rounded-full bg-white dark:bg-[#202c33] text-gray-600 dark:text-gray-200 shadow-xl border border-black/10 dark:border-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
      title="Ir al final del chat"
      @click="jumpToEnd"
    >
      <i class="bi bi-chevron-double-down text-sm"></i>
      <span
        v-if="endIndex < totalCount"
        class="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white dark:border-[#202c33]"
      ></span>
    </button>

    <!-- Bottom Read-Only Input Simulation Bar -->
    <div
      class="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#e9edef] dark:border-[#2a3942] flex items-center gap-2.5 text-gray-500 dark:text-[#8696a0] select-none shrink-0"
    >
      <div class="flex items-center gap-2">
        <i class="bi bi-emoji-smile text-lg"></i>
        <i class="bi bi-paperclip text-lg"></i>
      </div>

      <div
        class="flex-1 py-2 px-4 rounded-full bg-white dark:bg-[#2a3942] text-xs text-gray-400 dark:text-gray-400 italic border border-transparent dark:border-white/5 truncate"
      >
        <span>Visor de historial de chat — Modo exportación de WhatsApp</span>
      </div>

      <div class="w-9 h-9 rounded-full bg-[#00a884] dark:bg-[#25d366] text-white flex items-center justify-center shadow-xs">
        <i class="bi bi-mic-fill text-sm"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import type { ChatMessage } from '../types/chat'
import MessageBubble from './MessageBubble.vue'
import SystemMessage from './SystemMessage.vue'

const props = defineProps<{
  messages: ChatMessage[]
  protagonist: string
  searchQuery: string
  filterSender: string
}>()

defineEmits<{
  (e: 'view-image', payload: { url: string; name: string }): void
}>()

const scrollContainerRef = ref<HTMLDivElement | null>(null)
const bottomAnchorRef = ref<HTMLDivElement | null>(null)
const showScrollBottomBtn = ref(false)

// Virtual window slice configuration
const batchSize = 120
const startIndex = ref(0)
const endIndex = ref(0)
const isLoadingOlder = ref(false)
const isLoadingNewer = ref(false)

// Filter messages based on search query and sender
const filteredMessages = computed(() => {
  let list = props.messages

  if (props.filterSender) {
    list = list.filter(m => m.sender === props.filterSender || m.isSystem)
  }

  if (props.searchQuery.trim()) {
    const q = props.searchQuery.toLowerCase().trim()
    list = list.filter(m => {
      const matchText = m.content.toLowerCase().includes(q)
      const matchSender = m.sender.toLowerCase().includes(q)
      const matchFile = m.attachment?.fileName.toLowerCase().includes(q)
      return matchText || matchSender || matchFile
    })
  }

  return list
})

const totalCount = computed(() => filteredMessages.value.length)

// Slice only the visible window of messages (prevents DOM overloading!)
const visibleMessages = computed(() => {
  return filteredMessages.value.slice(startIndex.value, endIndex.value)
})

// Group ONLY the visible messages by date
const groupedVisibleMessages = computed(() => {
  const groups: { date: string; messages: ChatMessage[] }[] = []
  let currentGroup: { date: string; messages: ChatMessage[] } | null = null

  for (const msg of visibleMessages.value) {
    if (!currentGroup || currentGroup.date !== msg.dateGroup) {
      currentGroup = {
        date: msg.dateGroup,
        messages: [],
      }
      groups.push(currentGroup)
    }
    currentGroup.messages.push(msg)
  }

  return groups
})

/**
 * Initializes the window range to show the latest messages.
 */
function initializeWindow(scrollToBottomFlag = true) {
  const count = filteredMessages.value.length
  if (count <= batchSize) {
    startIndex.value = 0
    endIndex.value = count
  } else {
    startIndex.value = count - batchSize
    endIndex.value = count
  }

  if (scrollToBottomFlag) {
    scrollToBottom(false)
  }
}

/**
 * Loads older messages prepended at the top with scroll offset compensation.
 */
async function loadOlderMessages(amount = 80) {
  if (startIndex.value <= 0 || isLoadingOlder.value) return
  isLoadingOlder.value = true

  const container = scrollContainerRef.value
  const oldScrollHeight = container?.scrollHeight || 0
  const oldScrollTop = container?.scrollTop || 0

  startIndex.value = Math.max(0, startIndex.value - amount)

  await nextTick()

  // Compensate scrollTop to prevent visual jump
  if (container) {
    const newScrollHeight = container.scrollHeight
    container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight)
  }

  isLoadingOlder.value = false
}

/**
 * Loads newer messages appended at the bottom.
 */
async function loadNewerMessages(amount = 80) {
  if (endIndex.value >= totalCount.value || isLoadingNewer.value) return
  isLoadingNewer.value = true

  endIndex.value = Math.min(totalCount.value, endIndex.value + amount)

  await nextTick()
  isLoadingNewer.value = false
}

/**
 * Jump to the very beginning of the chat.
 */
async function jumpToBeginning() {
  startIndex.value = 0
  endIndex.value = Math.min(totalCount.value, batchSize)
  await nextTick()
  if (scrollContainerRef.value) {
    scrollContainerRef.value.scrollTop = 0
  }
}

/**
 * Jump to the very end (latest messages).
 */
async function jumpToEnd() {
  initializeWindow(true)
}

/**
 * Load all messages at once into the DOM (with confirmation if massive).
 */
async function loadAllMessages() {
  if (totalCount.value > 2500) {
    const confirmed = confirm(`El chat contiene ${totalCount.value.toLocaleString()} mensajes. Renderizar todos a la vez puede requerir mucha memoria. ¿Deseas continuar?`)
    if (!confirmed) return
  }

  startIndex.value = 0
  endIndex.value = totalCount.value
}

/**
 * Scroll event handler: triggers auto loading of older/newer messages as user scrolls.
 */
function handleScroll() {
  if (!scrollContainerRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.value
  const distanceFromBottom = scrollHeight - scrollTop - clientHeight

  showScrollBottomBtn.value = distanceFromBottom > 250 || endIndex.value < totalCount.value

  // Reverse infinite scroll: if user scrolls near top, auto-load older messages
  if (scrollTop < 180 && startIndex.value > 0 && !isLoadingOlder.value) {
    loadOlderMessages(80)
  }

  // Forward infinite scroll: if user scrolled down and there are newer unloaded messages
  if (distanceFromBottom < 180 && endIndex.value < totalCount.value && !isLoadingNewer.value) {
    loadNewerMessages(80)
  }
}

function scrollToBottom(smooth = false) {
  nextTick(() => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTo({
        top: scrollContainerRef.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  })
}

// Re-initialize window when messages or filters change
watch(
  () => [props.messages, props.filterSender, props.searchQuery],
  () => {
    initializeWindow(true)
  },
  { immediate: true }
)

onMounted(() => {
  initializeWindow(false)
  scrollToBottom(false)
})
</script>
