<template>
  <div class="fixed inset-0 z-40 bg-[#050608] flex flex-col">
    <!-- Top HUD Bar -->
    <header class="relative z-10 bg-black/80 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
        <span class="font-mono text-xs uppercase font-bold text-stone-200">
          MUNDO PROCEDURAL INFINITO // CÁMARA SUPERIOR
        </span>
        <span class="text-[10px] font-mono px-2 py-0.5 bg-stone-900 border border-stone-700 text-stone-400">
          WASD: Moverse | C: Sigilo / Normal | Shift: Correr | F: Interactuar (cajas, carros, bombas) | Espacio: freno de mano | Q/E: Rotar cámara | Rueda: Zoom | Clic: Disparar | R: Recargar | 1-5: Armas | G: Lanzar/plantar | H: Explosivo | T: Detonar C4 | L: Armas de prueba | N: Saltar día/noche | K: Nuevo mundo
        </span>
      </div>

      <button
        type="button"
        class="steel-btn px-4 py-1.5 text-xs font-mono font-bold uppercase text-stone-300 hover:text-white flex items-center gap-2"
        @click="isPaused = true"
      >
        <i class="bi bi-pause-fill"></i>
        <span>Pausar (ESC)</span>
      </button>
    </header>

    <!-- Canvas Container -->
    <div ref="container" class="relative flex-1 overflow-hidden">
      <canvas ref="gameCanvas" class="w-full h-full block cursor-crosshair"></canvas>
      
      <!-- Controles móviles -->
      <MobileControls 
        @move="handleMobileMove" 
        @aim="handleMobileAim" 
        @keyPress="handleMobileKey" 
        @keyState="handleMobileKeyState" 
      />

      <!-- Pause Menu Overlay -->
      <div v-if="isPaused" class="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
        <div class="bg-[#0f1115] border-2 border-stone-700 p-8 rounded shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center">
          <h2 class="text-3xl font-mono font-bold text-white mb-8 tracking-widest uppercase">PAUSA</h2>
          
          <div class="flex flex-col w-full gap-4">
            <button 
              @click="isPaused = false; gameCanvas?.requestPointerLock()" 
              class="w-full py-3 steel-btn text-lg font-bold text-stone-200 hover:text-white uppercase tracking-wider"
            >
              Reanudar
            </button>
            <button 
              @click="showSettings = true" 
              class="w-full py-3 steel-btn text-lg font-bold text-stone-200 hover:text-white uppercase tracking-wider"
            >
              Ajustes
            </button>
            <button 
              @click="exit" 
              class="w-full py-3 bg-red-900/40 border border-red-700/50 hover:bg-red-800/60 text-lg font-bold text-red-100 hover:text-white uppercase tracking-wider transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        <!-- Ajustes Overlay (dentro del menú de pausa) -->
        <div v-if="showSettings" class="absolute inset-0 bg-[#0f1115]/95 backdrop-blur-md flex items-center justify-center p-4">
          <div class="max-w-lg w-full bg-stone-900 border border-stone-700 p-6 rounded shadow-xl">
            <h3 class="text-2xl font-mono text-white mb-6">Ajustes</h3>
            <p class="text-stone-400 mb-6 font-mono">En desarrollo...</p>
            <button 
              @click="showSettings = false" 
              class="w-full py-2 steel-btn text-stone-200 hover:text-white uppercase font-bold"
            >
              Volver
            </button>
          </div>
        </div>
      </div>

      <!-- Menú de debug de armas y físicas (Tab). onDebugMouseDown evita que los botones roben el foco del teclado sin bloquear los sliders -->
      <div class="absolute top-3 right-4 z-30 flex flex-col items-end gap-2" @mousedown="onDebugMouseDown">
        <button
          type="button"
          class="px-3 py-1 text-[11px] font-mono font-bold uppercase border bg-black/80"
          :class="debugOpen ? 'border-yellow-500 text-yellow-300' : 'border-stone-600 text-stone-400 hover:text-white'"
          @click="debugOpen = !debugOpen"
        >
          Debug / Físicas (Tab)
        </button>

        <div
          v-if="debugOpen"
          class="w-84 max-h-[82vh] overflow-y-auto bg-black/90 border border-yellow-700/60 p-3 font-mono text-[11px] text-stone-300"
        >
          <div class="text-xs font-bold text-yellow-300 uppercase tracking-wider mb-2">Selector de armas</div>

          <div
            v-for="d in debugWeapons"
            :key="d.id"
            class="border p-2 mb-1.5 cursor-pointer transition-colors"
            :class="
              weaponHud.equippedId === d.id
                ? 'border-yellow-500 bg-yellow-900/30'
                : 'border-stone-700 hover:border-stone-400'
            "
            @click="debugGive(d.id)"
          >
            <div class="flex justify-between items-baseline">
              <span class="font-bold text-stone-100">{{ d.name }}</span>
              <span class="text-[10px] uppercase text-stone-500">{{ d.category }}</span>
            </div>
            <div class="text-[10px] text-stone-400 leading-snug mt-0.5">
              Daño {{ d.damage }}<span v-if="d.pellets > 1"> × {{ d.pellets }}</span> · {{ d.rpm }} RPM
              <span v-if="d.mag"> · cargador {{ d.mag }} · recarga {{ d.reload }} s</span>
              · alcance {{ d.range }} m · ruido {{ d.noise }} m · {{ d.auto ? 'automática' : 'semi' }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5 mt-3">
            <button type="button" class="border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugRefill">
              Munición completa
            </button>
            <button type="button" class="border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugGiveAll">
              Todas las armas
            </button>
            <button type="button" class="col-span-2 border border-orange-800 bg-orange-950/40 text-orange-200 py-1 hover:border-orange-400 hover:bg-orange-900/50" @click="debugRefillExplosives">
              🧨 Reponer explosivos
            </button>
            <button type="button" class="border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugSpawnZombies">
              +6 zombis (14 m)
            </button>
            <button type="button" class="border border-red-800 text-red-400 py-1 hover:border-red-500 hover:text-red-200" @click="debugSpawnExtreme">
              +1 Extremo (1%)
            </button>
            <button type="button" class="col-span-2 border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugClearZombies">
              Quitar zombis (60 m)
            </button>
            <button type="button" class="col-span-2 border border-stone-600 py-1 hover:border-red-500 hover:text-red-300" @click="debugReset">
              Reiniciar inventario (solo bate)
            </button>
          </div>

          <!-- Vehículos y Ajustes de Empuje Ragdoll -->
          <div class="mt-3 pt-2.5 border-t border-yellow-700/60">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-yellow-300 uppercase tracking-wider">Vehículo & Empuje Zombi</span>
              <button
                type="button"
                class="text-[10px] text-stone-400 hover:text-yellow-300 underline"
                @click="resetPushSliders"
              >
                Defecto
              </button>
            </div>

            <!-- Selector de Modelo de Vehículo -->
            <div class="mb-2">
              <div class="text-[10px] text-stone-400 mb-1 flex justify-between">
                <span>Catálogo de Vehículos:</span>
                <span class="text-yellow-400 uppercase text-[9px]">{{ selectedSpawnArchetype }}</span>
              </div>
              <select
                v-model="selectedSpawnArchetype"
                class="w-full bg-stone-900 border border-stone-700 text-stone-200 text-[11px] p-1 rounded focus:outline-none focus:border-yellow-500"
              >
                <option v-for="opt in archetypeOptions" :key="opt.id" :value="opt.id">
                  {{ opt.label }} - {{ opt.name }}
                </option>
              </select>
            </div>

            <!-- Acciones de Carro -->
            <div class="grid grid-cols-3 gap-1 mb-2.5">
              <button
                type="button"
                class="border border-cyan-800 bg-cyan-950/40 text-cyan-200 py-1 px-1 text-center hover:border-cyan-400 hover:bg-cyan-900/50"
                @click="debugSpawnCar"
                title="Genera el modelo seleccionado frente a ti"
              >
                🚗 Spawnear
              </button>
              <button
                type="button"
                class="border border-cyan-800 bg-cyan-950/40 text-cyan-200 py-1 px-1 text-center hover:border-cyan-400 hover:bg-cyan-900/50"
                @click="debugSpawnAndEnterCar"
                title="Genera y sube inmediatamente al vehículo"
              >
                ⚡ Subir
              </button>
              <button
                type="button"
                class="border border-purple-800 bg-purple-950/40 text-purple-200 py-1 px-1 text-center hover:border-purple-400 hover:bg-purple-900/50"
                @click="debugSpawnProcedural"
                title="Genera con probabilidades ponderadas del bioma actual"
              >
                🎲 Bioma
              </button>
            </div>

            <!-- Telemetría en vivo del vehículo conducido -->
            <div v-if="carHud.driving" class="mb-2.5 p-1.5 bg-stone-900/80 border border-stone-800 rounded-xs text-[9px] space-y-1">
              <div class="flex justify-between items-center text-yellow-300 font-bold">
                <span>{{ carHud.name }}</span>
                <span class="text-[8px] px-1 bg-stone-800 uppercase text-stone-300">{{ carHud.archetype }}</span>
              </div>
              <div class="grid grid-cols-2 gap-x-2 text-stone-400">
                <div>Masa: <b class="text-stone-200">{{ carHud.mass }} kg</b></div>
                <div>Terreno: <b class="text-stone-200 uppercase">{{ carHud.terrain }}</b></div>
                <div>Ruido motor: <b class="text-stone-200">{{ Math.round(carHud.noiseRadius) }} m</b></div>
                <div>Tracc. offroad: <b class="text-stone-200">{{ Math.round(carHud.offroadTraction * 100) }}%</b></div>
              </div>
            </div>

            <!-- Sliders Parametrizables de Empuje -->
            <div class="space-y-2 bg-stone-950/80 border border-stone-800 p-2 rounded-xs">
              <!-- Slider Fuerza Horizontal -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Fuerza empuje:</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    {{ carPushConfig.force.toFixed(2) }}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.01"
                  v-model.number="carPushConfig.force"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0× (sin empuje)</span>
                  <span>1.0× (predeterminado)</span>
                  <span>2.0× (fuerte)</span>
                </div>
              </div>

              <!-- Slider Elevación Vertical (Lift) -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Elevación vertical (Lift):</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    {{ carPushConfig.lift.toFixed(1) }} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.1"
                  v-model.number="carPushConfig.lift"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0 m/s (ras de suelo)</span>
                  <span>3.0 m/s (vuelo)</span>
                  <span>5.0 m/s (alto)</span>
                </div>
              </div>

              <!-- Slider Dispersión Lateral -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Dispersión lateral:</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    ±{{ carPushConfig.scatter.toFixed(2) }} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.01"
                  v-model.number="carPushConfig.scatter"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0 (recto)</span>
                  <span>±0.60 (predeterminado)</span>
                  <span>±1.5 (abierto)</span>
                </div>
              </div>

              <!-- Slider Giros / Torsión en el aire -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Torsión / Giros (Tumble):</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    {{ carPushConfig.tumble.toFixed(1) }}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6.0"
                  step="0.1"
                  v-model.number="carPushConfig.tumble"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0 (rígido)</span>
                  <span>3.0 (vuelo)</span>
                  <span>6.0 (trompo)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Lectura en vivo del arma equipada -->
          <div class="mt-3 pt-2 border-t border-stone-700 text-[10px] text-stone-400 leading-relaxed">
            <div>Equipada: <span class="text-stone-100">{{ weaponHud.name }}</span></div>
            <div v-if="!weaponHud.melee">Dispersión actual: <span class="text-yellow-300">{{ weaponHud.spreadDeg.toFixed(2) }}°</span> (semi-ángulo)</div>
            <div>Bajas: <span class="text-stone-100">{{ hud.kills }}</span> · Zombis cerca: <span class="text-stone-100">{{ hud.zombies }}</span></div>
          </div>
        </div>
      </div>

      <!-- Vitals HUD -->
      <div class="absolute bottom-4 left-4 z-10 bg-black/80 border border-stone-800 p-3 rounded-xs flex items-center gap-6 font-mono text-xs">
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">SALUD SUPERVIVIENTE</div>
          <div class="w-32 h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-red-600" :style="{ width: `${playerHealth}%` }"></div>
          </div>
        </div>
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">ESTAMINA</div>
          <div class="w-32 h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-yellow-500" :style="{ width: `${playerStamina}%` }"></div>
          </div>
        </div>
        <!-- Vidas -->
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">VIDAS</div>
          <div class="text-lg leading-none tracking-widest">
            <span v-for="i in 3" :key="i" :class="i <= playerLives ? 'text-red-500' : 'text-stone-700'">❤</span>
          </div>
        </div>
        <!-- Postura / Sigilo -->
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">POSTURA [C]</div>
          <button
            type="button"
            @click="isStealth = !isStealth"
            class="px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer rounded-xs flex items-center gap-1.5"
            :class="
              isStealth
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            "
          >
            <span>{{ isStealth ? '🤫 SIGILO' : '🚶 NORMAL' }}</span>
          </button>
        </div>
      </div>

      <!-- Armas: ranuras 1-5, arma equipada y munición -->
      <div class="absolute bottom-24 left-4 z-10 w-64 bg-black/80 border border-stone-800 p-2 font-mono text-xs">
        <div class="flex gap-1 mb-2">
          <div
            v-for="(s, i) in weaponHud.slots"
            :key="i"
            class="flex-1 h-6 border text-[10px] flex items-center justify-center"
            :class="
              i === weaponHud.equipped
                ? 'border-yellow-500 text-yellow-300 bg-yellow-900/30'
                : s
                  ? 'border-stone-600 text-stone-300'
                  : 'border-stone-800 text-stone-700'
            "
          >
            {{ i + 1 }}
          </div>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="font-bold text-stone-100">{{ weaponHud.name }}</span>
          <span :class="!weaponHud.melee && weaponHud.ammo === 0 ? 'text-red-400' : 'text-yellow-300'">
            {{ weaponHud.melee ? 'Cuerpo a cuerpo' : `${weaponHud.ammo} / ${weaponHud.reserve}` }}
          </span>
        </div>
        <div class="flex justify-between items-baseline mt-1 pt-1 border-t border-stone-800">
          <span class="font-bold text-orange-300">🧨 {{ explosiveHudName }}</span>
          <span class="text-stone-300">×{{ explosiveCounts[selectedExplosive] ?? 0 }} <span class="text-stone-500">[G lanzar · H cambiar · T C4]</span></span>
        </div>
        <div v-if="weaponHud.reloading" class="mt-1">
          <div class="text-[10px] text-stone-400 uppercase">Recargando...</div>
          <div class="h-1.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-yellow-400" :style="{ width: `${Math.round(weaponHud.reloadPct * 100)}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Sangre en los bordes: crece con la vida perdida y flashea al recibir daño -->
      <div
        class="absolute inset-0 z-20 pointer-events-none"
        :style="{
          opacity: bloodOpacity,
          background:
            'radial-gradient(ellipse at center, transparent 42%, rgba(139,0,0,0.42) 72%, rgba(120,0,0,0.88) 100%),' +
            'radial-gradient(circle at 0% 0%, rgba(140,0,0,0.9) 0%, transparent 22%),' +
            'radial-gradient(circle at 100% 0%, rgba(140,0,0,0.9) 0%, transparent 24%),' +
            'radial-gradient(circle at 0% 100%, rgba(140,0,0,0.9) 0%, transparent 26%),' +
            'radial-gradient(circle at 100% 100%, rgba(140,0,0,0.9) 0%, transparent 23%)',
        }"
      ></div>

      <!-- Texto de combate flotante (bajas, cabezas, impactos, daño recibido) -->
      <div class="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-1">
        <div
          v-for="h in hitFeed"
          :key="h.id"
          class="hit-float font-mono font-black uppercase"
          :class="{ 'hit-tone-hit': h.tone === 'hit', 'hit-tone-head': h.tone === 'head', 'hit-tone-kill': h.tone === 'kill' }"
          :style="{ marginLeft: `${h.dx}px`, '--tilt': `${h.tilt}deg` }"
        >
          {{ h.text }}
        </div>
      </div>

      <!-- Prompt de interacción (cajas, carros, bombas) -->
      <div
        v-if="prompt"
        class="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 bg-black/80 border px-4 py-2 font-mono text-xs uppercase tracking-wider text-center"
        :class="{
          'border-yellow-600/70 text-yellow-300': prompt.tone === 'ok',
          'border-red-700/70 text-red-300': prompt.tone === 'bad',
          'border-stone-600 text-stone-300': prompt.tone === 'info',
        }"
      >
        {{ prompt.text }}
      </div>

      <!-- Aviso temporal -->
      <div
        v-if="toast"
        class="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-black/85 border border-stone-500 px-4 py-2 font-mono text-xs text-stone-100 uppercase tracking-wider"
      >
        {{ toast }}
      </div>

      <!-- Canalización de resurrección en curso -->
      <div
        v-if="reviving"
        class="absolute top-16 left-1/2 -translate-x-1/2 z-20 bg-black/85 border border-amber-400/70 px-4 py-2 font-mono text-xs text-amber-200 uppercase tracking-widest animate-pulse"
      >
        ✚ Canalizando resurrección — ¡aguanta!
      </div>

      <!-- Recarga de gasolina en curso -->
      <div
        v-if="refuelHud.active"
        class="absolute top-16 left-1/2 -translate-x-1/2 z-10 w-72 bg-black/85 border border-yellow-500/70 p-3 font-mono text-xs text-yellow-200"
      >
        <div class="flex items-center justify-between mb-1 uppercase tracking-wider">
          <span class="animate-pulse">⛽ Recargando gasolina</span>
          <span>+{{ refuelHud.added.toFixed(1) }} L</span>
        </div>
        <div class="h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
          <div class="h-full bg-yellow-400 transition-all duration-100" :style="{ width: `${Math.round(refuelHud.pct * 100)}%` }"></div>
        </div>
        <div class="mt-1 flex justify-between text-[10px] text-stone-400">
          <span>Tanque {{ Math.round(refuelHud.pct * 100) }}%</span>
          <span>Estación: {{ Math.round(refuelHud.left) }} L</span>
        </div>
      </div>

      <!-- Tablero del carro (solo al conducir) -->
      <div
        v-if="carHud.driving"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/90 border border-stone-700 px-5 py-3 font-mono text-xs flex items-center gap-6 shadow-2xl rounded-xs"
      >
        <div class="text-center min-w-16">
          <div class="text-3xl font-bold text-stone-100 leading-none">{{ carHud.speed }}</div>
          <div class="text-[10px] text-stone-500 uppercase">km/h</div>
          <div class="text-[9px] text-stone-400 mt-1 uppercase tracking-wider font-bold">
            {{ carHud.terrain }}
          </div>
        </div>

        <div class="flex flex-col gap-1.5 w-52">
          <!-- Modelo y Estado del Motor -->
          <div class="flex justify-between items-baseline">
            <span class="font-bold text-stone-100 text-[11px] truncate">{{ carHud.name }}</span>
            <span
              class="text-[9px] px-1 py-0.2 uppercase border"
              :class="carHud.durability <= 0 ? 'border-red-600 bg-red-950/60 text-red-300' : carHud.engineRunning ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300' : 'border-stone-700 text-stone-500'"
            >
              {{ carHud.durability <= 0 ? 'AVERIADO' : carHud.engineRunning ? 'MOTOR ON' : 'MOTOR OFF' }}
            </span>
          </div>

          <!-- Barra de Durabilidad / Chasis -->
          <div>
            <div class="flex justify-between text-[10px] uppercase mb-0.5" :class="carHud.durabilityPct <= 0.25 ? 'text-red-400' : 'text-stone-400'">
              <span>🛡️ Chasis</span>
              <span>{{ Math.round(carHud.durability) }} / {{ carHud.maxDurability }}</span>
            </div>
            <div class="h-2 bg-stone-900 border border-stone-700 overflow-hidden">
              <div
                class="h-full transition-all duration-150"
                :class="carHud.durabilityPct <= 0.25 ? 'bg-red-600' : carHud.durabilityPct <= 0.55 ? 'bg-amber-500' : 'bg-emerald-500'"
                :style="{ width: `${Math.round(carHud.durabilityPct * 100)}%` }"
              ></div>
            </div>
          </div>

          <!-- Barra de Gasolina -->
          <div>
            <div class="flex justify-between text-[10px] uppercase mb-0.5" :class="carHud.fuelPct <= 0.15 ? 'text-red-400' : 'text-stone-400'">
              <span>⛽ Gasolina</span>
              <span>{{ carHud.fuel.toFixed(1) }} L</span>
            </div>
            <div class="h-2 bg-stone-900 border border-stone-700 overflow-hidden">
              <div
                class="h-full transition-all duration-100"
                :class="carHud.fuelPct <= 0.15 ? 'bg-red-600' : 'bg-yellow-400'"
                :style="{ width: `${Math.round(carHud.fuelPct * 100)}%` }"
              ></div>
            </div>
          </div>

          <!-- Alerta de zombis por ruido de motor -->
          <div v-if="carHud.engineRunning" class="text-[9px] text-stone-400 flex justify-between">
            <span>Alerta sonora:</span>
            <span :class="carHud.noiseRadius > 25 ? 'text-amber-400 font-bold' : 'text-stone-300'">
              {{ Math.round(carHud.noiseRadius) }} m
            </span>
          </div>
        </div>
      </div>

      <!-- World debug HUD -->
      <div class="absolute bottom-4 right-4 z-10 bg-black/80 border border-stone-800 p-3 rounded-xs font-mono text-[11px] text-stone-300 leading-relaxed">
        <div>
          <span class="text-stone-500">HORA:</span> {{ hud.clock }}
          <span :class="hud.night ? 'text-indigo-300' : 'text-yellow-300'">{{ hud.night ? 'NOCHE' : 'DÍA' }}</span>
        </div>
        <div><span class="text-stone-500">SEMILLA:</span> {{ seed }}</div>
        <div><span class="text-stone-500">POS:</span> {{ hud.x }}, {{ hud.z }}</div>
        <div><span class="text-stone-500">CHUNK:</span> {{ hud.cx }}, {{ hud.cz }} ({{ hud.chunks }} cargados)</div>
        <div><span class="text-stone-500">CIUDAD MÁS CERCANA:</span> {{ hud.city }}</div>
        <div><span class="text-stone-500">ZOMBIS CERCA:</span> {{ hud.zombies }}</div>
        <div><span class="text-stone-500">BAJAS:</span> {{ hud.kills }}</div>
      </div>

      <!-- Sistema Multijugador y Chat Overlay -->
      <MultiplayerHUD @chat-focus-change="(val) => (isChatFocused = val)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { sound } from '../../audio/soundEngine';
import { WorldManager } from '../../game/world/worldManager';
import { ZombieManager, DEFAULT_CAR_PUSH_CONFIG, type CarPushConfig, type RemoteCarInfo } from '../../game/world/zombies';
import { ExplosivesManager } from '../../game/explosives/explosivesManager';
import { EXPLOSIVE_IDS, getExplosiveDef } from '../../game/explosives/explosiveDefs';
import { updateFadeTarget } from '../../game/world/fadeMaterial';
import { DayNightCycle } from '../../game/world/dayNight';
import { LampLights } from '../../game/world/lampLights';
import { setLampLevel } from '../../game/world/cabinMesh';
import { updateFireFx } from '../../game/world/chunkMesher';
import { PlayerAvatar } from '../../game/world/playerAvatar';
import { VehicleManager, type DriveInput, type DrivableCar, type VehicleTarget } from '../../game/world/vehicles';
import { RefuelSession, PUMP_CAR_RANGE } from '../../game/world/refuel';
import { FUEL_CAP, STATUS_LABEL } from '../../game/world/carData';
import { WORLD } from '../../game/world/worldConfig';
import { Arsenal, type WeaponItem } from '../../game/weapons/arsenal';
import type { Weapon } from '../../game/weapons/weapon';
import { allWeaponDefs, getWeaponDef, WEAPON_IDS } from '../../game/weapons/weaponDefs';
import { RecoilController } from '../../game/weapons/recoil';
import { MouseAim, AimReticle } from '../../game/weapons/aiming';
import { WeaponCompanion } from '../../game/weapons/weaponCompanion';
import { ShotFx } from '../../game/weapons/shotFx';
import { weaponAudio } from '../../game/weapons/weaponAudio';
import { PICKUP_RANGE, type DropSpawn } from '../../game/weapons/groundDrops';
import MultiplayerHUD from './MultiplayerHUD.vue';
import MobileControls from './MobileControls.vue';
import { networkManager } from '../../game/network/networkManager';
import { RemotePlayerManager } from '../../game/network/remotePlayerManager';

const emit = defineEmits<{
  (e: 'exit'): void;
}>();

const container = ref<HTMLDivElement | null>(null);
const gameCanvas = ref<HTMLCanvasElement | null>(null);
const isChatFocused = ref(false);
const isPaused = ref(false);
const showSettings = ref(false);

const mobileMove = ref({ x: 0, y: 0 });
const mobileAim = ref({ x: 0, y: 0, active: false, fire: false });

function handleMobileMove(input: { x: number; y: number }) {
  mobileMove.value = input;
}
function handleMobileAim(input: { x: number; y: number; active: boolean; fire: boolean }) {
  mobileAim.value = input;
}
function handleMobileKey(key: string) {
  handleKeyDown({ key, repeat: false, preventDefault: () => {} } as KeyboardEvent);
  setTimeout(() => handleKeyUp({ key, preventDefault: () => {} } as KeyboardEvent), 100);
}
function handleMobileKeyState(key: string, pressed: boolean) {
  if (pressed) {
    handleKeyDown({ key, repeat: false, preventDefault: () => {} } as KeyboardEvent);
  } else {
    handleKeyUp({ key, preventDefault: () => {} } as KeyboardEvent);
  }
}

let remotePlayers: RemotePlayerManager | null = null;
const playerHealth = ref(100);
const playerStamina = ref(100);
// Vidas y canalización de resurrección: al vaciarse la salud se pierde una vida
// y el jugador canaliza 5 s inmóvil (invulnerable, brillando) hasta soltar la
// onda de choque. Sin vidas restantes, muerte definitiva.
const playerLives = ref(3);
const reviving = ref(false);
let reviveT = 0;
const REVIVE_DURATION = 5;
const REVIVE_BLAST_RADIUS = 9;
const REVIVE_BLAST_POWER = 10;
// Sangre en bordes de pantalla: base por vida perdida + destello al recibir daño.
// Sin animación de daño en el personaje: la marcha nunca se interrumpe.
const bloodFlash = ref(0);
const bloodOpacity = computed(() => {
  const missing = 1 - playerHealth.value / 100;
  return Math.min(1, missing * 0.9 + bloodFlash.value).toFixed(3);
});
function flashBlood(damage: number) {
  bloodFlash.value = Math.min(1, bloodFlash.value + 0.25 + Math.min(0.45, damage * 0.02));
}

/**
 * Daño al jugador con sistema de vidas. Devuelve 'ok' (sigue en pie),
 * 'reviving' (perdió una vida y canaliza), 'invulnerable' (ya canalizando o
 * muerto: sin efecto) o 'dead' (sin vidas: muerte definitiva).
 */
function hurtPlayer(damage: number): 'ok' | 'reviving' | 'invulnerable' | 'dead' {
  if (reviving.value || playerHealth.value <= 0) return reviving.value ? 'reviving' : 'dead';
  playerHealth.value = Math.max(0, playerHealth.value - damage);
  flashBlood(damage);
  if (playerHealth.value > 0) return 'ok';
  if (playerLives.value > 1) {
    playerLives.value -= 1;
    reviving.value = true;
    reviveT = 0;
    avatar?.beginReviveGlow();
    return 'reviving';
  }
  playerLives.value = 0;
  return 'dead';
}

/**
 * Daño al jugador por explosiones/fuego, con el mismo feedback que el resto
 * (hitmark, toasts de vida/muerte). Lo usan los drains del ExplosivesManager.
 */
function blastHurtPlayer(damage: number) {
  const d = Math.round(damage);
  if (d <= 0) return;
  const r = hurtPlayer(d);
  if (r === 'invulnerable') return;
  if (r === 'reviving') {
    showToast('¡Aguanta! Canalizando resurrección...');
    return;
  }
  if (r === 'dead') {
    avatar?.playDeath();
    showToast('¡Volaste en pedazos!');
    return;
  }
  showHitMark(`-${d}`, 'kill');
}

// --- Explosivos y arrojadizos (conteo + selección; el vuelo lo lleva el manager) ---
const EXPLOSIVE_ORDER = ['frag_grenade', 'molotov', 'pipe_bomb', 'landmine', 'c4_charge'];
const EXPLOSIVE_INITIAL: Record<string, number> = {
  frag_grenade: 2, molotov: 2, pipe_bomb: 1, landmine: 2, c4_charge: 1,
};
const selectedExplosive = ref('frag_grenade');
const explosiveCounts = reactive<Record<string, number>>({ ...EXPLOSIVE_INITIAL });
const explosiveHudName = computed(() => getExplosiveDef(selectedExplosive.value)?.name ?? '—');
let burnAccum = 0;
let burnTickT = 0;
const weaponHud = reactive({
  slots: [] as ({ name: string } | null)[],
  equipped: 0,
  name: '—',
  melee: true,
  ammo: 0,
  reserve: 0,
  reloading: false,
  reloadPct: 0,
  equippedId: '',
  spreadDeg: 0,
});

// --- Menú de debug ---
const debugOpen = ref(false);
const carPushConfig = reactive<CarPushConfig>({ ...DEFAULT_CAR_PUSH_CONFIG });
const debugWeapons = allWeaponDefs().map((d) => ({
  id: d.id,
  name: d.name,
  category: d.category,
  damage: d.damage,
  pellets: d.pellets,
  rpm: d.fireRateRPM,
  mag: d.magSize,
  reload: d.reloadDuration,
  range: d.effectiveRange,
  noise: d.noiseRadius,
  auto: d.isAutomatic,
}));
interface HitFeedItem { id: number; text: string; tone: 'hit' | 'head' | 'kill'; dx: number; tilt: number }
const hitFeed = ref<HitFeedItem[]>([]);
let hitFeedId = 0;
type Tone = 'ok' | 'bad' | 'info';
const prompt = ref<{ text: string; tone: Tone } | null>(null);
import type { VehicleArchetype } from '../../game/vehicles';

const selectedSpawnArchetype = ref<VehicleArchetype>('sedan');
const archetypeOptions: { id: VehicleArchetype; label: string; name: string }[] = [
  { id: 'compact', label: '🚙 Compacto', name: 'Mini Hatchback' },
  { id: 'sedan', label: '🚗 Sedán', name: 'Sedán Clásico' },
  { id: 'offroad', label: '🛻 4x4 Offroad', name: 'Pickup 4x4 Sierra' },
  { id: 'truck', label: '🚛 Camión', name: 'Camión de Carga' },
  { id: 'sport', label: '🏎️ Deportivo', name: 'Coupé V8' },
  { id: 'emergency', label: '🚑 Emergencia', name: 'Ambulancia Rural' },
];

const toast = ref('');
const carHud = reactive({
  driving: false,
  speed: 0,
  fuel: 0,
  fuelPct: 0,
  name: '—',
  archetype: 'sedan',
  durability: 100,
  maxDurability: 100,
  durabilityPct: 1,
  engineRunning: false,
  noiseRadius: 0,
  terrain: 'asphalt',
  mass: 1400,
  offroadTraction: 0.55,
});
const refuelHud = reactive({ active: false, added: 0, pct: 0, left: 0 });
const seed = ref(networkManager.currentRoom?.seed ?? newSeed());
const hud = reactive({ x: 0, z: 0, cx: 0, cz: 0, chunks: 0, city: '—', zombies: 0, kills: 0, clock: '06:00', night: false });

function newSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

// --- Estado de juego ---
const isStealth = ref(false);
const player = { x: 0, z: 0, rot: 0, stealthSpeed: 2.8, walkSpeed: 5.6, runSpeed: 9.6, radius: 0.4 };
const keys: Record<string, boolean> = {};

// Cámara flotante superior (estilo Project Zomboid): ángulo fijo, rotable con Q/E.
const cam = { yaw: Math.PI / 4, pitch: THREE.MathUtils.degToRad(52), dist: 34, minDist: 16, maxDist: 70 };

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let world: WorldManager | null = null;
let zombies: ZombieManager | null = null;
let playerMesh: THREE.Group | null = null;
let sun: THREE.DirectionalLight | null = null;
let cycle: DayNightCycle | null = null;
let lampLights: LampLights | null = null;
let avatar: PlayerAvatar | null = null;
let vehicles: VehicleManager | null = null;
let refuel: RefuelSession | null = null;
let explosives: ExplosivesManager | null = null;
let camExtra = 0; // la cámara se aleja un poco al ir rápido en carro
let toastTimer: ReturnType<typeof setTimeout> | null = null;

// --- Armas ---
function makeArsenal() {
  const a = new Arsenal();
  a.pickup({ weapon: WEAPON_IDS.bat }); // se empieza con un bate
  return a;
}
let arsenal = makeArsenal();
const recoil = new RecoilController();
const aim = new MouseAim();
let companion: WeaponCompanion | null = null;
let shotFx: ShotFx | null = null;
let reticle: AimReticle | null = null;
let fireHeld = false;
/** Un clic pendiente (armas semiautomáticas): se consume al disparar. */
let semiPending = false;
let lastMobileFire = false;
let aimHeading = 0;
const aimDir = new THREE.Vector3(0, 0, 1);
const muzzlePos = new THREE.Vector3();
let resizeObserver: ResizeObserver | null = null;
let animId = 0;

/** Marcador provisional (cápsula) mientras carga el modelo de Miku. */
function createPlayerMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x1e3a8a }),
  );
  body.position.y = 0.8;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd2a679 }),
  );
  head.position.y = 1.65;
  // "Nariz" para indicar hacia dónde mira (+Z local)
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.25),
    new THREE.MeshLambertMaterial({ color: 0xe5e7eb }),
  );
  nose.position.set(0, 1.65, 0.3);
  g.add(body, head, nose);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return g;
}

// --- Sol/luna: luz direccional con sombras que sigue al jugador ---
const SHADOW_EXTENT = 50; // semi-ancho del área con sombras alrededor del jugador (m)
const SHADOW_MAP = 2048;
const SUN_DISTANCE = 90;
const SHADOW_TEXEL = (SHADOW_EXTENT * 2) / SHADOW_MAP;
const _t = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _ay = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Coloca la luz a lo largo de `dir`; el objetivo se ancla a la rejilla de texels (evita parpadeo). */
function updateSun(px: number, pz: number, dir: THREE.Vector3) {
  if (!sun) return;
  // Ejes del espacio de la luz (cambian a lo largo del día)
  _ax.crossVectors(_up, dir).normalize();
  _ay.crossVectors(dir, _ax).normalize();
  _t.set(px, 0, pz);
  const a = Math.round(_t.dot(_ax) / SHADOW_TEXEL) * SHADOW_TEXEL;
  const b = Math.round(_t.dot(_ay) / SHADOW_TEXEL) * SHADOW_TEXEL;
  const c = _t.dot(dir);
  sun.target.position
    .set(0, 0, 0)
    .addScaledVector(_ax, a)
    .addScaledVector(_ay, b)
    .addScaledVector(dir, c);
  sun.position.copy(sun.target.position).addScaledVector(dir, SUN_DISTANCE);
  sun.target.updateMatrixWorld();
}

function startWorld(newSeedValue: number) {
  if (!scene) return;
  refuel?.dispose();
  vehicles?.dispose();
  zombies?.dispose();
  explosives?.dispose();
  world?.dispose();
  seed.value = newSeedValue;
  world = new WorldManager(scene, newSeedValue);
  zombies = new ZombieManager(scene, world);
  zombies.carPushConfig = carPushConfig;
  zombies.onZombieHit = (z, damage, killed, impulse, isCar) => {
    if (networkManager.isConnected && networkManager.currentRoom) {
      networkManager.sendZombieHit({
        zombieId: z.id,
        zombieX: z.x,
        zombieZ: z.z,
        damage,
        impulseX: impulse.x,
        impulseY: impulse.y,
        impulseZ: impulse.z,
        isKilled: killed,
        isCarHit: isCar,
      });
    }
  };
  zombies.onPlayerAttacked = (z, damage) => {
    const r = hurtPlayer(damage);
    if (r === 'invulnerable') return;
    if (r === 'reviving') {
      showToast('¡Aguanta! Canalizando resurrección...');
      return;
    }
    if (r === 'dead') {
      avatar?.playDeath();
      showToast('¡Has caído ante la horda de zombis!');
      return;
    }
    showHitMark(`-${damage}`, 'hit');
  };
  vehicles = new VehicleManager(scene, world);
  vehicles.onPlayerDamaged = (damage: number) => {
    const r = hurtPlayer(damage);
    if (r === 'invulnerable') return;
    if (r === 'reviving') {
      showToast('¡Aguanta! Canalizando resurrección...');
      return;
    }
    if (r === 'dead') {
      avatar?.playDeath();
      showToast('¡Has muerto por impacto vehicular!');
      return;
    }
    showToast(`¡Impacto crítico! -${damage} Salud por colisión violenta`);
    showHitMark(`-${damage}`, 'kill');
  };
  refuel = new RefuelSession(scene, world);
  explosives = new ExplosivesManager(scene, world, zombies, vehicles);
  // Barriles rojos rotos por vehículos: explosión pequeña (no sale del loot).
  world.onRedBarrelBlast = (x, z) => {
    explosives?.detonate(x, 0.5, z, {
      id: 'red_barrel',
      name: 'Barril rojo',
      type: 'throwable',
      triggerType: 'impact',
      fuseTime: 0,
      maxDamage: 70,
      damageRadius: 3.5,
      impulseForce: 9,
      noiseRadius: 45,
      attractZombiesWhileActive: false,
      fireDuration: 0,
      throwSpeed: 0,
    });
  };
  player.x = 0;
  player.z = 0;
  arsenal = makeArsenal();
  prompt.value = null;
  carHud.driving = false;
  refuelHud.active = false;
  bloodFlash.value = 0;
  playerLives.value = 3;
  playerHealth.value = 100;
  reviving.value = false;
  avatar?.resetLife();
  clearShockRings();
  Object.assign(explosiveCounts, EXPLOSIVE_INITIAL);
  selectedExplosive.value = EXPLOSIVE_IDS.frag;
  burnAccum = 0;
  burnTickT = 0;
  if (playerMesh) playerMesh.visible = true;
}

function showToast(msg: string) {
  toast.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ''), 2400);
}

// --- Interacción (F): cajas, carros y bombas de gasolina ---------------------------------------
type Target =
  | { kind: 'crate' }
  | { kind: 'weapon'; drop: DropSpawn }
  | { kind: 'car'; veh: VehicleTarget }
  | { kind: 'pump'; pump: NonNullable<ReturnType<WorldManager['nearbyPump']>>; car: DrivableCar | null };

/** Lo más cercano con lo que se puede interactuar (la menor puntuación gana; la caja siempre gana). */
function findTarget(): Target | null {
  if (!world || !vehicles) return null;
  let best: { score: number; target: Target } | null = null;
  if (world.nearbyCrate(player.x, player.z)) best = { score: -10, target: { kind: 'crate' } };

  const wd = world.drops.nearest(player.x, player.z, PICKUP_RANGE);
  if (wd) {
    const score = wd.d - 0.6;
    if (!best || score < best.score) best = { score, target: { kind: 'weapon', drop: wd.drop } };
  }

  const pump = world.nearbyPump(player.x, player.z, 2.4);
  if (pump) {
    const car =
      vehicles.parkedCars().find((c) => Math.hypot(c.x - pump.pump.x, c.z - pump.pump.z) <= PUMP_CAR_RANGE) ?? null;
    const score = pump.d - 0.8;
    if (!best || score < best.score) best = { score, target: { kind: 'pump', pump, car } };
  }

  const veh = vehicles.findNear(player.x, player.z);
  if (veh) {
    const score = veh.d - 1.2;
    if (!best || score < best.score) best = { score, target: { kind: 'car', veh } };
  }
  return best ? best.target : null;
}

function updatePrompt() {
  if (!world || !vehicles) return;
  if (vehicles.driven) {
    prompt.value = { text: '[F] Bajar del carro', tone: 'info' };
    return;
  }
  if (refuel?.isActive) {
    prompt.value = { text: '[F] Detener la recarga', tone: 'info' };
    return;
  }
  const t = findTarget();
  if (!t) {
    prompt.value = null;
    return;
  }
  if (t.kind === 'crate') {
    prompt.value = { text: '[F] Abrir caja', tone: 'ok' };
  } else if (t.kind === 'weapon') {
    const def = getWeaponDef(t.drop.weapon);
    const owned = arsenal.slots.some((w) => w?.def.id === t.drop.weapon);
    const name = def?.name ?? t.drop.weapon;
    if (owned && def && def.magSize <= 0) prompt.value = { text: `Ya tienes: ${name}`, tone: 'info' };
    else prompt.value = { text: owned ? `[F] Recoger munición · ${name}` : `[F] Recoger ${name}`, tone: 'ok' };
  } else if (t.kind === 'car') {
    const s = t.veh.status;
    prompt.value =
      s === 'open'
        ? { text: `[F] Subir al carro · ${STATUS_LABEL[s]}`, tone: 'ok' }
        : { text: `${STATUS_LABEL[s]}${s === 'locked' ? ' · necesitas llaves' : s === 'broken' ? ' · no arranca' : ''}`, tone: 'bad' };
  } else {
    const left = Math.round(t.pump.remaining);
    if (!t.car) prompt.value = { text: `Estaciona un carro junto a la bomba · estación: ${left} L`, tone: 'info' };
    else if (t.car.fuel >= FUEL_CAP - 0.1) prompt.value = { text: 'Tanque lleno', tone: 'info' };
    else if (t.pump.remaining < 0.01) prompt.value = { text: 'Esta estación se quedó sin gasolina', tone: 'bad' };
    else {
      const pct = Math.round(t.car.fuelFraction * 100);
      prompt.value = { text: `[F] Recargar gasolina · tanque ${pct}% · estación: ${left} L`, tone: 'ok' };
    }
  }
}

function interact() {
  if (!world || !vehicles || !refuel) return;
  if (reviving.value) return; // canalizando: sin interacciones
  if (vehicles.driven) return exitCar();
  if (refuel.isActive) {
    refuel.stop('cancel');
    refuelHud.active = false;
    showToast('Recarga detenida');
    return;
  }
  const t = findTarget();
  if (!t) return;

  if (t.kind === 'crate') {
    const crate = world.nearbyCrate(player.x, player.z);
    if (!crate) return;
    world.lootCrate(crate.id);
    giveWeapon({ weapon: crate.loot });
    sound.playPlayClick();
  } else if (t.kind === 'weapon') {
    if (!giveWeapon(t.drop)) return; // ya tienes esa arma cuerpo a cuerpo: se queda en el suelo
    world.drops.take(t.drop.id);
    if (networkManager.isConnected && networkManager.currentRoom) {
      networkManager.sendItemPickup(t.drop.id);
    }
    sound.playPlayClick();
  } else if (t.kind === 'car') {
    const dc = vehicles.enter(t.veh);
    if (!dc) {
      // Sin mecánica para abrirlos todavía: solo se informa del estado
      const s = t.veh.status;
      showToast(s === 'locked' ? 'Cerrado con llave' : s === 'broken' ? 'Averiado: no arranca' : 'Destruido');
      return;
    }
    sound.playPlayClick();
    if (playerMesh) playerMesh.visible = false;
    showToast(`Gasolina: ${dc.fuel.toFixed(1)} L (${Math.round(dc.fuelFraction * 100)}%)`);
  } else {
    if (!t.car) return showToast('No hay ningún carro junto a la bomba');
    if (t.car.fuel >= FUEL_CAP - 0.1) return showToast('El tanque ya está lleno');
    if (t.pump.remaining < 0.01) return showToast('Esta estación se quedó sin gasolina');
    refuel.start(t.pump.station, t.pump.pump, t.car);
    sound.playPlayClick();
  }
  updatePrompt();
}

/** Baja del carro por el lado izquierdo (empujado fuera de obstáculos). */
function exitCar() {
  if (!vehicles || !world) return;
  const dc = vehicles.exit();
  if (!dc) return;
  const p = dc.worldPoint(-(dc.dims.W / 2 + 1.0), 0);
  const fixed = world.resolveCollision(p.x, p.z, player.radius);
  player.x = fixed.x;
  player.z = fixed.z;
  player.rot = dc.heading;
  if (playerMesh) playerMesh.visible = true;
  carHud.driving = false;
  sound.playClick();
  updatePrompt();
}

// --- Armas: recoger, recargar, disparar -----------------------------------------------------

/** Añade un arma al inventario. Devuelve false si no se recogió (p. ej. ya la tienes cuerpo a cuerpo). */
function giveWeapon(item: WeaponItem): boolean {
  const res = arsenal.pickup(item);
  if (!res) return false;
  const name = res.weapon.def.name;
  if (res.kind === 'duplicate') {
    showToast(`Ya tienes: ${name}`);
    return false;
  }
  if (res.kind === 'ammo') showToast(`+${res.added} balas · ${name}`);
  else if (res.kind === 'new') showToast(`Obtuviste: ${name}`);
  else {
    // Inventario lleno: la equipada se cambia por la nueva y se suelta a tus pies (con su munición)
    const d = res.dropped;
    world?.drops.dropAt({ weapon: d.def.id, ammo: d.ammo, reserve: d.reserve }, player.x - aimDir.x * 0.9, player.z - aimDir.z * 0.9);
    showToast(`Cambiaste ${d.def.name} por ${name}`);
  }
  return true;
}

function reloadWeapon() {
  if (vehicles?.driven) return;
  const w = arsenal.current;
  if (w && w.startReload()) weaponAudio.reload();
}

// --- Explosivos y arrojadizos (G lanzar/plantar, H cambiar, T detonar C4) ---

/** Rota la selección al siguiente explosivo del catálogo. */
function cycleExplosive() {
  const i = EXPLOSIVE_ORDER.indexOf(selectedExplosive.value);
  selectedExplosive.value = EXPLOSIVE_ORDER[(i + 1) % EXPLOSIVE_ORDER.length];
  const def = getExplosiveDef(selectedExplosive.value);
  if (def) showToast(`🧨 ${def.name} ×${explosiveCounts[def.id] ?? 0}`);
}

/** Usa el explosivo seleccionado: lo lanza al cursor o lo planta a los pies. */
function useSelectedExplosive() {
  if (!explosives || !world || reviving.value) return;
  if (vehicles?.driven) {
    showToast('Baja del carro para usar explosivos');
    return;
  }
  const def = getExplosiveDef(selectedExplosive.value);
  if (!def) return;
  if ((explosiveCounts[def.id] ?? 0) <= 0) {
    showToast(`Sin ${def.name}`);
    return;
  }
  if (def.type === 'deployable') {
    if (!explosives.plantExplosive(def, player.x, player.z)) return;
    explosiveCounts[def.id]--;
    showToast(
      def.triggerType === 'remote'
        ? `${def.name} plantada · [T] para detonar`
        : def.triggerType === 'proximity'
          ? `${def.name} armada · cuidado donde pisas`
          : `${def.name} plantada`,
    );
    sound.playPlayClick();
    return;
  }
  // Arrojadizo hacia el cursor (o al frente si el cursor está encima)
  let tx = aim.point.x;
  let tz = aim.point.z;
  if (Math.hypot(tx - player.x, tz - player.z) < 1.2) {
    tx = player.x + Math.sin(player.rot) * 8;
    tz = player.z + Math.cos(player.rot) * 8;
  }
  if (!explosives.throwExplosive(def, player.x, player.z, tx, tz)) return; // enfriando
  explosiveCounts[def.id]--;
  avatar?.playAttack('melee');
  sound.playPlayClick();
}

/** Detona las C4 plantadas (detonador remoto). */
function detonateC4() {
  if (!explosives || reviving.value) return;
  const n = explosives.detonateRemote();
  showToast(n > 0 ? `¡Detonando ${n} C4!` : 'Sin C4 plantados');
}

/** Recarga el inventario de explosivos (menú debug). */
function debugRefillExplosives() {
  Object.assign(explosiveCounts, EXPLOSIVE_INITIAL);
  showToast('Explosivos repuestos');
}

function showHitMark(text: string, tone: 'hit' | 'head' | 'kill') {
  const id = ++hitFeedId;
  hitFeed.value.push({
    id,
    text,
    tone,
    dx: Math.round((Math.random() - 0.5) * 140),
    tilt: Math.round((Math.random() - 0.5) * 14),
  });
  // Tope anti-spam (SMGs a 950 RPM): conserva solo los últimos
  if (hitFeed.value.length > 8) hitFeed.value.splice(0, hitFeed.value.length - 8);
  setTimeout(() => {
    hitFeed.value = hitFeed.value.filter((h) => h.id !== id);
  }, 950);
}

/** Anillos expansivos de la onda de choque de resurrección. */
interface ShockRing { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; geo: THREE.BufferGeometry; t: number }
const shockRings: ShockRing[] = [];
function spawnShockRing(x: number, z: number, maxR: number) {
  if (!scene) return;
  const geo = new THREE.RingGeometry(0.9, 1.0, 48);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffe6a3, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.15, z);
  mesh.scale.setScalar(1);
  mesh.userData.maxR = maxR;
  scene.add(mesh);
  shockRings.push({ mesh, mat, geo, t: 0 });
}
function updateShockRings(dt: number) {
  for (let i = shockRings.length - 1; i >= 0; i--) {
    const r = shockRings[i];
    r.t += dt;
    const k = r.t / 0.7;
    if (k >= 1) {
      scene?.remove(r.mesh);
      r.geo.dispose();
      r.mat.dispose();
      shockRings.splice(i, 1);
      continue;
    }
    const s = 1 + k * ((r.mesh.userData.maxR as number) - 1);
    r.mesh.scale.setScalar(s);
    r.mat.opacity = 0.9 * (1 - k);
  }
}
function clearShockRings() {
  for (const r of shockRings) {
    scene?.remove(r.mesh);
    r.geo.dispose();
    r.mat.dispose();
  }
  shockRings.length = 0;
}

/** Un intento de disparo: raycast contra zombis cercanos y obstáculos, daño, ruido, FX y sonido. */
function tryFire(w: Weapon, velocity: number) {
  if (!world || !zombies || !camera || !scene) return;
  const def = w.def;
  let origin: THREE.Vector3;
  let dir: THREE.Vector3;
  if (w.isMelee) {
    // El golpe sale de la mano derecha animada (sigue el swing del bate) hacia donde mira
    dir = new THREE.Vector3(Math.sin(aimHeading), 0, Math.cos(aimHeading));
    const hand = avatar?.getRightHandWorldPosition();
    origin = hand
      ? new THREE.Vector3(hand.x + dir.x * 0.3, hand.y, hand.z + dir.z * 0.3)
      : new THREE.Vector3(player.x + dir.x * 0.3, 1.0, player.z + dir.z * 0.3);
  } else {
    dir = aimDir;
    origin = muzzlePos.clone();
  }
  const range = (def.maxRange ?? def.effectiveRange * 2) + 2;
  const targets = zombies.getHitTargets(origin.x, origin.z, dir.x, dir.z, range);

  const res = w.shoot(camera, scene, velocity, {
    origin,
    direction: dir,
    targets,
    obstacle: (ox, oz, dx, dz, max) => world!.raycastObstacle(ox, oz, dx, dz, max),
    recoil,
  });

  if (!res) {
    if (w.failReason === 'empty') {
      semiPending = false;
      weaponAudio.empty();
      if (w.startReload()) weaponAudio.reload();
      else showToast('Sin munición');
    }
    return;
  }

  semiPending = false;
  shotFx?.play(res);
  if (res.melee) {
    weaponAudio.swing();
    avatar?.playAttack('melee');
  } else {
    weaponAudio.shot(def.category);
  }

  // Sincronizar disparo por red para que todos los jugadores vean fogonazo, trazadoras, impactos y escuchen el audio
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendPlayerShot({
      weaponId: def.id,
      category: def.category,
      isMelee: res.melee,
      muzzleX: res.muzzle.x,
      muzzleY: res.muzzle.y,
      muzzleZ: res.muzzle.z,
      dirX: res.direction.x,
      dirY: res.direction.y,
      dirZ: res.direction.z,
      pellets: res.pellets.map((p) => ({
        endX: p.end.x,
        endY: p.end.y,
        endZ: p.end.z,
        blocked: p.blocked,
        hit: !!p.hit,
      })),
    });
  }

  const out = zombies.applyShot(res);
  zombies.alertNoise(player.x, player.z, res.noiseRadius);
  if (out.hits > 0) {
    if (res.melee) weaponAudio.meleeHit();
    else weaponAudio.hit(out.headshots > 0);
    if (out.kills > 0) showHitMark('¡Baja!', 'kill');
    else if (out.headshots > 0) showHitMark('¡Cabeza!', 'head');
    else showHitMark(res.melee ? 'Golpe' : 'Impacto', 'hit');
  }
}

/** Debug: equipa el arma (la añade si no la tienes; si el inventario está lleno reemplaza a la equipada). */
function debugGive(id: string) {
  const have = arsenal.slots.findIndex((w) => w?.def.id === id);
  if (have >= 0) {
    arsenal.select(have);
    return;
  }
  arsenal.pickup({ weapon: id }); // 'new' equipa sola; 'swap' reemplaza a la equipada
}

function debugGiveAll() {
  for (const d of allWeaponDefs()) if (!arsenal.slots.some((w) => w?.def.id === d.id)) arsenal.pickup({ weapon: d.id });
  showToast('Todas las armas en el inventario');
}

/** Debug: cargador lleno y 5 cargadores de reserva en todas las armas del inventario. */
function debugRefill() {
  for (const w of arsenal.slots) {
    if (!w || w.isMelee) continue;
    w.cancelReload();
    w.ammo = w.def.magSize;
    w.reserve = w.def.magSize * 5;
  }
  showToast('Munición completa');
}

function debugSpawnZombies() {
  if (!zombies) return;
  const spawned = zombies.spawnTest(player.x, player.z, 6, 14);
  if (networkManager.isConnected && networkManager.currentRoom) {
    for (const s of spawned) {
      networkManager.sendZombieSpawn({
        id: s.id,
        x: s.x,
        z: s.z,
        rot: s.rot,
        tier: s.tier,
        heightVar: s.heightVar,
      });
    }
  }
}

function debugSpawnExtreme() {
  if (!zombies) return;
  const req = zombies.spawnExtreme(player.x, player.z, 14);
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendZombieSpawn({
      id: req.id,
      x: req.x,
      z: req.z,
      rot: req.rot,
      tier: 'extreme',
      heightVar: req.heightVar,
    });
  }
  showToast('Zombi extremo (1%) generado');
}

function debugClearZombies() {
  const n = zombies?.removeNear(player.x, player.z, 60) ?? 0;
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendZombieClear(player.x, player.z, 60);
  }
  showToast(`${n} zombis eliminados`);
}

function debugReset() {
  arsenal = makeArsenal();
  showToast('Inventario reiniciado');
}

function onDebugMouseDown(e: MouseEvent) {
  e.stopPropagation();
  const target = e.target as HTMLElement | null;
  // Previene que los botones roben el foco del teclado (para mantener WASD y Espacio activos),
  // pero permite la interacción nativa con los sliders (<input type="range">) y el scroll del panel.
  if (target?.closest('button')) {
    e.preventDefault();
  }
}

function blurInput(e: Event) {
  (e.target as HTMLElement | null)?.blur();
}

function resetPushSliders() {
  Object.assign(carPushConfig, DEFAULT_CAR_PUSH_CONFIG);
  if (zombies) zombies.carPushConfig = carPushConfig;
  showToast('Valores de empuje restablecidos por defecto');
}

function debugSpawnCar() {
  if (!vehicles) return;
  const fx = Math.sin(player.rot);
  const fz = Math.cos(player.rot);
  const spawnX = player.x + fx * 4.0;
  const spawnZ = player.z + fz * 4.0;
  const dc = vehicles.spawnCar(spawnX, spawnZ, player.rot, selectedSpawnArchetype.value);
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendVehicleSpawn({
      vehicleId: dc.id,
      archetype: dc.config.archetype,
      x: dc.x,
      z: dc.z,
      heading: dc.heading,
      durability: dc.currentDurability,
      fuel: dc.fuel,
    });
  }
  showToast(`${dc.config.name} (${dc.config.archetype}) creado (F para entrar)`);
  sound.playPlayClick();
}

function debugSpawnAndEnterCar() {
  if (!vehicles) return;
  if (vehicles.driven) exitCar();
  const fx = Math.sin(player.rot);
  const fz = Math.cos(player.rot);
  const spawnX = player.x + fx * 1.5;
  const spawnZ = player.z + fz * 1.5;
  const dc = vehicles.spawnCar(spawnX, spawnZ, player.rot, selectedSpawnArchetype.value);
  vehicles.enter({ id: dc.id, status: 'open', d: 0, owned: dc });
  if (playerMesh) playerMesh.visible = false;
  carHud.driving = true;
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendVehicleSpawn({
      vehicleId: dc.id,
      archetype: dc.config.archetype,
      x: dc.x,
      z: dc.z,
      heading: dc.heading,
      durability: dc.currentDurability,
      fuel: dc.fuel,
    });
  }
  showToast(`¡Abordaste ${dc.config.name}! Conduce con WASD / Espacio`);
  sound.playPlayClick();
}

function debugSpawnProcedural() {
  if (!vehicles || !world) return;
  const biome = world.getBiomeAt(player.x, player.z);
  const fx = Math.sin(player.rot);
  const fz = Math.cos(player.rot);
  const spawnX = player.x + fx * 4.0;
  const spawnZ = player.z + fz * 4.0;
  const dc = vehicles.spawnProcedural(biome, spawnX, spawnZ, player.rot);
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendVehicleSpawn({
      vehicleId: dc.id,
      archetype: dc.config.archetype,
      x: dc.x,
      z: dc.z,
      heading: dc.heading,
      durability: dc.currentDurability,
      fuel: dc.fuel,
    });
  }
  showToast(`${dc.config.name} [${dc.lockState.toUpperCase()}] generado en bioma "${biome}"`);
  sound.playPlayClick();
}

function updateWeaponHud() {
  weaponHud.slots = arsenal.slots.map((w) => (w ? { name: w.def.name } : null));
  weaponHud.equipped = arsenal.equipped;
  const w = arsenal.current;
  weaponHud.equippedId = w ? w.def.id : '';
  weaponHud.name = w ? w.def.name : 'Sin arma';
  weaponHud.melee = !w || w.isMelee;
  weaponHud.ammo = w ? w.ammo : 0;
  weaponHud.reserve = w ? w.reserve : 0;
  weaponHud.reloading = !!w && w.reloading;
  weaponHud.reloadPct = w ? w.reloadProgress : 0;
}

/** Depuración (tecla L): deja las armas de prueba en el suelo alrededor del jugador. */
function debugDropWeapons() {
  if (!world) return;
  const defs = allWeaponDefs();
  defs.forEach((d, i) => {
    const a = (i / defs.length) * Math.PI * 2;
    const dropX = player.x + Math.cos(a) * 3.5;
    const dropZ = player.z + Math.sin(a) * 3.5;
    const dropId = world!.drops.dropAt({ weapon: d.id }, dropX, dropZ);
    if (networkManager.isConnected && networkManager.currentRoom) {
      networkManager.sendItemDrop({
        id: dropId,
        weaponId: d.id,
        x: dropX,
        z: dropZ,
      });
    }
  });
  showToast('Armas de prueba en el suelo a tu alrededor');
}

function onMouseMove(e: MouseEvent) {
  if (gameCanvas.value) aim.setFromEvent(e, gameCanvas.value);
}

function onMouseDown(e: MouseEvent) {
  if (isChatFocused.value) return;
  if (e.button !== 0) return;
  if (gameCanvas.value) aim.setFromEvent(e, gameCanvas.value);
  fireHeld = true;
  semiPending = true;
}

function onMouseUp(e: MouseEvent) {
  if (e.button !== 0) return;
  fireHeld = false;
  semiPending = false;
}

function handleKeyDown(e: KeyboardEvent) {
  if (isChatFocused.value) return;
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k.startsWith('arrow') || e.key === ' ') e.preventDefault();
  if (e.key === 'Escape') {
    if (showSettings.value) {
      showSettings.value = false;
    } else {
      isPaused.value = !isPaused.value;
      if (!isPaused.value && document.pointerLockElement !== gameCanvas.value) {
        gameCanvas.value?.requestPointerLock();
      }
    }
  }
  if (isPaused.value) return; // No procesar más teclas si está en pausa
  
  if (k === 'c' && !e.repeat) {
    isStealth.value = !isStealth.value;
    showToast(isStealth.value ? 'Modo sigilo activado' : 'Modo caminata normal');
  }
  if (k === 'r' && !e.repeat) reloadWeapon();
  if (k === 'g' && !e.repeat) useSelectedExplosive();
  if (k === 'h' && !e.repeat) cycleExplosive();
  if (k === 't' && !e.repeat) detonateC4();
  if (k === 'k' && !e.repeat) {
    if (networkManager.isConnected && networkManager.currentRoom) {
      showToast('En multijugador la semilla está fijada por la sala');
    } else {
      startWorld(newSeed());
    }
  }
  if (k === 'l' && !e.repeat) debugDropWeapons();
  if (e.key === 'Tab') {
    e.preventDefault();
    if (!e.repeat) debugOpen.value = !debugOpen.value;
  }
  if (k === 'f' && !e.repeat) interact();
  if (k === 'n' && !e.repeat) {
    cycle?.skipPhase();
    if (cycle && networkManager.isConnected && networkManager.currentRoom) {
      networkManager.sendDayNightSync(cycle.time);
    }
  }
  if (/^[1-5]$/.test(e.key) && !vehicles?.driven) arsenal.select(Number(e.key) - 1);
}

function handleKeyUp(e: KeyboardEvent) {
  keys[e.key.toLowerCase()] = false;
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  cam.dist = THREE.MathUtils.clamp(cam.dist + Math.sign(e.deltaY) * 3, cam.minDist, cam.maxDist);
}

function exit() {
  sound.playClick();
  emit('exit');
}

function resize() {
  if (!renderer || !camera || !container.value) return;
  const w = container.value.clientWidth;
  const h = container.value.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

let frame = 0;
let lastTime = 0;

function loop(now: number) {
  animId = requestAnimationFrame(loop);
  if (!renderer || !scene || !camera || !world || !playerMesh) return;

  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;

  // Si el juego está en pausa:
  if (isPaused.value) {
    // Si estamos en multijugador, la lógica sigue corriendo pero ignoramos los inputs del jugador.
    // Si es un solo jugador, congelamos el mundo entero.
    if (!networkManager.currentRoom) {
      renderer.render(scene, camera);
      return;
    }
    // Para multijugador, forzamos inputs a 0
    for (const k in keys) keys[k] = false;
    mobileMove.value = { x: 0, y: 0 };
    mobileAim.value = { x: 0, y: 0, active: false, fire: false };
    fireHeld = false;
  }

  // Movimiento relativo a la cámara: W = hacia "arriba" en pantalla.
  const fx = -Math.sin(cam.yaw);
  const fz = -Math.cos(cam.yaw);
  const rx = Math.cos(cam.yaw);
  const rz = -Math.sin(cam.yaw);
  let mx = 0;
  let mz = 0;
  const drv = vehicles?.driven ?? null;
  // Canalizando resurrección: sin control de movimiento (tampoco joystick).
  if (!drv && !reviving.value) {
    if (keys['w'] || keys['arrowup']) { mx += fx; mz += fz; }
    if (keys['s'] || keys['arrowdown']) { mx -= fx; mz -= fz; }
    if (keys['d'] || keys['arrowright']) { mx += rx; mz += rz; }
    if (keys['a'] || keys['arrowleft']) { mx -= rx; mz -= rz; }
    
    // Joystick móvil
    if (mobileMove.value.y !== 0) {
      mx += mobileMove.value.y * fx;
      mz += mobileMove.value.y * fz;
    }
    if (mobileMove.value.x !== 0) {
      mx += mobileMove.value.x * rx;
      mz += mobileMove.value.x * rz;
    }
  }

  const moving = mx !== 0 || mz !== 0;
  const running = moving && keys['shift'] && playerStamina.value > 0;
  const stealthing = moving && !running && (isStealth.value || !!keys['control']);
  const speed = running ? player.runSpeed : stealthing ? player.stealthSpeed : player.walkSpeed;
  if (moving) {
    const len = Math.hypot(mx, mz);
    player.x += (mx / len) * speed * dt;
    player.z += (mz / len) * speed * dt;
    const target = Math.atan2(mx, mz);
    let diff = target - player.rot;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.rot += diff * Math.min(1, dt * 14);
    // Hitbox de las cabañas
    const fixed = world.resolveCollision(player.x, player.z, player.radius);
    player.x = fixed.x;
    player.z = fixed.z;
  }
  playerStamina.value = THREE.MathUtils.clamp(
    playerStamina.value + (running ? -22 : 14) * dt,
    0,
    100,
  );
  // El destello de sangre se apaga solo (~0.8 s)
  if (bloodFlash.value > 0) bloodFlash.value = Math.max(0, bloodFlash.value - dt * 1.3);

  if (keys['q']) cam.yaw -= 1.6 * dt;
  if (keys['e']) cam.yaw += 1.6 * dt;

  // Conduciendo: el jugador va dentro del carro (oculto) y la cámara sigue al carro
  if (drv && vehicles) {
    // Canalizando: el carro va solo (sin acelerador ni giro) hasta detenerse.
    const input: DriveInput = reviving.value
      ? { throttle: 0, steer: 0, handbrake: false }
      : {
        throttle: (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0) + mobileMove.value.y,
        steer: (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0) - mobileMove.value.x,
        handbrake: !!keys[' '],
      };
    vehicles.update(dt, input, cycle?.lampFactor ?? 0);
    player.x = drv.x;
    player.z = drv.z;
    player.rot = drv.heading;

    // Alerta zombis circundantes por el radio de ruido dinámico del motor
    if (drv.currentNoiseRadius > 0 && frame % 12 === 0) {
      zombies?.alertNoise(drv.x, drv.z, drv.currentNoiseRadius);
    }
  }

  // Recarga de gasolina (si la hay): consume la estación, llena el tanque y anima el chorro
  if (refuel) {
    const wasActive = refuel.isActive;
    const rs = refuel.update(dt, player.x, player.z);
    refuelHud.active = rs.active;
    if (rs.active) {
      refuelHud.added = rs.added;
      refuelHud.pct = rs.fuelFraction;
      refuelHud.left = rs.stationLeft;
    } else if (wasActive) {
      const why = refuel.lastEnd;
      showToast(
        why === 'full'
          ? `Tanque lleno · +${rs.added.toFixed(1)} L`
          : why === 'empty'
            ? 'La estación se quedó sin gasolina'
            : why === 'away'
              ? 'Recarga interrumpida: te alejaste'
              : 'Recarga interrumpida',
      );
      updatePrompt();
    }
  }

  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.rotation.y = player.rot;

  // Cámara siguiendo al jugador (o al carro) desde arriba; se aleja un poco al ir rápido.
  // El retroceso de las armas empuja temporalmente el pitch/yaw y se recupera con lerp (RecoilController).
  recoil.update(dt);
  camExtra += ((drv ? Math.min(12, Math.abs(drv.speed) * 0.45) : 0) - camExtra) * Math.min(1, dt * 2);
  const camDist = cam.dist + camExtra;
  const camPitch = cam.pitch + recoil.pitch;
  const camYaw = cam.yaw + recoil.yaw;
  const cp = Math.cos(camPitch);
  camera.position.set(
    player.x + Math.sin(camYaw) * cp * camDist,
    Math.sin(camPitch) * camDist,
    player.z + Math.cos(camYaw) * cp * camDist,
  );
  camera.lookAt(player.x, 0.5, player.z);
  // Árboles y cabañas entre la cámara y el jugador se vuelven semitransparentes
  updateFadeTarget(camera, player.x, 1.0, player.z);

  // --- Armas: apuntado con el ratón, retícula, arma flotante y disparo ---
  const tSec = now / 1000;
  if (!drv) {
    arsenal.update(dt);
    const w = arsenal.current;
    companion?.setWeapon(w ? w.def.id : null, w ? w.isMelee : false);

    // Punto del suelo bajo el cursor; el jugador gira hacia él
    let hasAim = aim.update(camera);
    let heading = player.rot;
    let aimDiff = 0;
    
    // Joystick móvil anula el apuntado con el ratón
    if (mobileAim.value.active) {
      hasAim = true;
      const targetAim = Math.atan2(mobileAim.value.x, mobileAim.value.y);
      heading = targetAim;
      aim.point.x = player.x + Math.sin(heading) * 10;
      aim.point.z = player.z + Math.cos(heading) * 10;
    } else if (hasAim) {
      const ax = aim.point.x - player.x;
      const az = aim.point.z - player.z;
      if (ax * ax + az * az > 0.09) heading = Math.atan2(ax, az);
    }

    if (hasAim) {
      aimDiff = Math.atan2(Math.sin(heading - player.rot), Math.cos(heading - player.rot));
      player.rot += aimDiff * Math.min(1, dt * 20);
      playerMesh.rotation.y = player.rot;
    }
    aimHeading = heading;

    // Avatar primero: sus huesos (manos) ya quedan en la pose de este frame y
    // el arma/muzzle que se calculan después nacen de la mano, sin un frame de lag.
    if (avatar) {
      let moveHeadingDiff = 0;
      if (moving) {
        const moveAngle = Math.atan2(mx, mz);
        let diff = moveAngle - player.rot;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        moveHeadingDiff = diff;
      }
      let turnDirection: 'left' | 'right' | null = null;
      if (!moving && Math.abs(aimDiff) > 0.05) {
        // En Three.js rotaciones positivas en Y suelen ser antihorarias (izquierda)
        turnDirection = aimDiff > 0 ? 'left' : 'right';
      }
      avatar.setLocomotion({
        moving,
        speed,
        moveHeadingDiff,
        turnDirection,
        isSprinting: running,
        isStealth: stealthing,
        isAiming: hasAim,
        isReloading: !!(w && w.reloading),
        reloadDuration: w && !w.isMelee ? w.def.reloadDuration : 0,
        hasGun: !!(w && !w.isMelee),
        isBlocking: false,
      });
      avatar.update(dt);
    }

    companion?.update(tSec, player.x, player.z, heading, true);
    companion?.muzzle(muzzlePos);

    // Dirección de disparo: del cañón al punto apuntado (las balas pasan por el cursor)
    let dx = aim.point.x - muzzlePos.x;
    let dz = aim.point.z - muzzlePos.z;
    let len = Math.hypot(dx, dz);
    if (!hasAim || len < 1.2) {
      dx = Math.sin(heading);
      dz = Math.cos(heading);
      len = 1;
    }
    aimDir.set(dx / len, 0, dz / len);

    // Retícula: el aro muestra la dispersión actual a esa distancia
    const vel = moving ? speed : 0;
    const spread = w && !w.isMelee ? w.currentSpread(vel) : 0;
    weaponHud.spreadDeg = (spread * 180) / Math.PI;
    const dist = Math.hypot(aim.point.x - player.x, aim.point.z - player.z);
    reticle?.update(aim.point, w?.isMelee ? 0.3 : Math.tan(spread) * dist, hasAim, w?.reloading ? 0xff9a3c : 0xffffff);

    // Mobile fire input handling
    if (mobileAim.value.fire && !lastMobileFire) semiPending = true;
    lastMobileFire = mobileAim.value.fire;
    
    const isFiring = (fireHeld || mobileAim.value.fire) && !reviving.value;
    if (w && isFiring && (w.def.isAutomatic || semiPending)) {
      tryFire(w, vel);
    }
  } else {
    companion?.update(tSec, player.x, player.z, player.rot, false);
    reticle?.update(aim.point, 0, false, 0xffffff);
  }
  shotFx?.update(dt);
  updateShockRings(dt);
  world.drops.update(tSec);

  // Explosivos: física de vuelo, mechas, minas, fuego y VFX
  if (explosives) {
    explosives.setPlayerPos(player.x, player.z);
    explosives.update(dt);
    const blastDmg = explosives.drainPlayerBlasts(player.x, player.z);
    if (blastDmg > 0) blastHurtPlayer(blastDmg);
    // Fuego bajo los pies: se acumula y golpea cada 0.5 s (un flash por golpe)
    burnAccum += explosives.drainFireDamage();
    burnTickT += dt;
    if (burnAccum >= 3 && burnTickT >= 0.5) {
      const d = burnAccum;
      burnAccum = 0;
      burnTickT = 0;
      blastHurtPlayer(d);
    }
  }

  // Canalización de resurrección: 5 s inmóvil brillando; al completar,
  // onda de choque radial (no letal) + salud restaurada.
  if (reviving.value) {
    reviveT += dt;
    avatar?.setReviveGlow(reviveT / REVIVE_DURATION);
    if (reviveT >= REVIVE_DURATION) {
      reviving.value = false;
      avatar?.clearReviveGlow();
      zombies?.blastWave(player.x, player.z, REVIVE_BLAST_RADIUS, REVIVE_BLAST_POWER);
      spawnShockRing(player.x, player.z, REVIVE_BLAST_RADIUS);
      playerHealth.value = 100;
      showToast(`¡Resucitado! Te quedan ${playerLives.value} ${playerLives.value === 1 ? 'vida' : 'vidas'}`);
    }
  }

  if (cycle) {
    cycle.update(dt);
    setLampLevel(cycle.lampFactor);
    updateFireFx(now / 1000, cycle.lampFactor);
    updateSun(player.x, player.z, cycle.lightDir);
  }

  world.update(player.x, player.z);
  const otherPositions = remotePlayers?.getOtherPlayerPositions() ?? [];
  // Carros con conductor remoto (fantasmas sincronizados): sólidos para los
  // zombis locales y atacables con animación. El daño real a su chapa lo
  // aplica el conductor (autoridad del vehículo); los atropellos los replica
  // el conductor por evento (applyRemoteHit → knockDown), así que aquí no se
  // generan golpes nuevos para ellos.
  const remoteCars: RemoteCarInfo[] = [];
  if (remotePlayers && vehicles) {
    for (const rider of remotePlayers.getInVehicleRiders()) {
      const car = vehicles.getCar(rider.vehicleId);
      if (!car || car === vehicles.driven) continue;
      remoteCars.push({
        x: car.x,
        z: car.z,
        heading: car.heading,
        halfL: car.dims.L * 0.5,
        halfW: car.dims.W * 0.5,
      });
      // Sus motores también atraen a la horda (como el local de arriba).
      if (car.isEngineRunning && frame % 12 === 0) {
        zombies?.alertNoise(car.x, car.z, 8 + Math.min(25, Math.abs(car.speed) * 1.1));
      }
    }
  }
  zombies?.update(dt, player.x, player.z, drv, otherPositions, { isStealth: stealthing, isRunning: running }, remoteCars);
  remotePlayers?.update(dt);

  // Transmisión de estado multijugador en tiempo real
  if (networkManager.isConnected && networkManager.currentRoom) {
    networkManager.sendPlayerState({
      x: player.x,
      y: 0,
      z: player.z,
      heading: player.rot,
      speed: moving ? speed : 0,
      isMoving: moving,
      isRunning: running,
      isStealth: stealthing,
      currentAnim: moving ? (running ? 'run' : stealthing ? 'sneak' : 'walk') : 'idle',
      equippedWeapon: arsenal.current?.def.id ?? null,
      health: playerHealth.value,
      maxHealth: 100,
      isInVehicle: !!drv,
      vehicleId: drv ? drv.id : null,
    });

    if (drv) {
      networkManager.sendVehicleState({
        vehicleId: drv.id,
        archetype: drv.config.archetype,
        x: drv.x,
        y: 0,
        z: drv.z,
        heading: drv.heading,
        speed: drv.currentSpeed,
        steer: drv.steer,
        durability: drv.currentDurability,
        maxDurability: drv.config.maxDurability,
        fuel: drv.fuel,
        isEngineRunning: drv.isEngineRunning,
      });
    }

    // Sincronización periódica de zombis activos (cada 10 frames)
    if (frame % 10 === 0 && zombies) {
      const activeZombies = zombies.getActiveZombiesSync(18, 30);
      if (activeZombies.length > 0) {
        networkManager.sendZombieSync(activeZombies);
      }
    }

    // Sincronización periódica de ciclo día/noche (cada 240 frames, ~4s)
    if (frame % 240 === 0 && cycle) {
      networkManager.sendDayNightSync(cycle.time);
    }
  }

  if (cycle) lampLights?.update(world, player.x, player.z, cycle.lampFactor, now / 1000);

  if (frame % 4 === 0) {
    updatePrompt();
    updateWeaponHud();
    if (drv) {
      carHud.driving = true;
      carHud.speed = Math.round(Math.abs(drv.speed) * 3.6);
      carHud.fuel = drv.fuel;
      carHud.fuelPct = drv.fuelFraction;
      carHud.name = drv.config.name;
      carHud.archetype = drv.config.archetype;
      carHud.durability = drv.currentDurability;
      carHud.maxDurability = drv.config.maxDurability;
      carHud.durabilityPct = drv.durabilityFraction;
      carHud.engineRunning = drv.isEngineRunning;
      carHud.noiseRadius = drv.currentNoiseRadius;
      carHud.terrain = world.getTerrainType(drv.x, drv.z);
      carHud.mass = drv.config.mass;
      carHud.offroadTraction = drv.config.offroadTractionMultiplier;
    }
  }

  if (++frame % 8 === 0) {
    const cs = WORLD.chunkSize;
    hud.x = Math.round(player.x);
    hud.z = Math.round(player.z);
    hud.cx = Math.floor(player.x / cs);
    hud.cz = Math.floor(player.z / cs);
    hud.chunks = world.loadedCount;
    hud.zombies = zombies ? zombies.count : 0;
    hud.kills = zombies ? zombies.kills : 0;
    if (cycle) {
      hud.clock = cycle.clock;
      hud.night = cycle.isNight;
    }
    const nc = world.nearestCity(player.x, player.z);
    hud.city = nc ? `${Math.round(nc.dist)} m` : 'ninguna cerca';
  }

  renderer.render(scene, camera);
}

onMounted(() => {
  const canvas = gameCanvas.value;
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Colores/intensidades iniciales; el ciclo día/noche los actualiza cada frame
  scene = new THREE.Scene();
  const background = new THREE.Color(0x8fa3b0);
  const fog = new THREE.Fog(background.clone(), 80, WORLD.chunkSize * WORLD.viewRadius + 10);
  scene.background = background;
  scene.fog = fog;

  camera = new THREE.PerspectiveCamera(40, 1, 1, 500);

  const hemi = new THREE.HemisphereLight(0xaab8c8, 0x2a3320, 0.75);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffe9c4, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  const sc = sun.shadow.camera;
  sc.left = -SHADOW_EXTENT;
  sc.right = SHADOW_EXTENT;
  sc.top = SHADOW_EXTENT;
  sc.bottom = -SHADOW_EXTENT;
  sc.near = 1;
  sc.far = 250;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  cycle = new DayNightCycle(background, fog, hemi, sun);
  lampLights = new LampLights(scene);

  companion = new WeaponCompanion(scene);
  shotFx = new ShotFx(scene);
  reticle = new AimReticle(scene);

  playerMesh = createPlayerMesh();
  scene.add(playerMesh);

  // Inicialización de jugadores remotos multijugador
  remotePlayers = new RemotePlayerManager(scene);
  if (networkManager.currentRoom) {
    if (networkManager.currentRoom.dayNightTime !== undefined && cycle) {
      cycle.setTime(networkManager.currentRoom.dayNightTime);
    }
    for (const p of networkManager.currentRoomPlayers) {
      if (p.connectionId !== networkManager.connectionId) {
        remotePlayers.updatePlayer(p);
      }
    }
  }

  networkManager.onRemotePlayerUpdate = (state) => {
    remotePlayers?.updatePlayer(state);
  };
  networkManager.onPlayerJoined = (state) => {
    remotePlayers?.updatePlayer(state);
  };
  networkManager.onPlayerLeft = (connId, nick) => {
    remotePlayers?.removePlayer(connId);
    showToast(`${nick} salió de la partida`);
  };
  networkManager.onJoinedRoom = (room, initialPlayers) => {
    remotePlayers?.clear();
    for (const p of initialPlayers) {
      if (p.connectionId !== networkManager.connectionId) {
        remotePlayers?.updatePlayer(p);
      }
    }
    showToast(`Conectado a ${room.name}`);
    if (room.seed && seed.value !== room.seed) {
      seed.value = room.seed;
      startWorld(room.seed);
    }
    if (room.dayNightTime !== undefined && cycle) {
      cycle.setTime(room.dayNightTime);
    }
  };
  networkManager.onRemoteVehicleUpdate = (state) => {
    if (!vehicles) return;
    let car = vehicles.getCar(state.vehicleId);
    if (!car && state.x !== 0) {
      car = vehicles.spawnCar(state.x, state.z, state.heading, state.archetype, state.vehicleId);
    }
    if (car && car !== vehicles.driven) {
      car.x = state.x;
      car.z = state.z;
      car.heading = state.heading;
      car.speed = state.speed;
      car.steer = state.steer;
      car.currentDurability = state.durability;
      car.currentFuel = state.fuel;
      car.isEngineRunning = state.isEngineRunning;
      car.syncMesh();
    }
  };
  networkManager.onZombieHitEvent = (hit) => {
    if (hit.attackerConnectionId === networkManager.connectionId) return;
    weaponAudio.hit(false);
    if (hit.isKilled) {
      sound.playEnemyDeath();
    }
    zombies?.applyRemoteHit(hit);
  };
  networkManager.onZombieAlertEvent = (zombieId, x, z) => {
    zombies?.applyRemoteAlert(zombieId, x, z);
  };
  networkManager.onZombieSyncBatch = (batch) => {
    zombies?.applyRemoteSync(batch);
  };
  networkManager.onZombieSpawnEvent = (spawn) => {
    zombies?.spawnFromNetwork(spawn);
  };
  networkManager.onDayNightSyncEvent = (time) => {
    cycle?.setTime(time);
  };
  networkManager.onVehicleSpawnEvent = (spawn) => {
    if (!vehicles) return;
    let car = vehicles.getCar(spawn.vehicleId);
    if (!car) {
      car = vehicles.spawnCar(spawn.x, spawn.z, spawn.heading, spawn.archetype, spawn.vehicleId);
      car.currentDurability = spawn.durability;
      car.fuel = spawn.fuel;
      car.syncMesh();
    }
  };
  networkManager.onZombieClearEvent = (x, z, r) => {
    zombies?.removeNear(x, z, r);
  };
  networkManager.onItemDropEvent = (drop) => {
    world?.drops.dropAtWithId(drop.id, { weapon: drop.weaponId as any, ammo: drop.ammo, reserve: drop.reserve }, drop.x, drop.z);
  };
  networkManager.onItemPickupEvent = (dropId) => {
    world?.drops.take(dropId);
  };
  networkManager.onPlayerShotEvent = (shot) => {
    if (shot.shooterConnectionId === networkManager.connectionId) return;

    // Reproducir fogonazo, trazadoras y partículas de impacto
    shotFx?.playRemote({
      category: shot.category,
      isMelee: shot.isMelee,
      muzzle: new THREE.Vector3(shot.muzzleX, shot.muzzleY, shot.muzzleZ),
      direction: new THREE.Vector3(shot.dirX, shot.dirY, shot.dirZ),
      pellets: shot.pellets.map((p) => ({
        end: new THREE.Vector3(p.endX, p.endY, p.endZ),
        blocked: p.blocked,
        hit: p.hit,
      })),
    });

    // Reproducir animación de ataque en el personaje remoto
    remotePlayers?.playAttack(shot.shooterConnectionId, shot.isMelee);

    // Reproducir sonido espacial según la distancia del jugador local al tirador
    const dist = Math.hypot(player.x - shot.muzzleX, player.z - shot.muzzleZ);
    if (dist < 75) {
      if (shot.isMelee) {
        if (dist < 20) weaponAudio.swing();
      } else {
        weaponAudio.shot(shot.category as any);
      }
    }
  };

  // Carga de Miku (modelo + animaciones); reemplaza a la cápsula cuando esté lista
  PlayerAvatar.load()
    .then((a) => {
      if (!playerMesh) {
        a.dispose(); // el componente se desmontó mientras cargaba
        return;
      }
      playerMesh.clear();
      playerMesh.add(a.root);
      avatar = a;
      companion?.setHandBone(a.getRightHandBone());
    })
    .catch((err) => console.error('[zombie-game] No se pudo cargar el avatar de Miku:', err));

  startWorld(seed.value);

  resize();
  resizeObserver = new ResizeObserver(resize);
  if (container.value) resizeObserver.observe(container.value);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mouseup', onMouseUp);

  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animId);
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  gameCanvas.value?.removeEventListener('wheel', handleWheel);
  gameCanvas.value?.removeEventListener('mousemove', onMouseMove);
  gameCanvas.value?.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mouseup', onMouseUp);
  if (toastTimer) clearTimeout(toastTimer);
  hitFeed.value = [];
  companion?.dispose();
  shotFx?.dispose();
  reticle?.dispose();
  companion = shotFx = reticle = null;
  refuel?.dispose();
  vehicles?.dispose();
  zombies?.dispose();
  explosives?.dispose();
  explosives = null;
  lampLights?.dispose();
  avatar?.dispose();
  avatar = null;
  remotePlayers?.clear();
  remotePlayers = null;
  networkManager.onRemotePlayerUpdate = undefined;
  networkManager.onPlayerJoined = undefined;
  networkManager.onPlayerLeft = undefined;
  networkManager.onJoinedRoom = undefined;
  networkManager.onRemoteVehicleUpdate = undefined;
  networkManager.onZombieHitEvent = undefined;
  networkManager.onZombieAlertEvent = undefined;
  networkManager.onZombieSyncBatch = undefined;
  networkManager.onZombieSpawnEvent = undefined;
  networkManager.onDayNightSyncEvent = undefined;
  networkManager.onVehicleSpawnEvent = undefined;
  networkManager.onZombieClearEvent = undefined;
  networkManager.onItemDropEvent = undefined;
  networkManager.onItemPickupEvent = undefined;
  networkManager.onPlayerShotEvent = undefined;
  world?.dispose();
  renderer?.dispose();
  renderer = null;
  scene = null;
  playerMesh = null;
  world = null;
  zombies = null;
  vehicles = null;
  refuel = null;
  lampLights = null;
  cycle = null;
});
</script>

<style scoped>
/* Texto de combate flotante estilo Fortnite: rebote con overshoot, subida y fundido */
.hit-float {
  letter-spacing: 0.12em;
  animation: hit-pop 0.95s cubic-bezier(0.22, 1.4, 0.36, 1) forwards;
  /* Contorno oscuro para legibilidad sobre cualquier fondo */
  text-shadow:
    -1px -1px 0 rgba(0, 0, 0, 0.85),
    1px -1px 0 rgba(0, 0, 0, 0.85),
    -1px 1px 0 rgba(0, 0, 0, 0.85),
    1px 1px 0 rgba(0, 0, 0, 0.85),
    0 0 12px rgba(0, 0, 0, 0.6);
}
.hit-tone-hit {
  font-size: 15px;
  color: #f5f5f4;
}
.hit-tone-head {
  font-size: 24px;
  color: #fde047;
}
.hit-tone-kill {
  font-size: 31px;
  color: #f87171;
}
@keyframes hit-pop {
  0% {
    transform: rotate(var(--tilt, 0deg)) scale(0.4);
    opacity: 0;
  }
  22% {
    transform: translateY(-14px) rotate(var(--tilt, 0deg)) scale(1.28);
    opacity: 1;
  }
  42% {
    transform: translateY(-22px) rotate(var(--tilt, 0deg)) scale(0.94);
    opacity: 1;
  }
  62% {
    transform: translateY(-32px) rotate(var(--tilt, 0deg)) scale(1.07);
    opacity: 1;
  }
  100% {
    transform: translateY(-58px) rotate(var(--tilt, 0deg)) scale(1);
    opacity: 0;
  }
}
</style>
