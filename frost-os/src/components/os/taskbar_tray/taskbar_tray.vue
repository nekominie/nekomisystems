<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import type { App } from '../../data/app'
import IconManager from '../iconmanager.vue'

const props = defineProps<{
  trayApps: App[]
  maxMain?: number
}>()

const emit = defineEmits<{
  (e: 'right-click', payload: { e:MouseEvent; id: string }): void
}>()

const maxMain = computed(() => props.maxMain ?? 3)

const isOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const mainApps = computed(() => props.trayApps.slice(0, maxMain.value))
const overflowApps = computed(() => props.trayApps.slice(maxMain.value))
const hasOverflow = computed(() => overflowApps.value.length > 0)

const toggleOpen = () => {
  if (!hasOverflow.value) return
  isOpen.value = !isOpen.value
}

const close = () => (isOpen.value = false)

const onGlobalMouseDown = (e: MouseEvent) => {
  if (!isOpen.value) return
  const target = e.target as HTMLElement
  if (!rootEl.value) return
  if (!rootEl.value.contains(target)) close()
}

const onGlobalKeyDown = (e: KeyboardEvent) => {
  if (!isOpen.value) return
  if (e.key === 'Escape') close()
}

const trayRightClick = (e: MouseEvent, id: string) => {
    if(e.button === 2){
        emit('right-click', { e, id })
    }
}

onMounted(() => {
  window.addEventListener('mousedown', onGlobalMouseDown)
  window.addEventListener('keydown', onGlobalKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('mousedown', onGlobalMouseDown)
  window.removeEventListener('keydown', onGlobalKeyDown)
})
</script>

<template>
    <div
        v-if="trayApps.length > 0"
        ref="rootEl" 
        class="tray-root"
    >
    <!-- Overflow panel -->
    <Transition name="tray-pop">
      <div v-if="isOpen && hasOverflow" class="tray-popover">
        <TransitionGroup name="tray-list" tag="div" class="tray-popover-grid">
          <div
            v-for="app in overflowApps"
            :key="app.manifest.id"
            class="app-icon overflow"
            title="app.manifest.name"
          >
            <IconManager :id="app.manifest.id" />
          </div>
        </TransitionGroup>
      </div>
    </Transition>

    <!-- Main tray -->
    <div class="main-tray">
      <div
        v-for="app in mainApps"
        :key="app.manifest.id"
        class="app-icon"
        :title="app.manifest.name"
        @contextmenu.prevent.stop="trayRightClick($event, app.manifest.id)"
      >
        <IconManager :id="app.manifest.id" />
      </div>

      <button
        v-if="hasOverflow"
        class="chevron"
        type="button"
        @click.stop="toggleOpen"
        :aria-expanded="isOpen"
        aria-label="Mostrar iconos ocultos"
      >
        <i class="bi bi-caret-up-fill"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.tray-root{
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
}

/* Main tray */
.main-tray{
  border-radius: 6px;
  background-color: rgba(0, 0, 0, 0.329);
  margin-right: 10px;
  height: 96%;
  
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0px 4px;
}

.app-icon{
  aspect-ratio: 1 / 1;
  padding: 5px;
  border-radius: 5px;
  cursor: pointer;
  flex: 0 0 auto;
  max-height: 62%;
  margin: 0 2px;

  display: flex;
  align-items: center;
  justify-content: center;
}

.iconmanager-icon{
  max-width: 20px;
  object-fit: contain;
  display: block;
}

.app-icon:hover{
  background-color: rgba(0, 0, 0, 0.322);
}

.chevron{
    background-color: rgba(255, 255, 255, 0.253);
    aspect-ratio: 1 / 1;
    padding: 5px;
    border-radius: 5px;
    flex: 0 0 auto;
    height: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 0;
    cursor: pointer;
    margin: 0 2px;
    color: white;
    margin-left: 6px;
}

.chevron i{
  font-size: 14px;
}

.chevron:hover{
  background-color: rgba(255, 255, 255, 0.178);
}

/* Overflow panel */
.tray-popover{
  position: absolute;
  right: 0;
  bottom: calc(100% + 15px);
  padding: 10px;
  border-radius: 10px;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(22px);
  box-shadow: 0 8px 28px rgba(0,0,0,0.35);
  min-width: 160px;
  z-index: 2000;
}

.tray-popover-grid{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

/* Animación popover */
.tray-pop-enter-from,
.tray-pop-leave-to{
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.tray-pop-enter-active,
.tray-pop-leave-active{
  transition: all 0.16s ease;
}

.tray-pop-enter-to,
.tray-pop-leave-from{
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Animaciones del TransitionGroup */
.tray-list-move{
  transition: transform 0.18s ease;
}

.tray-list-enter-from{
  opacity: 0;
  transform: scale(0.9);
}

.tray-list-enter-active{
  transition: all 0.16s ease;
}

.tray-list-enter-to{
  opacity: 1;
  transform: scale(1);
}

.tray-list-leave-active{
  transition: all 0.12s ease;
  position: absolute;
}

.tray-list-leave-to{
  opacity: 0;
  transform: scale(0.9);
}
</style>
