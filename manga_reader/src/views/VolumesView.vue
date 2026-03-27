<script setup lang="ts">
import { onMounted } from 'vue'
import { ensureDearFlipPreviewStyles } from '../lib/dearflip'
import type { MangaProject, ReaderVolume } from '../types/manga'

defineProps<{
  project: MangaProject
}>()

const emit = defineEmits<{
  openReader: [payload: { volumeId: string; chapterId: string }]
}>()

const getPreviewImage = (volume: ReaderVolume) => volume.coverThumbnail || volume.cover
const getLaunchChapter = (volume: ReaderVolume) =>
  volume.chapters.find((chapter) => !chapter.viewer?.hideInReaderSelectors) ?? volume.chapters[0]

onMounted(() => {
  void ensureDearFlipPreviewStyles().catch((error) => {
    console.warn('No se pudieron cargar los estilos de previsualizacion de DearFlip.', error)
  })
})

const openVolume = (volume: ReaderVolume) => {
  const launchChapter = getLaunchChapter(volume)
  if (!launchChapter) {
    return
  }

  emit('openReader', { volumeId: volume.id, chapterId: launchChapter.id })
}
</script>

<template>
  <section class="view">
    <div class="view-header">
      <div>
        <span class="view-label">Biblioteca</span>
        <h2>Tomos Disponibles</h2>
      </div>
      <p>Explora la estanteria, pasa el cursor por las portadas y entra al lector haciendo click en el tomo.</p>
    </div>

    <div class="volume-library__notice">
      <i class="bi bi-stars"></i>
      <strong>Haz click en cualquier tomo para abrirlo.</strong>
      <span>Las portadas reaccionan como mini libros y te llevan directo al lector.</span>
    </div>

    <div class="volume-grid volume-grid--library">
      <article
        v-for="volume in project.volumes"
        :key="volume.id"
        class="volume-card"
      >
        <button
          type="button"
          class="volume-card__cover volume-card__cover--preview volume-card__cover--action"
          :aria-label="`Abrir ${volume.title}`"
          @click.stop.prevent="openVolume(volume)"
        >
          <div class="volume-card__preview-stage">
            <div class="_df_thumb volume-card__thumb" aria-hidden="true">
              <div
                class="_df_book-cover"
                :style="{ backgroundImage: `url('${getPreviewImage(volume)}')` }"
              >
                <span class="_df_book-title">{{ volume.title }}</span>
              </div>
            </div>
          </div>
          <span class="volume-card__read-cue">
            <i class="bi bi-book-half"></i>
            Leer
          </span>
        </button>
        <div class="volume-card__body">
          <span>{{ volume.era }}</span>
          <h3>{{ volume.title }}</h3>
          <p>{{ volume.summary }}</p>
          <div class="volume-card__meta">
            <strong>{{ volume.chapters.length }} capitulos</strong>
            <small>{{ volume.publishDate }}</small>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
