<script setup lang="ts">

import OperatingSystem from './os.vue'

const emit = defineEmits<{
    (e: 'shutdown'): void
}>()

const handleShutdown = () => {
    emit('shutdown');
}

</script>

<template>
    <OperatingSystem 
        @shutdown="handleShutdown"
    />
</template>