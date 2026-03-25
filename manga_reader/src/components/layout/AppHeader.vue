<script setup lang="ts">
defineProps<{
  sections: Array<{ id: string; label: string; icon: string }>
  title: string
}>()
</script>

<template>
  <header class="topbar">
    <a class="brand" href="#hero">
      <span class="brand__mark">MR</span>
      <span class="brand__text">{{ title }}</span>
    </a>

    <nav class="topbar__nav">
      <a
        v-for="section in sections"
        :key="section.id"
        class="topbar__link"
        :href="`#${section.id}`"
      >
        <i :class="section.icon"></i>
        <span>{{ section.label }}</span>
      </a>
    </nav>
  </header>
</template>
