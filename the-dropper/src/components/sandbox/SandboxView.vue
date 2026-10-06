<template>
  <div
    class="relative w-full h-[100dvh] overflow-hidden select-none bg-[#0c2e63]"
  >
    <!-- 1. Real-time 3D Sandbox Scene (Celestial Skybox, Sun, Cloud Deck, Platform, OrbitControls & Physics) -->
    <SandboxScene
      ref="sceneRef"
      @select-item="onSelectItem"
      @update-stats="onUpdateStats"
      @update-spawn-height="(h) => spawnHeight = h"
      @update-platform-config="onUpdatePlatformConfig"
    />

    <!-- 2. Top Navigation & Quick Controls Bar -->
    <header class="absolute top-0 left-0 right-0 z-30 px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between pointer-events-auto">
      <div class="flex items-center space-x-3 sm:space-x-4">
        <button
          type="button"
          class="group relative inline-flex items-center space-x-2 py-2 px-3.5 sm:px-4 rounded-full text-xs font-mono tracking-[0.2em] text-white/70 hover:text-white transition-all duration-300 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/15 hover:border-white/30 cursor-pointer shadow-lg"
          title="Regresar a la selección de mundos"
          @click="onExitToWorlds"
          @mouseenter="sound.playHover(0.04)"
        >
          <i class="bi bi-arrow-left text-xs transition-transform duration-300 group-hover:-translate-x-1"></i>
          <span class="uppercase">MUNDOS</span>
        </button>

        <!-- Sandbox Title & Active World Name -->
        <div class="flex flex-col">
          <div class="flex items-center space-x-2">
            <h1 class="text-xs sm:text-sm font-semibold text-white uppercase font-['Syne',sans-serif] tracking-[0.15em] line-clamp-1 max-w-[160px] sm:max-w-xs">
              {{ activeWorld?.name || 'Mundo Sandbox' }}
            </h1>
            <!-- Unsaved Badge -->
            <span
              v-if="hasUnsavedChanges"
              class="px-2 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/40 animate-pulse flex items-center space-x-1 shrink-0"
              title="Hay cambios sin guardar (pulsa Guardar o Ctrl+S)"
            >
              <i class="bi bi-circle-fill text-[6px]"></i>
              <span class="hidden sm:inline">Sin guardar</span>
            </span>
            <span
              v-else-if="lastSavedTime"
              class="hidden lg:inline px-2 py-0.5 rounded-full text-[9px] font-mono bg-white/5 text-white/40 border border-white/10 shrink-0"
            >
              Guardado en Dexie
            </span>
          </div>
          <span class="text-[9px] sm:text-[10px] font-mono text-cyan-400/80 tracking-[0.15em] uppercase">
            LABORATORIO LIBRE // VACÍO CELESTIAL
          </span>
        </div>
      </div>

      <!-- Center: Modo Construcción Toggle & Stats -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        <!-- Modo Construcción Switch Button -->
        <button
          type="button"
          class="relative inline-flex items-center space-x-2 py-1.5 sm:py-2 px-3.5 sm:px-4 rounded-full text-[11px] sm:text-xs font-mono tracking-[0.18em] transition-all duration-300 border cursor-pointer shadow-lg backdrop-blur-xl"
          :class="[
            isBuildMode
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_20px_rgba(13,240,212,0.25)] hover:bg-cyan-500/30'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.25)] hover:bg-emerald-500/30'
          ]"
          :title="isBuildMode ? 'Cambiar a Modo Simulación (oculta catálogos y bloquea piezas)' : 'Activar Modo Construcción para editar piezas'"
          @click="toggleBuildMode"
          @mouseenter="sound.playHover(0.04)"
        >
          <i :class="isBuildMode ? 'bi bi-tools text-cyan-400' : 'bi bi-play-circle-fill text-emerald-400'"></i>
          <span class="uppercase font-semibold hidden sm:inline">
            {{ isBuildMode ? 'MODO CONSTRUCCIÓN' : 'MODO SIMULACIÓN' }}
          </span>
          <span class="sm:hidden uppercase font-semibold">
            {{ isBuildMode ? 'CONSTRUIR' : 'SIMULAR' }}
          </span>
          <span
            class="w-2 h-2 rounded-full"
            :class="isBuildMode ? 'bg-cyan-400 shadow-[0_0_8px_#0df0d4]' : 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse'"
          ></span>
        </button>

        <!-- Stats Pill -->
        <div class="hidden lg:flex items-center space-x-3 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 text-[11px] font-mono text-white/50">
          <span>PIEZAS: <strong class="text-white font-normal">{{ stats.items }}</strong></span>
          <span>|</span>
          <span>ESFERAS: <strong class="text-cyan-300 font-normal">{{ stats.balls }}</strong></span>
          <span>|</span>
          <span class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full" :class="stats.isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'"></span>
            <span>{{ stats.isPaused ? 'PAUSA' : 'ACTIVO' }}</span>
          </span>
        </div>
      </div>

      <!-- Quick scene controls -->
      <div class="flex items-center space-x-2">
        <!-- Save World Button -->
        <button
          type="button"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center space-x-1.5 backdrop-blur-xl shadow-lg"
          :class="[
            hasUnsavedChanges
              ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/60 shadow-[0_0_15px_rgba(13,240,212,0.35)] hover:bg-cyan-500/40'
              : 'bg-black/40 text-white/70 hover:text-white border-white/10 hover:border-white/25'
          ]"
          :title="'Guardar estado del mundo en Dexie (Ctrl+S)'"
          @click="onSaveWorld()"
        >
          <i
            :class="[
              isSaving
                ? 'bi bi-arrow-repeat animate-spin text-cyan-400'
                : hasUnsavedChanges
                ? 'bi bi-floppy-fill text-cyan-400'
                : 'bi bi-floppy text-white/60'
            ]"
          ></i>
          <span class="hidden sm:inline text-[10px] uppercase tracking-wider font-semibold">
            {{ isSaving ? 'Guardando...' : hasUnsavedChanges ? 'Guardar' : 'Guardado' }}
          </span>
        </button>

        <!-- Floor / Platform Settings Button -->
        <button
          type="button"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 hover:border-cyan-400/50 text-xs font-mono transition-all cursor-pointer flex items-center space-x-1.5"
          :class="[
            platformConfig.isInfinite
              ? 'text-emerald-300 border-emerald-400/40 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
              : 'text-white/80 hover:text-white'
          ]"
          title="Ajustar tamaño del piso o activar suelo infinito"
          @click="showFloorModal = true"
        >
          <i :class="platformConfig.isInfinite ? 'bi bi-infinity text-emerald-400' : 'bi bi-bounding-box text-cyan-400'"></i>
          <span class="hidden sm:inline text-[10px] uppercase tracking-wider font-semibold">
            {{ platformConfig.isInfinite ? 'Suelo Infinito' : `Suelo: ${platformConfig.width}×${platformConfig.depth}m` }}
          </span>
        </button>

        <button
          type="button"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 hover:border-white/25 text-xs font-mono text-white/70 hover:text-white transition-all cursor-pointer flex items-center space-x-1.5"
          title="Restablecer posición de la cámara"
          @click="sceneRef?.resetCamera()"
        >
          <i class="bi bi-camera-video text-xs"></i>
          <span class="hidden sm:inline text-[10px] uppercase tracking-wider">Cámara</span>
        </button>

        <button
          type="button"
          class="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 hover:border-rose-400/40 text-xs font-mono text-rose-300/80 hover:text-rose-200 transition-all cursor-pointer flex items-center space-x-1.5"
          title="Vaciar todo el escenario"
          @click="sceneRef?.clearAll()"
        >
          <i class="bi bi-trash3 text-xs"></i>
          <span class="hidden sm:inline text-[10px] uppercase tracking-wider">Vaciar</span>
        </button>
      </div>
    </header>

    <!-- 2.2 Time of day: sun position, sky color and lamp shadows follow this slider -->
    <div
      class="absolute top-20 left-4 sm:left-8 z-30 pointer-events-auto flex items-center space-x-2.5 px-3 py-1.5 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg"
    >
      <i :class="timeIcon" class="text-sm w-4 text-center"></i>
      <span class="font-mono text-[11px] text-white/80 w-10 tabular-nums">{{ timeLabel }}</span>
      <input
        v-model.number="timeOfDay"
        type="range"
        min="0"
        max="24"
        step="0.01"
        class="w-28 sm:w-44 accent-cyan-400 cursor-pointer"
        title="Hora del día"
        aria-label="Hora del día"
      />
      <button
        type="button"
        class="w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer"
        :class="timeAutoPlay ? 'bg-cyan-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'"
        :title="timeAutoPlay ? 'Detener el ciclo día/noche' : 'Reproducir ciclo día/noche'"
        @click="timeAutoPlay = !timeAutoPlay"
      >
        <i :class="timeAutoPlay ? 'bi bi-pause-fill' : 'bi bi-play-fill'"></i>
      </button>
    </div>

    <!-- 2.5 Floor 3D Gizmo Active HUD Banner -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div
        v-if="isPlatformGizmoActive && !activePlacementItem"
        class="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center space-x-3 px-4 py-2 rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-amber-400/50 shadow-[0_10px_35px_rgba(245,158,11,0.3)] text-xs font-mono text-white"
      >
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
          <span class="text-white/60 uppercase tracking-wider text-[11px]">ESTIRANDO SUELO:</span>
          <strong class="text-amber-300 font-bold uppercase tracking-wider">{{ platformConfig.width }}m × {{ platformConfig.depth }}m</strong>
        </div>
        <span class="text-white/20">|</span>
        <span class="text-white/70 text-[11px] hidden sm:inline">Arrastra las flechas del suelo en 3D para estirar</span>
        <button
          type="button"
          class="p-1 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs flex items-center space-x-1 cursor-pointer font-bold uppercase"
          @click="onTogglePlatformGizmo"
        >
          <i class="bi bi-check-lg"></i>
          <span>Listo</span>
        </button>
      </div>
    </transition>

    <!-- 3. Placement Tool Active HUD Banner -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-4 scale-95"
    >
      <div
        v-if="activePlacementItem"
        class="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center space-x-2.5 sm:space-x-3 px-3.5 sm:px-4 py-2 rounded-2xl bg-[#090d16]/90 backdrop-blur-2xl border border-cyan-400/50 shadow-[0_10px_35px_rgba(13,240,212,0.3)] text-xs font-mono text-white"
      >
        <div class="flex items-center space-x-2">
          <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#0df0d4]"></span>
          <span class="text-white/60 uppercase tracking-wider text-[11px]">
            {{ activePlacementItem.kind === 'ball' ? 'SOLTANDO:' : 'COLOCANDO:' }}
          </span>
          <strong class="text-cyan-300 font-bold uppercase tracking-wider">{{ activePlacementItem.name || activePlacementItem.shapeType }}</strong>
        </div>

        <span class="text-white/20">|</span>

        <!-- Drop Height Indicator with Mouse Wheel hint -->
        <div
          class="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-white/[0.08] border border-cyan-400/30 text-cyan-300 shadow-inner"
          title="Gira la rueda del mouse para subir o bajar la altura de caída"
        >
          <i class="bi bi-arrows-vertical text-cyan-400"></i>
          <span>ALTURA: <strong class="font-bold text-white">{{ spawnHeight.toFixed(1) }}m</strong></span>
          <span class="text-white/50 text-[10px] hidden sm:inline">[Rueda ↕]</span>
        </div>

        <span class="text-white/20">|</span>
        <span class="text-white/70 text-[11px] hidden lg:inline">Clic: Soltar · Clic der / Esc: Salir</span>

        <button
          type="button"
          class="p-1 px-2 rounded-lg bg-white/10 hover:bg-rose-500/25 text-white/70 hover:text-rose-300 transition-colors cursor-pointer text-xs flex items-center space-x-1"
          title="Cancelar colocación (Esc)"
          @click="clearPlacementItem"
        >
          <i class="bi bi-x-lg"></i>
          <span class="text-[10px] uppercase font-bold">Salir</span>
        </button>
      </div>
    </transition>

    <!-- 4. Floating Transform Toolbar (Only in Construction Mode when a piece is selected and not placing) -->
    <div
      v-if="selectedItem && isBuildMode && !activePlacementItem"
      class="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto"
    >
      <TransformToolbar
        :item="selectedItem"
        :active-mode="transformMode"
        :snap-enabled="snapEnabled"
        :spin-reversed="spinReversed"
        @set-mode="onSetTransformMode"
        @toggle-snap="onToggleSnap"
        @toggle-spin="onToggleSpin"
        @duplicate="sceneRef?.duplicateSelectedItem()"
        @delete="sceneRef?.deleteSelectedItem()"
        @deselect="sceneRef?.deleteSelectedItem"
      />
    </div>

    <!-- 5. Camera Navigation Tip Pill -->
    <div class="hidden sm:flex absolute top-20 right-6 z-20 pointer-events-none px-3.5 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/5 text-[9px] font-mono tracking-wider text-white/40">
      <span v-if="activePlacementItem">
        RUEDA: ALTURA [↕] · CLIC: SOLTAR · CLIC DER / ESC: CANCELAR
      </span>
      <span v-else-if="isBuildMode">
        HOVER: RESALTAR · CLIC IZQ: SELECCIONAR · PESTAÑA INFERIOR: CATÁLOGO
      </span>
      <span v-else class="text-emerald-300/80">
        MODO SIMULACIÓN · ELIGE ESFERAS PARA SOLTAR O DISFRUTA LA SIMULACIÓN
      </span>
    </div>

    <!--
      6. Bottom Dock: Architectural Shapes, Decoration & Physics Balls Catalogs.
      Collapsed by default into a small tab at the bottom edge. Hovering the tab opens the catalog,
      moving the mouse out closes it again, unless the pin button anchors it open.
      The footer itself ignores the pointer so it never blocks the 3D scene around the dock.
    -->
    <footer class="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none">
      <div
        class="pointer-events-auto flex flex-col items-center max-w-full px-4 sm:px-0"
        @mouseenter="onDockEnter"
        @mouseleave="onDockLeave"
      >
        <transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-4"
        >
        <div
          v-show="dockOpen"
          class="w-[min(56rem,calc(100vw-2rem))] mb-2 rounded-3xl bg-[#090d16]/85 backdrop-blur-2xl border border-white/12 p-3 sm:p-4 shadow-[0_25px_60px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.2)] flex flex-col space-y-3"
        >
          
          <!-- Dock Header: Tab Switcher & Physics Simulation Controls -->
          <div class="flex items-center justify-between border-b border-white/10 pb-2.5 px-2">
            
            <!-- Catalog Tab Switcher (Build Mode) or Simulation Badge (Sim Mode) -->
            <div v-if="isBuildMode" class="flex items-center space-x-2">
              <button
                type="button"
                class="px-4 py-1.5 rounded-xl text-xs font-mono tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer flex items-center space-x-2"
                :class="[
                  activeTab === 'shapes'
                    ? 'bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(13,240,212,0.4)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                ]"
                @click="onSwitchTab('shapes')"
              >
                <i class="bi bi-boxes"></i>
                <span>Piezas de Concreto</span>
              </button>

              <button
                type="button"
                class="px-4 py-1.5 rounded-xl text-xs font-mono tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer flex items-center space-x-2"
                :class="[
                  activeTab === 'balls'
                    ? 'bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(13,240,212,0.4)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                ]"
                @click="onSwitchTab('balls')"
              >
                <i class="bi bi-circle"></i>
                <span>Esferas & Físicas</span>
              </button>

              <button
                type="button"
                class="px-4 py-1.5 rounded-xl text-xs font-mono tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer flex items-center space-x-2"
                :class="[
                  activeTab === 'decor'
                    ? 'bg-cyan-400 text-black font-bold shadow-[0_0_15px_rgba(13,240,212,0.4)]'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                ]"
                @click="onSwitchTab('decor')"
              >
                <i class="bi bi-flower2"></i>
                <span>Decoración</span>
              </button>
            </div>

            <!-- In Simulation Mode: display sleek spawner header -->
            <div v-else class="flex items-center space-x-2.5 px-2 py-1">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
              <span class="text-xs font-mono tracking-[0.15em] text-emerald-300 uppercase font-semibold">
                LANZADOR DE ESFERAS // MODO SIMULACIÓN
              </span>
            </div>

            <!-- Dock pin + Physics Play/Pause & Reset Actions -->
            <div class="flex items-center space-x-1.5">
              <button
                type="button"
                class="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5 border"
                :class="[
                  dockPinned
                    ? 'bg-cyan-400 text-black font-bold border-cyan-300 shadow-[0_0_15px_rgba(13,240,212,0.4)]'
                    : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/20 border-transparent',
                ]"
                :title="dockPinned ? 'Desanclar: el catálogo se ocultará al sacar el mouse' : 'Anclar el catálogo para mantenerlo siempre visible'"
                :aria-pressed="dockPinned"
                @click="toggleDockPin"
              >
                <i :class="dockPinned ? 'bi bi-pin-angle-fill' : 'bi bi-pin-angle'"></i>
                <span class="hidden md:inline">{{ dockPinned ? 'Anclado' : 'Anclar' }}</span>
              </button>

              <button
                type="button"
                class="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-1.5"
                :class="[
                  stats.isPaused
                    ? 'bg-amber-400 text-black font-bold shadow-[0_0_15px_rgba(251,191,36,0.5)]'
                    : 'bg-white/10 text-white hover:bg-white/20',
                ]"
                :title="stats.isPaused ? 'Reanudar simulación de físicas' : 'Pausar físicas'"
                @click="sceneRef?.togglePhysics()"
              >
                <i :class="stats.isPaused ? 'bi bi-play-fill' : 'bi bi-pause-fill'"></i>
                <span class="hidden sm:inline">{{ stats.isPaused ? 'Reanudar' : 'Pausar' }}</span>
              </button>

              <button
                type="button"
                class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                title="Reiniciar posición de las esferas"
                @click="sceneRef?.resetBalls()"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
              </button>

              <button
                type="button"
                class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-white/50 hover:text-rose-300 text-xs font-mono transition-colors cursor-pointer"
                title="Limpiar esferas del escenario"
                @click="sceneRef?.clearBalls()"
              >
                <i class="bi bi-trash3"></i>
              </button>
            </div>

          </div>

          <!-- Sub-bar for Balls: Auto-Spawn toggle and Speed/Cadence selector -->
          <div
            v-if="activeTab === 'balls'"
            class="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-2xl bg-white/[0.03] border border-white/8 text-xs font-mono"
          >
            <div class="flex items-center space-x-3">
              <button
                type="button"
                class="px-3 py-1 rounded-xl text-[11px] font-mono tracking-wider uppercase transition-all flex items-center space-x-2 cursor-pointer"
                :class="[
                  isAutoSpawnOn
                    ? 'bg-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                    : 'bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                ]"
                @click="toggleAutoSpawn"
              >
                <i :class="isAutoSpawnOn ? 'bi bi-lightning-charge-fill animate-pulse' : 'bi bi-lightning-charge'"></i>
                <span>{{ isAutoSpawnOn ? 'AUTO-SPAWN: ACTIVO' : 'AUTO-SPAWN: APAGADO' }}</span>
              </button>

              <span class="hidden sm:inline text-white/40 text-[10px]">
                {{ isAutoSpawnOn ? 'Generando flujo continuo' : 'Spawnea solo 1 esfera al hacer clic' }}
              </span>
            </div>

            <!-- Speed / Interval Selector -->
            <div class="flex items-center space-x-2">
              <span class="text-white/50 text-[10px] uppercase">Cadencia:</span>
              <div class="flex items-center space-x-1 bg-black/40 rounded-xl p-0.5 border border-white/10">
                <button
                  v-for="rate in [
                    { label: '0.3s', val: 0.3 },
                    { label: '0.8s', val: 0.8 },
                    { label: '1.5s', val: 1.5 },
                    { label: '3.0s', val: 3.0 }
                  ]"
                  :key="rate.val"
                  type="button"
                  class="px-2 py-0.5 rounded-lg text-[10px] font-mono transition-colors cursor-pointer"
                  :class="[
                    autoSpawnInterval === rate.val
                      ? 'bg-cyan-400 text-black font-bold'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  ]"
                  @click="onSetAutoSpawnInterval(rate.val)"
                >
                  {{ rate.label }}
                </button>
              </div>
            </div>
          </div>

          <!-- Catalog Body (Shapes vs Balls) -->
          <div class="px-1">
            <ShapesCatalog
              v-if="isBuildMode && activeTab === 'shapes'"
              @spawn="onSpawnShape"
            />

            <DecorCatalog
              v-else-if="isBuildMode && activeTab === 'decor'"
            />

            <BallsCatalog
              v-else-if="activeTab === 'balls' || !isBuildMode"
              @spawn="onSpawnBall"
            />
          </div>

        </div>
        </transition>

        <!-- Dock tab: always visible at the bottom edge; hovering it opens the catalog -->
        <div
          class="flex items-center space-x-2 h-8 pl-3 pr-1.5 rounded-t-2xl border border-b-0 backdrop-blur-xl select-none transition-colors duration-200"
          :class="dockOpen ? 'bg-[#090d16]/90 border-white/15' : 'bg-black/55 hover:bg-black/70 border-white/15'"
          @pointerdown="onDockTabPointerDown"
        >
          <i
            class="bi bi-chevron-up text-[10px] text-white/60 transition-transform duration-200"
            :class="dockOpen ? 'rotate-180' : ''"
          ></i>
          <span class="text-[10px] font-mono tracking-[0.2em] uppercase text-white/70">
            {{ isBuildMode ? 'Catálogo' : 'Esferas' }}
          </span>
          <i
            v-if="dockPinned"
            class="bi bi-pin-angle-fill text-[10px] text-cyan-300"
            title="Catálogo anclado"
          ></i>
          <!-- Physics pause stays reachable while the catalog is hidden -->
          <button
            type="button"
            class="w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer"
            :class="stats.isPaused ? 'bg-amber-400 text-black' : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'"
            :title="stats.isPaused ? 'Reanudar simulación de físicas' : 'Pausar físicas'"
            @click.stop="sceneRef?.togglePhysics()"
          >
            <i :class="stats.isPaused ? 'bi bi-play-fill' : 'bi bi-pause-fill'"></i>
          </button>
        </div>
      </div>
    </footer>

    <!-- 7. Floor Settings & Infinite Plane Modal -->
    <FloorSettingsModal
      :is-open="showFloorModal"
      :config="platformConfig"
      :is-gizmo-active="isPlatformGizmoActive"
      @close="showFloorModal = false"
      @update-config="onSetPlatformConfig"
      @toggle-gizmo="onTogglePlatformGizmo"
    />

    <!-- 8. Floating Save Notification Toast -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-4 scale-95"
    >
      <div
        v-if="saveToastMessage"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 py-2 rounded-2xl bg-[#090d16]/95 backdrop-blur-2xl border border-cyan-400/50 shadow-[0_10px_35px_rgba(13,240,212,0.3)] text-xs font-mono text-cyan-300 flex items-center space-x-2"
      >
        <i class="bi bi-check-circle-fill text-cyan-400 text-sm"></i>
        <span>{{ saveToastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import SandboxScene from './SandboxScene.vue';
import ShapesCatalog from './ShapesCatalog.vue';
import BallsCatalog from './BallsCatalog.vue';
import DecorCatalog from './DecorCatalog.vue';
import TransformToolbar from './TransformToolbar.vue';
import FloorSettingsModal from './FloorSettingsModal.vue';
import { navigateToMenu, navigateToSandboxWorlds } from '../../state/gameStore';
import {
  activeWorld,
  hasUnsavedChanges,
  isSaving,
  lastSavedTime,
  saveToastMessage,
  saveCurrentWorld,
  restoreActiveWorld,
} from '../../state/sandboxWorldStore';
import { activePlacementItem, clearPlacementItem } from '../../state/sandboxDragStore';
import { timeOfDay, timeAutoPlay, formatTime } from '../../state/sandboxEnvStore';
import type { SandboxItem, ShapeType, PlatformConfig } from '../../utils/sandboxPhysics';
import type { BallSkin } from '../../types/game';
import { sound } from '../../utils/sound';

const sceneRef = ref<InstanceType<typeof SandboxScene> | null>(null);

const timeLabel = computed(() => formatTime(timeOfDay.value));
const timeIcon = computed(() => {
  const h = timeOfDay.value;
  if (h < 5 || h >= 20) return 'bi bi-moon-stars-fill text-indigo-300';
  if (h < 7.5 || h >= 17.5) return 'bi bi-sunset-fill text-orange-300';
  return 'bi bi-sun-fill text-amber-300';
});

// ── Auto-hiding catalog dock ──
const DOCK_PIN_KEY = 'the_dropper_sandbox_dock_pinned_v1';
const DOCK_HIDE_DELAY_MS = 180;

function loadDockPinned(): boolean {
  try {
    return localStorage.getItem(DOCK_PIN_KEY) === '1';
  } catch {
    return false;
  }
}

/** When pinned the catalog stays open; otherwise it only shows while the mouse is over it */
const dockPinned = ref(loadDockPinned());
const dockHover = ref(false);
const dockOpen = computed(() => dockPinned.value || dockHover.value);
let dockLeaveTimer: ReturnType<typeof setTimeout> | null = null;

function clearDockLeaveTimer() {
  if (dockLeaveTimer) {
    clearTimeout(dockLeaveTimer);
    dockLeaveTimer = null;
  }
}

function onDockEnter() {
  clearDockLeaveTimer();
  dockHover.value = true;
}

function onDockLeave() {
  clearDockLeaveTimer();
  // Tiny grace period so crossing the gap between the tab and the panel never flickers
  dockLeaveTimer = setTimeout(() => {
    dockLeaveTimer = null;
    dockHover.value = false;
  }, DOCK_HIDE_DELAY_MS);
}

/** Touch screens have no hover: tapping the tab toggles the catalog instead */
function onDockTabPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse') return;
  clearDockLeaveTimer();
  dockHover.value = !dockHover.value;
}

function toggleDockPin() {
  dockPinned.value = !dockPinned.value;
  sound.playClick(0.08);
}

watch(dockPinned, (pinned) => {
  try {
    localStorage.setItem(DOCK_PIN_KEY, pinned ? '1' : '0');
  } catch {}
});

const isBuildMode = ref(true);
const activeTab = ref<'shapes' | 'balls' | 'decor'>('shapes');
const selectedItem = ref<SandboxItem | null>(null);
const spinReversed = ref(false);
const transformMode = ref<'translate' | 'rotate' | 'scale'>('translate');
const snapEnabled = ref<boolean>(false);
const spawnHeight = ref<number>(3.5);

// Floor / Platform State
const showFloorModal = ref(false);
const isPlatformGizmoActive = ref(false);
const platformConfig = ref<PlatformConfig>({
  width: 18,
  depth: 18,
  isInfinite: false,
});

const isAutoSpawnOn = ref(false);
const autoSpawnInterval = ref(0.8);

const stats = ref({
  items: 0,
  balls: 0,
  isPaused: false,
});

function onUpdatePlatformConfig(cfg: PlatformConfig) {
  platformConfig.value = { ...cfg };
}

function onSetPlatformConfig(cfg: PlatformConfig) {
  platformConfig.value = { ...cfg };
  sceneRef.value?.setPlatformSize(cfg.width, cfg.depth, cfg.isInfinite);
}

function onTogglePlatformGizmo() {
  isPlatformGizmoActive.value = !isPlatformGizmoActive.value;
  sceneRef.value?.enablePlatformGizmo(isPlatformGizmoActive.value);
  if (isPlatformGizmoActive.value) {
    showFloorModal.value = false;
  }
}

function toggleBuildMode() {
  isBuildMode.value = !isBuildMode.value;
  if (!isBuildMode.value) {
    if (activePlacementItem.value?.kind === 'shape') {
      clearPlacementItem();
    }
    activeTab.value = 'balls';
  }
  sceneRef.value?.setBuildMode(isBuildMode.value);
}

function onSwitchTab(tab: 'shapes' | 'balls' | 'decor') {
  activeTab.value = tab;
  clearPlacementItem();
}

function onSelectItem(item: SandboxItem | null) {
  selectedItem.value = item;
  spinReversed.value = Boolean(item?.reversed);
}

function onToggleSpin() {
  const reversed = sceneRef.value?.toggleSelectedSpin();
  if (reversed !== null && reversed !== undefined) spinReversed.value = reversed;
}

function onUpdateStats(newStats: { items: number; balls: number; isPaused: boolean }) {
  stats.value = newStats;
}

function toggleAutoSpawn() {
  isAutoSpawnOn.value = !isAutoSpawnOn.value;
  sceneRef.value?.setAutoSpawn(isAutoSpawnOn.value);
}

function onSetAutoSpawnInterval(val: number) {
  autoSpawnInterval.value = val;
  sceneRef.value?.setAutoSpawnInterval(val);
}

function onSpawnShape(type: ShapeType) {
  if (!isBuildMode.value) return;
  sceneRef.value?.spawnShape(type);
}

function onSpawnBall(skin: BallSkin) {
  sceneRef.value?.spawnBall(skin);
}

function onSetTransformMode(mode: 'translate' | 'rotate' | 'scale') {
  transformMode.value = mode;
  sceneRef.value?.setTransformMode(mode);
}

function onToggleSnap() {
  snapEnabled.value = !snapEnabled.value;
  sceneRef.value?.setSnap(snapEnabled.value);
  sound.playClick(0.08);
}

async function onSaveWorld(silent = false): Promise<boolean> {
  if (!sceneRef.value) return false;
  if (isSaving.value && silent) return true;
  const state = sceneRef.value.serializeWorldState();
  return await saveCurrentWorld(state, { silent });
}

async function onExitToWorlds() {
  clearAutoSaveDebounce();
  if (hasUnsavedChanges.value) {
    const ok = await onSaveWorld();
    // Never leave the world if the save failed, otherwise the changes would be lost
    if (!ok) return;
  }
  sound.playClick(0.1);
  sound.playModalTransition();
  navigateToSandboxWorlds();
}

function onWindowKeyDown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    onSaveWorld();
  }
}

let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
let autoSaveDebounce: ReturnType<typeof setTimeout> | null = null;

function clearAutoSaveDebounce() {
  if (autoSaveDebounce) {
    clearTimeout(autoSaveDebounce);
    autoSaveDebounce = null;
  }
}

// Debounced autosave: a couple of seconds after the first unsaved change
watch(hasUnsavedChanges, (dirty) => {
  clearAutoSaveDebounce();
  if (dirty) {
    autoSaveDebounce = setTimeout(() => {
      autoSaveDebounce = null;
      if (hasUnsavedChanges.value) onSaveWorld(true);
    }, 2500);
  }
});

/**
 * Flushes pending changes when the tab is hidden or closed. The localStorage
 * write inside saveWorld happens synchronously, so it survives the page unload.
 */
function flushPendingSave() {
  if (hasUnsavedChanges.value) {
    onSaveWorld(true);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'hidden') flushPendingSave();
}

onMounted(async () => {
  if (!activeWorld.value) {
    await restoreActiveWorld();
  }
  if (activeWorld.value?.platformConfig) {
    platformConfig.value = { ...activeWorld.value.platformConfig };
  }
  window.addEventListener('keydown', onWindowKeyDown);
  window.addEventListener('beforeunload', flushPendingSave);
  window.addEventListener('pagehide', flushPendingSave);
  document.addEventListener('visibilitychange', onVisibilityChange);
  // Safety-net periodic save
  autoSaveTimer = setInterval(() => {
    if (hasUnsavedChanges.value) {
      onSaveWorld(true);
    }
  }, 15000);
});

onBeforeUnmount(() => {
  // Parent beforeUnmount runs before the scene is destroyed, so we can still serialize it
  flushPendingSave();
  window.removeEventListener('keydown', onWindowKeyDown);
  window.removeEventListener('beforeunload', flushPendingSave);
  window.removeEventListener('pagehide', flushPendingSave);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  clearAutoSaveDebounce();
  clearDockLeaveTimer();
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
});
</script>
