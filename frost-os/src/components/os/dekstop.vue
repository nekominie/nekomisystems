<script setup lang="ts">

import { computed, inject, onMounted, onUnmounted, ComponentPublicInstance  } from 'vue'
import { MasterAppRegistry } from '../data/master_apps_registry.ts'
import { MasterSnippetsRegistry } from '../data/master_snippets_registry.ts'
import { useContextMenu } from './context_menu/context_menu.ts'
import { OS_KEY } from '../api/os_api'
import Window from './window.vue'
import SnippetHost from './snippet_host.vue'
import DesktopIconsLayer from './desktop_icons/desktop_icons_layer.vue'

const os = inject(OS_KEY)
if(!os) throw new Error('OS API not found')

const { 
    openMenu 
} = useContextMenu()

const transitionName = computed(() => 
    os.state.lastAction
)

const windowOpenApps = computed(() => 
    os.state.apps.filter(app => app.runtime.isWindowOpen)
)

const pinnedDesktopApps = computed(() => 
    os.state.apps.filter(app => app.user.isPinnedDesktop)
)

const mountedSnippets = computed(() => 
    os.state.snippets.filter(snippet => snippet.runtime.isMounted)
)

onMounted(() => {
  window.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true })
})

onUnmounted(() => {
  window.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true } as any)
})

const snippetEls = new Map<string, HTMLElement>()

const setSnippetEl = (id: string) => (el: Element | ComponentPublicInstance | null) => {
  // el será el root DOM del componente si el ref está en un elemento
  if (el && el instanceof HTMLElement) snippetEls.set(id, el)
  else snippetEls.delete(id)
}

const handleGlobalPointerDown = (e: PointerEvent) => {
  // solo click izquierdo
  if (e.button !== 0) return

  // cierra solo flyouts (no widgets permanentes)
  const openFlyouts = os.state.snippets.filter(s =>
    s.runtime.isMounted &&
    s.runtime.isVisible &&
    s.manifest.snippet?.kind === 'flyout'
  )

  if (openFlyouts.length === 0) return

  const target = e.target as Node | null
  if (!target) return

  for (const s of openFlyouts) {
    const el = snippetEls.get(s.manifest.id)
    if (!el) continue

    // si el click fue dentro, no lo cierres
    if (el.contains(target)) continue

    // click afuera => hide (dispara transición)
    os.hideSnippet(s.manifest.id)
  }
}

const handleContextMenu = (e: MouseEvent) => {
    openMenu(e, [
        { label: 'Personalizar', icon: 'bi-brush-fill', action: () => os.launchApp('settings') }
    ])
}

</script>

<style scoped>
    @import '../styles/desktop.css';
</style>

<style>
    @import "../styles/snippet_transitions.css";
</style>

<template>
    <div class="desktop" @contextmenu="handleContextMenu">

        <DesktopIconsLayer 
            :pinnedApps="pinnedDesktopApps" 
        />

        <SnippetHost
            v-for="snippet in mountedSnippets"
            :key="snippet.manifest.id"
            :snippet="snippet"
            :component="MasterSnippetsRegistry[snippet.manifest.id]"
            :set-el="setSnippetEl(snippet.manifest.id)"
            @request-close="() => os.hideSnippet(snippet.manifest.id)"
            @after-leave="() => os.unmountSnippet(snippet.manifest.id)"
        />
        
        <TransitionGroup :name="transitionName">
            <Window
                v-for="app in windowOpenApps"
                v-show="!app.runtime.isMinimized"
                :key="app.manifest.id"
                :app="app"
                :component="MasterAppRegistry[app.manifest.id]"
                @close="os.closeApp"
                @focus="os.bringToFront"
                @minimize="os.minimizeWindow"
                @maximize="os.maximizeWindow"
            />
        </TransitionGroup>
    </div>
</template>