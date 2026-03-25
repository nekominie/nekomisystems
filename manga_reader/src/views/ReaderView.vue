<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ImmersiveBook from '../components/reader/ImmersiveBook.vue'
import type { MangaProject, ReaderPage, ReadingUnit } from '../types/manga'

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

const selectedVolumeId = ref(props.initialSelection?.volumeId ?? props.project.volumes[0]?.id ?? '')
const selectedChapterId = ref(
  props.initialSelection?.chapterId ?? props.project.volumes[0]?.chapters[0]?.id ?? ''
)
const displayMode = ref<'single' | 'spread'>('spread')
const currentUnitIndex = ref(0)
const thumbnailsOpen = ref(true)

const selectedVolume = computed(
  () => props.project.volumes.find((volume) => volume.id === selectedVolumeId.value) ?? props.project.volumes[0]
)

const selectedChapter = computed(() => {
  const chapter = selectedVolume.value?.chapters.find((item) => item.id === selectedChapterId.value)
  return chapter ?? selectedVolume.value?.chapters[0]
})

const createSpreadUnits = (pages: ReaderPage[]): ReadingUnit[] => {
  const units: ReadingUnit[] = []
  let pendingLeft: ReaderPage | undefined
  let pendingRight: ReaderPage | undefined

  const flush = () => {
    if (!pendingLeft && !pendingRight) {
      return
    }

    units.push({
      id: `spread-${units.length}`,
      left: pendingLeft,
      right: pendingRight,
    })

    pendingLeft = undefined
    pendingRight = undefined
  }

  for (const page of pages) {
    if (page.side === 'spread' || page.side === 'single') {
      flush()
      units.push({ id: page.id, full: page })
      continue
    }

    if (page.side === 'left') {
      if (pendingLeft) {
        flush()
      }

      pendingLeft = page
    }

    if (page.side === 'right') {
      if (pendingRight) {
        flush()
      }

      pendingRight = page
    }

    if (pendingLeft && pendingRight) {
      flush()
    }
  }

  flush()

  return units
}

const createSingleUnits = (pages: ReaderPage[]): ReadingUnit[] =>
  pages.map((page) => ({
    id: page.id,
    full: page,
  }))

const readingUnits = computed(() => {
  const pages = selectedChapter.value?.pages ?? []
  return displayMode.value === 'spread' ? createSpreadUnits(pages) : createSingleUnits(pages)
})

const currentUnit = computed(() => readingUnits.value[currentUnitIndex.value])

const canGoBack = computed(() => currentUnitIndex.value > 0)
const canGoForward = computed(() => currentUnitIndex.value < readingUnits.value.length - 1)

watch(selectedVolume, (volume) => {
  selectedChapterId.value = volume?.chapters[0]?.id ?? ''
  currentUnitIndex.value = 0
})

watch(selectedChapter, () => {
  currentUnitIndex.value = 0
})

watch(displayMode, () => {
  currentUnitIndex.value = 0
})

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

const goToUnit = (index: number) => {
  if (index < 0 || index >= readingUnits.value.length) {
    return
  }

  currentUnitIndex.value = index
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowLeft') {
    goToUnit(currentUnitIndex.value + 1)
  }

  if (event.key === 'ArrowRight') {
    goToUnit(currentUnitIndex.value - 1)
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
        <span class="view-label">{{ selectedVolume?.title }} - {{ selectedChapter?.title }}</span>
        <h3>{{ selectedChapter?.subtitle }}</h3>
        <p>{{ selectedChapter?.summary }}</p>
        <small class="reader-gesture-hint">
          Scroll para zoom, click para acercar y arrastrar para moverte.
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
              v-for="chapter in selectedVolume?.chapters"
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
            Libro abierto
          </button>
        </div>

        <div class="reader-stats">
          <article>
            <span>Publicacion</span>
            <strong>{{ selectedChapter?.publishDate }}</strong>
          </article>
          <article>
            <span>Paginas</span>
            <strong>{{ selectedChapter?.pages.length }}</strong>
          </article>
        </div>
      </div>

      <div class="reader-panel">
        <button type="button" class="ink-button ink-button--ghost" @click="thumbnailsOpen = !thumbnailsOpen">
          {{ thumbnailsOpen ? 'Ocultar miniaturas' : 'Mostrar miniaturas' }}
        </button>
      </div>
    </div>

    <div class="reader-view__stage">
      <div class="reader-toolbar">
        <button type="button" class="chrome-button" :disabled="!canGoForward" @click="goToUnit(currentUnitIndex + 1)">
          <i class="bi bi-chevron-left"></i>
          Siguiente
        </button>
        <div class="reader-toolbar__progress">
          <span>{{ currentUnitIndex + 1 }} / {{ readingUnits.length }}</span>
          <div class="reader-toolbar__track">
            <div
              class="reader-toolbar__fill"
              :style="{ width: `${readingUnits.length ? ((currentUnitIndex + 1) / readingUnits.length) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
        <button type="button" class="chrome-button" :disabled="!canGoBack" @click="goToUnit(currentUnitIndex - 1)">
          Anterior
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>

      <ImmersiveBook
        :unit="currentUnit"
        :unit-index="currentUnitIndex"
        :unit-count="readingUnits.length"
        :mode="displayMode"
        :overlay-open="thumbnailsOpen"
      />

      <transition name="thumb-drawer">
        <div v-show="thumbnailsOpen" class="thumb-drawer">
          <div class="thumb-drawer__grid">
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
            <div v-else class="thumb-card__spread">
              <img
                v-if="unit.left"
                :src="unit.left.thumbnail"
                :alt="unit.left.title"
                loading="lazy"
                decoding="async"
              />
              <img
                v-if="unit.right"
                :src="unit.right.thumbnail"
                :alt="unit.right.title"
                loading="lazy"
                decoding="async"
              />
            </div>
            <span>{{ index + 1 }}</span>
          </button>
          </div>
        </div>
      </transition>
    </div>
  </section>
</template>
