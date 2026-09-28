<script setup lang="ts">
import IconManager from '../iconmanager.vue'

defineProps<{
  id: string
  name: string
  icon: string
  selected: boolean
}>()
</script>

<template>
  <div class="desktop-icon" :class="{ selected }">
    <IconManager :id="id" />
    <span class="label">{{ name }}</span>
  </div>
</template>

<style scoped>
.desktop-icon {
  width: 80px;
  user-select: none;
  text-align: center;
  padding: 6px 4px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.desktop-icon .label {
  font-size: 12px;
  line-height: 14px;
  color: white;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  word-break: break-word;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-top: 4px;
  padding: 1px 3px;
  border-radius: 3px;
}

.desktop-icon:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(4px);
}

.desktop-icon.selected {
  background: rgba(0, 120, 215, 0.28);
  border-color: rgba(125, 214, 255, 0.7);
  backdrop-filter: blur(4px);
  box-shadow: 0 0 10px rgba(0, 120, 215, 0.25);
}

.desktop-icon.selected .label {
  background: rgba(0, 120, 215, 0.45);
}

.iconmanager-icon {
  max-width: 50px;
  color: rgb(255, 255, 255);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65));
  margin-bottom: 2px;
}

.iconmanager-icon-img,
.iconmanager-icon-svg {
  aspect-ratio: 1/1;
  pointer-events: none;
}
</style>
