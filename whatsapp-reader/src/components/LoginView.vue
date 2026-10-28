<template>
  <div class="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 bg-gradient-to-b from-[#0b141a] via-[#111b21] to-[#0c1317] text-white overflow-y-auto select-none">
    <!-- Header -->
    <header class="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
      <div class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#25d366] to-[#128c7e] flex items-center justify-center shadow-lg shadow-[#25d366]/20">
          <i class="bi bi-whatsapp text-2xl text-white"></i>
        </div>
        <div>
          <h1 class="font-bold text-lg tracking-tight">WhatsApp Reader</h1>
          <p class="text-xs text-gray-400">Portal de acceso</p>
        </div>
      </div>

      <button
        type="button"
        class="text-xs font-medium text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-1.5"
        @click="$emit('back')"
      >
        <i class="bi bi-arrow-left"></i>
        Volver al inicio
      </button>
    </header>

    <!-- Main Login Card -->
    <main class="w-full max-w-md mx-auto my-auto py-8">
      <div class="bg-[#1f2c34]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <!-- Background accent glow -->
        <div class="absolute -top-20 -right-20 w-52 h-52 bg-[#25d366]/15 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -bottom-20 -left-20 w-52 h-52 bg-[#128c7e]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="relative z-10">
          <!-- Icon & Heading -->
          <div class="text-center mb-6">
            <div class="w-14 h-14 rounded-2xl bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/30 flex items-center justify-center text-2xl mx-auto mb-3 shadow-md shadow-[#25d366]/10">
              <i class="bi bi-person-lock"></i>
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Iniciar Sesión</h2>
            <p class="text-gray-400 text-xs mt-1">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          <!-- Generic Form (Pure UI) -->
          <form class="space-y-4" @submit.prevent="handleSubmit">
            <!-- Email / User Input -->
            <div>
              <label class="block text-xs font-semibold text-gray-300 mb-1.5">
                Correo electrónico o usuario
              </label>
              <div class="relative flex items-center">
                <i class="bi bi-envelope absolute left-3.5 text-gray-400 text-sm"></i>
                <input
                  v-model="email"
                  type="text"
                  placeholder="usuario@ejemplo.com"
                  autocomplete="username"
                  class="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111b21] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-hidden focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366] transition-all"
                />
              </div>
            </div>

            <!-- Password Input -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-semibold text-gray-300">
                  Contraseña
                </label>
                <a href="#" class="text-[11px] text-[#25d366] hover:underline" @click.prevent>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div class="relative flex items-center">
                <i class="bi bi-lock absolute left-3.5 text-gray-400 text-sm"></i>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  class="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#111b21] border border-white/10 text-white text-xs placeholder-gray-500 focus:outline-hidden focus:border-[#25d366] focus:ring-1 focus:ring-[#25d366] transition-all"
                />
                <button
                  type="button"
                  class="absolute right-3 text-gray-400 hover:text-white transition-colors"
                  @click="showPassword = !showPassword"
                >
                  <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
            </div>

            <!-- Remember me checkbox -->
            <div class="flex items-center gap-2 pt-1">
              <input
                id="rememberMe"
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 rounded-md bg-[#111b21] border border-white/20 text-[#25d366] accent-[#25d366] cursor-pointer"
              />
              <label for="rememberMe" class="text-xs text-gray-400 cursor-pointer">
                Recordarme en este equipo
              </label>
            </div>

            <!-- Submit button -->
            <button
              type="submit"
              class="w-full py-3 rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-bold text-xs shadow-lg shadow-[#25d366]/20 hover:shadow-[#25d366]/35 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2"
            >
              <span>Acceder</span>
              <i class="bi bi-arrow-right"></i>
            </button>
          </form>

          <!-- Divider -->
          <div class="relative my-6 text-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
            <span class="relative px-3 bg-[#1f2c34] text-[11px] text-gray-500">
              o accede con
            </span>
          </div>

          <!-- Social buttons (pure UI) -->
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              @click.prevent
            >
              <i class="bi bi-google"></i>
              <span>Google</span>
            </button>
            <button
              type="button"
              class="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              @click.prevent
            >
              <i class="bi bi-meta"></i>
              <span>Meta</span>
            </button>
          </div>

          <!-- Subtle disclaimer note -->
          <p class="text-[10px] text-gray-500 text-center mt-6">
            <i class="bi bi-info-circle mr-1"></i>
            Interfaz de autenticación de demostración.
          </p>
        </div>
      </div>

      <!-- Back link below card -->
      <div class="text-center mt-4">
        <button
          type="button"
          class="text-xs text-gray-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          @click="$emit('back')"
        >
          <i class="bi bi-arrow-left"></i>
          <span>Volver al lector de chats</span>
        </button>
      </div>
    </main>

    <!-- Footer -->
    <footer class="w-full max-w-5xl mx-auto text-center py-4 text-xs text-gray-500 border-t border-white/5">
      <p>NekomiSystems — WhatsApp Reader. Creado con Vue 3 & Tailwind CSS.</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{
  (e: 'back'): void
}>()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const showPassword = ref(false)

function handleSubmit() {
  // Pure UI - non functional for now as requested
  alert('Interfaz de demostración: Función de login no implementada.')
}
</script>
