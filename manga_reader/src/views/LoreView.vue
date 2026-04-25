<script setup lang="ts">
import { reactive } from 'vue'
import type { LoreEntry, MangaProject } from '../types/manga'

defineProps<{
  project: MangaProject
}>()

const spoilerOpenState = reactive<Record<string, boolean>>({})

const hasVisibleSpoiler = (entry: LoreEntry) => Boolean(entry.spoiler && !entry.spoiler.hidden)

const isSpoilerOpen = (entry: LoreEntry) => {
  if (!hasVisibleSpoiler(entry)) {
    return false
  }

  if (entry.id in spoilerOpenState) {
    return spoilerOpenState[entry.id]
  }

  return !entry.spoiler?.hiddenByDefault
}

const toggleSpoiler = (entry: LoreEntry) => {
  if (!hasVisibleSpoiler(entry)) {
    return
  }

  spoilerOpenState[entry.id] = !isSpoilerOpen(entry)
}
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

        <div
          v-if="hasVisibleSpoiler(entry)"
          class="lore-card__spoiler"
          :class="{ 'lore-card__spoiler--open': isSpoilerOpen(entry) }"
        >
          <button
            type="button"
            class="lore-card__spoiler-toggle"
            @click="toggleSpoiler(entry)"
          >
            <span>{{ entry.spoiler?.title ?? 'Spoiler' }}</span>
            <strong>
              {{
                isSpoilerOpen(entry)
                  ? entry.spoiler?.hideLabel ?? 'Ocultar spoiler'
                  : entry.spoiler?.revealLabel ?? 'Mostrar spoiler'
              }}
            </strong>
          </button>

          <transition name="lore-spoiler">
            <p v-if="isSpoilerOpen(entry)" class="lore-card__spoiler-body">
              {{ entry.spoiler?.detail }}
            </p>
          </transition>
        </div>
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
