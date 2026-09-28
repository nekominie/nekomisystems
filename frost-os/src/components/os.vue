<script setup lang="ts">

import { provide, onMounted, onUnmounted } from 'vue'
import { processInstructions } from './os/process_manager'
import { OS_KEY } from './api/os_api'

import Taskbar from './os/taskbar.vue'
import Desktop from './os/dekstop.vue'
import ContextMenu from './os/context_menu/context_menu.vue'
import LockScreen from './os/lock/lock_screen.vue'
import { useLockStore } from './os/lock/lock_store'

const emit = defineEmits<{
    (e: 'shutdown'): void
    (e: 'restart'): void
}>()

const os = processInstructions()
provide(OS_KEY, os)

const lockStore = useLockStore()

const preventDefaulContextMenu = (e: MouseEvent) => e.preventDefault()

const handleGlobalLockShortcut = (e: KeyboardEvent) => {
    // Atajo Ctrl + Alt + L o Alt + L para bloquear la pantalla
    if ((e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') || (e.altKey && e.key.toLowerCase() === 'l')) {
        e.preventDefault()
        lockStore.lock()
    }
}

onMounted(() => {
    window.addEventListener('contextmenu', preventDefaulContextMenu)
    window.addEventListener('keydown', handleGlobalLockShortcut)
    lockStore.loadSettings()
})

onUnmounted(() => {
    window.removeEventListener('contextmenu', preventDefaulContextMenu)
    window.removeEventListener('keydown', handleGlobalLockShortcut)
})

</script>

<style scoped>
  @import "./styles/display.css";
</style>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap');    
    .main-font {
        font-family: "Quicksand", sans-serif;
        font-optical-sizing: auto;
        font-weight: 400;
        font-style: normal;    
    }
</style>

<template>
    <div class="display main-font" style="height: 100%; width: 100%;">
        <Desktop/>

        <Taskbar
            @shutdown="emit('shutdown')"
            @restart="emit('restart')"
        />

        <ContextMenu />

        <Transition name="lock-slide">
            <LockScreen
                v-if="lockStore.isLocked"
                @shutdown="emit('shutdown')"
                @restart="emit('restart')"
            />
        </Transition>
    </div>
</template>


