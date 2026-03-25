<script setup lang="ts">
import type { FunFact, StoryBeat } from '../../types/manga'

defineProps<{
  funFacts: FunFact[]
  timeline: StoryBeat[]
}>()
</script>

<template>
  <section id="world" class="extras-grid">
    <div class="panel">
      <span class="eyebrow">Datos curiosos</span>
      <h2>Espacio para trivia, notas de autor y extras de produccion.</h2>
      <div class="notes-grid">
        <article v-for="fact in funFacts" :key="fact.title" class="note-card">
          <h3>{{ fact.title }}</h3>
          <p>{{ fact.detail }}</p>
        </article>
      </div>
    </div>

    <div class="panel">
      <span class="eyebrow">Ruta narrativa</span>
      <h2>Mapa de arcos, temporadas o hitos editoriales.</h2>
      <div class="timeline">
        <article v-for="beat in timeline" :key="beat.label" class="timeline-item">
          <span>{{ beat.label }}</span>
          <h3>{{ beat.title }}</h3>
          <p>{{ beat.description }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
