<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
    <div
      class="w-full max-w-xl bg-[#202c33] text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh]"
      @click.stop
    >
      <!-- Header -->
      <div class="p-6 border-b border-white/10 flex items-center gap-3 bg-[#111b21]">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#25d366] to-[#128c7e] text-white flex items-center justify-center text-xl shrink-0 shadow-lg shadow-[#25d366]/20">
          <i class="bi bi-person-bounding-box"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-white truncate">¿Quién es el protagonista?</h3>
          <p class="text-xs text-gray-400">
            Se detectaron {{ participants.length }} participante{{ participants.length > 1 ? 's' : '' }} en el chat
          </p>
        </div>
        <button
          type="button"
          class="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
          @click="$emit('cancel')"
        >
          <i class="bi bi-x-lg text-sm"></i>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 overflow-y-auto space-y-3 flex-1">
        <p class="text-xs text-gray-300 leading-relaxed mb-4">
          Selecciona quién eres tú en esta conversación. Tus mensajes se mostrarán en <strong class="text-[#25d366]">burbujas verdes del lado derecho</strong>, y los de los demás participantes se mostrarán a la izquierda.
        </p>

        <!-- Participant Cards List -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="p in participants"
            :key="p.name"
            class="p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 relative"
            :class="[
              selectedName === p.name
                ? 'border-[#25d366] bg-[#25d366]/15 shadow-md shadow-[#25d366]/10 scale-[1.01]'
                : 'border-white/10 bg-[#111b21]/70 hover:bg-[#111b21] hover:border-white/25'
            ]"
            @click="selectedName = p.name"
          >
            <!-- Avatar -->
            <div
              class="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 shadow"
              :style="{ backgroundColor: p.color }"
            >
              {{ getInitials(p.name) }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <h4 class="font-bold text-sm text-white truncate" :title="p.name">
                {{ p.name }}
              </h4>
              <p class="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                <span>{{ p.messageCount.toLocaleString() }} mensajes</span>
                <span v-if="totalMessages > 0" class="text-gray-500">
                  ({{ Math.round((p.messageCount / totalMessages) * 100) }}%)
                </span>
              </p>
            </div>

            <!-- Selected check badge -->
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0"
              :class="[
                selectedName === p.name
                  ? 'bg-[#25d366] text-[#111b21]'
                  : 'border border-white/20 text-transparent'
              ]"
            >
              <i class="bi bi-check-lg text-sm font-bold"></i>
            </div>
          </div>
        </div>

        <!-- Optional Neutral / Observer mode -->
        <div
          class="mt-4 p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3"
          :class="[
            selectedName === ''
              ? 'border-[#25d366] bg-[#25d366]/15'
              : 'border-dashed border-white/15 bg-transparent hover:bg-white/5'
          ]"
          @click="selectedName = ''"
        >
          <div class="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-300 shrink-0">
            <i class="bi bi-eye"></i>
          </div>
          <div class="flex-1 min-w-0">
            <h4 class="text-xs font-semibold text-white">Modo Observador</h4>
            <p class="text-[11px] text-gray-400">Ver todas las burbujas a la izquierda como tercero</p>
          </div>
          <input
            type="radio"
            value=""
            v-model="selectedName"
            class="text-[#25d366] accent-[#25d366]"
          />
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-white/10 bg-[#111b21] flex items-center justify-between gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all"
          @click="$emit('cancel')"
        >
          Atrás
        </button>
        <button
          type="button"
          class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-bold text-xs shadow-lg shadow-[#25d366]/20 hover:scale-102 active:scale-98 transition-all flex items-center gap-2"
          @click="confirmProtagonist"
        >
          <span>Abrir chat</span>
          <i class="bi bi-whatsapp"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ParticipantInfo } from '../types/chat'
import { getInitials } from '../utils/colors'

const props = defineProps<{
  participants: ParticipantInfo[]
  totalMessages: number
  initialSelected?: string
}>()

const emit = defineEmits<{
  (e: 'select', protagonistName: string): void
  (e: 'cancel'): void
}>()

// Default selection: if user provided, or first participant
const selectedName = ref(
  props.initialSelected !== undefined
    ? props.initialSelected
    : props.participants[0]?.name || ''
)

function confirmProtagonist() {
  emit('select', selectedName.value)
}
</script>
