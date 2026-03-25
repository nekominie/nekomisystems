<script setup lang="ts">
import type { MangaProject } from '../types/manga'

defineProps<{
  project: MangaProject
}>()
</script>

<template>
  <section class="view">
    <div class="view-header">
      <div>
        <span class="view-label">Lore</span>
        <h2>Notas del mundo y archivo expandido</h2>
      </div>
      <p>Menos enciclopedia fria, mas sala de evidencias. Cada bloque puede crecer en fichas, mapas, lineas temporales o documentos.</p>
    </div>

    <div class="lore-grid">
      <article
        v-for="entry in project.loreEntries"
        :key="entry.id"
        class="lore-card"
        :style="{ '--accent': entry.accent }"
      >
        <span>{{ entry.summary }}</span>
        <h3>{{ entry.title }}</h3>
        <p>{{ entry.detail }}</p>
      </article>
    </div>

    <div class="archive-grid">
      <article v-for="note in project.archiveNotes" :key="note.id" class="archive-card">
        <span>{{ note.label }}</span>
        <h3>{{ note.title }}</h3>
        <p>{{ note.body }}</p>
      </article>
    </div>
  </section>
</template>
