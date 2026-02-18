<script setup lang="ts">
import { computed } from 'vue';
import { icons } from '../data/icons.ts';

const props = defineProps<{
  id: string
}>();

const currentIcon = computed(() => {
  return icons.find(app => app.id === props.id);
});

const isImage = (iconString: string) => {
    return /\.(jpg|jpeg|png|webp|avif|svg)$/.test(iconString) || iconString.startsWith('/');
}

</script>

<template>

  <img
    v-if="currentIcon?.saved_path && isImage(currentIcon.saved_path)"
    :src="currentIcon.saved_path"
    class="iconmanager-icon iconmanager-icon-img"
  >

  <div
    v-else-if="currentIcon && currentIcon.svg"
    v-html="currentIcon.svg"  
    class="iconmanager-icon iconmanager-icon-svg"
  >
  </div>

  <svg
    v-else-if="currentIcon && currentIcon.paths"
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 16 16" 
    fill="currentColor"
    class="svg-icon iconmanager-icon-svg iconmanager-icon"
  >
    <path
        v-for="(pathData, index) in currentIcon.paths"
        :key="index"
        :d="pathData"
    />
  </svg>
</template>

<style scoped>
.svg-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>