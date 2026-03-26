<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DearFlipBook from '../components/reader/DearFlipBook.vue'
import ImmersiveBook from '../components/reader/ImmersiveBook.vue'
import type { MangaProject, ReaderChapter, ReaderPage, ReaderVolume, ReadingUnit } from '../types/manga'

interface VolumeBookPage {
  chapterId?: string
  id: string
  image: string
  pageNumber: number
  thumbnail: string
  title: string
}

interface ChapterRange {
  chapter: ReaderChapter
  chapterId: string
  endPage: number
  startPage: number
}

interface ChapterJumpCard {
  chapterId?: string
  id: string
  label: string
  pageNumber: number
  subtitle: string
  thumbnail: string
}

interface SpreadBookHandle {
  goToPage: (page: number) => void
  next: () => void
  prev: () => void
  resize: () => void
}

const props = defineProps<{
  project: MangaProject
  initialSelection?: {
    volumeId?: string
    chapterId?: string
  }
}>()

const emit = defineEmits<{
  backToLibrary: []
}>()

const initialVolume =
  props.project.volumes.find((volume) => volume.id === props.initialSelection?.volumeId) ??
  props.project.volumes[0]

const selectedVolumeId = ref(initialVolume?.id ?? '')
const selectedChapterId = ref(
  props.initialSelection?.chapterId ??
    initialVolume?.chapters.find((chapter) => !chapter.viewer?.hideInReaderSelectors)?.id ??
    initialVolume?.chapters[0]?.id ??
    ''
)
const displayMode = ref<'single' | 'spread'>('spread')
const currentUnitIndex = ref(0)
const currentBookPage = ref(1)
const thumbnailsOpen = ref(true)
const spreadBookRef = ref<SpreadBookHandle | null>(null)
const syncingChapterFromBook = ref(false)
const prefetchedAssets = new Set<string>()

const selectedVolume = computed(
  () => props.project.volumes.find((volume) => volume.id === selectedVolumeId.value) ?? props.project.volumes[0]
)

const selectedChapter = computed(() => {
  const chapter = selectedVolume.value?.chapters.find((item) => item.id === selectedChapterId.value)
  return chapter ?? selectedVolume.value?.chapters[0]
})

const createSingleUnits = (pages: ReaderPage[]): ReadingUnit[] =>
  pages.map((page) => ({
    id: page.id,
    full: page,
  }))

const getSingleViewPages = (pages: ReaderPage[]) =>
  pages.filter((page) => !page.viewer?.hideInSinglePageMode)

const getSelectableChapters = (volume?: ReaderVolume) =>
  volume?.chapters.filter((chapter) => !chapter.viewer?.hideInReaderSelectors) ?? []

const getDefaultChapterId = (volume?: ReaderVolume) =>
  getSelectableChapters(volume)[0]?.id ?? volume?.chapters[0]?.id ?? ''

const selectableChapters = computed(() => getSelectableChapters(selectedVolume.value))

const readingUnits = computed(() =>
  createSingleUnits(getSingleViewPages(selectedChapter.value?.pages ?? []))
)

const currentUnit = computed(() => readingUnits.value[currentUnitIndex.value])

const createVolumeBook = (volume?: ReaderVolume) => {
  if (!volume) {
    return {
      chapterRanges: [] as ChapterRange[],
      chapterStarts: {} as Record<string, number>,
      jumpCards: [] as ChapterJumpCard[],
      pages: [] as VolumeBookPage[],
    }
  }

  const pages: VolumeBookPage[] = [
    {
      id: `${volume.id}-cover`,
      image: volume.cover,
      pageNumber: 1,
      thumbnail: volume.coverThumbnail || volume.cover,
      title: `${volume.title} - Portada`,
    },
  ]

  const chapterStarts: Record<string, number> = {}
  const chapterRanges: ChapterRange[] = []
  const jumpCards: ChapterJumpCard[] = [
    {
      id: `${volume.id}-cover-card`,
      label: 'Portada',
      pageNumber: 1,
      subtitle: volume.title,
      thumbnail: volume.coverThumbnail || volume.cover,
    },
  ]

  for (const chapter of volume.chapters) {
    const startPage = pages.length + 1
    chapterStarts[chapter.id] = startPage

    jumpCards.push({
      chapterId: chapter.id,
      id: `${volume.id}-${chapter.id}-card`,
      label: chapter.title,
      pageNumber: startPage,
      subtitle: chapter.subtitle,
      thumbnail: chapter.pages[0]?.thumbnail ?? chapter.pages[0]?.image ?? volume.cover,
    })

    for (const page of chapter.pages) {
      pages.push({
        chapterId: chapter.id,
        id: page.id,
        image: page.image,
        pageNumber: pages.length + 1,
        thumbnail: page.thumbnail,
        title: `${chapter.title} - ${page.title}`,
      })
    }

    chapterRanges.push({
      chapter,
      chapterId: chapter.id,
      endPage: pages.length,
      startPage,
    })
  }

  return {
    chapterRanges,
    chapterStarts,
    jumpCards,
    pages,
  }
}

const volumeBook = computed(() => createVolumeBook(selectedVolume.value))

const activeBookRange = computed(() =>
  volumeBook.value.chapterRanges.find(
    (range) => currentBookPage.value >= range.startPage && currentBookPage.value <= range.endPage
  )
)

const activeBookChapter = computed(() => activeBookRange.value?.chapter)
const showingVolumeCover = computed(() => displayMode.value === 'spread' && currentBookPage.value === 1)

const displayChapter = computed(() => {
  if (displayMode.value === 'spread' && !showingVolumeCover.value) {
    return activeBookChapter.value ?? selectedChapter.value
  }

  return selectedChapter.value
})

const toolbarTotal = computed(() =>
  displayMode.value === 'spread' ? volumeBook.value.pages.length : readingUnits.value.length
)

const toolbarCurrent = computed(() => {
  if (!toolbarTotal.value) {
    return 0
  }

  return displayMode.value === 'spread' ? currentBookPage.value : currentUnitIndex.value + 1
})

const canGoBack = computed(() =>
  displayMode.value === 'spread' ? currentBookPage.value > 1 : currentUnitIndex.value > 0
)

const canGoForward = computed(() =>
  displayMode.value === 'spread'
    ? currentBookPage.value < volumeBook.value.pages.length
    : currentUnitIndex.value < readingUnits.value.length - 1
)

const progressFill = computed(() => {
  if (!toolbarTotal.value) {
    return 0
  }

  return (toolbarCurrent.value / toolbarTotal.value) * 100
})

const readerContextLabel = computed(() => {
  if (!selectedVolume.value) {
    return ''
  }

  if (displayMode.value === 'spread') {
    if (showingVolumeCover.value) {
      return `${selectedVolume.value.title} - Portada del tomo`
    }

    return `${selectedVolume.value.title} - ${displayChapter.value?.title ?? 'Libro 3D'}`
  }

  return `${selectedVolume.value.title} - ${selectedChapter.value?.title ?? ''}`
})

const readerHeadline = computed(() => {
  if (displayMode.value === 'spread' && showingVolumeCover.value) {
    return selectedVolume.value?.era ?? 'Portada'
  }

  return displayChapter.value?.subtitle ?? ''
})

const readerSummary = computed(() => {
  if (displayMode.value === 'spread' && showingVolumeCover.value) {
    return selectedVolume.value?.summary ?? ''
  }

  return displayChapter.value?.summary ?? ''
})

const readerHint = computed(() =>
  displayMode.value === 'spread'
    ? 'Libro 3D con portada del tomo y todos los capitulos. Usa la rueda del mouse para zoom, arrastra cuando estes acercado y en tactil haz pinch con dos dedos.'
    : 'Scroll para zoom, click para acercar y arrastrar para moverte.'
)

const statsPublishDate = computed(() => {
  if (displayMode.value === 'spread' && showingVolumeCover.value) {
    return selectedVolume.value?.publishDate ?? ''
  }

  if (displayMode.value === 'spread') {
    return displayChapter.value?.publishDate ?? selectedVolume.value?.publishDate ?? ''
  }

  return selectedChapter.value?.publishDate ?? ''
})

const statsPageCount = computed(() =>
  displayMode.value === 'spread' ? volumeBook.value.pages.length : readingUnits.value.length
)

const statsPageLabel = computed(() =>
  displayMode.value === 'spread' ? 'Paginas del tomo' : 'Paginas del capitulo'
)

const toggleDrawerLabel = computed(() =>
  displayMode.value === 'spread'
    ? thumbnailsOpen.value
      ? 'Ocultar capitulos'
      : 'Mostrar capitulos'
    : thumbnailsOpen.value
      ? 'Ocultar miniaturas'
      : 'Mostrar miniaturas'
)

const preloadAsset = (src?: string) => {
  if (!src || prefetchedAssets.has(src) || typeof Image === 'undefined') {
    return
  }

  const image = new Image()
  image.decoding = 'async'
  image.src = src
  prefetchedAssets.add(src)
}

const preloadSingleNeighbors = (index: number) => {
  for (const offset of [-1, 1, 2]) {
    const page = readingUnits.value[index + offset]?.full
    preloadAsset(page?.thumbnail)
    preloadAsset(page?.image)
  }
}

const preloadSpreadNeighbors = (pageNumber: number) => {
  for (const offset of [1, 2]) {
    const page = volumeBook.value.pages[pageNumber - 1 + offset]
    preloadAsset(page?.thumbnail)
    preloadAsset(page?.image)
  }
}

const goToUnit = (index: number) => {
  if (index < 0 || index >= readingUnits.value.length) {
    return
  }

  currentUnitIndex.value = index
}

const goToBookPage = (page: number) => {
  if (page < 1 || page > volumeBook.value.pages.length) {
    return
  }

  currentBookPage.value = page
  spreadBookRef.value?.goToPage(page)
}

const goForward = () => {
  if (displayMode.value === 'spread') {
    spreadBookRef.value?.next()
    return
  }

  goToUnit(currentUnitIndex.value + 1)
}

const goBack = () => {
  if (displayMode.value === 'spread') {
    spreadBookRef.value?.prev()
    return
  }

  goToUnit(currentUnitIndex.value - 1)
}

const jumpToChapter = (chapterId: string) => {
  selectedChapterId.value = chapterId
}

const isActiveJumpCard = (card: ChapterJumpCard) => {
  if (!card.chapterId) {
    return currentBookPage.value === 1
  }

  return displayChapter.value?.id === card.chapterId && currentBookPage.value !== 1
}

const handleBookPageChange = (page: number) => {
  currentBookPage.value = page

  const range = volumeBook.value.chapterRanges.find(
    (item) => page >= item.startPage && page <= item.endPage
  )

  if (!range || range.chapterId === selectedChapterId.value) {
    return
  }

  if (range.chapter.viewer?.hideInReaderSelectors) {
    return
  }

  syncingChapterFromBook.value = true
  selectedChapterId.value = range.chapterId

  window.setTimeout(() => {
    syncingChapterFromBook.value = false
  }, 0)
}

watch(selectedVolume, (volume) => {
  selectedChapterId.value = getDefaultChapterId(volume)
  currentUnitIndex.value = 0
  currentBookPage.value = 1
})

watch(selectedChapter, (chapter) => {
  currentUnitIndex.value = 0

  if (displayMode.value !== 'spread' || !chapter || syncingChapterFromBook.value) {
    return
  }

  const targetPage = volumeBook.value.chapterStarts[chapter.id] ?? 1

  if (targetPage !== currentBookPage.value) {
    goToBookPage(targetPage)
  }
})

watch(displayMode, (mode) => {
  currentUnitIndex.value = 0

  if (mode === 'spread') {
    currentBookPage.value = volumeBook.value.chapterStarts[selectedChapterId.value] ?? 1
    window.setTimeout(() => {
      spreadBookRef.value?.resize()
    }, 60)
  }
})

watch(thumbnailsOpen, () => {
  if (displayMode.value !== 'spread') {
    return
  }

  window.setTimeout(() => {
    spreadBookRef.value?.resize()
  }, 60)
})

watch(
  () => [displayMode.value, currentUnitIndex.value] as const,
  ([mode, unitIndex]) => {
    if (mode !== 'single') {
      return
    }

    preloadSingleNeighbors(unitIndex)
  },
  { immediate: true }
)

watch(
  () => [displayMode.value, currentBookPage.value] as const,
  ([mode, pageNumber]) => {
    if (mode !== 'spread') {
      return
    }

    preloadSpreadNeighbors(pageNumber)
  },
  { immediate: true }
)

watch(
  () => props.initialSelection,
  (selection) => {
    if (selection?.volumeId) {
      selectedVolumeId.value = selection.volumeId
    }

    if (selection?.chapterId) {
      selectedChapterId.value = selection.chapterId
    }
  },
  { deep: true }
)

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') {
    goForward()
  }

  if (event.key === 'ArrowRight') {
    goBack()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <section class="reader-view">
    <div class="reader-view__sidebar">
      <div class="reader-panel">
        <button type="button" class="ink-button ink-button--ghost" @click="emit('backToLibrary')">
          <i class="bi bi-arrow-left"></i>
          Regresar a tomos
        </button>
      </div>

      <div class="reader-panel">
        <span class="view-label">{{ readerContextLabel }}</span>
        <h3>{{ readerHeadline }}</h3>
        <p>{{ readerSummary }}</p>
        <small class="reader-gesture-hint">
          {{ readerHint }}
        </small>
      </div>

      <div class="reader-panel reader-panel--controls">
        <label>
          <span>Tomo</span>
          <select v-model="selectedVolumeId">
            <option v-for="volume in project.volumes" :key="volume.id" :value="volume.id">
              {{ volume.title }}
            </option>
          </select>
        </label>

        <label>
          <span>Capitulo</span>
          <select v-model="selectedChapterId">
            <option
              v-for="chapter in selectableChapters"
              :key="chapter.id"
              :value="chapter.id"
            >
              {{ chapter.title }} - {{ chapter.subtitle }}
            </option>
          </select>
        </label>

        <div class="toggle-row">
          <button
            type="button"
            class="toggle-chip"
            :class="{ 'toggle-chip--active': displayMode === 'single' }"
            @click="displayMode = 'single'"
          >
            1 pagina
          </button>
          <button
            type="button"
            class="toggle-chip"
            :class="{ 'toggle-chip--active': displayMode === 'spread' }"
            @click="displayMode = 'spread'"
          >
            Libro 3D
          </button>
        </div>

        <div class="reader-stats">
          <article>
            <span>Publicacion</span>
            <strong>{{ statsPublishDate }}</strong>
          </article>
          <article>
            <span>{{ statsPageLabel }}</span>
            <strong>{{ statsPageCount }}</strong>
          </article>
        </div>
      </div>

      <div class="reader-panel">
        <button type="button" class="ink-button ink-button--ghost" @click="thumbnailsOpen = !thumbnailsOpen">
          {{ toggleDrawerLabel }}
        </button>
      </div>
    </div>

    <div class="reader-view__stage">
      <div class="reader-toolbar">
        <button type="button" class="chrome-button" :disabled="!canGoForward" @click="goForward">
          <i class="bi bi-chevron-left"></i>
          Siguiente
        </button>
        <div class="reader-toolbar__progress">
          <span>{{ toolbarCurrent }} / {{ toolbarTotal }}</span>
          <div class="reader-toolbar__track">
            <div
              class="reader-toolbar__fill"
              :style="{ width: `${progressFill}%` }"
            ></div>
          </div>
        </div>
        <div class="reader-toolbar__actions">
          <button type="button" class="chrome-button" :disabled="!canGoBack" @click="goBack">
            Anterior
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>

      <ImmersiveBook
        v-if="displayMode === 'single'"
        :unit="currentUnit"
        :unit-index="currentUnitIndex"
        :unit-count="readingUnits.length"
        mode="single"
        :overlay-open="thumbnailsOpen"
      />

      <DearFlipBook
        v-else
        ref="spreadBookRef"
        :book-id="selectedVolume?.id ?? 'reader-volume'"
        :title="selectedVolume?.title ?? project.title"
        :pages="volumeBook.pages"
        :initial-page="currentBookPage"
        :overlay-open="thumbnailsOpen"
        @page-change="handleBookPageChange"
      />

      <transition name="thumb-drawer">
        <div v-show="thumbnailsOpen" class="thumb-drawer">
          <div v-if="displayMode === 'single'" class="thumb-drawer__grid">
            <button
              v-for="(unit, index) in readingUnits"
              :key="unit.id"
              type="button"
              class="thumb-card"
              :class="{ 'thumb-card--active': index === currentUnitIndex }"
              @click="goToUnit(index)"
            >
              <img
                v-if="unit.full"
                :src="unit.full.thumbnail"
                :alt="unit.full.title"
                loading="lazy"
                decoding="async"
              />
              <span>{{ index + 1 }}</span>
            </button>
          </div>

          <div v-else class="thumb-drawer__grid thumb-drawer__grid--chapters">
            <button
              v-for="card in volumeBook.jumpCards"
              :key="card.id"
              type="button"
              class="thumb-card thumb-card--chapter"
              :class="{ 'thumb-card--active': isActiveJumpCard(card) }"
              @click="card.chapterId ? jumpToChapter(card.chapterId) : goToBookPage(card.pageNumber)"
            >
              <img
                :src="card.thumbnail"
                :alt="card.label"
                loading="lazy"
                decoding="async"
              />
              <span>{{ card.label }}</span>
              <small>{{ card.subtitle }}</small>
            </button>
          </div>
        </div>
      </transition>
    </div>
  </section>
</template>
