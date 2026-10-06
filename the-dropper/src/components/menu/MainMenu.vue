<template>
  <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8 pointer-events-auto select-none">
    <!-- Center Column -->
    <div class="flex flex-col items-center text-center max-w-4xl w-full">
      
      <!-- Logo Container with water/glass caustics glow -->
      <div class="relative group mb-8 md:mb-12 flex flex-col items-center">
        <!-- Diffuse glass glow backdrop -->
        <div
          class="absolute -inset-10 bg-gradient-to-r from-cyan-500/10 via-white/5 to-blue-500/10 rounded-full blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"
        ></div>

        <!-- Prominent Logotype -->
        <div class="relative px-6 py-4 flex items-center justify-center">
          <img
            :src="logoLight"
            alt="The Dropper Logo"
            class="w-full max-w-[340px] sm:max-w-[480px] md:max-w-[620px] lg:max-w-[720px] h-auto object-contain filter drop-shadow-[0_10px_35px_rgba(255,255,255,0.12)] transition-transform duration-700 ease-out group-hover:scale-[1.01]"
          />
        </div>

        <!-- Architectural Monolithic Tagline -->
        <div class="flex items-center space-x-3 mt-3">
          <span class="h-[1px] w-8 md:w-16 bg-gradient-to-r from-transparent to-white/30"></span>
          <p class="text-[10px] md:text-xs font-mono uppercase tracking-[0.35em] text-white/50">
            SANDBOX DE FÍSICAS & ARQUITECTURA CINÉTICA
          </p>
          <span class="h-[1px] w-8 md:w-16 bg-gradient-to-l from-transparent to-white/30"></span>
        </div>
      </div>

      <!-- Navigation Menu: Pure typography at rest, liquid glass blur on hover -->
      <nav class="flex flex-col items-center space-y-3 sm:space-y-4 md:space-y-5 w-full max-w-lg">
        <!-- 01 // JUGAR (Highlighted & Prominent) -->
        <div class="w-full flex justify-center py-1">
          <BrutalistNavButton
            label="JUGAR"
            index="01"
            :is-primary="true"
            @click="navigateToModes"
          />
        </div>

        <!-- Divider with subtle coordinates -->
        <div class="w-48 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent my-1"></div>

        <!-- Secondary Menu Options -->
        <div class="flex flex-col sm:flex-row sm:space-x-2 items-center justify-center w-full">
          <BrutalistNavButton
            label="CASILLERO"
            index="02"
            @click="navigateToLocker"
          />

          <BrutalistNavButton
            label="AJUSTES"
            index="03"
            @click="navigateToSettings"
          />

          <BrutalistNavButton
            label="CRÉDITOS"
            index="04"
            @click="openModal('credits')"
          />
        </div>
      </nav>

      <!-- Bottom Hint / Physics Sandbox Motto -->
      <div class="mt-14 md:mt-20 flex flex-col items-center space-y-2 pointer-events-none">
        <div class="px-6 py-2 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md">
          <p class="text-[10px] font-mono tracking-[0.25em] text-white/40 uppercase">
            ESTRUCTURAS · GRAVEDAD · EQUILIBRIO
          </p>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup lang="ts">
import BrutalistNavButton from '../ui/BrutalistNavButton.vue';
import { openModal, navigateToModes, navigateToLocker, navigateToSettings } from '../../state/gameStore';
import logoLight from '../../../logo_light.png';
</script>
