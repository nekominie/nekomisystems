<script lang="ts" setup>

import type { App } from '../data/app'

const props = defineProps<{
    snippet: App,
    component: any
}>()

</script>

<template>
    <component :is="component" v-if="component" />
</template>

<style scoped>
</style>