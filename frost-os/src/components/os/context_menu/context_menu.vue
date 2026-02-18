<script setup lang="ts">

import { useContextMenu } from './context_menu.ts';
const { contextMenuState, closeMenu } = useContextMenu();

// Cerrar si haces click fuera
window.addEventListener('click', closeMenu);
</script>

<template>
  <Transition name="context-menu-animate">
    <Teleport to="body">
      <div 
        v-if="contextMenuState.isOpen" 
        class="context-menu main-font"
        :style="{ 
          top: contextMenuState.y + 'px', 
          left: contextMenuState.x + 'px',
          visibility: contextMenuState.x === 0 ? 'hidden' : 'visible'
        }"
        @click="closeMenu"
      >
        <div v-for="(opt, i) in contextMenuState.options" :key="i">

          <div style="margin: 8px 0; height: 1px; background-color: #ffffff38;" v-if="opt.separator"></div>
          
          <div
            v-else 
            class="menu-item" 
            :class="{ disabled: opt.disabled }"
            @click="opt.action"
          >
            <i v-if="opt.icon" :class="opt.icon"></i>
            <span>{{ opt.label }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </Transition>
</template>

<style scoped>

.context-menu {
    position: fixed;
    z-index: 1001;

    color: #d7d7d7;
    background-color: #0000007a;
    backdrop-filter: blur(8px);
    border: 0;
    border-radius: 6px;
    padding: 6px 8px;
    min-width: 180px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    font-size: 14px;
}

.context-menu i{
    margin-right: 9px;
}

.menu-item{
  padding: 4px 7px;
  border-radius: 6px;
  cursor: default;
}

.menu-item:hover{
  background-color: rgba(0, 0, 0, 0.404);
}

/* Estado inicial (Entrada) / Estado final (Salida) */
.context-menu-animate-enter-from,
.context-menu-animate-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(-10px);
}

/* Durante la animación */
.context-menu-animate-enter-active {
  transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1), transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.context-menu-animate-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

/* Estado final (Visible) */
.context-menu-animate-enter-to,
.context-menu-animate-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* Estiliza tus .menu-item aquí */
</style>