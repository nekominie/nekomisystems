<script setup lang="ts">
import type { MangaProject, ReaderVolume } from '../types/manga'

defineProps<{
  project: MangaProject
}>()

const emit = defineEmits<{
  openReader: [payload: { volumeId: string; chapterId: string }]
}>()

const openVolume = (volume: ReaderVolume) => {
  const firstChapter = volume.chapters[0]
  if (!firstChapter) {
    return
  }

  emit('openReader', { volumeId: volume.id, chapterId: firstChapter.id })
}
</script>

<template>
  <section class="view">
    <div class="view-header">
      <div>
        <span class="view-label">Biblioteca</span>
        <h2>Tomos disponibles</h2>
      </div>
      <p>La biblioteca toma tus carpetas reales y convierte cada tomo en una pieza editorial navegable.</p>
    </div>

    <div class="volume-grid">
      <article
        v-for="volume in project.volumes"
        :key="volume.id"
        class="volume-card"
      >
        <div class="volume-card__cover">
          <img :src="volume.cover" :alt="volume.title" />
        </div>
        <div class="volume-card__body">
          <span>{{ volume.era }}</span>
          <h3>{{ volume.title }}</h3>
          <p>{{ volume.summary }}</p>
          <div class="volume-card__meta">
            <strong>{{ volume.chapters.length }} capitulos</strong>
            <small>{{ volume.publishDate }}</small>
          </div>
          <button type="button" class="ink-button" @click="openVolume(volume)">
            Abrir tomo
          </button>
        </div>
      </article>
    </div>
  </section>
</template>
