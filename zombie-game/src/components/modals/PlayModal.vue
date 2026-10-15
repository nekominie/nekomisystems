<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
    <!-- Steel Bunker Container -->
    <div
      class="relative w-full max-w-2xl steel-panel rounded-sm overflow-hidden p-5 sm:p-7 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
    >
      <!-- Rivets -->
      <span class="rivet absolute top-3 left-3"></span>
      <span class="rivet absolute top-3 right-3"></span>
      <span class="rivet absolute bottom-3 left-3"></span>
      <span class="rivet absolute bottom-3 right-3"></span>

      <!-- Hazard Header Strip -->
      <div class="hazard-stripes-blood h-2 -mx-7 -mt-7 mb-5 shrink-0"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-3 border-b border-stone-700/80 mb-5 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xs bg-red-950 border border-red-600/70 flex items-center justify-center text-red-400">
            <i class="bi bi-play-circle-fill text-2xl"></i>
          </div>
          <div>
            <h2 class="text-xl sm:text-2xl font-extrabold uppercase tracking-wider text-white font-['Black_Ops_One']">
              DESPLIEGUE // ENTRAR AL MUNDO
            </h2>
            <p class="text-[11px] font-mono text-emerald-400/90 tracking-wide uppercase">
              SECTOR REFUGIO // ZONA DE SUPERVIVENCIA
            </p>
          </div>
        </div>

        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center bg-stone-900 border border-stone-700 text-stone-400 hover:text-white hover:border-red-600 transition-colors rounded-xs cursor-pointer"
          @click="close"
        >
          <i class="bi bi-x-lg text-sm"></i>
        </button>
      </div>

      <!-- Contenedor con Scroll para el contenido -->
      <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 font-mono">
        <!-- 1. CAMPO DESTACADO DE SELECCIÓN DE USUARIO -->
        <div class="relative p-4 sm:p-5 bg-gradient-to-b from-[#141d24]/90 via-[#0e141a]/95 to-[#090d12]/95 border-2 border-emerald-500/70 rounded-xs shadow-[0_0_25px_rgba(16,185,129,0.2)] flex flex-col gap-2.5">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-2 left-2"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-2 right-2"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-2 left-2"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute bottom-2 right-2"></span>

          <div class="flex items-center justify-between">
            <label for="player-nickname" class="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <i class="bi bi-person-badge-fill text-emerald-400 text-base"></i>
              NOMBRE DE SUPERVIVIENTE // USUARIO
            </label>
            <span class="text-[10px] font-mono uppercase px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 font-bold rounded-xs">
              IDENTIFICACIÓN
            </span>
          </div>

          <div class="relative flex items-center">
            <div class="absolute left-3.5 text-emerald-500 pointer-events-none flex items-center">
              <i class="bi bi-person-fill text-lg"></i>
            </div>
            <input
              id="player-nickname"
              v-model="nicknameInput"
              type="text"
              maxlength="20"
              class="w-full bg-[#0a0d13] border-2 border-emerald-500/80 focus:border-emerald-400 focus:shadow-[0_0_20px_rgba(16,185,129,0.35)] pl-10 pr-10 py-3 text-sm sm:text-base font-bold font-mono text-emerald-300 placeholder-stone-600 rounded-xs outline-none transition-all"
              placeholder="Ingresa tu nombre..."
              @change="saveNickname"
              @keyup.enter="joinGlobalAndPlay"
            />
            <button
              type="button"
              class="absolute right-2 px-2 py-1 text-stone-400 hover:text-emerald-300 bg-stone-900/80 hover:bg-stone-800 border border-stone-700 rounded-xs text-xs font-mono transition-colors cursor-pointer"
              title="Generar nombre aleatorio"
              @click="randomizeNickname"
            >
              <i class="bi bi-dice-5"></i>
            </button>
          </div>

          <p class="text-[11px] font-mono text-stone-400 flex items-center gap-1.5">
            <i class="bi bi-info-circle text-stone-500"></i>
            Este nombre identificará a tu personaje ante otros supervivientes en el mundo.
          </p>
        </div>

        <!-- 2. ESTADO DEL SERVIDOR / CONEXIÓN -->
        <div
          class="border p-3 text-xs flex items-center justify-between gap-2 rounded-xs"
          :class="
            status === 'connected'
              ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
              : status === 'connecting'
                ? 'bg-yellow-950/40 border-yellow-700/60 text-yellow-300'
                : 'bg-stone-900/60 border-stone-800 text-stone-400'
          "
        >
          <div class="flex items-center gap-2.5">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="
                status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : status === 'connecting'
                    ? 'bg-yellow-400 animate-spin'
                    : 'bg-stone-500'
              "
            ></span>
            <span v-if="status === 'connected'" class="font-bold">
              Servidor en línea · {{ globalPlayerCount }} superviviente(s) en la zona
            </span>
            <span v-else-if="status === 'connecting'">
              Conectando al servidor del juego...
            </span>
            <span v-else>
              Servidor desconectado · Reintentando en segundo plano…
            </span>
          </div>

          <button
            v-if="status !== 'connected' && status !== 'connecting'"
            type="button"
            class="text-emerald-400 hover:text-emerald-300 text-[10px] uppercase font-bold underline cursor-pointer"
            @click="connectToServer"
          >
            Reintentar conexión
          </button>
        </div>

        <!-- Mensaje de Error si la conexión falla -->
        <div
          v-if="errorMessage"
          class="bg-red-950/80 border border-red-600 p-2.5 text-xs text-red-200 flex items-center justify-between rounded-xs"
        >
          <div class="flex items-center gap-2">
            <i class="bi bi-exclamation-triangle-fill text-red-400 text-sm"></i>
            <span>{{ errorMessage }}</span>
          </div>
          <button
            type="button"
            class="text-red-400 hover:text-white text-xs underline cursor-pointer"
            @click="errorMessage = ''"
          >
            Cerrar
          </button>
        </div>

        <!-- 3. ZONA PRINCIPAL DEL MUNDO -->
        <div class="bg-gradient-to-r from-emerald-950/30 via-[#10151d] to-[#0c0f14] border border-stone-700/70 p-4 rounded-xs flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <i class="bi bi-globe-americas text-emerald-400"></i>
              <span class="font-bold text-xs sm:text-sm text-stone-200 uppercase tracking-wider">MUNDO COMPARTIDO // SERVIDOR CENTRAL</span>
            </div>
            <span class="text-[9px] px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-600 text-emerald-200 uppercase font-bold rounded-xs">
              SALA OFICIAL
            </span>
          </div>
          <p class="text-[11px] font-mono text-stone-400 leading-relaxed">
            Mundo persistente abierto con generación procedural infinita, vehículos conducibles, armas y supervivencia con otros jugadores en tiempo real.
          </p>
        </div>

        <!-- 4. CONFIGURACIÓN AVANZADA (SERVIDOR) -->
        <details class="group">
          <summary class="text-[10px] text-stone-600 hover:text-stone-400 cursor-pointer uppercase tracking-wider select-none">
            ⚙ Avanzado: servidor personalizado
          </summary>
          <div class="mt-2 bg-black/70 border border-stone-800 p-3 flex gap-1.5 rounded-xs">
            <input
              v-model="serverUrlInput"
              type="text"
              class="flex-1 bg-[#12151c] border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-emerald-500 rounded-xs"
              placeholder="https://zombie-api.nekomisystems.com"
              :disabled="isConnecting"
            />
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-bold uppercase bg-stone-800 border border-stone-600 text-stone-200 hover:bg-stone-700 transition-colors shrink-0 rounded-xs cursor-pointer"
              :disabled="isConnecting"
              @click="connectToServer"
            >
              Conectar
            </button>
          </div>
        </details>
      </div>

      <!-- Action Footer -->
      <div class="flex flex-col gap-3 pt-4 border-t border-stone-800 mt-4 shrink-0">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            class="steel-btn w-full sm:w-auto px-6 py-2.5 text-xs uppercase font-mono tracking-wider font-bold text-stone-400 hover:text-white cursor-pointer"
            @click="close"
          >
            Cancelar
          </button>

          <button
            type="button"
            class="play-btn-prominent w-full sm:w-auto px-8 py-3 text-sm uppercase font-extrabold tracking-widest text-white flex items-center justify-center gap-2 font-['Black_Ops_One'] cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="isJoining"
            @click="joinGlobalAndPlay"
          >
            <i v-if="isJoining" class="bi bi-arrow-repeat animate-spin text-lg"></i>
            <i v-else class="bi bi-crosshair2 text-lg text-emerald-300"></i>
            <span>{{ status === 'connected' ? 'ENTRAR AL JUEGO' : 'CONECTAR Y ENTRAR' }}</span>
          </button>
        </div>

        <!-- Botón sutil para jugar en solitario / offline hasta abajo -->
        <div class="flex items-center justify-center pt-1 border-t border-stone-900">
          <button
            type="button"
            class="text-[11px] font-mono text-stone-500 hover:text-stone-300 tracking-wider uppercase transition-colors flex items-center gap-1.5 cursor-pointer py-1 px-3 rounded-xs hover:bg-stone-900/60"
            @click="startSingleplayer"
          >
            <i class="bi bi-hdd-network text-stone-600 text-xs"></i>
            <span>Jugar en solitario (Offline)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { sound } from '../../audio/soundEngine';
import { networkManager, getSavedServerUrl } from '../../game/network/networkManager';
import type { RoomSummaryDto, ConnectionStatus } from '../../game/network/networkTypes';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'launch-demo'): void;
}>();

// Form credentials
const nicknameInput = ref(
  localStorage.getItem('zombie_game_nick') || `Survivor_${Math.floor(Math.random() * 900 + 100)}`
);
const serverUrlInput = ref(getSavedServerUrl());

// Connection & status
const status = ref<ConnectionStatus>(networkManager.status);
const isConnecting = ref(false);
const errorMessage = ref('');
const isJoining = ref(false);
const joiningRoomId = ref<string | null>(null);

// Rooms
const roomList = ref<RoomSummaryDto[]>([]);
const isLoadingRooms = ref(false);

// Jugadores en la sala global (para el mensaje de estado de conexión)
const globalPlayerCount = computed(() => {
  const g = roomList.value.find((r) => r.roomId === 'GLOBAL');
  return g?.currentPlayers ?? 0;
});

function randomizeNickname() {
  nicknameInput.value = `Survivor_${Math.floor(Math.random() * 900 + 100)}`;
  saveNickname();
  sound.playClick();
}

async function saveNickname(): Promise<string> {
  const nick = nicknameInput.value.trim() || 'Survivor';
  localStorage.setItem('zombie_game_nick', nick);
  if (networkManager.isConnected) {
    await networkManager.setNickname(nick);
  }
  return nick;
}

async function connectToServer() {
  if (isConnecting.value) return;
  errorMessage.value = '';
  isConnecting.value = true;

  const nick = nicknameInput.value.trim() || 'Survivor';
  localStorage.setItem('zombie_game_nick', nick);
  localStorage.setItem('zombie_game_server', serverUrlInput.value);

  try {
    const ok = await networkManager.connect(serverUrlInput.value, nick);
    status.value = networkManager.status;
    if (ok) {
      await refreshRooms();
    } else {
      errorMessage.value = 'No se pudo conectar al servidor. Inténtalo de nuevo en un momento.';
    }
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al conectar con el servidor.';
  } finally {
    isConnecting.value = false;
  }
}

async function refreshRooms() {
  if (status.value !== 'connected') return;
  isLoadingRooms.value = true;
  try {
    const list = await networkManager.getRoomList();
    roomList.value = list;
  } catch (err: any) {
    console.warn('[PlayModal] Error obteniendo lista de salas:', err);
  } finally {
    isLoadingRooms.value = false;
  }
}

async function startSingleplayer() {
  await saveNickname();
  // Asegurarse de salir de cualquier sala previa si estaba conectado
  if (networkManager.isConnected && networkManager.currentRoom) {
    await networkManager.leaveRoom();
  }
  sound.playPlayClick();
  emit('launch-demo');
}

async function joinGlobalAndPlay() {
  const nick = await saveNickname();
  if (status.value !== 'connected') {
    await connectToServer();
    if (status.value !== 'connected') return;
  }

  // Asegurar que el servidor confirme el nickname antes de unirse
  await networkManager.setNickname(nick);

  isJoining.value = true;
  joiningRoomId.value = 'GLOBAL';
  errorMessage.value = '';

  try {
    await networkManager.joinGlobalRoom();
    sound.playPlayClick();
    emit('launch-demo');
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al unirse a la partida.';
  } finally {
    isJoining.value = false;
    joiningRoomId.value = null;
  }
}

function close() {
  sound.playClick();
  emit('close');
}

onMounted(() => {
  status.value = networkManager.status;

  networkManager.onStatusChange = (newStatus) => {
    status.value = newStatus;
  };

  networkManager.onRoomListUpdated = (rooms) => {
    roomList.value = rooms;
  };

  networkManager.onError = (err) => {
    errorMessage.value = err;
    isJoining.value = false;
  };

  if (status.value === 'connected') {
    refreshRooms();
  } else if (status.value !== 'connecting') {
    connectToServer();
  }
});

onUnmounted(() => {
  networkManager.onStatusChange = undefined;
  networkManager.onRoomListUpdated = undefined;
  networkManager.onError = undefined;
});
</script>
