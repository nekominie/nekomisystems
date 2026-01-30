<script setup lang="ts">

import OperatingSystem from './os.vue'

const emit = defineEmits<{
    (e: 'shutdown'): void
}>()

const acpiHandler = () => {
    emit('shutdown');
}

</script>

<template>
    <OperatingSystem 
        @shutdown="acpiHandler"
    />
</template>