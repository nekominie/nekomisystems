<template>
  <div class="relative flex flex-col items-center justify-center select-none pt-4 pb-2">
    <!-- Hazard caution strip accent above title -->
    <div class="flex items-center gap-3 mb-2 opacity-80">
      <div class="w-12 sm:w-20 h-1.5 hazard-stripes rounded-xs"></div>
      <span class="text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-red-500 font-bold flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block"></span>
        ALERTA BIOLÓGICA // PROTOCOLO DE AISLAMIENTO
      </span>
      <div class="w-12 sm:w-20 h-1.5 hazard-stripes rounded-xs"></div>
    </div>

    <!-- Main Title Container with Industrial Plaque Backing -->
    <div class="relative px-8 sm:px-14 py-3 sm:py-4">
      <!-- Metallic backing plate with rivets -->
      <div class="absolute inset-0 bg-gradient-to-b from-[#1c202a] via-[#10131a] to-[#0a0c10] border border-[#3b4356] rounded-sm shadow-[0_8px_35px_rgba(0,0,0,0.85)]">
        <!-- Corner Rivets -->
        <span class="rivet absolute top-2 left-2"></span>
        <span class="rivet absolute top-2 right-2"></span>
        <span class="rivet absolute bottom-2 left-2"></span>
        <span class="rivet absolute bottom-2 right-2"></span>
        <!-- Rusty scratch overlay lines -->
        <div class="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <!-- Blood Splatter Decal SVG positioned over title -->
      <svg
        class="absolute -top-3 -left-4 w-28 h-28 pointer-events-none opacity-85 text-red-700"
        viewBox="0 0 100 100"
        fill="currentColor"
      >
        <path d="M50 20 C45 35 30 38 28 50 C26 62 38 75 52 72 C66 69 75 55 70 40 C65 25 55 5 50 20 Z" />
        <circle cx="22" cy="35" r="4" />
        <circle cx="18" cy="48" r="2.5" />
        <circle cx="78" cy="38" r="3.5" />
        <circle cx="82" cy="52" r="5" />
        <circle cx="68" cy="78" r="3" />
        <path d="M52 72 Q54 88 56 95 Q57 97 58 95 Q60 85 58 72 Z" fill="#991b1b" />
      </svg>

      <!-- Blood Drips running down the title text -->
      <svg
        class="absolute -bottom-4 right-12 w-20 h-16 pointer-events-none opacity-90 text-red-600"
        viewBox="0 0 100 60"
        fill="currentColor"
      >
        <path d="M20 0 Q22 25 24 40 Q25 45 26 40 Q28 20 30 0 Z" />
        <circle cx="24.5" cy="42" r="3" />
        <path d="M60 0 Q62 35 64 50 Q65 55 66 50 Q68 30 70 0 Z" fill="#7f1d1d" />
        <circle cx="64.5" cy="52" r="3.5" fill="#7f1d1d" />
      </svg>

      <!-- The Typography: "Zombie game" -->
      <div class="relative z-10 flex flex-col items-center">
        <h1
          class="title-text text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-wider uppercase m-0 leading-tight select-none"
        >
          <span class="zombie-word">ZOMBIE</span>
          <span class="game-word ml-3 sm:ml-5">GAME</span>
        </h1>
        
        <!-- Subtitle plate -->
        <div class="flex items-center gap-2 mt-1 sm:mt-2">
          <span class="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-stone-400 font-semibold uppercase bg-black/60 px-2.5 py-0.5 border border-stone-700/80 rounded-xs">
            ISOMETRIC SURVIVAL HORROR // BUILD v0.1.0
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.title-text {
  font-family: 'Black Ops One', Impact, sans-serif;
  letter-spacing: 0.08em;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.9));
}

.zombie-word {
  background: linear-gradient(
    180deg,
    #ffffff 0%,
    #cbd5e1 35%,
    #991b1b 60%,
    #450a0a 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1.5px #1e222d;
  filter: drop-shadow(0 0 15px rgba(220, 38, 38, 0.6));
}

.game-word {
  background: linear-gradient(
    180deg,
    #f8fafc 0%,
    #94a3b8 45%,
    #475569 75%,
    #1e293b 100%
  );
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1.5px #0f172a;
  filter: drop-shadow(0 0 10px rgba(148, 163, 184, 0.3));
}
</style>
