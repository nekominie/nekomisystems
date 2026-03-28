<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ReaderProgressiveImage from './ReaderProgressiveImage.vue'
import type { ReaderPage } from '../../types/manga'

interface ZoomFocus {
  x: number
  y: number
}

const props = defineProps<{
  pages: ReaderPage[]
}>()

const viewportRef = ref<HTMLElement | null>(null)
const viewportSize = ref({ width: 0, height: 0 })
const zoomLevel = ref(1)
const isPanning = ref(false)

const minZoom = 0.78
const maxZoom = 2.8
const scrollZoomStep = 0.16
const quickZoom = 1.42

let resizeObserver: ResizeObserver | null = null
let viewportRefreshTimers: number[] = []
let lastTouchTapAt = 0
let pinchStartDistance = 0
let pinchStartZoom = 1
let suppressTouchTapUntil = 0
let pinchMoveAttached = false
let touchGestureMoved = false
let touchStartX = 0
let touchStartY = 0
let zoomAnimationToken = 0
let panPointerId: number | null = null
let panStartX = 0
let panStartY = 0
let panStartScrollLeft = 0
let panStartScrollTop = 0

const clearViewportRefreshTimers = () => {
  viewportRefreshTimers.forEach((timer) => window.clearTimeout(timer))
  viewportRefreshTimers = []
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

const baseColumnWidth = computed(() => {
  const availableWidth = Math.max(viewportSize.value.width - 56, 0)
  return Math.max(280, Math.min(availableWidth || 860, 860))
})

const laneStyle = computed(() => ({
  width: `${Math.round(baseColumnWidth.value * zoomLevel.value)}px`,
}))

const getViewportFocus = (clientX?: number, clientY?: number): ZoomFocus => {
  const viewport = viewportRef.value

  if (!viewport) {
    return { x: 0, y: 0 }
  }

  const bounds = viewport.getBoundingClientRect()

  return {
    x: Math.max(
      0,
      Math.min(bounds.width, (clientX ?? bounds.left + bounds.width / 2) - bounds.left)
    ),
    y: Math.max(
      0,
      Math.min(bounds.height, (clientY ?? bounds.top + bounds.height / 2) - bounds.top)
    ),
  }
}

const clampScroll = (viewport: HTMLElement, left: number, top: number) => ({
  left: Math.max(0, Math.min(Math.max(0, viewport.scrollWidth - viewport.clientWidth), left)),
  top: Math.max(0, Math.min(Math.max(0, viewport.scrollHeight - viewport.clientHeight), top)),
})

const nextAnimationFrame = () =>
  new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve())
  })

const stopZoomAnimation = () => {
  zoomAnimationToken += 1
}

const resetPan = () => {
  const viewport = viewportRef.value

  if (viewport && panPointerId !== null && viewport.hasPointerCapture(panPointerId)) {
    viewport.releasePointerCapture(panPointerId)
  }

  isPanning.value = false
  panPointerId = null
}

const setZoom = async (
  nextZoom: number,
  options: {
    animated?: boolean
    focus?: ZoomFocus
  } = {}
) => {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, Number(nextZoom.toFixed(2))))
  const startZoom = zoomLevel.value

  if (Math.abs(normalizedZoom - startZoom) < 0.001) {
    return
  }

  const focus = options.focus ?? getViewportFocus()
  const startScrollLeft = viewport.scrollLeft
  const startScrollTop = viewport.scrollTop
  const scaleRatio = normalizedZoom / Math.max(startZoom, 0.001)
  const targetScrollLeft = (startScrollLeft + focus.x) * scaleRatio - focus.x
  const targetScrollTop = (startScrollTop + focus.y) * scaleRatio - focus.y

  stopZoomAnimation()
  const animationToken = zoomAnimationToken

  if (options.animated === false) {
    zoomLevel.value = normalizedZoom
    await nextTick()
    await nextAnimationFrame()

    const nextViewport = viewportRef.value

    if (!nextViewport || animationToken !== zoomAnimationToken) {
      return
    }

    const clamped = clampScroll(nextViewport, targetScrollLeft, targetScrollTop)
    nextViewport.scrollTo({
      left: clamped.left,
      top: clamped.top,
      behavior: 'auto',
    })

    if (normalizedZoom <= 1) {
      resetPan()
    }

    return
  }

  const startedAt = performance.now()
  const duration = 150

  while (true) {
    const elapsed = performance.now() - startedAt
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)

    zoomLevel.value = Number((startZoom + (normalizedZoom - startZoom) * eased).toFixed(3))
    await nextTick()

    const nextViewport = viewportRef.value

    if (!nextViewport || animationToken !== zoomAnimationToken) {
      return
    }

    const interpolatedLeft = startScrollLeft + (targetScrollLeft - startScrollLeft) * eased
    const interpolatedTop = startScrollTop + (targetScrollTop - startScrollTop) * eased
    const clamped = clampScroll(nextViewport, interpolatedLeft, interpolatedTop)

    nextViewport.scrollTo({
      left: clamped.left,
      top: clamped.top,
      behavior: 'auto',
    })

    if (progress >= 1) {
      break
    }

    await nextAnimationFrame()
  }

  if (normalizedZoom <= 1) {
    resetPan()
  }
}

const resetZoom = () => {
  resetPan()
  void setZoom(1, { animated: true })
}

const toggleQuickZoom = (focus?: ZoomFocus) => {
  void setZoom(zoomLevel.value === 1 ? quickZoom : 1, {
    animated: true,
    focus,
  })
}

const getTouchDistance = (touches: TouchList) => {
  if (touches.length < 2) {
    return 0
  }

  const first = touches[0]
  const second = touches[1]
  return Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY)
}

const handleWheel = (event: WheelEvent) => {
  if (!(event.ctrlKey || event.metaKey)) {
    return
  }

  event.preventDefault()
  const direction = event.deltaY < 0 ? 1 : -1

  void setZoom(zoomLevel.value + direction * scrollZoomStep, {
    animated: true,
    focus: getViewportFocus(event.clientX, event.clientY),
  })
}

const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault()
  toggleQuickZoom(getViewportFocus(event.clientX, event.clientY))
}

const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 1) {
    const touch = event.touches[0]
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchGestureMoved = false
  }

  if (event.touches.length < 2) {
    return
  }

  stopZoomAnimation()
  pinchStartDistance = getTouchDistance(event.touches)
  pinchStartZoom = zoomLevel.value
  touchGestureMoved = true
  suppressTouchTapUntil = Date.now() + 280
  attachPinchMoveListener()
}

const handleTouchMoveState = (event: TouchEvent) => {
  if (event.touches.length !== 1) {
    return
  }

  const touch = event.touches[0]
  const deltaX = Math.abs(touch.clientX - touchStartX)
  const deltaY = Math.abs(touch.clientY - touchStartY)

  if (deltaX > 10 || deltaY > 10) {
    touchGestureMoved = true
  }
}

const handlePinchMove = (event: TouchEvent) => {
  if (event.touches.length < 2 || pinchStartDistance <= 0) {
    return
  }

  event.preventDefault()
  const distance = getTouchDistance(event.touches)

  if (!distance) {
    return
  }

  const first = event.touches[0]
  const second = event.touches[1]

  void setZoom(pinchStartZoom * (distance / pinchStartDistance), {
    animated: false,
    focus: getViewportFocus(
      (first.clientX + second.clientX) / 2,
      (first.clientY + second.clientY) / 2
    ),
  })
}

const handleTouchEnd = (event: TouchEvent) => {
  if (event.touches.length < 2) {
    pinchStartDistance = 0
    pinchStartZoom = zoomLevel.value
    detachPinchMoveListener()
  }

  if (event.touches.length > 0) {
    return
  }

  if (touchGestureMoved || Date.now() < suppressTouchTapUntil) {
    touchGestureMoved = false
    return
  }

  const now = Date.now()

  if (now - lastTouchTapAt <= 280) {
    const changedTouch = event.changedTouches[0]

    toggleQuickZoom(
      changedTouch ? getViewportFocus(changedTouch.clientX, changedTouch.clientY) : undefined
    )
    lastTouchTapAt = 0
    suppressTouchTapUntil = now + 280
    touchGestureMoved = false
    return
  }

  lastTouchTapAt = now
  touchGestureMoved = false
}

const handlePointerDown = (event: PointerEvent) => {
  if (event.pointerType === 'touch' || event.button !== 0 || zoomLevel.value <= 1) {
    return
  }

  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  panPointerId = event.pointerId
  panStartX = event.clientX
  panStartY = event.clientY
  panStartScrollLeft = viewport.scrollLeft
  panStartScrollTop = viewport.scrollTop
  isPanning.value = true
  viewport.setPointerCapture(event.pointerId)
  event.preventDefault()
}

const handlePointerMove = (event: PointerEvent) => {
  if (!isPanning.value || panPointerId !== event.pointerId) {
    return
  }

  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  viewport.scrollTo({
    left: panStartScrollLeft - (event.clientX - panStartX),
    top: panStartScrollTop - (event.clientY - panStartY),
    behavior: 'auto',
  })

  event.preventDefault()
}

const handlePointerUp = (event: PointerEvent) => {
  if (panPointerId !== event.pointerId) {
    return
  }

  resetPan()
}

const handleWindowResize = () => {
  stopZoomAnimation()
  resetPan()
  scheduleViewportRefresh([0, 120, 260])
}

const attachPinchMoveListener = () => {
  if (!viewportRef.value || pinchMoveAttached) {
    return
  }

  viewportRef.value.addEventListener('touchmove', handlePinchMove, { passive: false })
  pinchMoveAttached = true
}

const detachPinchMoveListener = () => {
  if (!viewportRef.value || !pinchMoveAttached) {
    return
  }

  viewportRef.value.removeEventListener('touchmove', handlePinchMove)
  pinchMoveAttached = false
}

watch(
  () => props.pages.map((page) => page.id),
  async (pageIds) => {
    stopZoomAnimation()
    resetPan()

    if (!pageIds.length) {
      return
    }

    await nextTick()
    scheduleViewportRefresh([0, 80, 180, 320])
    window.setTimeout(() => {
      viewportRef.value?.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto',
      })
    }, 0)
  },
  { immediate: true }
)

onMounted(async () => {
  await nextTick()
  scheduleViewportRefresh([0, 80, 180, 320])

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
  stopZoomAnimation()
  resizeObserver?.disconnect()
  clearViewportRefreshTimers()
  detachPinchMoveListener()
  resetPan()
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('orientationchange', handleWindowResize)
  window.visualViewport?.removeEventListener('resize', handleWindowResize)
})

defineExpose({
  resetZoom,
  refreshLayout: () => scheduleViewportRefresh([0, 120, 260, 420]),
})
</script>

<template>
  <div
    class="cascade-stage"
    :class="{
      'cascade-stage--zoomed': zoomLevel > 1,
      'cascade-stage--panning': isPanning,
    }"
  >
    <div class="cascade-stage__glow"></div>

    <div
      ref="viewportRef"
      class="cascade-stage__viewport"
      @wheel="handleWheel"
      @dblclick="handleDoubleClick"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerUp"
      @touchstart="handleTouchStart"
      @touchmove.passive="handleTouchMoveState"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    >
      <div class="cascade-stage__lane" :style="laneStyle">
        <article
          v-for="page in pages"
          :key="page.id"
          class="cascade-page"
        >
          <ReaderProgressiveImage
            :src="page.image"
            :preview-src="page.thumbnail"
            :alt="page.title"
          />
        </article>
      </div>
    </div>
  </div>
</template>
