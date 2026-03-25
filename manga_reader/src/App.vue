<script setup lang="ts">
import { computed, ref } from 'vue'
import AtlasNav from './components/atlas/AtlasNav.vue'
import { useHashRoute } from './composables/useHashRoute'
import { mangaProject } from './data/mangaData'
import CharactersView from './views/CharactersView.vue'
import LoreView from './views/LoreView.vue'
import OverviewView from './views/OverviewView.vue'
import ReaderView from './views/ReaderView.vue'
import VolumesView from './views/VolumesView.vue'

const { currentRoute, goTo } = useHashRoute()

const readerSelection = ref<{
  volumeId?: string
  chapterId?: string
}>({})

const currentView = computed(() => {
  switch (currentRoute.value) {
    case 'volumes':
      return VolumesView
    case 'characters':
      return CharactersView
    case 'lore':
      return LoreView
    case 'reader':
      return ReaderView
    default:
      return OverviewView
  }
})

const showAtlasNav = computed(() => currentRoute.value !== 'reader')

const openReader = (payload: { volumeId: string; chapterId: string }) => {
  readerSelection.value = payload
  goTo('reader')
}

const goBackToLibrary = () => {
  goTo('volumes')
}
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--reader': currentRoute === 'reader' }">
    <div class="ambient ambient--one"></div>
    <div class="ambient ambient--two"></div>
    <div class="ambient ambient--grain"></div>

    <AtlasNav
      v-if="showAtlasNav"
      :project="mangaProject"
      :current-route="currentRoute"
      @navigate="goTo"
    />

    <main class="app-stage">
      <component
        :is="currentView"
        :project="mangaProject"
        :initial-selection="readerSelection"
        @open-reader="openReader"
        @back-to-library="goBackToLibrary"
      />
    </main>
  </div>
</template>
