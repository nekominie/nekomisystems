<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Chapter, MangaPage, Volume } from '../../types/manga'

const props = defineProps<{
  volumes: Volume[]
}>()

const selectedVolumeId = ref(props.volumes[0]?.id ?? '')
const selectedChapterId = ref(props.volumes[0]?.chapters[0]?.id ?? '')
const currentPageIndex = ref(0)

const selectedVolume = computed(
  () => props.volumes.find((volume) => volume.id === selectedVolumeId.value) ?? props.volumes[0]
)

const selectedChapter = computed<Chapter | undefined>(() => {
  const chapter = selectedVolume.value?.chapters.find(
    (item) => item.id === selectedChapterId.value
  )

  return chapter ?? selectedVolume.value?.chapters[0]
})

const currentPage = computed<MangaPage | undefined>(
  () => selectedChapter.value?.pages[currentPageIndex.value]
)

watch(selectedVolume, (volume) => {
  selectedChapterId.value = volume?.chapters[0]?.id ?? ''
  currentPageIndex.value = 0
})

watch(selectedChapter, () => {
  currentPageIndex.value = 0
})

const goToPage = (direction: number) => {
  const total = selectedChapter.value?.pages.length ?? 0
  const nextIndex = currentPageIndex.value + direction

  if (nextIndex < 0 || nextIndex >= total) {
    return
  }

  currentPageIndex.value = nextIndex
}
</script>

<template>
  <section id="reader" class="panel reader">
    <div class="section-heading">
      <div>
        <span class="eyebrow">Lector</span>
        <h2>Define tomos, capitulos, fechas y paginas desde una sola estructura.</h2>
      </div>
    </div>

    <div class="reader__controls">
      <label class="reader-select">
        <span>Tomo</span>
        <select v-model="selectedVolumeId">
          <option v-for="volume in volumes" :key="volume.id" :value="volume.id">
            {{ volume.title }}
          </option>
        </select>
      </label>

      <label class="reader-select">
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
    </div>

    <div class="reader__meta">
      <article class="reader-meta-card">
        <span>Publicacion del tomo</span>
        <strong>{{ selectedVolume?.publishDate }}</strong>
        <p>{{ selectedVolume?.summary }}</p>
      </article>
      <article class="reader-meta-card">
        <span>Publicacion del capitulo</span>
        <strong>{{ selectedChapter?.publishDate }}</strong>
        <p>{{ selectedChapter?.teaser }}</p>
      </article>
    </div>

    <div class="reader__stage">
      <button
        type="button"
        class="reader-nav"
        :disabled="currentPageIndex === 0"
        @click="goToPage(-1)"
      >
        <i class="bi bi-arrow-left"></i>
      </button>

      <article class="page-frame">
        <div class="page-frame__header">
          <div>
            <span class="eyebrow eyebrow--soft">{{ selectedChapter?.title }}</span>
            <h3>{{ currentPage?.title }}</h3>
          </div>
          <strong>
            {{ currentPageIndex + 1 }} / {{ selectedChapter?.pages.length || 0 }}
          </strong>
        </div>

        <div v-if="currentPage?.type === 'image'" class="page-art">
          <img :src="currentPage.src" :alt="currentPage.alt || currentPage.title" />
        </div>

        <div v-else class="page-note">
          <i class="bi bi-vector-pen"></i>
          <p>{{ currentPage?.note }}</p>
        </div>
      </article>

      <button
        type="button"
        class="reader-nav"
        :disabled="currentPageIndex >= (selectedChapter?.pages.length || 1) - 1"
        @click="goToPage(1)"
      >
        <i class="bi bi-arrow-right"></i>
      </button>
    </div>

    <div class="thumbnail-row">
      <button
        v-for="(page, index) in selectedChapter?.pages"
        :key="page.id"
        type="button"
        class="thumb"
        :class="{ 'thumb--active': index === currentPageIndex }"
        @click="currentPageIndex = index"
      >
        <span>{{ index + 1 }}</span>
        <small>{{ page.title }}</small>
      </button>
    </div>
  </section>
</template>
