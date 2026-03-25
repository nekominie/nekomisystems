import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { AppView } from '../types/manga'

const validRoutes: AppView[] = ['overview', 'volumes', 'characters', 'lore', 'reader']

const normalizeHash = (hash: string): AppView => {
  const candidate = hash.replace(/^#/, '') as AppView
  return validRoutes.includes(candidate) ? candidate : 'overview'
}

export const useHashRoute = () => {
  const currentRoute = ref<AppView>(normalizeHash(window.location.hash))

  const syncRoute = () => {
    currentRoute.value = normalizeHash(window.location.hash)
  }

  const goTo = (route: AppView) => {
    if (window.location.hash === `#${route}`) {
      currentRoute.value = route
      return
    }

    window.location.hash = route
  }

  onMounted(() => {
    window.addEventListener('hashchange', syncRoute)
    if (!window.location.hash) {
      goTo('overview')
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', syncRoute)
  })

  return {
    currentRoute: computed(() => currentRoute.value),
    goTo,
  }
}
