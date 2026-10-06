<template>
  <main class="relative z-10 flex-1 flex flex-col items-center justify-start px-4 md:px-8 py-8 pointer-events-auto select-none w-full max-w-7xl mx-auto">
    <!-- 1. Top Navigation & Header -->
    <div class="w-full flex items-center justify-between mb-6 sm:mb-8 max-w-6xl">
      <button
        type="button"
        class="group relative inline-flex items-center space-x-2 py-2 px-4 rounded-full text-xs font-mono tracking-[0.25em] text-white/60 hover:text-white transition-all duration-300 hover:bg-white/10 hover:backdrop-blur-md border border-white/10 hover:border-white/25 cursor-pointer shadow-lg"
        @click="navigateToModes"
        @mouseenter="sound.playHover(0.04)"
      >
        <i class="bi bi-arrow-left text-xs transition-transform duration-300 group-hover:-translate-x-1"></i>
        <span class="uppercase">MODOS DE JUEGO</span>
      </button>

      <div class="flex items-center space-x-2 text-[10px] sm:text-xs font-mono tracking-[0.25em] text-white/40 uppercase">
        <span class="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
        <span>LABORATORIO // GESTIÓN DE MUNDOS</span>
      </div>
    </div>

    <!-- 2. Main Title & Actions Bar -->
    <div class="w-full max-w-6xl flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl sm:text-4xl font-light text-white uppercase font-['Syne',sans-serif] tracking-[0.18em]">
          Mundos Sandbox
        </h1>
        <p class="text-xs sm:text-sm font-mono text-cyan-400/90 tracking-wider uppercase mt-1 flex items-center space-x-2">
          <span>ALMACENAMIENTO PERSISTENTE LOCAL CON DEXIE (INDEXEDDB)</span>
        </p>
      </div>

      <!-- Action Buttons & Search -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Search filter -->
        <div class="relative">
          <i class="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-xs"></i>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Buscar mundos..."
            class="pl-9 pr-4 py-2 rounded-2xl bg-white/[0.04] border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-cyan-400/60 focus:bg-white/[0.08] transition-all w-48 sm:w-60"
          />
        </div>

        <!-- Create World Button -->
        <button
          type="button"
          class="px-5 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 hover:border-cyan-400 shadow-[0_0_20px_rgba(13,240,212,0.25)] hover:shadow-[0_0_30px_rgba(13,240,212,0.4)] text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer flex items-center space-x-2 font-bold transform hover:-translate-y-0.5"
          @click="openCreateModal"
          @mouseenter="sound.playHover(0.05)"
        >
          <i class="bi bi-plus-lg text-sm"></i>
          <span>Nuevo Mundo</span>
        </button>
      </div>
    </div>

    <!-- 3. Worlds Grid -->
    <div class="w-full max-w-6xl">
      <!-- Loading State -->
      <div v-if="isLoading" class="py-20 flex flex-col items-center justify-center space-y-3">
        <span class="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></span>
        <span class="text-xs font-mono text-white/50 tracking-widest uppercase">Cargando base de datos Dexie...</span>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredWorlds.length === 0 && !searchQuery"
        class="py-16 px-6 rounded-3xl bg-white/[0.02] border border-dashed border-white/15 flex flex-col items-center justify-center text-center space-y-4"
      >
        <div class="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-2xl shadow-[0_0_25px_rgba(13,240,212,0.15)]">
          <i class="bi bi-bounding-box-circles"></i>
        </div>
        <div>
          <h2 class="text-lg font-light text-white font-['Syne',sans-serif] tracking-wider uppercase">
            No hay mundos guardados todavía
          </h2>
          <p class="text-xs font-mono text-white/50 max-w-md mt-1">
            Crea tu primer laboratorio de físicas o genera el circuito de prueba preconfigurado para comenzar a experimentar.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            class="px-5 py-2.5 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 text-xs font-mono tracking-wider uppercase font-bold transition-all cursor-pointer flex items-center space-x-2"
            @click="openCreateModal"
          >
            <i class="bi bi-plus-lg"></i>
            <span>Crear Mundo en Blanco</span>
          </button>

          <button
            type="button"
            class="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 text-xs font-mono tracking-wider uppercase transition-all cursor-pointer flex items-center space-x-2"
            @click="generateStarterWorld"
          >
            <i class="bi bi-lightning-charge"></i>
            <span>Cargar Circuito Demo Alfa</span>
          </button>
        </div>
      </div>

      <!-- No Search Results -->
      <div
        v-else-if="filteredWorlds.length === 0 && searchQuery"
        class="py-16 text-center text-xs font-mono text-white/40"
      >
        No se encontraron mundos que coincidan con "{{ searchQuery }}".
      </div>

      <!-- Worlds Card Grid -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="world in filteredWorlds"
          :key="world.id"
          class="group relative rounded-3xl p-6 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/12 hover:border-cyan-400/70 transition-all duration-300 flex flex-col justify-between shadow-[0_15px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_50px_rgba(13,240,212,0.25)] hover:-translate-y-1.5"
          @mouseenter="sound.playHover(0.03)"
        >
          <!-- Card Header: Badges & Dropdown Options -->
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <!-- Platform badge -->
              <span
                class="px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase flex items-center space-x-1.5"
                :class="[
                  world.platformConfig.isInfinite
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                ]"
              >
                <i :class="world.platformConfig.isInfinite ? 'bi bi-infinity text-xs' : 'bi bi-bounding-box text-xs'"></i>
                <span>{{ world.platformConfig.isInfinite ? 'Suelo Infinito' : `${world.platformConfig.width}×${world.platformConfig.depth}m` }}</span>
              </span>

              <!-- Relative / Formatted Date -->
              <span class="text-[10px] font-mono text-white/40">
                {{ formatDate(world.updatedAt) }}
              </span>
            </div>

            <!-- World Name -->
            <h2 class="text-lg sm:text-xl font-light text-white font-['Syne',sans-serif] tracking-wide group-hover:text-cyan-300 transition-colors line-clamp-1">
              {{ world.name }}
            </h2>

            <!-- World Description -->
            <p class="text-xs font-mono text-white/50 line-clamp-2 mt-1 min-h-[32px]">
              {{ world.description || 'Sin descripción adicional.' }}
            </p>

            <!-- Stats Pills -->
            <div class="flex items-center space-x-3 mt-4 pt-3 border-t border-white/10 text-[11px] font-mono text-white/60">
              <span class="flex items-center space-x-1.5">
                <i class="bi bi-boxes text-cyan-400"></i>
                <span><strong>{{ world.items?.length || 0 }}</strong> piezas</span>
              </span>
              <span>·</span>
              <span class="flex items-center space-x-1.5">
                <i class="bi bi-circle text-emerald-400"></i>
                <span><strong>{{ world.balls?.length || 0 }}</strong> esferas</span>
              </span>
            </div>
          </div>

          <!-- Card Bottom Actions -->
          <div class="mt-6 flex items-center justify-between gap-2 pt-4 border-t border-white/10">
            <!-- Open World Primary Button -->
            <button
              type="button"
              class="flex-1 py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300 hover:text-white border border-cyan-400/40 hover:border-cyan-400 text-xs font-mono tracking-wider uppercase font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(13,240,212,0.2)]"
              @click="enterWorld(world)"
            >
              <i class="bi bi-box-arrow-in-right text-sm"></i>
              <span>Abrir</span>
            </button>

            <!-- Secondary Actions: Duplicate, Rename, Delete -->
            <div class="flex items-center space-x-1">
              <button
                type="button"
                class="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                title="Duplicar mundo"
                @click="onDuplicateWorld(world)"
              >
                <i class="bi bi-copy"></i>
              </button>

              <button
                type="button"
                class="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/60 hover:text-white border border-white/10 text-xs transition-colors cursor-pointer"
                title="Renombrar mundo"
                @click="openRenameModal(world)"
              >
                <i class="bi bi-pencil"></i>
              </button>

              <button
                type="button"
                class="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 border border-white/10 text-xs transition-colors cursor-pointer"
                title="Eliminar mundo"
                @click="openDeleteModal(world)"
              >
                <i class="bi bi-trash3"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. MODAL: Crear Nuevo Mundo -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95 translate-y-2"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 translate-y-2"
    >
      <div
        v-if="isCreateModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="isCreateModalOpen = false"
      >
        <div class="relative w-full max-w-md rounded-3xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_30px_rgba(13,240,212,0.15)] flex flex-col space-y-5 text-white">
          <div class="flex items-center justify-between border-b border-white/10 pb-3">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#0df0d4]"></span>
              <h2 class="text-base font-semibold tracking-wider uppercase font-mono text-white">
                Nuevo Laboratorio Sandbox
              </h2>
            </div>
            <button
              type="button"
              class="p-1 rounded-lg bg-white/10 hover:bg-rose-500/20 text-white/60 hover:text-rose-300 text-xs"
              @click="isCreateModalOpen = false"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="flex flex-col space-y-3">
            <label class="text-xs font-mono text-white/70 uppercase">Nombre del Mundo:</label>
            <input
              v-model="newWorldName"
              type="text"
              placeholder="ej. Circuito Espiral 01"
              maxlength="40"
              class="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all"
              @keydown.enter="handleCreateWorld"
            />
          </div>

          <div class="flex flex-col space-y-3">
            <label class="text-xs font-mono text-white/70 uppercase">Descripción (Opcional):</label>
            <input
              v-model="newWorldDesc"
              type="text"
              placeholder="ej. Pista con múltiples desniveles y salto parabólico"
              maxlength="100"
              class="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 focus:bg-white/[0.06] transition-all"
              @keydown.enter="handleCreateWorld"
            />
          </div>

          <div class="flex flex-col space-y-2">
            <label class="text-xs font-mono text-white/70 uppercase">Tipo de Plataforma Inicial:</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="py-2.5 px-3 rounded-xl border text-xs font-mono transition-all flex flex-col items-center space-y-1 cursor-pointer"
                :class="[
                  !newWorldIsInfinite
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_15px_rgba(13,240,212,0.2)]'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                ]"
                @click="newWorldIsInfinite = false"
              >
                <i class="bi bi-bounding-box text-base"></i>
                <span class="font-bold">Delimitada</span>
                <span class="text-[9px] text-white/40">18 × 18 metros</span>
              </button>

              <button
                type="button"
                class="py-2.5 px-3 rounded-xl border text-xs font-mono transition-all flex flex-col items-center space-y-1 cursor-pointer"
                :class="[
                  newWorldIsInfinite
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                    : 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                ]"
                @click="newWorldIsInfinite = true"
              >
                <i class="bi bi-infinity text-base"></i>
                <span class="font-bold">Suelo Infinito</span>
                <span class="text-[9px] text-white/40">Plano continuo</span>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end space-x-2 pt-3 border-t border-white/10">
            <button
              type="button"
              class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono text-white/70 hover:text-white transition-colors cursor-pointer uppercase"
              @click="isCreateModalOpen = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-5 py-2 rounded-xl bg-cyan-500/25 hover:bg-cyan-500/40 text-cyan-300 border border-cyan-400/50 text-xs font-mono font-bold tracking-wider transition-all cursor-pointer uppercase shadow-[0_0_20px_rgba(13,240,212,0.3)]"
              @click="handleCreateWorld"
            >
              Crear y Entrar
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 5. MODAL: Renombrar Mundo -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isRenameModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="isRenameModalOpen = false"
      >
        <div class="relative w-full max-w-sm rounded-3xl bg-[#090d16]/95 backdrop-blur-2xl border border-white/15 p-6 shadow-2xl flex flex-col space-y-4 text-white">
          <h2 class="text-sm font-semibold tracking-wider uppercase font-mono text-white">
            Renombrar Mundo
          </h2>
          <input
            v-model="renameValue"
            type="text"
            maxlength="40"
            class="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm font-mono text-white focus:outline-none focus:border-cyan-400 transition-all"
            @keydown.enter="handleSaveRename"
          />
          <div class="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono text-white/70 hover:text-white"
              @click="isRenameModalOpen = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-1.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-xs font-mono font-bold"
              @click="handleSaveRename"
            >
              Guardar
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 6. MODAL: Confirmar Eliminación -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="isDeleteModalOpen && targetWorld"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="isDeleteModalOpen = false"
      >
        <div class="relative w-full max-w-sm rounded-3xl bg-[#090d16]/95 backdrop-blur-2xl border border-rose-500/30 p-6 shadow-2xl flex flex-col space-y-4 text-white">
          <div class="flex items-center space-x-2 text-rose-400">
            <i class="bi bi-exclamation-triangle-fill text-lg"></i>
            <h2 class="text-sm font-semibold tracking-wider uppercase font-mono text-rose-300">
              ¿Eliminar Mundo?
            </h2>
          </div>
          <p class="text-xs font-mono text-white/70">
            Se eliminará el mundo <strong class="text-white">"{{ targetWorld.name }}"</strong> con todas sus piezas y configuraciones permanentemente de Dexie.
          </p>
          <div class="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-mono text-white/70 hover:text-white"
              @click="isDeleteModalOpen = false"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="px-4 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold"
              @click="handleConfirmDelete"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  type SandboxWorldRecord,
  getAllWorlds,
  getWorldById,
  createNewWorld,
  duplicateWorld,
  deleteWorld,
  renameWorld,
  seedStarterWorldIfEmpty,
} from '../../db/sandboxDb';
import { setActiveWorld } from '../../state/sandboxWorldStore';
import { navigateToModes, navigateToSandbox } from '../../state/gameStore';
import { sound } from '../../utils/sound';

const worlds = ref<SandboxWorldRecord[]>([]);
const isLoading = ref(true);
const searchQuery = ref('');

// Create Modal State
const isCreateModalOpen = ref(false);
const newWorldName = ref('');
const newWorldDesc = ref('');
const newWorldIsInfinite = ref(false);

// Rename Modal State
const isRenameModalOpen = ref(false);
const renameValue = ref('');
const targetWorld = ref<SandboxWorldRecord | null>(null);

// Delete Modal State
const isDeleteModalOpen = ref(false);

const filteredWorlds = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return worlds.value;
  return worlds.value.filter(
    (w) =>
      w.name.toLowerCase().includes(q) ||
      (w.description && w.description.toLowerCase().includes(q))
  );
});

async function loadWorlds() {
  try {
    isLoading.value = true;
    // Seed default if database is fresh
    await seedStarterWorldIfEmpty();
    worlds.value = await getAllWorlds();
  } catch (err) {
    console.error('Failed to load worlds:', err);
  } finally {
    isLoading.value = false;
  }
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Hace un momento';
  if (diffSec < 3600) return `Hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `Hace ${Math.floor(diffSec / 3600)} h`;

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function enterWorld(world: SandboxWorldRecord) {
  let freshWorld = world;
  try {
    freshWorld = (await getWorldById(world.id)) || world;
  } catch (err) {
    console.warn('[SandboxWorldsMenu] Could not reload world, using cached copy:', err);
  }
  setActiveWorld(freshWorld);
  sound.playClick(0.16);
  sound.playModalTransition();
  navigateToSandbox();
}

function openCreateModal() {
  newWorldName.value = `Laboratorio #${worlds.value.length + 1}`;
  newWorldDesc.value = '';
  newWorldIsInfinite.value = false;
  isCreateModalOpen.value = true;
  sound.playClick(0.08);
}

async function handleCreateWorld() {
  const name = newWorldName.value.trim() || `Laboratorio #${worlds.value.length + 1}`;
  const world = await createNewWorld(
    name,
    {
      width: 18,
      depth: 18,
      isInfinite: newWorldIsInfinite.value,
    },
    newWorldDesc.value.trim()
  );

  isCreateModalOpen.value = false;
  await enterWorld(world);
}

async function generateStarterWorld() {
  const starter = await seedStarterWorldIfEmpty();
  if (starter) {
    worlds.value = await getAllWorlds();
    await enterWorld(starter);
  } else {
    const existingStarter = worlds.value.find((w) => w.id === 'starter_circuit_alpha') || (await getWorldById('starter_circuit_alpha'));
    if (existingStarter) {
      await enterWorld(existingStarter);
    } else {
      await loadWorlds();
    }
  }
}

async function onDuplicateWorld(world: SandboxWorldRecord) {
  sound.playClick(0.08);
  const cloned = await duplicateWorld(world.id);
  if (cloned) {
    worlds.value = await getAllWorlds();
  }
}

function openRenameModal(world: SandboxWorldRecord) {
  targetWorld.value = world;
  renameValue.value = world.name;
  isRenameModalOpen.value = true;
  sound.playClick(0.08);
}

async function handleSaveRename() {
  if (targetWorld.value && renameValue.value.trim()) {
    await renameWorld(targetWorld.value.id, renameValue.value.trim());
    isRenameModalOpen.value = false;
    worlds.value = await getAllWorlds();
    sound.playClick(0.1);
  }
}

function openDeleteModal(world: SandboxWorldRecord) {
  targetWorld.value = world;
  isDeleteModalOpen.value = true;
  sound.playClick(0.08);
}

async function handleConfirmDelete() {
  if (targetWorld.value) {
    await deleteWorld(targetWorld.value.id);
    isDeleteModalOpen.value = false;
    worlds.value = await getAllWorlds();
    sound.playClick(0.12);
  }
}

onMounted(() => {
  loadWorlds();
});
</script>
