<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

interface FlipBookPage {
  id: string
  image: string
  title: string
}

interface FlipBookInstance {
  _activePage?: number
  contentProvider?: {
    maxZoom?: number
    zoomScale?: number
  }
  dispose?: () => void
  gotoPage?: (page: number) => void
  next?: () => void
  pageCount?: number
  prev?: () => void
  resize?: () => void
  target?: {
    _activePage?: number
    pageCount?: number
    pan?: (point: unknown) => void
    startPoint?: unknown
  }
  ui?: {
    update?: () => void
  }
  zoomValue?: number
  zoom?: (direction: number) => void
}

const props = defineProps<{
  bookId: string
  initialPage: number
  overlayOpen: boolean
  pages: FlipBookPage[]
  title: string
}>()

const emit = defineEmits<{
  error: [message: string]
  pageChange: [page: number]
  ready: [pageCount: number]
}>()

const hostRef = ref<HTMLElement | null>(null)
const instanceRef = shallowRef<FlipBookInstance | null>(null)
const isLoading = ref(true)
const isReady = ref(false)
const isDragging = ref(false)
const isZoomed = ref(false)
const errorMessage = ref('')
let resizeTimers: number[] = []

const stageClass = computed(() => ({
  'dearflip-stage--dragging': isDragging.value,
  'dearflip-stage--overlay-open': props.overlayOpen,
  'dearflip-stage--ready': isReady.value,
  'dearflip-stage--zoomed': isZoomed.value,
}))

const normalizePage = (page: number) => {
  if (!props.pages.length) {
    return 1
  }

  return Math.max(1, Math.min(props.pages.length, Math.round(page || 1)))
}

const asFlipBook = (value: unknown): FlipBookInstance | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as FlipBookInstance
}

const getZoomScale = (book: FlipBookInstance | null = instanceRef.value) =>
  Number(book?.contentProvider?.zoomScale ?? book?.zoomValue ?? 1)

const syncZoomState = (book: FlipBookInstance | null = instanceRef.value) => {
  isZoomed.value = getZoomScale(book) > 1.01
}

const getActivePage = (book: FlipBookInstance | null) => {
  if (!book) {
    return normalizePage(props.initialPage)
  }

  const activePage = book.target?._activePage ?? book._activePage ?? props.initialPage
  return normalizePage(Number(activePage))
}

const syncPageFromBook = (book?: FlipBookInstance | null) => {
  emit('pageChange', getActivePage(book ?? instanceRef.value))
}

const runResize = () => {
  const book = instanceRef.value

  if (!book) {
    return
  }

  try {
    book.resize?.()
    window.requestAnimationFrame(() => {
      syncZoomState(book)
    })
  } catch (error) {
    console.warn('No se pudo recalcular el tamaño del libro.', error)
  }
}

const scheduleResize = (delays = [0, 120, 260, 420]) => {
  resizeTimers.forEach((timer) => window.clearTimeout(timer))
  resizeTimers = []

  for (const delay of delays) {
    resizeTimers.push(
      window.setTimeout(() => {
        runResize()
      }, delay)
    )
  }
}

const destroyBook = () => {
  resizeTimers.forEach((timer) => window.clearTimeout(timer))
  resizeTimers = []

  try {
    instanceRef.value?.dispose?.()
  } catch (error) {
    console.warn('No se pudo destruir la instancia de DearFlip.', error)
  }

  instanceRef.value = null
  isDragging.value = false
  isReady.value = false
  isZoomed.value = false

  if (hostRef.value) {
    hostRef.value.innerHTML = ''
  }
}

const handleBookReady = function (this: unknown, book: unknown) {
  const resolvedBook = asFlipBook(book) ?? asFlipBook(this) ?? instanceRef.value

  if (resolvedBook) {
    instanceRef.value = resolvedBook
  }

  isLoading.value = false
  isReady.value = true
  errorMessage.value = ''
  syncZoomState(resolvedBook)
  emit('ready', props.pages.length)
  syncPageFromBook(resolvedBook)
}

const handleBookFlip = function (this: unknown, book: unknown) {
  const resolvedBook = asFlipBook(book) ?? asFlipBook(this) ?? instanceRef.value
  syncPageFromBook(resolvedBook)
}

const initializeBook = async () => {
  await nextTick()

  if (!hostRef.value) {
    return
  }

  destroyBook()

  if (!props.pages.length) {
    isLoading.value = false
    errorMessage.value = 'No hay paginas disponibles para construir el libro.'
    emit('error', errorMessage.value)
    return
  }

  const $ = window.jQuery ?? window.$
  const DFLIP = window.DFLIP
  const flipBookPlugin = $?.fn?.flipBook

  if (!DFLIP || !$ || typeof flipBookPlugin !== 'function') {
    isLoading.value = false
    errorMessage.value = 'DearFlip no pudo cargarse en esta vista.'
    emit('error', errorMessage.value)
    return
  }

  isLoading.value = true
  isReady.value = false
  errorMessage.value = ''

  const options = {
    autoEnableOutline: false,
    autoEnableThumbnail: false,
    backgroundColor: 'transparent',
    controlsPosition: DFLIP.CONTROLSPOSITION?.HIDDEN ?? 'hide',
    direction: DFLIP.DIRECTION?.RTL ?? 2,
    enableDownload: false,
    forceFit: true,
    hard: 'cover',
    height: '100%',
    openPage: normalizePage(props.initialPage),
    pageMode: DFLIP.PAGE_MODE?.DOUBLE ?? 2,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 8,
    scrollWheel: true,
    search: false,
    soundEnable: false,
    transparent: true,
    webgl: true,
    onFlip: handleBookFlip,
    onReady: handleBookReady,
  }

  try {
    instanceRef.value = $(hostRef.value).flipBook(
      props.pages.map((page) => page.image),
      options
    ) as FlipBookInstance

    scheduleResize()

    window.setTimeout(() => {
      syncPageFromBook(instanceRef.value)
    }, 120)
  } catch (error) {
    console.error(error)
    isLoading.value = false
    errorMessage.value = 'Hubo un problema al inicializar el libro 3D.'
    emit('error', errorMessage.value)
    destroyBook()
  }
}

const goToPage = (page: number) => {
  const normalizedPage = normalizePage(page)
  instanceRef.value?.gotoPage?.(normalizedPage)
  emit('pageChange', normalizedPage)
}

const next = () => {
  instanceRef.value?.next?.()
}

const prev = () => {
  instanceRef.value?.prev?.()
}

const applyZoom = (direction: 1 | -1) => {
  const book = instanceRef.value

  if (!book?.zoom) {
    return
  }

  book.zoom(direction)
  book.ui?.update?.()
  book.target?.startPoint && book.target?.pan?.(book.target.startPoint)
  window.requestAnimationFrame(() => {
    syncZoomState(book)
  })
}

const zoomIn = () => {
  applyZoom(1)
}

const zoomOut = () => {
  applyZoom(-1)
}

const handleWheel = (event: WheelEvent) => {
  if (!isReady.value) {
    return
  }

  event.preventDefault()

  if (Math.abs(event.deltaY) < 2) {
    return
  }

  if (event.deltaY < 0) {
    zoomIn()
    return
  }

  zoomOut()
}

const handleDoubleClick = (event: MouseEvent) => {
  if (!isReady.value) {
    return
  }

  event.preventDefault()
  zoomIn()
}

const handlePointerDown = (event: PointerEvent) => {
  if (!isReady.value || !isZoomed.value) {
    return
  }

  if (event.pointerType === 'mouse' && event.button !== 0) {
    return
  }

  isDragging.value = true
}

const handlePointerUp = () => {
  isDragging.value = false
  window.requestAnimationFrame(() => {
    syncZoomState()
  })
}

const handlePointerLeave = () => {
  isDragging.value = false
}

watch(
  () => props.bookId,
  () => {
    initializeBook()
  }
)

watch(
  () => props.initialPage,
  (page) => {
    if (!isReady.value) {
      return
    }

    const activePage = getActivePage(instanceRef.value)
    const normalizedPage = normalizePage(page)

    if (normalizedPage !== activePage) {
      goToPage(normalizedPage)
    }
  }
)

watch(
  () => props.overlayOpen,
  () => {
    scheduleResize([0, 240, 420])
  }
)

onMounted(() => {
  initializeBook()
  window.addEventListener('resize', runResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', runResize)
  destroyBook()
})

defineExpose({
  goToPage,
  next,
  prev,
  resize: runResize,
  zoomIn,
  zoomOut,
})
</script>

<template>
  <div class="dearflip-stage" :class="stageClass">
    <div class="dearflip-stage__glow"></div>

    <div
      class="dearflip-stage__viewport"
      @wheel.prevent="handleWheel"
      @dblclick.prevent="handleDoubleClick"
      @pointerdown="handlePointerDown"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @pointerleave="handlePointerLeave"
    >
      <div ref="hostRef" class="dearflip-stage__book"></div>
    </div>

    <transition name="reader-image-status">
      <div v-if="isLoading || errorMessage" class="dearflip-stage__status">
        <div class="reader-image__status-card">
          <span class="reader-image__status-label">
            {{ errorMessage ? 'DearFlip' : 'Cargando libro 3D' }}
          </span>
          <strong>{{ errorMessage || title }}</strong>
          <div v-if="!errorMessage" class="reader-image__status-track">
            <div class="reader-image__status-fill reader-image__status-fill--indeterminate"></div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
