<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
    <div
      class="w-full max-w-lg bg-[#202c33] text-white rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[85vh] animate-scale-up"
      @click.stop
    >
      <!-- Modal Header -->
      <div class="p-6 border-b border-white/10 flex items-center gap-3 bg-[#111b21]">
        <div class="w-10 h-10 rounded-2xl bg-[#25d366]/20 text-[#25d366] flex items-center justify-center text-xl shrink-0">
          <i class="bi bi-file-earmark-text"></i>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-lg font-bold text-white truncate">Selecciona el archivo maestro</h3>
          <p class="text-xs text-gray-400">
            Se encontraron {{ txtFiles.length }} archivo{{ txtFiles.length > 1 ? 's' : '' }} .txt en el ZIP
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

      <!-- Modal Body (File list) -->
      <div class="p-6 overflow-y-auto space-y-3 flex-1">
        <p class="text-xs text-gray-300 leading-relaxed mb-3">
          Elige el archivo de texto que contiene el historial de la conversación que deseas visualizar:
        </p>

        <div
          v-for="file in txtFiles"
          :key="file.relativePath"
          class="p-4 rounded-2xl border transition-all cursor-pointer relative"
          :class="[
            selectedPath === file.relativePath
              ? 'border-[#25d366] bg-[#25d366]/10 shadow-lg shadow-[#25d366]/10'
              : 'border-white/10 bg-[#111b21]/60 hover:bg-[#111b21] hover:border-white/20'
          ]"
          @click="selectedPath = file.relativePath"
        >
          <div class="flex items-start gap-3">
            <div class="pt-0.5">
              <input
                type="radio"
                :value="file.relativePath"
                v-model="selectedPath"
                class="w-4 h-4 text-[#25d366] accent-[#25d366] cursor-pointer"
              />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2">
                <h4 class="font-bold text-sm text-white truncate flex items-center gap-1.5">
                  <i class="bi bi-chat-left-text text-[#25d366]"></i>
                  {{ file.name }}
                </h4>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-300 shrink-0">
                  {{ formatSize(file.size) }}
                </span>
              </div>

              <div class="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                <span v-if="file.lineCount">
                  <i class="bi bi-list-ol mr-1"></i>{{ file.lineCount.toLocaleString() }} líneas
                </span>
                <span class="truncate">
                  <i class="bi bi-folder2 mr-1"></i>{{ file.relativePath }}
                </span>
              </div>

              <!-- Preview snippet -->
              <div v-if="file.sampleText" class="mt-2.5 p-2 rounded-xl bg-black/40 border border-white/5 font-mono text-[10px] text-gray-400 whitespace-pre-wrap line-clamp-3">
                {{ file.sampleText }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="p-4 border-t border-white/10 bg-[#111b21] flex items-center justify-end gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all"
          @click="$emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-6 py-2.5 rounded-xl bg-[#25d366] hover:bg-[#20bd5a] text-[#111b21] font-bold text-xs shadow-lg shadow-[#25d366]/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="!selectedPath"
          @click="confirmSelection"
        >
          <span>Continuar</span>
          <i class="bi bi-arrow-right"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ZipTxtFile } from '../types/chat'

const props = defineProps<{
  txtFiles: ZipTxtFile[]
}>()

const emit = defineEmits<{
  (e: 'select', relativePath: string): void
  (e: 'cancel'): void
}>()

const selectedPath = ref(props.txtFiles[0]?.relativePath || '')

watch(
  () => props.txtFiles,
  (newVal) => {
    if (newVal.length > 0 && !selectedPath.value) {
      selectedPath.value = newVal[0].relativePath
    }
  },
  { immediate: true }
)

function confirmSelection() {
  if (selectedPath.value) {
    emit('select', selectedPath.value)
  }
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>
