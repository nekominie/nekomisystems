<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CharacterProfile, MangaProject } from '../types/manga'

const props = defineProps<{
  project: MangaProject
}>()

const activeId = ref(props.project.characters[0]?.id ?? '')

const activeCharacter = computed(
  () => props.project.characters.find((character) => character.id === activeId.value) ?? props.project.characters[0]
)

const getSlotPortrait = (character: CharacterProfile) =>
  character.slotPortrait ?? character.portrait ?? props.project.logo

const getPortrait = (character: CharacterProfile) => character.portrait ?? props.project.cover
</script>

<template>
  <section class="view character-view">
    <div class="view-header">
      <div>
        <span class="view-label">Elenco</span>
        <h2>Personajes y presencias</h2>
      </div>
      <p>Esta vista funciona como panel de personaje. Luego puedes sumarle relaciones, quotes, OST o galerias.</p>
    </div>

    <div class="character-stage">
      <aside class="character-roster">
        <div class="character-roster__header">
          <span class="view-label">Archivo vivo</span>
          <strong>{{ project.characters.length }} perfiles</strong>
          <p>La lista lateral ahora tiene su propio scroll para que el panel principal no se deforme.</p>
        </div>

        <div class="character-list">
          <button
            v-for="character in project.characters"
            :key="character.id"
            class="character-tab"
            :class="{ 'character-tab--active': character.id === activeId }"
            type="button"
            :style="{ '--accent': character.accent }"
            @click="activeId = character.id"
          >
            <div class="character-tab__portrait">
              <img :src="getSlotPortrait(character)" :alt="character.displayName" />
            </div>
            <div class="character-tab__meta">
              <strong>{{ character.displayName }}</strong>
              <small style="display: none;">{{ character.fullName }}</small>
              <span>{{ character.role }}</span>
            </div>
          </button>
        </div>
      </aside>

      <article v-if="activeCharacter" class="character-spotlight">
        <div class="character-spotlight__art">
          <img :src="getPortrait(activeCharacter)" :alt="activeCharacter.displayName" />
          <div class="character-spotlight__signal">
            <span class="view-label">Identidad</span>
            <strong>{{ activeCharacter.displayName }}</strong>
            <small style="">{{ activeCharacter.fullName }}</small>
          </div>
        </div>
        <div class="character-spotlight__copy">
          <span class="view-label">{{ activeCharacter.role }}</span>
          <h3>{{ activeCharacter.fullName }}</h3>
          <p style="display:none;" class="character-spotlight__fullname">{{ activeCharacter.fullName }}</p>
          <p class="character-spotlight__tagline">{{ activeCharacter.tagline }}</p>
          <p>{{ activeCharacter.bio }}</p>
          <div class="fact-strip">
            <article v-for="fact in activeCharacter.facts" :key="fact.label" class="fact-tile">
              <span>{{ fact.label }}</span>
              <strong>{{ fact.value }}</strong>
            </article>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
