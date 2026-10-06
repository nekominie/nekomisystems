<template>
  <GlassModal
    :is-open="activeModal === 'credits'"
    title="Créditos // Manifiesto & Autoría"
    system-code="PROTOCOL 04 // ARCHIVE"
    @close="closeModal"
  >
    <div class="space-y-8 max-w-2xl mx-auto text-center py-4">
      <!-- Title & Branding -->
      <div>
        <h3 class="text-2xl font-light text-white font-['Syne',sans-serif] tracking-[0.3em] uppercase">
          THE DROPPER
        </h3>
        <p class="text-xs font-mono text-cyan-400 mt-2 tracking-[0.2em]">
          UN PROYECTO DE NEKOMISYSTEMS
        </p>
      </div>

      <!-- Manifest Statement -->
      <blockquote class="p-6 rounded-2xl bg-white/[0.02] border border-white/10 text-xs md:text-sm font-light text-white/70 italic leading-relaxed">
        "El brutalismo no es simple frialdad; es la honestidad de la materia sin artificios. En The Dropper, cada viga, plano inclinado y trayectoria gravitatoria expone la pureza de la física y la arquitectura."
      </blockquote>

      <!-- Production Roles -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left font-mono text-xs">
        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span class="text-[10px] text-white/30 uppercase tracking-widest block">DIRECCIÓN & CONCEPTO</span>
          <span class="text-white text-sm font-['Syne',sans-serif]">NekomiSystems</span>
          <span class="text-white/40 block text-[11px]">Software creado por pasión, no por dinero.</span>
        </div>

        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span class="text-[10px] text-white/30 uppercase tracking-widest block">MOTOR 3D & FÍSICAS</span>
          <span class="text-white text-sm font-['Syne',sans-serif]">Three.js & Cannon.es</span>
          <span class="text-white/40 block text-[11px]">Simulación cinemática y renderizado PBR.</span>
        </div>

        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span class="text-[10px] text-white/30 uppercase tracking-widest block">ARQUITECTURA DE INTERFAZ</span>
          <span class="text-white text-sm font-['Syne',sans-serif]">Vue 3 + Vite</span>
          <span class="text-white/40 block text-[11px]">Tailwind CSS con Glassmorphism & Caústicas.</span>
        </div>

        <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
          <span class="text-[10px] text-white/30 uppercase tracking-widest block">MOTOR ACÚSTICO</span>
          <span class="text-white text-sm font-['Syne',sans-serif]">Web Audio API</span>
          <span class="text-white/40 block text-[11px]">Síntesis procedural de armónicos de vidrio.</span>
        </div>
      </div>

      <div class="pt-4 text-[11px] font-mono text-white/30">
        © 2026 NekomiSystems. Todos los derechos reservados.
      </div>
    </div>
  </GlassModal>
</template>

<script setup lang="ts">
import GlassModal from '../ui/GlassModal.vue';
import { activeModal, closeModal } from '../../state/gameStore';
</script>
