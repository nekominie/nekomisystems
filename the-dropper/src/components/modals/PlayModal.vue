<template>
  <GlassModal
    :is-open="activeModal === 'play'"
    title="Selección de Nivel // Cámara de Pruebas"
    system-code="PROTOCOL 01 // DEPLOY"
    @close="closeModal"
  >
    <div class="space-y-8">
      <!-- Mode Tabs (Minimalist Brutalist) -->
      <div class="flex items-center space-x-6 border-b border-white/10 pb-4">
        <button
          type="button"
          class="text-sm font-['Syne',sans-serif] tracking-[0.2em] uppercase transition-colors duration-300 cursor-pointer"
          :class="activeTab === 'campaign' ? 'text-white border-b-2 border-cyan-400 pb-2 -mb-[18px]' : 'text-white/40 hover:text-white/70'"
          @click="activeTab = 'campaign'"
        >
          [ 01 ] MODO CAMPAÑA
        </button>
        <button
          type="button"
          class="text-sm font-['Syne',sans-serif] tracking-[0.2em] uppercase transition-colors duration-300 cursor-pointer"
          :class="activeTab === 'sandbox' ? 'text-white border-b-2 border-cyan-400 pb-2 -mb-[18px]' : 'text-white/40 hover:text-white/70'"
          @click="activeTab = 'sandbox'"
        >
          [ 02 ] SANDBOX LIBRE
        </button>
      </div>

      <!-- Campaign Tab -->
      <div v-if="activeTab === 'campaign'" class="space-y-6">
        <p class="text-xs md:text-sm font-light text-white/60 tracking-wider">
          Selecciona una cámara física. Tu objetivo es construir un andamiaje con las piezas disponibles para conducir la esfera desde la zona de lanzamiento hasta el receptor cuántico.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="lvl in LEVELS"
            :key="lvl.id"
            class="group relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between overflow-hidden"
            :class="[
              lvl.unlocked
                ? 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-cyan-400/40 cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                : 'bg-white/[0.01] border-white/5 opacity-50 cursor-not-allowed',
            ]"
            @click="lvl.unlocked && selectLevel(lvl)"
          >
            <!-- Background subtle hover glow -->
            <div
              class="absolute -right-10 -bottom-10 w-28 h-28 bg-cyan-400/5 rounded-full blur-2xl group-hover:bg-cyan-400/10 transition-colors pointer-events-none"
            ></div>

            <div>
              <div class="flex items-center justify-between mb-3 text-[11px] font-mono">
                <span class="text-cyan-400/80">{{ lvl.code }}</span>
                <span
                  class="px-2 py-0.5 rounded text-[10px] tracking-wider uppercase"
                  :class="[
                    lvl.difficulty === 'Fácil' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : '',
                    lvl.difficulty === 'Medio' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : '',
                    lvl.difficulty === 'Difícil' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : '',
                    lvl.difficulty === 'Experto' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : '',
                  ]"
                >
                  {{ lvl.difficulty }}
                </span>
              </div>

              <h3 class="text-base font-medium text-white mb-1 group-hover:text-cyan-300 transition-colors font-['Syne',sans-serif]">
                {{ lvl.name }}
              </h3>
              <p class="text-xs text-white/50 leading-relaxed">
                {{ lvl.subtitle }}
              </p>
            </div>

            <div class="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
              <span class="text-white/40">
                PIEZAS: <strong class="text-white/80 font-normal">{{ lvl.piecesCount }}</strong>
              </span>
              <span v-if="lvl.bestTime" class="text-emerald-400/80">
                RÉCORD: {{ lvl.bestTime }}
              </span>
              <span v-else-if="lvl.unlocked" class="text-white/30 group-hover:text-cyan-400 transition-colors">
                [ INICIAR &gt; ]
              </span>
              <span v-else class="text-white/30">
                BLOQUEADO
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sandbox Tab -->
      <div v-else class="p-8 rounded-2xl bg-white/[0.02] border border-white/10 space-y-6">
        <div class="flex items-center space-x-3">
          <i class="bi bi-gear-wide-connected text-2xl text-cyan-400"></i>
          <div>
            <h3 class="text-lg font-light text-white font-['Syne',sans-serif] tracking-wider">
              ESPACIO DE PRUEBAS ILIMITADO
            </h3>
            <p class="text-xs text-white/50">
              Ambiente arquitectónico libre sin restricciones de piezas ni temporizador.
            </p>
          </div>
        </div>

        <div class="p-5 rounded-xl bg-black/40 border border-white/5 space-y-3 text-xs text-white/70 font-mono">
          <div class="flex justify-between">
            <span class="text-white/40">HERRAMIENTAS:</span>
            <span>Rampas, Trampolines, Tubos, Guías gravitatorias, Deflectores</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">FÍSICAS:</span>
            <span>Gravedad personalizable (-9.82 m/s²), Rebote dinámico, Detección de colisiones continua</span>
          </div>
          <div class="flex justify-between">
            <span class="text-white/40">ESTADO DEL MÓDULO:</span>
            <span class="text-cyan-400">EN PREPARACIÓN (FASE 2)</span>
          </div>
        </div>

        <div class="text-center pt-2">
          <button
            type="button"
            class="px-8 py-3 rounded-full text-xs font-mono tracking-[0.25em] text-white/90 bg-white/10 hover:bg-cyan-500/20 hover:text-cyan-300 border border-white/20 hover:border-cyan-400/50 backdrop-blur-md transition-all cursor-pointer"
            @click="launchSandboxNotice"
          >
            [ CARGAR LABORATORIO SANDBOX ]
          </button>
        </div>
      </div>
    </div>
  </GlassModal>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GlassModal from '../ui/GlassModal.vue';
import { activeModal, closeModal, LEVELS } from '../../state/gameStore';
import type { LevelInfo } from '../../types/game';
import { sound } from '../../utils/sound';

const activeTab = ref<'campaign' | 'sandbox'>('campaign');

function selectLevel(lvl: LevelInfo) {
  sound.playClick(0.15);
  alert(`Iniciando ${lvl.name} (${lvl.code})\n\nNota: La simulación física y colocación de piezas estará disponible en la siguiente fase de desarrollo.`);
}

function launchSandboxNotice() {
  sound.playClick(0.15);
  alert('Modo Sandbox Libre: la fase del motor físico interactivo está siendo preparada.');
}
</script>
