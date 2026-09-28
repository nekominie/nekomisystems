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
    backdrop-filter: var(--os-blur, blur(16px));
    -webkit-backdrop-filter: var(--os-blur, blur(16px));
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    padding: 6px 8px;
    min-width: 180px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    font-size: 14px;
}

.context-menu i{
    margin-right: 9px;
}

.context-menu .text-danger,
.context-menu .bi-mic-mute-fill {
    color: #ed4245 !important;
}

.menu-item{
  padding: 5px 8px;
  border-radius: 6px;
  cursor: default;
  transition: background-color 0.1s ease;
}

.menu-item:hover{
  background-color: rgba(var(--os-accent-rgb, 56, 189, 248), 0.25);
  color: #ffffff;
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