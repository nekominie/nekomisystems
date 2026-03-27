<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ReaderProgressiveImage from './ReaderProgressiveImage.vue'
import type { ReaderPage, ReadingUnit } from '../../types/manga'

const props = defineProps<{
  unit: ReadingUnit | undefined
  unitIndex: number
  unitCount: number
  mode: 'single' | 'spread'
  overlayOpen: boolean
}>()

const flipState = ref<'idle' | 'next' | 'prev'>('idle')
const viewportRef = ref<HTMLElement | null>(null)
const zoomLevel = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const dragMoved = ref(false)
const viewportSize = ref({ width: 0, height: 0 })
const pageRatios = ref<Record<string, number>>({})

const minZoom = 1
const maxZoom = 4
const scrollZoomStep = 0.2
const quickZoom = 2
const singleFallbackRatio = 0.72
const spreadFallbackRatio = 1.45
let dragOriginX = 0
let dragOriginY = 0
let dragStartX = 0
let dragStartY = 0
let lastTouchTapAt = 0
let pinchStartDistance = 0
let pinchStartZoom = 1
let suppressClickUntil = 0
let suppressTouchTapUntil = 0
let pinchActive = false
let resizeObserver: ResizeObserver | null = null
const activeTouchPointers = new Map<number, { x: number; y: number }>()
let viewportRefreshTimers: number[] = []

const resetView = () => {
  zoomLevel.value = 1
  offsetX.value = 0
  offsetY.value = 0
  isDragging.value = false
  dragMoved.value = false
  activeTouchPointers.clear()
  pinchActive = false
  pinchStartDistance = 0
  pinchStartZoom = 1
}

const updateViewportSize = (force = false) => {
  if (!viewportRef.value) {
    return
  }

  const nextWidth = Math.round(viewportRef.value.clientWidth)
  const nextHeight = Math.round(viewportRef.value.clientHeight)

  if ((!nextWidth || !nextHeight) && !force) {
    return
  }

  viewportSize.value = {
    width: nextWidth,
    height: nextHeight,
  }
}

const clearViewportRefreshTimers = () => {
  viewportRefreshTimers.forEach((timer) => window.clearTimeout(timer))
  viewportRefreshTimers = []
}

const scheduleViewportRefresh = (delays = [0, 120, 260, 420]) => {
  clearViewportRefreshTimers()

  delays.forEach((delay, index) => {
    viewportRefreshTimers.push(
      window.setTimeout(() => {
        updateViewportSize(index === delays.length - 1)
      }, delay)
    )
  })
}

const getRatio = (page?: ReaderPage) => {
  if (!page) {
    return singleFallbackRatio
  }

  return pageRatios.value[page.id] ?? (page.side === 'spread' ? spreadFallbackRatio : singleFallbackRatio)
}

const clampOffset = (x: number, y: number, zoom = zoomLevel.value) => {
  const viewport = viewportRef.value

  if (!viewport || zoom <= 1) {
    return { x: 0, y: 0 }
  }

  const bounds = viewport.getBoundingClientRect()
  const limitX = ((zoom - 1) * bounds.width) / 2
  const limitY = ((zoom - 1) * bounds.height) / 2

  return {
    x: Math.max(-limitX, Math.min(limitX, x)),
    y: Math.max(-limitY, Math.min(limitY, y)),
  }
}

const setZoom = (nextZoom: number) => {
  const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, Number(nextZoom.toFixed(2))))
  zoomLevel.value = normalizedZoom

  if (normalizedZoom === 1) {
    offsetX.value = 0
    offsetY.value = 0
    return
  }

  const clamped = clampOffset(offsetX.value, offsetY.value, normalizedZoom)
  offsetX.value = clamped.x
  offsetY.value = clamped.y
}

const toggleQuickZoom = () => {
  setZoom(zoomLevel.value === 1 ? quickZoom : 1)
}

const resetZoom = () => {
  resetView()
}

const getTouchDistance = () => {
  if (activeTouchPointers.size < 2) {
    return 0
  }

  const [first, second] = Array.from(activeTouchPointers.values())
  return Math.hypot(second.x - first.x, second.y - first.y)
}

const handleTouchTap = () => {
  const now = Date.now()

  if (now < suppressTouchTapUntil) {
    return
  }

  if (now - lastTouchTapAt <= 280) {
    toggleQuickZoom()
    lastTouchTapAt = 0
    return
  }

  lastTouchTapAt = now
}

const currentSinglePage = computed(
  () => props.unit?.full ?? props.unit?.right ?? props.unit?.left
)

const singleFrameStyle = computed(() => {
  const availableWidth = Math.max(viewportSize.value.width - 24, 0)
  const availableHeight = Math.max(viewportSize.value.height - 24, 0)
  const ratio = getRatio(currentSinglePage.value)
  const width = Math.min(availableWidth, availableHeight * ratio)
  const height = ratio > 0 ? width / ratio : availableHeight

  return {
    width: `${Math.max(width, 0)}px`,
    height: `${Math.max(height, 0)}px`,
  }
})

const spreadMetrics = computed(() => {
  const availableWidth = Math.max(viewportSize.value.width - 24, 0)
  const availableHeight = Math.max(viewportSize.value.height - 24, 0)

  if (props.unit?.full) {
    const ratio = getRatio(props.unit.full)
    const width = Math.min(availableWidth, availableHeight * ratio)
    const height = ratio > 0 ? width / ratio : availableHeight

    return {
      width,
      height,
      pageWidth: width,
      pageHeight: height,
      isFull: true,
    }
  }

  const leftRatio = getRatio(props.unit?.left)
  const rightRatio = getRatio(props.unit?.right)
  const pageRatio = Math.max(leftRatio, rightRatio, singleFallbackRatio)
  const pageWidth = Math.min(availableWidth / 2, availableHeight * pageRatio)
  const pageHeight = pageRatio > 0 ? pageWidth / pageRatio : availableHeight

  return {
    width: pageWidth * 2,
    height: pageHeight,
    pageWidth,
    pageHeight,
    isFull: false,
  }
})

const spreadFrameStyle = computed(() => ({
  width: `${Math.max(spreadMetrics.value.width, 0)}px`,
  height: `${Math.max(spreadMetrics.value.height, 0)}px`,
}))

const spreadPageStyle = computed(() => ({
  width: `${Math.max(spreadMetrics.value.pageWidth, 0)}px`,
  height: `${Math.max(spreadMetrics.value.pageHeight, 0)}px`,
}))

watch(
  () => props.unitIndex,
  (current, previous) => {
    if (previous === undefined || current === previous) {
      return
    }

    flipState.value = current > previous ? 'next' : 'prev'
    window.setTimeout(() => {
      flipState.value = 'idle'
    }, 700)
  }
)

watch(
  () => [props.unit?.id, props.mode],
  async () => {
    resetView()
    await nextTick()
    updateViewportSize()
  }
)

const stageClass = computed(() => ({
  'book-stage--single': props.mode === 'single',
  'book-stage--flip-next': flipState.value === 'next',
  'book-stage--flip-prev': flipState.value === 'prev',
  'book-stage--zoomed': zoomLevel.value > 1,
  'book-stage--dragging': isDragging.value,
  'book-stage--overlay-open': props.overlayOpen,
}))

const canvasStyle = computed(() => ({
  transform: `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoomLevel.value})`,
}))

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const direction = event.deltaY < 0 ? 1 : -1
  setZoom(zoomLevel.value + direction * scrollZoomStep)
}

const handleClick = () => {
  if (Date.now() < suppressClickUntil) {
    return
  }

  if (dragMoved.value) {
    dragMoved.value = false
    return
  }

  toggleQuickZoom()
}

const handlePointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'touch') {
    activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    suppressClickUntil = Date.now() + 450

    if (activeTouchPointers.size >= 2) {
      pinchActive = true
      isDragging.value = false
      dragMoved.value = true
      pinchStartDistance = getTouchDistance()
      pinchStartZoom = zoomLevel.value
      return
    }
  }

  if (zoomLevel.value <= 1) {
    return
  }

  isDragging.value = true
  dragMoved.value = false
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragOriginX = offsetX.value
  dragOriginY = offsetY.value
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (event.pointerType === 'touch' && activeTouchPointers.has(event.pointerId)) {
    activeTouchPointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (activeTouchPointers.size >= 2 && pinchStartDistance > 0) {
      const pinchDistance = getTouchDistance()

      if (pinchDistance > 0) {
        setZoom(pinchStartZoom * (pinchDistance / pinchStartDistance))
      }

      dragMoved.value = true
      return
    }
  }

  if (!isDragging.value || zoomLevel.value <= 1 || pinchActive) {
    return
  }

  const nextX = dragOriginX + (event.clientX - dragStartX)
  const nextY = dragOriginY + (event.clientY - dragStartY)
  const clamped = clampOffset(nextX, nextY)
  offsetX.value = clamped.x
  offsetY.value = clamped.y

  if (Math.abs(event.clientX - dragStartX) > 4 || Math.abs(event.clientY - dragStartY) > 4) {
    dragMoved.value = true
  }
}

const handlePointerUp = (event: PointerEvent) => {
  const wasPinching = pinchActive
  const wasDragGesture = dragMoved.value

  if (!(event.currentTarget instanceof HTMLElement)) {
    return
  }

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  isDragging.value = false

  if (event.pointerType === 'touch') {
    activeTouchPointers.delete(event.pointerId)

    if (activeTouchPointers.size < 2) {
      pinchActive = false
      pinchStartDistance = 0
      pinchStartZoom = zoomLevel.value
    }

    if (wasPinching) {
      suppressTouchTapUntil = Date.now() + 280
    }

    if (!wasPinching && !wasDragGesture) {
      handleTouchTap()
    }

    dragMoved.value = false
  }
}

const recordRatio = (pageId: string | undefined, image: HTMLImageElement) => {
  if (!pageId) {
    return
  }

  const { naturalWidth, naturalHeight } = image

  if (!naturalWidth || !naturalHeight) {
    return
  }

  pageRatios.value = {
    ...pageRatios.value,
    [pageId]: naturalWidth / naturalHeight,
  }

  scheduleViewportRefresh([0, 80])
}

onMounted(async () => {
  await nextTick()
  scheduleViewportRefresh([0, 80, 180])

  resizeObserver = new ResizeObserver(() => {
    scheduleViewportRefresh([0, 80])
  })

  if (viewportRef.value) {
    resizeObserver.observe(viewportRef.value)
  }

  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('orientationchange', handleWindowResize)
  window.visualViewport?.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  clearViewportRefreshTimers()
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('orientationchange', handleWindowResize)
  window.visualViewport?.removeEventListener('resize', handleWindowResize)
  activeTouchPointers.clear()
})

const handleWindowResize = () => {
  scheduleViewportRefresh([0, 120, 260])
}

defineExpose({
  refreshLayout: () => scheduleViewportRefresh([0, 120, 260, 420]),
  resetZoom,
})
</script>

<template>
  <div class="book-stage" :class="stageClass">
    <div class="book-stage__glow"></div>

    <div
      ref="viewportRef"
      class="book-stage__viewport"
      @wheel.prevent="handleWheel"
      @click="handleClick"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
    >
      <div class="book-stage__canvas" :style="canvasStyle">
        <div v-if="mode === 'single'" class="single-book" :style="singleFrameStyle">
          <div class="book-page book-page--single" :key="unit?.id">
            <ReaderProgressiveImage
              v-if="currentSinglePage"
              :src="currentSinglePage.image"
              :preview-src="currentSinglePage.thumbnail"
              :alt="currentSinglePage.title"
              @loaded="recordRatio(currentSinglePage.id, $event)"
            />
          </div>
        </div>

        <div
          v-else
          class="spread-book"
          :class="{ 'spread-book--full': spreadMetrics.isFull }"
          :style="spreadFrameStyle"
          :key="unit?.id"
        >
          <div class="spread-book__shadow"></div>

          <div v-if="unit?.full" class="book-page book-page--full" :style="spreadPageStyle">
            <ReaderProgressiveImage
              :src="unit.full.image"
              :preview-src="unit.full.thumbnail"
              :alt="unit.full.title"
              @loaded="recordRatio(unit.full.id, $event)"
            />
          </div>

          <template v-else>
            <div class="book-page book-page--left" :style="spreadPageStyle">
              <ReaderProgressiveImage
                v-if="unit?.left"
                :src="unit.left.image"
                :preview-src="unit.left.thumbnail"
                :alt="unit.left.title"
                @loaded="recordRatio(unit.left.id, $event)"
              />
            </div>

            <div class="book-page book-page--right" :style="spreadPageStyle">
              <ReaderProgressiveImage
                v-if="unit?.right"
                :src="unit.right.image"
                :preview-src="unit.right.thumbnail"
                :alt="unit.right.title"
                @loaded="recordRatio(unit.right.id, $event)"
              />
            </div>

            <div class="spread-book__spine"></div>
            <div class="spread-book__spine-glow"></div>
          </template>
        </div>
      </div>
    </div>

    <div class="book-stage__counter">
      <span>Spread {{ unitIndex + 1 }}</span>
      <strong>{{ unitCount }}</strong>
      <small>{{ zoomLevel.toFixed(2) }}x</small>
    </div>
  </div>
</template>
