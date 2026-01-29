<script setup lang="ts">

const emit = defineEmits<{
    (e: 'boot-success'): void
}>();

emit('boot-success');

</script>

<template>
</template>