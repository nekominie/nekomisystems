<script setup lang="ts">
import type { AppView, MangaProject } from '../../types/manga'

defineProps<{
  project: MangaProject
  currentRoute: AppView
}>()

const emit = defineEmits<{
  navigate: [route: AppView]
}>()
</script>

<template>
  <aside class="atlas-nav">
    <div class="atlas-nav__brand">
      <div class="atlas-nav__seal">
        <img :src="project.logo" :alt="project.title" />
      </div>
      <div>
        <span class="atlas-nav__kicker">{{ project.experienceLabel }}</span>
        <h1>{{ project.title }}</h1>
        <p>{{ project.subtitle }}</p>
      </div>
    </div>

    <nav class="atlas-nav__menu">
      <button
        v-for="item in project.nav"
        :key="item.id"
        type="button"
        class="atlas-nav__link"
        :class="{ 'atlas-nav__link--active': item.id === currentRoute }"
        @click="emit('navigate', item.id)"
      >
        <i :class="item.icon"></i>
        <span>{{ item.label }}</span>
        <small>{{ item.caption }}</small>
      </button>
    </nav>

    <div class="atlas-nav__meta">
      <span>{{ project.status }}</span>
      <strong>{{ project.readingDirection }}</strong>
    </div>
  </aside>
</template>
