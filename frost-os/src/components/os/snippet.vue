<script lang="ts" setup>

import type { App } from '../data/app'

const props = defineProps<{
    snippet: App,
    component: any
}>()

</script>

<template>
    <div class="snippet-root">
        <component :is="component" v-if="component" />
    </div>
</template>

<style scoped>
</style>