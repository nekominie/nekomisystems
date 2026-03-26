<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  src: string
  alt: string
  previewSrc?: string
}>()

const emit = defineEmits<{
  loaded: [image: HTMLImageElement]
}>()

const displaySrc = ref('')
const isLoading = ref(true)
const hasError = ref(false)
const progress = ref(0)
const progressKnown = ref(false)

let activeObjectUrl: string | null = null
let activeController: AbortController | null = null
let requestToken = 0

const progressLabel = computed(() => {
  if (!isLoading.value) {
    return 'Listo'
  }

  if (!progressKnown.value) {
    return 'Cargando...'
  }

  return `${Math.round(progress.value)}%`
})

const previewSource = computed(() => {
  if (
    !props.previewSrc ||
    props.previewSrc === displaySrc.value ||
    (!isLoading.value && !hasError.value)
  ) {
    return ''
  }

  return props.previewSrc
})

const cleanupObjectUrl = () => {
  if (!activeObjectUrl) {
    return
  }

  URL.revokeObjectURL(activeObjectUrl)
  activeObjectUrl = null
}

const resetState = () => {
  isLoading.value = true
  hasError.value = false
  progress.value = 0
  progressKnown.value = false
  displaySrc.value = ''
}

const loadWithNativeImage = (src: string, token: number) => {
  if (token !== requestToken) {
    return
  }

  displaySrc.value = src
}

const loadImage = async (src: string) => {
  requestToken += 1
  const token = requestToken

  activeController?.abort()
  activeController = new AbortController()
  cleanupObjectUrl()
  resetState()

  try {
    const response = await fetch(src, {
      signal: activeController.signal,
      cache: 'force-cache',
    })

    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status}`)
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0)
    const reader = response.body?.getReader()

    if (!reader) {
      loadWithNativeImage(src, token)
      return
    }

    progressKnown.value = contentLength > 0

    const chunks: Uint8Array[] = []
    let received = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      if (!value) {
        continue
      }

      chunks.push(value)
      received += value.length

      if (contentLength > 0) {
        progress.value = Math.min((received / contentLength) * 100, 100)
      }
    }

    if (token !== requestToken) {
      return
    }

    const blob = new Blob(chunks, {
      type: response.headers.get('content-type') ?? undefined,
    })

    cleanupObjectUrl()
    activeObjectUrl = URL.createObjectURL(blob)
    displaySrc.value = activeObjectUrl
  } catch (error) {
    if (activeController.signal.aborted || token !== requestToken) {
      return
    }

    loadWithNativeImage(src, token)

    if (!displaySrc.value) {
      hasError.value = true
      isLoading.value = false
    }
  }
}

const handleLoad = (event: Event) => {
  if (!(event.target instanceof HTMLImageElement)) {
    return
  }

  isLoading.value = false
  progress.value = 100
  progressKnown.value = true
  emit('loaded', event.target)
}

const handleError = () => {
  hasError.value = true
  isLoading.value = false
}

watch(
  () => props.src,
  (src) => {
    if (!src) {
      resetState()
      return
    }

    void loadImage(src)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  activeController?.abort()
  cleanupObjectUrl()
})
</script>

<template>
  <div class="reader-image" :class="{ 'reader-image--loading': isLoading }">
    <img
      v-if="previewSource"
      class="reader-image__preview"
      :src="previewSource"
      alt=""
      aria-hidden="true"
      draggable="false"
      decoding="async"
      loading="eager"
    />

    <img
      v-if="displaySrc"
      class="reader-image__full"
      :src="displaySrc"
      :alt="alt"
      draggable="false"
      decoding="async"
      @load="handleLoad"
      @error="handleError"
    />

    <transition name="reader-image-status">
      <div v-if="isLoading || hasError" class="reader-image__status">
        <div class="reader-image__status-card">
          <span class="reader-image__status-label">
            {{ hasError ? 'No se pudo cargar la pagina' : 'Cargando pagina' }}
          </span>
          <strong>{{ hasError ? 'Error de carga' : progressLabel }}</strong>
          <div class="reader-image__status-track">
            <div
              class="reader-image__status-fill"
              :class="{ 'reader-image__status-fill--indeterminate': !progressKnown && !hasError }"
              :style="progressKnown ? { width: `${progress}%` } : undefined"
            ></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
