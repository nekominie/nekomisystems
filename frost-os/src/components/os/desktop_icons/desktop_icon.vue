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
.desktop-icon{
  width: 80px;
  user-select: none;
  text-align: center;
  padding: 6px 4px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.desktop-icon .label{
  font-size: 12px;
  line-height: 14px;
  color: white;
  text-shadow: 0 2px 3px black;
  word-break: break-word;
  display: -webkit-box;
  /*-webkit-line-clamp: 2;*/
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.desktop-icon:hover{
  background: rgb(0 0 0 / 18%);
  backdrop-filter: blur(2px);
}

.desktop-icon.selected{
  /*background: rgba(0, 120, 215, 0.25);
  outline: 1px solid rgba(0, 120, 215, 0.55);*/

  background: rgb(0 0 0 / 18%);
  outline: 1px solid rgb(255 255 255 / 64%);
  backdrop-filter: blur(2px);
  /*box-shadow: 0 0 12px 0px #ffffff70;*/
}

.iconmanager-icon{
  max-width: 50px;
  color: rgb(255, 255, 255);
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.685));
  margin-bottom: 9px;
}

.iconmanager-icon-img, .iconmanager-icon-svg{
  aspect-ratio: 1/1;
  pointer-events: none;
}
</style>
