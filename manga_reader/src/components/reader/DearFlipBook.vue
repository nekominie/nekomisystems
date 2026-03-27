<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { ensureDearFlipAssets } from '../../lib/dearflip'

// Ajusta estos valores para cambiar el comportamiento del zoom del libro 3D.
const BOOK_ZOOM_SETTINGS = {
  // Multiplicador que usa DearFlip en cada paso de zoom hacia adentro.
  internalZoomStepRatio: 1.2,
  // Limite maximo del zoom interno de DearFlip.
  maxInternalScale: 6,
  // Permite alejar el libro por debajo de su tamano base.
  minOuterScale: 0.6,
  // Paso que se aplica al alejar/acercar el libro cuando esta por debajo de 1x.
  outerScaleStep: 0.12,
  // Delta minimo de la rueda antes de aplicar un paso de zoom.
  wheelDeltaThreshold: 2,
} as const

// Ajusta estas medidas para afinar el area real que DearFlip usa
// para calcular su canvas y el espacio interno del libro.
const BOOK_RENDER_BOX_SETTINGS = {
  height: '100%',
  maxHeight: '100%',
  maxWidth: '100%',
  minHeight: '0px',
  minWidth: '0px',
  paddingBottom: 24,
  paddingLeft: 18,
  paddingRight: 18,
  paddingTop: 14,
  width: '100%',
} as const

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
const outerBookScale = ref(1)
const errorMessage = ref('')
let resizeTimers: number[] = []
let initializationToken = 0

const stageClass = computed(() => ({
  'dearflip-stage--dragging': isDragging.value,
  'dearflip-stage--overlay-open': props.overlayOpen,
  'dearflip-stage--ready': isReady.value,
  'dearflip-stage--zoomed': isZoomed.value,
}))

const bookShellStyle = computed(() => ({
  height: BOOK_RENDER_BOX_SETTINGS.height,
  maxHeight: BOOK_RENDER_BOX_SETTINGS.maxHeight,
  maxWidth: BOOK_RENDER_BOX_SETTINGS.maxWidth,
  minHeight: BOOK_RENDER_BOX_SETTINGS.minHeight,
  minWidth: BOOK_RENDER_BOX_SETTINGS.minWidth,
  transform: `scale(${outerBookScale.value})`,
  width: BOOK_RENDER_BOX_SETTINGS.width,
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

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getInternalZoomScale = (book: FlipBookInstance | null = instanceRef.value) =>
  Number(book?.contentProvider?.zoomScale ?? book?.zoomValue ?? 1)

const getDisplayZoomScale = (book: FlipBookInstance | null = instanceRef.value) =>
  outerBookScale.value * getInternalZoomScale(book)

const syncZoomLimits = (book: FlipBookInstance | null = instanceRef.value) => {
  if (!book?.contentProvider) {
    return
  }

  book.contentProvider.maxZoom = BOOK_ZOOM_SETTINGS.maxInternalScale
}

const syncZoomState = (book: FlipBookInstance | null = instanceRef.value) => {
  syncZoomLimits(book)
  isZoomed.value = getDisplayZoomScale(book) > 1.01
}

const setOuterBookScale = (value: number) => {
  outerBookScale.value = clamp(value, BOOK_ZOOM_SETTINGS.minOuterScale, 1)
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
  outerBookScale.value = 1
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

  outerBookScale.value = 1
  isLoading.value = false
  isReady.value = true
  errorMessage.value = ''
  syncZoomLimits(resolvedBook)
  syncZoomState(resolvedBook)
  emit('ready', props.pages.length)
  syncPageFromBook(resolvedBook)
}

const handleBookFlip = function (this: unknown, book: unknown) {
  const resolvedBook = asFlipBook(book) ?? asFlipBook(this) ?? instanceRef.value
  syncPageFromBook(resolvedBook)
}

const initializeBook = async () => {
  const token = ++initializationToken

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

  isLoading.value = true
  isReady.value = false
  errorMessage.value = ''

  try {
    await ensureDearFlipAssets()
  } catch (error) {
    if (token !== initializationToken) {
      return
    }

    console.error(error)
    isLoading.value = false
    errorMessage.value = 'No se pudieron cargar los archivos del lector 3D.'
    emit('error', errorMessage.value)
    return
  }

  if (token !== initializationToken || !hostRef.value) {
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
    // Leave a little more room around the rendered book so the hard cover
    // can extend past the page block without being clipped.
    paddingBottom: BOOK_RENDER_BOX_SETTINGS.paddingBottom,
    paddingLeft: BOOK_RENDER_BOX_SETTINGS.paddingLeft,
    paddingRight: BOOK_RENDER_BOX_SETTINGS.paddingRight,
    paddingTop: BOOK_RENDER_BOX_SETTINGS.paddingTop,
    scrollWheel: false,
    search: false,
    soundEnable: false,
    transparent: true,
    webgl: true,
    zoomRatio: BOOK_ZOOM_SETTINGS.internalZoomStepRatio,
    onFlip: handleBookFlip,
    onReady: handleBookReady,
  }

  try {
    instanceRef.value = $(hostRef.value).flipBook(
      props.pages.map((page) => page.image),
      options
    ) as FlipBookInstance

    syncZoomLimits(instanceRef.value)
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

const applyInternalZoom = (direction: 1 | -1) => {
  const book = instanceRef.value

  if (!book?.zoom) {
    return
  }

  syncZoomLimits(book)
  book.zoom(direction)
  book.ui?.update?.()
  book.target?.startPoint && book.target?.pan?.(book.target.startPoint)
  window.requestAnimationFrame(() => {
    syncZoomState(book)
  })
}

const zoomIn = () => {
  if (outerBookScale.value < 1) {
    setOuterBookScale(outerBookScale.value + BOOK_ZOOM_SETTINGS.outerScaleStep)
    syncZoomState()
    return
  }

  applyInternalZoom(1)
}

const zoomOut = () => {
  const book = instanceRef.value

  if (!book) {
    return
  }

  if (getInternalZoomScale(book) > 1.01) {
    applyInternalZoom(-1)
    return
  }

  setOuterBookScale(outerBookScale.value - BOOK_ZOOM_SETTINGS.outerScaleStep)
  syncZoomState(book)
}

const resetZoom = () => {
  const book = instanceRef.value
  outerBookScale.value = 1

  if (!book?.zoom) {
    syncZoomState(book)
    return
  }

  syncZoomLimits(book)

  let guard = 0
  while (getInternalZoomScale(book) > 1.01 && guard < 24) {
    book.zoom(-1)
    guard += 1
  }

  book.ui?.update?.()
  book.target?.startPoint && book.target?.pan?.(book.target.startPoint)

  window.requestAnimationFrame(() => {
    syncZoomState(book)
  })
}

const handleWheel = (event: WheelEvent) => {
  if (!isReady.value) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  if (Math.abs(event.deltaY) < BOOK_ZOOM_SETTINGS.wheelDeltaThreshold) {
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
  initializationToken += 1
  window.removeEventListener('resize', runResize)
  destroyBook()
})

defineExpose({
  goToPage,
  next,
  prev,
  resetZoom,
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
      <div class="dearflip-stage__book-shell" :style="bookShellStyle">
        <div ref="hostRef" class="dearflip-stage__book"></div>
      </div>
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
