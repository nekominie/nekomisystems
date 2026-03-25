<script setup lang="ts">
import type { MangaProject } from '../types/manga'

defineProps<{
  project: MangaProject
}>()
</script>

<template>
  <section class="view view--overview">
    <div class="hero-card">
      <div class="hero-card__copy">
        <span class="view-label">{{ project.experienceLabel }}</span>
        <h2>{{ project.title }}</h2>
        <p class="hero-card__subtitle">{{ project.shortPitch }}</p>
        <div class="tag-row">
          <span v-for="tag in project.tags" :key="tag" class="tag-pill">{{ tag }}</span>
        </div>
      </div>

      <div class="hero-card__cover">
        <img :src="project.cover" :alt="project.title" />
      </div>
    </div>

    <div class="stat-deck">
      <article v-for="fact in project.spotlight" :key="fact.label" class="stat-tile">
        <span>{{ fact.label }}</span>
        <strong>{{ fact.value }}</strong>
      </article>
    </div>

    <div class="moment-grid">
      <article v-for="moment in project.overviewMoments" :key="moment.id" class="moment-card">
        <span>{{ moment.label }}</span>
        <h3>{{ moment.title }}</h3>
        <p>{{ moment.body }}</p>
      </article>
    </div>
  </section>
</template>
