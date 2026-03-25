<script setup lang="ts">
import type { MangaProject } from '../../types/manga'

defineProps<{
  project: MangaProject
}>()
</script>

<template>
  <section id="overview" class="panel section-grid">
    <div>
      <span class="eyebrow">Sinopsis</span>
      <h2>Una portada viva para presentar el manga antes de leerlo.</h2>
      <p class="section-copy">{{ project.synopsis }}</p>
    </div>

    <div class="feature-stack">
      <article
        v-for="item in project.lore"
        :key="item.title"
        class="feature-card"
      >
        <div class="feature-card__icon">
          <i :class="item.icon || 'bi bi-stars'"></i>
        </div>
        <div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.body }}</p>
        </div>
      </article>
    </div>
  </section>
</template>
