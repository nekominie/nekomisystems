<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CharacterProfile } from '../../types/manga'

const props = defineProps<{
  characters: CharacterProfile[]
}>()

const activeCharacterId = ref(props.characters[0]?.id ?? '')

const activeCharacter = computed(
  () =>
    props.characters.find((character) => character.id === activeCharacterId.value) ??
    props.characters[0]
)
</script>

<template>
  <section id="characters" class="panel characters">
    <div class="section-heading">
      <div>
        <span class="eyebrow">Personajes</span>
        <h2>Presenta el cast principal y deja cada ficha lista para expandirse.</h2>
      </div>
    </div>

    <div class="characters__layout">
      <div class="character-list">
        <button
          v-for="character in characters"
          :key="character.id"
          type="button"
          class="character-pill"
          :class="{ 'character-pill--active': character.id === activeCharacterId }"
          :style="{ '--accent': character.accent }"
          @click="activeCharacterId = character.id"
        >
          <strong>{{ character.name }}</strong>
          <span>{{ character.role }}</span>
        </button>
      </div>

      <article v-if="activeCharacter" class="character-card">
        <div class="character-card__header">
          <div
            class="avatar-shell"
            :style="{ '--accent': activeCharacter.accent || '#ffffff' }"
          >
            {{ activeCharacter.name.slice(0, 1) }}
          </div>
          <div>
            <span class="eyebrow eyebrow--soft">{{ activeCharacter.role }}</span>
            <h3>{{ activeCharacter.name }}</h3>
            <p>{{ activeCharacter.tagline }}</p>
          </div>
        </div>

        <p class="character-card__description">
          {{ activeCharacter.description }}
        </p>

        <div class="fact-grid">
          <div
            v-for="fact in activeCharacter.facts"
            :key="fact.label"
            class="fact-card"
          >
            <span>{{ fact.label }}</span>
            <strong>{{ fact.value }}</strong>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
