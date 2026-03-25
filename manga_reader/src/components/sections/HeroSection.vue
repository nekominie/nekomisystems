<script setup lang="ts">
import type { MangaProject } from '../../types/manga'

defineProps<{
  project: MangaProject
}>()
</script>

<template>
  <section id="hero" class="hero panel">
    <div class="hero__copy">
      <span class="eyebrow">{{ project.badge }}</span>
      <div class="hero__headline">
        <div class="logo-orb" :style="{ '--accent': project.primaryColor }">
          {{ project.logoText }}
        </div>
        <div>
          <h1>{{ project.title }}</h1>
          <p class="hero__subtitle">{{ project.subtitle }}</p>
        </div>
      </div>

      <p class="hero__description">{{ project.heroDescription }}</p>
      <p class="hero__hook">{{ project.readingHook }}</p>

      <div class="chip-row">
        <span v-for="tag in project.genre" :key="tag" class="chip">{{ tag }}</span>
        <span class="chip chip--muted">{{ project.status }}</span>
        <span class="chip chip--muted">{{ project.ageRating }}</span>
      </div>

      <div class="hero__actions">
        <a
          v-for="link in project.actionLinks"
          :key="link.label"
          class="action-button"
          :href="link.href"
        >
          <i v-if="link.icon" :class="link.icon"></i>
          <span>{{ link.label }}</span>
        </a>
      </div>
    </div>

    <div class="hero__aside">
      <div class="quote-card">
        <span class="eyebrow eyebrow--soft">Moodboard</span>
        <p>{{ project.spotlightQuote }}</p>
      </div>

      <div class="stats-grid">
        <article v-for="stat in project.stats" :key="stat.label" class="stat-card">
          <span>{{ stat.label }}</span>
          <strong>{{ stat.value }}</strong>
          <small>{{ stat.helper }}</small>
        </article>
      </div>
    </div>
  </section>
</template>
