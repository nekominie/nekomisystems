<template>
  <div class="fixed inset-0 pointer-events-none z-1 overflow-hidden select-none">
    <!-- Subtle liquid glass refraction glow behind central logo -->
    <div
      class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55vw] h-[28vw] max-w-[800px] max-h-[380px] rounded-[100%] bg-gradient-to-b from-white/[0.04] via-cyan-400/[0.02] to-transparent blur-[90px] animate-water-drift"
    ></div>

    <!-- Fine Brutalist Architectural Coordinate Lines & Framing -->
    <div class="absolute inset-4 sm:inset-6 md:inset-10 border border-white/[0.07] pointer-events-none rounded-3xl">
      <!-- Corner Crosshairs (+) -->
      <span class="absolute -top-1.5 -left-1.5 text-[10px] font-mono text-white/30 select-none">+</span>
      <span class="absolute -top-1.5 -right-1.5 text-[10px] font-mono text-white/30 select-none">+</span>
      <span class="absolute -bottom-1.5 -left-1.5 text-[10px] font-mono text-white/30 select-none">+</span>
      <span class="absolute -bottom-1.5 -right-1.5 text-[10px] font-mono text-white/30 select-none">+</span>

      <!-- Subtle Side Architectural Coordinates -->
      <div class="hidden lg:flex absolute top-1/2 -left-8 -translate-y-1/2 -rotate-90 text-[9px] font-mono tracking-[0.3em] text-white/30 uppercase whitespace-nowrap">
        WALL // BRUTALIST CONCRETE T-01
      </div>
      <div class="hidden lg:flex absolute top-1/2 -right-8 -translate-y-1/2 rotate-90 text-[9px] font-mono tracking-[0.3em] text-white/30 uppercase whitespace-nowrap">
        LIGHT: 42.5° AZIMUTH // SHADOW: PCF-2K
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes water-drift {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translate(-51%, -49%) scale(1.05);
    opacity: 0.8;
  }
}

.animate-water-drift {
  animation: water-drift 12s ease-in-out infinite;
}
</style>
