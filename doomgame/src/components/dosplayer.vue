<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
    zipPath: { type: String, required: true },
    executable: { type: String, required: true }
})

const dosContainer = ref(null)
let ci = null

const loadResources = () => {
    return new Promise((resolve) => {
        if (window.Dos) return resolve()

        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = '/games/doom/js-dos.css'
        document.head.appendChild(link)

        const script = document.createElement('script')
        //script.src = 'https://v8.js-dos.com/latest/js-dos.js'
        script.src = '/games/doom/js-dos.js'
        script.onload = resolve
        document.head.appendChild(script)
    })
}

onMounted(async () => {
    await loadResources()

    try {
        ci = window.Dos(dosContainer.value, {
            url: props.zipPath,
            executable: props.executable,
            autoStart: true
        })

    } catch (e) {
        console.error('Error iniciando js-dos v8:', e)
    }
})

onBeforeUnmount(() => {
    if (ci?.exit) {
        ci.exit()
        ci = null
    }
})
</script>

<style scoped>
:deep(.sidebar) {
    display: none !important;
}

:deep(.w-12) {
    display: none !important;
}
</style>

<template>
    <div ref="dosContainer" class="dosbox-container"></div>
</template>