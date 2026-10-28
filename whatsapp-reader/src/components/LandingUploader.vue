<template>
  <div class="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-b from-[#0b141a] via-[#111b21] to-[#0c1317] text-white overflow-y-auto select-none">
    <!-- Header -->
    <header class="w-full max-w-5xl mx-auto flex items-center justify-between py-2 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#25d366] to-[#128c7e] flex items-center justify-center shadow-lg shadow-[#25d366]/20">
          <i class="bi bi-whatsapp text-2xl text-white"></i>
        </div>
        <div>
          <h1 class="font-bold text-lg tracking-tight flex items-center gap-2">
            WhatsApp Reader
            <span class="text-xs bg-[#25d366]/20 text-[#25d366] px-2 py-0.5 rounded-full font-semibold border border-[#25d366]/30">v1.0</span>
          </h1>
          <p class="text-xs text-gray-400">Visualizador moderno de chats exportados</p>
        </div>
      </div>

      <a
        href="/portfolio/"
        class="text-xs font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
      >
        <i class="bi bi-arrow-left"></i>
        Portafolio
      </a>
    </header>

    <!-- Main Hero Card -->
    <main class="w-full max-w-4xl mx-auto my-auto py-8">
      <div class="bg-[#1f2c34]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <!-- Background accent glow -->
        <div class="absolute -top-24 -right-24 w-72 h-72 bg-[#25d366]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-24 -left-24 w-72 h-72 bg-[#128c7e]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10 text-center max-w-2xl mx-auto mb-8">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#25d366]/10 border border-[#25d366]/20 text-[#25d366] text-xs font-semibold mb-4">
            <i class="bi bi-shield-check"></i>
            100% Privado y Seguro — Todo se procesa en tu navegador
          </div>
          <h2 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Revive tus conversaciones como en WhatsApp
          </h2>
          <p class="text-gray-300 text-sm sm:text-base leading-relaxed">
            Sube el archivo <strong class="text-white">.ZIP</strong> que genera WhatsApp al exportar tu chat. Visualiza fotos, audios, stickers, contactos y mensajes en una interfaz interactiva.
          </p>
        </div>

        <!-- Drag & Drop Zone -->
        <div
          class="relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer group"
          :class="[
            isDragging
              ? 'border-[#25d366] bg-[#25d366]/10 scale-[1.01]'
              : 'border-white/20 hover:border-[#25d366]/60 bg-[#111b21]/70 hover:bg-[#111b21]/90',
            isLoading ? 'pointer-events-none opacity-70' : ''
          ]"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleFileDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInputRef"
            type="file"
            accept=".zip,application/zip"
            class="hidden"
            @change="handleFileInputChange"
          />

          <!-- Loading state -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-4">
            <div class="w-14 h-14 rounded-full border-4 border-[#25d366]/30 border-t-[#25d366] animate-spin mb-4"></div>
            <p class="text-white font-semibold text-lg">{{ loadingStatus || 'Leyendo archivo ZIP...' }}</p>
            <p class="text-gray-400 text-xs mt-1">Extrayendo historial y archivos multimedia</p>
          </div>

          <!-- Normal drop state -->
          <div v-else class="flex flex-col items-center justify-center">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#25d366]/20 to-[#128c7e]/20 border border-[#25d366]/30 flex items-center justify-center text-[#25d366] mb-5 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#25d366]/20 transition-all">
              <i class="bi bi-file-earmark-zip text-4xl"></i>
            </div>

            <h3 class="text-lg sm:text-xl font-bold text-white mb-2">
              Arrastra tu archivo <span class="text-[#25d366]">.ZIP</span> aquí
            </h3>
            <p class="text-gray-400 text-xs sm:text-sm max-w-md mb-6">
              O haz clic en cualquier parte de este recuadro para seleccionar el archivo exportado desde tu dispositivo.
            </p>

            <button
              type="button"
              class="px-6 py-3 rounded-full bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-bold text-sm shadow-lg shadow-[#25d366]/25 hover:shadow-[#25d366]/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              @click.stop="triggerFileInput"
            >
              <i class="bi bi-folder-plus text-base"></i>
              Seleccionar archivo ZIP
            </button>
          </div>
        </div>

        <!-- Or try demo button -->
        <div class="mt-6 flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10 text-xs text-gray-400">
          <span>¿No tienes un ZIP a la mano?</span>
          <button
            type="button"
            class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-all flex items-center gap-2 hover:scale-102 border border-white/15"
            @click="$emit('load-demo')"
          >
            <i class="bi bi-play-circle-fill text-[#25d366]"></i>
            Probar con chat de demostración
          </button>
        </div>
      </div>

      <!-- Quick How-To Instructions -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div class="bg-[#1f2c34]/50 border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
          <div class="w-8 h-8 rounded-xl bg-[#25d366]/20 text-[#25d366] font-bold text-sm flex items-center justify-center shrink-0">1</div>
          <div>
            <h4 class="text-white font-semibold text-xs mb-1">Exportar en WhatsApp</h4>
            <p class="text-gray-400 text-xs leading-relaxed">
              Abre el chat > Más opciones (⋮) > Más > <strong>Exportar chat</strong> > Selecciona <em>"Incluir archivos"</em>.
            </p>
          </div>
        </div>

        <div class="bg-[#1f2c34]/50 border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
          <div class="w-8 h-8 rounded-xl bg-[#25d366]/20 text-[#25d366] font-bold text-sm flex items-center justify-center shrink-0">2</div>
          <div>
            <h4 class="text-white font-semibold text-xs mb-1">Seleccionar archivo maestro</h4>
            <p class="text-gray-400 text-xs leading-relaxed">
              La herramienta detecta los archivos <strong>.txt</strong> dentro del ZIP para que elijas el chat que deseas leer.
            </p>
          </div>
        </div>

        <div class="bg-[#1f2c34]/50 border border-white/5 rounded-2xl p-4 flex gap-3 items-start">
          <div class="w-8 h-8 rounded-xl bg-[#25d366]/20 text-[#25d366] font-bold text-sm flex items-center justify-center shrink-0">3</div>
          <div>
            <h4 class="text-white font-semibold text-xs mb-1">Elige tu protagonista</h4>
            <p class="text-gray-400 text-xs leading-relaxed">
              Selecciona quién eres tú para que tus burbujas aparezcan a la derecha en verde y las demás a la izquierda.
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="w-full max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 py-4 text-xs text-gray-500 border-t border-white/5 mt-8 shrink-0">
      <p>NekomiSystems — WhatsApp Reader. Creado con Vue 3 & Tailwind CSS.</p>
      <button
        type="button"
        class="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-white/5 opacity-70 hover:opacity-100"
        title="Acceder al sistema"
        @click="$emit('open-login')"
      >
        <i class="bi bi-box-arrow-in-right text-xs"></i>
        <span>Acceder</span>
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  isLoading: boolean
  loadingStatus: string
}>()

const emit = defineEmits<{
  (e: 'file-selected', file: File): void
  (e: 'load-demo'): void
  (e: 'open-login'): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileInputChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('file-selected', target.files[0])
    target.value = ''
  }
}

function handleFileDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file.name.toLowerCase().endsWith('.zip') || file.type.includes('zip')) {
      emit('file-selected', file)
    } else {
      alert('Por favor selecciona un archivo comprimido .ZIP.')
    }
  }
}
</script>
