<script lang="ts" setup>

import { ref, computed } from 'vue';
import { useDiscordStore } from './store';

const store = useDiscordStore('discord')

const muted = computed(() => store.state.muted);

</script>

<template>
    <div style="color: white; font-size: 100px;">Discord!!!!</div>
    <button
        style="background-color: green; font-size: 100px;"
        @click="muted = !muted"
        :class="{
            'muted': muted
        }"
    >Muted?</button>
</template>

<style scoped>

.muted{
    background-color: red !important;
}

</style>