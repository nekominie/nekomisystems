<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import ReaderProgressiveImage from './ReaderProgressiveImage.vue'
import type { ReaderPage } from '../../types/manga'

const props = defineProps<{
  pages: ReaderPage[]
}>()

const emit = defineEmits<{
  pageChange: [index: number]
}>()

const viewportRef = ref<HTMLElement | null>(null)
const pageRefs = ref<HTMLElement[]>([])
const viewportSize = ref({ width: 0, height: 0 })
const zoomLevel = ref(1)
const activeIndex = ref(0)

const minZoom = 0.78
const maxZoom = 2.8
const scrollZoomStep = 0.16
const quickZoom = 1.42

let resizeObserver: ResizeObserver | null = null
let viewportRefreshTimers: number[] = []
let scrollUpdateFrame = 0
let lastTouchTapAt = 0
let pinchStartDistance = 0
let pinchStartZoom = 1
let suppressTouchTapUntil = 0

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
        queueCurrentPageUpdate()
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

const setPageRef = (element: Element | null, index: number) => {
  if (!(element instanceof HTMLElement)) {
    return
  }

  pageRefs.value[index] = element
}

const emitActiveIndex = (index: number) => {
  if (index === activeIndex.value) {
    return
  }

  activeIndex.value = index
  emit('pageChange', index)
}

const updateCurrentPage = () => {
  const viewport = viewportRef.value

  if (!viewport || !props.pages.length) {
    return
  }

  const viewportCenter = viewport.scrollTop + viewport.clientHeight / 2
  let closestIndex = 0
  let closestDistance = Number.POSITIVE_INFINITY

  props.pages.forEach((_, index) => {
    const pageElement = pageRefs.value[index]

    if (!pageElement) {
      return
    }

    const pageCenter = pageElement.offsetTop + pageElement.offsetHeight / 2
    const distance = Math.abs(pageCenter - viewportCenter)

    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = index
    }
  })

  emitActiveIndex(closestIndex)
}

const queueCurrentPageUpdate = () => {
  if (scrollUpdateFrame) {
    return
  }

  scrollUpdateFrame = window.requestAnimationFrame(() => {
    scrollUpdateFrame = 0
    updateCurrentPage()
  })
}

const setZoom = async (nextZoom: number) => {
  const viewport = viewportRef.value
  const normalizedZoom = Math.max(minZoom, Math.min(maxZoom, Number(nextZoom.toFixed(2))))

  if (normalizedZoom === zoomLevel.value) {
    return
  }

  const verticalRatio = viewport
    ? viewport.scrollTop / Math.max(1, viewport.scrollHeight - viewport.clientHeight)
    : 0
  const horizontalRatio = viewport
    ? viewport.scrollLeft / Math.max(1, viewport.scrollWidth - viewport.clientWidth)
    : 0

  zoomLevel.value = normalizedZoom
  await nextTick()

  if (!viewport) {
    return
  }

  const nextScrollTop = verticalRatio * Math.max(0, viewport.scrollHeight - viewport.clientHeight)
  const nextScrollLeft = horizontalRatio * Math.max(0, viewport.scrollWidth - viewport.clientWidth)

  viewport.scrollTo({
    top: nextScrollTop,
    left: normalizedZoom <= 1 ? 0 : nextScrollLeft,
    behavior: 'auto',
  })

  queueCurrentPageUpdate()
}

const resetZoom = () => {
  void setZoom(1)
}

const toggleQuickZoom = () => {
  void setZoom(zoomLevel.value === 1 ? quickZoom : 1)
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
  void setZoom(zoomLevel.value + direction * scrollZoomStep)
}

const handleDoubleClick = (event: MouseEvent) => {
  event.preventDefault()
  toggleQuickZoom()
}

const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length < 2) {
    return
  }

  pinchStartDistance = getTouchDistance(event.touches)
  pinchStartZoom = zoomLevel.value
  suppressTouchTapUntil = Date.now() + 280
}

const handleTouchMove = (event: TouchEvent) => {
  if (event.touches.length < 2 || pinchStartDistance <= 0) {
    return
  }

  event.preventDefault()
  const distance = getTouchDistance(event.touches)

  if (!distance) {
    return
  }

  void setZoom(pinchStartZoom * (distance / pinchStartDistance))
}

const handleTouchEnd = (event: TouchEvent) => {
  if (event.touches.length < 2) {
    pinchStartDistance = 0
    pinchStartZoom = zoomLevel.value
  }

  if (event.touches.length > 0 || Date.now() < suppressTouchTapUntil) {
    return
  }

  const now = Date.now()

  if (now - lastTouchTapAt <= 280) {
    toggleQuickZoom()
    lastTouchTapAt = 0
    suppressTouchTapUntil = now + 280
    return
  }

  lastTouchTapAt = now
}

const scrollToPage = (index: number, behavior: ScrollBehavior = 'smooth') => {
  const viewport = viewportRef.value
  const pageElement = pageRefs.value[index]

  if (!viewport || !pageElement || index < 0 || index >= props.pages.length) {
    return
  }

  viewport.scrollTo({
    top: Math.max(pageElement.offsetTop - 18, 0),
    behavior,
  })

  emitActiveIndex(index)
}

const handleScroll = () => {
  queueCurrentPageUpdate()
}

const handleWindowResize = () => {
  scheduleViewportRefresh([0, 120, 260])
}

watch(
  () => props.pages.map((page) => page.id),
  async (pageIds) => {
    pageRefs.value = []
    activeIndex.value = 0

    if (!pageIds.length) {
      return
    }

    await nextTick()
    scheduleViewportRefresh([0, 80, 180, 320])
    window.setTimeout(() => {
      scrollToPage(0, 'auto')
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
  resizeObserver?.disconnect()
  clearViewportRefreshTimers()
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('orientationchange', handleWindowResize)
  window.visualViewport?.removeEventListener('resize', handleWindowResize)

  if (scrollUpdateFrame) {
    window.cancelAnimationFrame(scrollUpdateFrame)
    scrollUpdateFrame = 0
  }
})

defineExpose({
  goToPage: (index: number) => scrollToPage(index),
  next: () => scrollToPage(Math.min(activeIndex.value + 1, props.pages.length - 1)),
  prev: () => scrollToPage(Math.max(activeIndex.value - 1, 0)),
  resetZoom,
  refreshLayout: () => scheduleViewportRefresh([0, 120, 260, 420]),
})
</script>

<template>
  <div class="cascade-stage" :class="{ 'cascade-stage--zoomed': zoomLevel > 1 }">
    <div class="cascade-stage__glow"></div>

    <div
      ref="viewportRef"
      class="cascade-stage__viewport"
      @scroll="handleScroll"
      @wheel="handleWheel"
      @dblclick="handleDoubleClick"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    >
      <div class="cascade-stage__lane" :style="laneStyle">
        <article
          v-for="(page, index) in pages"
          :key="page.id"
          :ref="(element) => setPageRef(element, index)"
          class="cascade-page"
          :class="{ 'cascade-page--active': index === activeIndex }"
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
