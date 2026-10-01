<script setup lang="ts">
import IconManager from '../iconmanager.vue'

defineProps<{
  id: string
  name: string
  icon?: string
  selected: boolean
  isShortcut?: boolean
  isFolder?: boolean
  iconClass?: string
  thumbnail?: string | null
}>()
</script>

<template>
  <div class="desktop-icon" :class="{ selected }">
    <div class="desktop-icon-frame">
      <!-- 1. Imagen con Thumbnail -->
      <div v-if="thumbnail" class="desktop-thumb-wrap">
        <img :src="thumbnail" :alt="name" class="desktop-thumb-img" />
      </div>

      <!-- 2. Acceso directo a una app -->
      <div v-else-if="isShortcut" class="desktop-shortcut-wrap">
        <IconManager :id="id" class="desktop-app-icon" />
        <div class="desktop-shortcut-badge">
          <i class="bi bi-arrow-up-right-square-fill"></i>
        </div>
      </div>

      <!-- 3. Carpeta de archivos -->
      <div v-else-if="isFolder" class="desktop-folder-wrap">
        <i class="bi bi-folder-fill text-warning desktop-folder-icon"></i>
      </div>

      <!-- 4. Archivo genérico (texto, markdown, etc.) -->
      <div v-else class="desktop-file-wrap">
        <i class="bi desktop-file-icon" :class="iconClass || 'bi-file-earmark'"></i>
      </div>
    </div>

    <span class="label" :title="name">{{ name }}</span>
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

.desktop-icon-frame {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.desktop-shortcut-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.desktop-app-icon {
  max-width: 44px;
  max-height: 44px;
  display: block;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.65));
}

.desktop-shortcut-badge {
  position: absolute;
  bottom: 0px;
  left: 0px;
  font-size: 11px;
  color: #38bdf8;
  line-height: 1;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 2px;
  padding: 1px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.desktop-folder-icon {
  font-size: 42px;
  line-height: 1;
  filter: drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45));
}

.desktop-file-icon {
  font-size: 38px;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.desktop-thumb-wrap {
  width: 46px;
  height: 46px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.desktop-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
