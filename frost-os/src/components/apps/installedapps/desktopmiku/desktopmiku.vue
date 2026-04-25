<script setup lang="ts">

import { computed } from 'vue';
import { useDesktopMikuStore } from './store';
const store = useDesktopMikuStore('')

const showConfigPanel = () => store.showConfigPanel()

</script>

<template>
    <div>Desktop miku</div>
</template>