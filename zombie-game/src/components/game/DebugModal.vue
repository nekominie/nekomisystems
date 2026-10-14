<template>
  <div
    class="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 font-mono select-none"
    @click.self="$emit('close')"
    @mousedown="onRootMouseDown"
  >
    <div
      class="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0a0c10]/96 border border-yellow-600/50 rounded-xs shadow-[0_0_50px_rgba(0,0,0,0.9),inset_0_0_24px_rgba(234,179,8,0.04)] text-stone-200 overflow-hidden"
    >
      <!-- Cabecera + interruptor maestro (siempre visible) -->
      <header class="px-4 sm:px-5 py-3 border-b border-yellow-700/40 bg-black/90 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div class="flex items-start sm:items-center gap-3 min-w-0">
          <div class="w-9 h-9 shrink-0 rounded-xs border border-yellow-600/50 bg-yellow-950/40 flex items-center justify-center text-yellow-300 text-lg">
            ⚙
          </div>
          <div class="min-w-0">
            <h2 class="text-sm sm:text-base font-bold tracking-wider text-yellow-300 uppercase truncate">
              Consola de Debug // Físicas
            </h2>
            <p class="text-[10px] text-stone-500">
              Tab para abrir/cerrar · ESC para salir · acciones activas solo con modo debug ON
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap justify-end">
          <!-- Interruptor grande siempre visible -->
          <button
            type="button"
            class="group flex items-center gap-3 px-3 py-2 rounded-xs border transition-all"
            :class="enabled
              ? 'border-emerald-500/70 bg-emerald-950/50 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
              : 'border-stone-700 bg-stone-950/80 hover:border-stone-500'"
            @click="toggleEnabled"
            title="Habilitar o deshabilitar todos los efectos del modo debug"
          >
            <div class="text-left leading-tight">
              <div class="text-[9px] uppercase tracking-widest font-bold" :class="enabled ? 'text-emerald-400' : 'text-stone-500'">
                Modo debug
              </div>
              <div class="text-xs font-black uppercase tracking-wide" :class="enabled ? 'text-emerald-200' : 'text-stone-400'">
                {{ enabled ? 'Habilitado' : 'Deshabilitado' }}
              </div>
            </div>
            <div
              class="relative w-14 h-7 rounded-full border transition-colors"
              :class="enabled ? 'bg-emerald-500/30 border-emerald-400' : 'bg-stone-800 border-stone-600'"
            >
              <span
                class="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 shadow"
                :class="enabled ? 'left-8 bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'left-0.5 bg-stone-400'"
              ></span>
            </div>
          </button>

          <!-- Modo pasivo: zombis no reaccionan ni atacan -->
          <button
            type="button"
            class="group flex items-center gap-3 px-3 py-2 rounded-xs border transition-all"
            :class="!enabled
              ? 'border-stone-800 bg-stone-950/50 opacity-50 cursor-not-allowed'
              : passiveMode
                ? 'border-sky-500/70 bg-sky-950/50 shadow-[0_0_18px_rgba(14,165,233,0.25)]'
                : 'border-stone-700 bg-stone-950/80 hover:border-stone-500'"
            :disabled="!enabled"
            @click="togglePassive"
            title="Los zombis deambulan pero nunca detectan, persiguen ni atacan"
          >
            <div class="text-left leading-tight">
              <div class="text-[9px] uppercase tracking-widest font-bold" :class="enabled && passiveMode ? 'text-sky-400' : 'text-stone-500'">
                Modo pasivo
              </div>
              <div class="text-xs font-black uppercase tracking-wide" :class="enabled && passiveMode ? 'text-sky-200' : 'text-stone-400'">
                {{ !enabled ? 'Requiere debug' : passiveMode ? 'Activo' : 'Inactivo' }}
              </div>
            </div>
            <div
              class="relative w-14 h-7 rounded-full border transition-colors"
              :class="enabled && passiveMode ? 'bg-sky-500/30 border-sky-400' : 'bg-stone-800 border-stone-600'"
            >
              <span
                class="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200 shadow"
                :class="enabled && passiveMode ? 'left-8 bg-sky-400 shadow-[0_0_10px_#38bdf8]' : 'left-0.5 bg-stone-400'"
              ></span>
            </div>
          </button>

          <button
            type="button"
            class="px-3 py-2 bg-stone-900 border border-stone-700 hover:border-red-500 hover:bg-red-950/40 text-stone-300 hover:text-red-200 text-xs font-bold transition-colors"
            @click="$emit('close')"
          >
            ✕ Cerrar
          </button>
        </div>
      </header>

      <!-- Pestañas -->
      <nav class="flex border-b border-stone-800 bg-stone-950/70 text-[11px] overflow-x-auto shrink-0">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="px-3.5 py-2.5 border-b-2 font-bold uppercase tracking-wide whitespace-nowrap transition-all"
          :class="activeTab === tab.id
            ? 'border-yellow-400 text-yellow-300 bg-yellow-950/25'
            : 'border-transparent text-stone-500 hover:text-stone-200 hover:bg-stone-900/60'"
          @click="activeTab = tab.id"
        >
          <span class="mr-1.5 opacity-80">{{ tab.icon }}</span>{{ tab.label }}
        </button>
      </nav>

      <!-- Contenido -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 relative">
        <div
          v-if="!enabled && activeTab !== 'general'"
          class="mb-3 px-3 py-2 border border-amber-700/50 bg-amber-950/30 text-amber-200 text-[11px] flex items-center gap-2"
        >
          <span class="text-base">⚠</span>
          <span>El modo debug está <b>deshabilitado</b>. Actívalo con el interruptor superior para usar estas acciones.</span>
        </div>

        <!-- GENERAL -->
        <section v-if="activeTab === 'general'" class="space-y-4">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div class="border border-stone-800 bg-black/40 p-4 rounded-xs">
              <h3 class="text-xs font-bold text-yellow-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                Información del mapa
              </h3>
              <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-stone-400">
                <div>
                  <span class="text-stone-600 block text-[9px] uppercase">Hora</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.clock }}</span>
                  <span class="ml-1.5 text-[10px] font-bold" :class="worldInfo.night ? 'text-indigo-300' : 'text-yellow-300'">
                    {{ worldInfo.night ? 'NOCHE' : 'DÍA' }}
                  </span>
                </div>
                <div>
                  <span class="text-stone-600 block text-[9px] uppercase">Semilla</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.seed }}</span>
                </div>
                <div>
                  <span class="text-stone-600 block text-[9px] uppercase">Posición</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.x }}, {{ worldInfo.z }}</span>
                </div>
                <div>
                  <span class="text-stone-600 block text-[9px] uppercase">Chunk</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.cx }}, {{ worldInfo.cz }}</span>
                  <span class="text-stone-500 text-[10px]"> ({{ worldInfo.chunks }} cargados)</span>
                </div>
                <div class="col-span-2">
                  <span class="text-stone-600 block text-[9px] uppercase">Ciudad más cercana</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.city }}</span>
                </div>
                <div>
                  <span class="text-stone-600 block text-[9px] uppercase">Zombis cerca</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.zombies }}</span>
                </div>
                <div>
                  <span class="text-stone-600 block text-[9px] uppercase">Bajas</span>
                  <span class="text-stone-100 font-bold">{{ worldInfo.kills }}</span>
                </div>
              </div>
            </div>

            <div class="border border-stone-800 bg-black/40 p-4 rounded-xs">
              <h3 class="text-xs font-bold text-yellow-300 uppercase tracking-wider mb-3">Arma equipada</h3>
              <div class="flex items-center gap-3 mb-3">
                <div
                  class="w-14 h-14 bg-black/70 border border-stone-700 p-1.5 rounded-xs flex items-center justify-center"
                  v-html="iconFor(equippedId)"
                ></div>
                <div class="min-w-0">
                  <div class="text-sm font-bold text-stone-100 truncate">{{ equippedName }}</div>
                  <div class="text-[10px] text-stone-500 uppercase">
                    {{ melee ? 'Cuerpo a cuerpo' : `Disp. ${spreadDeg.toFixed(2)}°` }}
                  </div>
                </div>
              </div>
              <div class="text-[11px] text-stone-400 space-y-1">
                <div>Bajas totales: <span class="text-stone-100 font-bold">{{ worldInfo.kills }}</span></div>
                <div>Zombis en radio: <span class="text-stone-100 font-bold">{{ worldInfo.zombies }}</span></div>
              </div>
              <p class="mt-4 text-[10px] text-stone-500 leading-relaxed border-t border-stone-800 pt-3">
                Con el interruptor <b class="text-yellow-300">Habilitar modo debug</b> activo puedes spawnear armas,
                vehículos, zombis y ajustar físicas desde las demás pestañas. Al desactivarlo se revierten los
                parámetros de empuje a sus valores por defecto y se bloquean las acciones de cheat.
              </p>
            </div>
          </div>
        </section>

        <!-- ARMAS -->
        <section v-else-if="activeTab === 'weapons'" class="space-y-4" :class="{ 'opacity-55 pointer-events-none': !enabled }">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="cat in weaponCategories"
              :key="cat.id"
              type="button"
              class="px-2.5 py-1 text-[10px] font-bold uppercase border rounded-xs transition-colors"
              :class="weaponFilter === cat.id
                ? 'border-yellow-500 bg-yellow-950/40 text-yellow-300'
                : 'border-stone-700 text-stone-400 hover:border-stone-500 hover:text-stone-200'"
              @click="weaponFilter = cat.id"
            >
              {{ cat.label }}
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              v-for="w in filteredWeapons"
              :key="w.id"
              type="button"
              class="text-left border p-3 rounded-xs transition-all group"
              :class="equippedId === w.id
                ? 'border-yellow-500 bg-yellow-950/35 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
                : 'border-stone-800 bg-black/35 hover:border-yellow-600/60 hover:bg-yellow-950/15'"
              @click="$emit('giveWeapon', w.id)"
            >
              <div class="flex items-start gap-3">
                <div
                  class="w-12 h-12 shrink-0 bg-black/70 border border-stone-700 group-hover:border-yellow-600/50 p-1 rounded-xs flex items-center justify-center"
                  v-html="iconFor(w.id)"
                ></div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="text-xs font-bold text-stone-100 truncate">{{ w.name }}</span>
                    <span class="text-[9px] uppercase text-stone-500 shrink-0">{{ categoryLabel(w.category) }}</span>
                  </div>
                  <div class="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-stone-400">
                    <div>Daño <b class="text-stone-200">{{ w.damage }}<span v-if="w.pellets > 1">×{{ w.pellets }}</span></b></div>
                    <div>RPM <b class="text-stone-200">{{ w.rpm }}</b></div>
                    <div v-if="w.mag">Mag <b class="text-stone-200">{{ w.mag }}</b></div>
                    <div>Alcance <b class="text-stone-200">{{ w.range }} m</b></div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button type="button" class="dbg-btn" @click="$emit('refillAmmo')">Munición completa</button>
            <button type="button" class="dbg-btn" @click="$emit('giveAllWeapons')">Todas las armas</button>
            <button type="button" class="dbg-btn" @click="$emit('dropWeapons')">Armas al suelo [L]</button>
            <button type="button" class="dbg-btn border-red-800/80 text-red-300 hover:border-red-500" @click="$emit('resetInventory')">Solo bate</button>
          </div>
        </section>

        <!-- VEHÍCULOS -->
        <section v-else-if="activeTab === 'vehicles'" class="space-y-4" :class="{ 'opacity-55 pointer-events-none': !enabled }">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              v-for="opt in archetypeOptions"
              :key="opt.id"
              type="button"
              class="text-left border p-3 rounded-xs transition-all"
              :class="selectedArchetype === opt.id
                ? 'border-cyan-500 bg-cyan-950/30'
                : 'border-stone-800 bg-black/35 hover:border-cyan-700/60'"
              @click="$emit('update:selectedArchetype', opt.id)"
            >
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 shrink-0 bg-black/70 border border-stone-700 p-1.5 rounded-xs flex items-center justify-center"
                  v-html="HUD_ICONS[`vehicle_${opt.id}`] || HUD_ICONS.vehicle_sedan"
                ></div>
                <div>
                  <div class="text-xs font-bold text-stone-100">{{ opt.name }}</div>
                  <div class="text-[10px] text-cyan-400/80 uppercase">{{ opt.label }}</div>
                </div>
              </div>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button type="button" class="dbg-btn border-cyan-800 text-cyan-200 hover:border-cyan-400" @click="$emit('spawnCar')">
              🚗 Spawnear frente
            </button>
            <button type="button" class="dbg-btn border-cyan-800 text-cyan-200 hover:border-cyan-400" @click="$emit('spawnAndEnterCar')">
              ⚡ Spawnear y subir
            </button>
            <button type="button" class="dbg-btn border-purple-800 text-purple-200 hover:border-purple-400" @click="$emit('spawnProceduralCar')">
              🎲 Según bioma
            </button>
          </div>

          <div v-if="carHud.driving" class="border border-stone-800 bg-stone-950/70 p-3 rounded-xs text-[11px]">
            <div class="flex justify-between items-center text-yellow-300 font-bold mb-2">
              <span>{{ carHud.name }}</span>
              <span class="text-[9px] px-1.5 py-0.5 bg-stone-800 uppercase text-stone-300">{{ carHud.archetype }}</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-400">
              <div>Masa: <b class="text-stone-200">{{ carHud.mass }} kg</b></div>
              <div>Terreno: <b class="text-stone-200 uppercase">{{ carHud.terrain }}</b></div>
              <div>Ruido: <b class="text-stone-200">{{ Math.round(carHud.noiseRadius) }} m</b></div>
              <div>Offroad: <b class="text-stone-200">{{ Math.round(carHud.offroadTraction * 100) }}%</b></div>
            </div>
          </div>
        </section>

        <!-- ZOMBIES -->
        <section v-else-if="activeTab === 'zombies'" class="space-y-4" :class="{ 'opacity-55 pointer-events-none': !enabled }">
          <div
            class="border p-3 rounded-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            :class="passiveMode ? 'border-sky-600/60 bg-sky-950/25' : 'border-stone-800 bg-black/40'"
          >
            <div class="min-w-0">
              <div class="text-xs font-bold uppercase tracking-wider" :class="passiveMode ? 'text-sky-300' : 'text-stone-200'">
                Modo pasivo
              </div>
              <p class="text-[10px] text-stone-500 mt-1 leading-relaxed">
                Los zombis siguen deambulando, pero <b class="text-stone-300">no detectan</b>,
                <b class="text-stone-300">no persiguen</b> y <b class="text-stone-300">no atacan</b>
                (ni al jugador, ni a carros, ni por ruido de disparos).
              </p>
            </div>
            <button
              type="button"
              class="shrink-0 px-4 py-2 border text-[11px] font-bold uppercase tracking-wide rounded-xs transition-colors"
              :class="passiveMode
                ? 'border-sky-400 bg-sky-500/20 text-sky-200'
                : 'border-stone-600 text-stone-300 hover:border-sky-500 hover:text-sky-300'"
              @click="togglePassive"
            >
              {{ passiveMode ? 'Desactivar pasivo' : 'Activar pasivo' }}
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="border border-stone-800 bg-black/40 p-4 rounded-xs flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12" v-html="HUD_ICONS.zombie"></div>
                <div>
                  <div class="text-xs font-bold text-stone-100">Horda de prueba</div>
                  <div class="text-[10px] text-stone-500">6 zombis a ~14 m</div>
                </div>
              </div>
              <button type="button" class="dbg-btn" @click="$emit('spawnZombies')">+6 zombis</button>
            </div>

            <div class="border border-red-900/50 bg-red-950/20 p-4 rounded-xs flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12" v-html="HUD_ICONS.zombie_extreme"></div>
                <div>
                  <div class="text-xs font-bold text-red-200">Zombi extremo</div>
                  <div class="text-[10px] text-red-400/80">Tier 1% · muy peligroso</div>
                </div>
              </div>
              <button type="button" class="dbg-btn border-red-800 text-red-300 hover:border-red-500" @click="$emit('spawnExtreme')">
                +1 Extremo
              </button>
            </div>

            <div class="border border-stone-800 bg-black/40 p-4 rounded-xs flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <div class="w-12 h-12 opacity-70" v-html="HUD_ICONS.zombie_clear"></div>
                <div>
                  <div class="text-xs font-bold text-stone-100">Limpieza</div>
                  <div class="text-[10px] text-stone-500">Eliminar en radio 60 m</div>
                </div>
              </div>
              <button type="button" class="dbg-btn" @click="$emit('clearZombies')">Quitar zombis (60 m)</button>
            </div>
          </div>

          <div class="text-[11px] text-stone-500 border border-stone-800 bg-black/30 p-3 rounded-xs">
            Zombis cerca ahora: <b class="text-stone-200">{{ worldInfo.zombies }}</b>
            · Bajas de la sesión: <b class="text-stone-200">{{ worldInfo.kills }}</b>
          </div>
        </section>

        <!-- EXPLOSIVOS -->
        <section v-else-if="activeTab === 'explosives'" class="space-y-4" :class="{ 'opacity-55 pointer-events-none': !enabled }">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="ex in explosives"
              :key="ex.id"
              class="border border-stone-800 bg-black/35 p-3 rounded-xs flex items-center gap-3"
            >
              <div
                class="w-12 h-12 shrink-0 bg-black/70 border border-stone-700 p-1 rounded-xs flex items-center justify-center"
                v-html="iconFor(ex.id)"
              ></div>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-stone-100">{{ ex.name }}</div>
                <div class="text-[10px] text-stone-500">En inventario: <b class="text-yellow-300">{{ explosiveCounts[ex.id] ?? 0 }}</b></div>
              </div>
            </div>
          </div>
          <button type="button" class="dbg-btn border-orange-800 text-orange-200 hover:border-orange-400 w-full sm:w-auto" @click="$emit('refillExplosives')">
            🧨 Reponer explosivos
          </button>
        </section>

        <!-- FÍSICAS -->
        <section v-else-if="activeTab === 'physics'" class="space-y-4" :class="{ 'opacity-55 pointer-events-none': !enabled }">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold text-yellow-300 uppercase tracking-wider">Empuje ragdoll (vehículo → zombi)</h3>
            <button type="button" class="text-[10px] text-stone-400 hover:text-yellow-300 underline" @click="$emit('resetPush')">
              Restaurar defecto
            </button>
          </div>

          <div class="space-y-4 bg-stone-950/80 border border-stone-800 p-4 rounded-xs">
            <div v-for="slider in pushSliders" :key="slider.key">
              <div class="flex justify-between items-center text-stone-300 mb-1 text-[11px]">
                <span>{{ slider.label }}</span>
                <span class="font-bold text-yellow-300 bg-stone-900 px-1.5 py-0.5 border border-stone-700">
                  {{ formatPush(slider) }}
                </span>
              </div>
              <input
                type="range"
                :min="slider.min"
                :max="slider.max"
                :step="slider.step"
                :value="pushConfig[slider.key]"
                @input="onPushInput(slider.key, $event)"
                @change="blurInput"
                @pointerup="blurInput"
                class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
              />
              <div class="flex justify-between text-[9px] text-stone-600 mt-0.5">
                <span>{{ slider.lo }}</span>
                <span>{{ slider.mid }}</span>
                <span>{{ slider.hi }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { HUD_ICONS } from './hudIcons';
import type { VehicleArchetype } from '../../game/vehicles';
import type { CarPushConfig } from '../../game/world/zombies';

export interface DebugWeaponRow {
  id: string;
  name: string;
  category: string;
  damage: number;
  pellets: number;
  rpm: number;
  mag: number;
  reload: number;
  range: number;
  noise: number;
  auto: boolean;
}

export interface DebugWorldInfo {
  clock: string;
  night: boolean;
  seed: number | string;
  x: number;
  z: number;
  cx: number;
  cz: number;
  chunks: number;
  city: string;
  zombies: number;
  kills: number;
}

export interface DebugCarHud {
  driving: boolean;
  name: string;
  archetype: string;
  mass: number;
  terrain: string;
  noiseRadius: number;
  offroadTraction: number;
}

const props = defineProps<{
  enabled: boolean;
  passiveMode: boolean;
  weapons: DebugWeaponRow[];
  equippedId: string;
  equippedName: string;
  melee: boolean;
  spreadDeg: number;
  worldInfo: DebugWorldInfo;
  archetypeOptions: { id: VehicleArchetype; label: string; name: string }[];
  selectedArchetype: VehicleArchetype;
  carHud: DebugCarHud;
  pushConfig: CarPushConfig;
  explosives: { id: string; name: string }[];
  explosiveCounts: Record<string, number>;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'update:enabled', v: boolean): void;
  (e: 'update:passiveMode', v: boolean): void;
  (e: 'update:selectedArchetype', v: VehicleArchetype): void;
  (e: 'update:pushConfig', key: keyof CarPushConfig, value: number): void;
  (e: 'giveWeapon', id: string): void;
  (e: 'giveAllWeapons'): void;
  (e: 'refillAmmo'): void;
  (e: 'dropWeapons'): void;
  (e: 'resetInventory'): void;
  (e: 'spawnCar'): void;
  (e: 'spawnAndEnterCar'): void;
  (e: 'spawnProceduralCar'): void;
  (e: 'spawnZombies'): void;
  (e: 'spawnExtreme'): void;
  (e: 'clearZombies'): void;
  (e: 'refillExplosives'): void;
  (e: 'resetPush'): void;
}>();

const activeTab = ref<'general' | 'weapons' | 'vehicles' | 'zombies' | 'explosives' | 'physics'>('general');
const weaponFilter = ref('all');

const tabs = [
  { id: 'general' as const, label: 'General', icon: '📋' },
  { id: 'weapons' as const, label: 'Armas', icon: '🔫' },
  { id: 'vehicles' as const, label: 'Vehículos', icon: '🚗' },
  { id: 'zombies' as const, label: 'Zombies', icon: '🧟' },
  { id: 'explosives' as const, label: 'Explosivos', icon: '🧨' },
  { id: 'physics' as const, label: 'Físicas', icon: '☢' },
];

const weaponCategories = [
  { id: 'all', label: 'Todas' },
  { id: 'melee', label: 'Melee' },
  { id: 'pistol', label: 'Pistolas' },
  { id: 'smg', label: 'SMG' },
  { id: 'shotgun', label: 'Escopetas' },
  { id: 'rifle', label: 'Rifles' },
  { id: 'sniper', label: 'Sniper' },
];

const CAT_LABELS: Record<string, string> = {
  melee: 'Melee',
  pistol: 'Pistola',
  smg: 'SMG',
  shotgun: 'Escopeta',
  rifle: 'Rifle',
  sniper: 'Sniper',
};

const filteredWeapons = computed(() => {
  if (weaponFilter.value === 'all') return props.weapons;
  return props.weapons.filter((w) => w.category === weaponFilter.value);
});

const pushSliders: {
  key: keyof CarPushConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  lo: string;
  mid: string;
  hi: string;
  suffix?: string;
  prefix?: string;
  digits: number;
}[] = [
  { key: 'force', label: 'Fuerza empuje', min: 0, max: 2, step: 0.01, lo: '0×', mid: '1.0× defecto', hi: '2.0×', suffix: '×', digits: 2 },
  { key: 'lift', label: 'Elevación vertical (Lift)', min: 0, max: 5, step: 0.1, lo: '0 m/s', mid: '3.0 vuelo', hi: '5.0 alto', suffix: ' m/s', digits: 1 },
  { key: 'scatter', label: 'Dispersión lateral', min: 0, max: 1.5, step: 0.01, lo: '0 recto', mid: '±0.60', hi: '±1.5', prefix: '±', suffix: ' m/s', digits: 2 },
  { key: 'tumble', label: 'Torsión / Giros (Tumble)', min: 0, max: 6, step: 0.1, lo: '0 rígido', mid: '3.0 vuelo', hi: '6.0 trompo', digits: 1 },
];

function categoryLabel(c: string) {
  return CAT_LABELS[c] ?? c;
}

function iconFor(id: string) {
  return HUD_ICONS[id] || HUD_ICONS.combat_knife;
}

function formatPush(slider: (typeof pushSliders)[number]) {
  const v = props.pushConfig[slider.key];
  return `${slider.prefix ?? ''}${v.toFixed(slider.digits)}${slider.suffix ?? ''}`;
}

function onPushInput(key: keyof CarPushConfig, e: Event) {
  const v = Number((e.target as HTMLInputElement).value);
  emit('update:pushConfig', key, v);
}

function blurInput(e: Event) {
  (e.target as HTMLElement | null)?.blur();
}

function toggleEnabled() {
  emit('update:enabled', !props.enabled);
}

function togglePassive() {
  if (!props.enabled) return;
  emit('update:passiveMode', !props.passiveMode);
}

function onRootMouseDown(e: MouseEvent) {
  e.stopPropagation();
  const target = e.target as HTMLElement | null;
  if (target?.closest('button')) e.preventDefault();
}

watch(
  () => props.enabled,
  (on) => {
    if (!on && activeTab.value !== 'general') {
      // keep tab; just dimmed via template
    }
  },
);
</script>

<style scoped>
.dbg-btn {
  border: 1px solid rgb(87 83 78);
  background: rgb(12 10 9 / 0.6);
  padding: 0.5rem 0.5rem;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgb(214 211 209);
  border-radius: 2px;
  transition: color 0.15s, border-color 0.15s;
}
.dbg-btn:hover {
  border-color: rgb(234 179 8);
  color: rgb(253 224 71);
}
</style>
