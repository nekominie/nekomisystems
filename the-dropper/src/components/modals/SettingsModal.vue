<template>
  <GlassModal
    :is-open="activeModal === 'settings'"
    title="Ajustes // Parámetros del Sistema"
    system-code="PROTOCOL 03 // CONFIG"
    @close="closeModal"
  >
    <div class="space-y-8 max-w-2xl mx-auto">
      <!-- Audio Settings Section -->
      <section class="space-y-4">
        <h3 class="text-xs font-mono tracking-[0.25em] text-cyan-400 uppercase border-b border-white/10 pb-2">
          01 // EXPERIENCIA SONORA & SÁPTICA
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <span class="text-sm font-medium text-white block">Efectos & Sonido Táctil</span>
              <span class="text-xs text-white/40">Retroalimentación acústica al interactuar con la interfaz y piezas.</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="settings.ambientSound"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"
              ></div>
            </label>
          </div>

          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
            <div class="flex justify-between text-xs">
              <span class="text-white/70">Volumen Maestro</span>
              <span class="font-mono text-cyan-400">{{ settings.masterVolume }}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              v-model="settings.masterVolume"
              class="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </section>

      <!-- Video & Graphics Section -->
      <section class="space-y-4">
        <h3 class="text-xs font-mono tracking-[0.25em] text-cyan-400 uppercase border-b border-white/10 pb-2">
          02 // RENDERIZADO 3D & ARQUITECTURA
        </h3>

        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <span class="text-sm font-medium text-white block">Parallax de Cámara Cinemático</span>
              <span class="text-xs text-white/40">Inclinación espacial reactiva al movimiento del cursor del ratón.</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="settings.cameraParallax"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"
              ></div>
            </label>
          </div>

          <div class="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div>
              <span class="text-sm font-medium text-white block">Efectos de Vidrio & Difracción</span>
              <span class="text-xs text-white/40">Filtro de desenfoque de agua y refracciones de luz en la UI.</span>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="settings.glassRefractions"
                class="sr-only peer"
              />
              <div
                class="w-11 h-6 bg-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"
              ></div>
            </label>
          </div>

          <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span class="text-sm font-medium text-white">Calidad Gráfica 3D</span>
            <div class="flex space-x-2">
              <button
                v-for="q in ['medium', 'high', 'ultra'] as const"
                :key="q"
                type="button"
                class="px-3 py-1 rounded text-xs font-mono uppercase transition-colors"
                :class="settings.graphicsQuality === q ? 'bg-cyan-400 text-black font-bold' : 'bg-white/10 text-white/50 hover:text-white'"
                @click="settings.graphicsQuality = q"
              >
                {{ q }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </GlassModal>
</template>

<script setup lang="ts">
import GlassModal from '../ui/GlassModal.vue';
import { activeModal, closeModal, settings } from '../../state/gameStore';
</script>
