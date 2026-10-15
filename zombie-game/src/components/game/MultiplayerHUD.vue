<template>
  <div>
    <!-- Botón / Badge Superior en el HUD -->
    <div class="fixed top-2.5 right-48 z-20 flex items-center gap-2">
      <button
        type="button"
        class="px-2.5 py-1 text-xs font-mono font-bold uppercase border bg-black/80 flex items-center gap-2 transition-colors"
        :class="
          network.status === 'connected'
            ? 'border-emerald-500 text-emerald-300 hover:bg-emerald-950/40'
            : network.status === 'connecting'
              ? 'border-yellow-500 text-yellow-300 animate-pulse'
              : 'border-stone-700 text-stone-400 hover:text-stone-200'
        "
        @click="showLobbyModal = true"
      >
        <span
          class="w-2 h-2 rounded-full"
          :class="
            network.status === 'connected'
              ? 'bg-emerald-400'
              : network.status === 'connecting'
                ? 'bg-yellow-400'
                : 'bg-red-500'
          "
        ></span>
        <span v-if="network.currentRoom">
          SALA: {{ network.currentRoom.name }} ({{ network.currentRoom.currentPlayers }})
        </span>
        <span v-else-if="network.status === 'connected'">MULTIJUGADOR: LOBBY</span>
        <span v-else-if="network.status === 'connecting'">CONECTANDO...</span>
        <span v-else>MULTIJUGADOR (OFFLINE)</span>
      </button>
    </div>

    <!-- Modal de Lobby / Gestión de Salas -->
    <div
      v-if="showLobbyModal"
      class="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs font-mono"
      @click.self="showLobbyModal = false"
    >
      <div class="bg-stone-950 border border-stone-800 w-full max-w-xl p-5 shadow-2xl flex flex-col gap-4 text-stone-200">
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-stone-800 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-emerald-400 text-lg">🌐</span>
            <h2 class="text-sm font-bold uppercase tracking-wider text-stone-100">
              Multijugador en Tiempo Real (.NET)
            </h2>
          </div>
          <button
            type="button"
            class="text-stone-500 hover:text-stone-300 text-sm"
            @click="showLobbyModal = false"
          >
            ✕ Cerrar (ESC)
          </button>
        </div>

        <!-- Configuración mínima: solo nickname -->
        <div class="bg-stone-900/60 p-3 border border-stone-800">
          <label class="block text-[10px] uppercase text-stone-400 mb-1">Nombre de Superviviente:</label>
          <input
            v-model="nicknameInput"
            type="text"
            maxlength="24"
            class="w-full bg-black border border-stone-700 px-2.5 py-1 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
            placeholder="Ej: Survivor_01"
            :disabled="network.status === 'connecting'"
          />
        </div>

        <!-- Acciones: reconectar (si cae) / sala global / salir -->
        <div class="flex items-center gap-2">
          <button
            v-if="network.status !== 'connected'"
            type="button"
            class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-3 text-xs uppercase transition-colors"
            :disabled="network.status === 'connecting'"
            @click="connectToServer"
          >
            {{ network.status === 'connecting' ? 'Conectando...' : 'Reconectar al Servidor' }}
          </button>
          <template v-else>
            <button
              v-if="!network.currentRoom"
              type="button"
              class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 text-xs uppercase"
              @click="joinGlobal"
            >
              Unirse a Sala Global Abierta
            </button>
            <div
              v-else
              class="flex-1 border border-emerald-700/60 bg-emerald-950/40 py-2 px-3 text-xs text-emerald-300 uppercase text-center"
            >
              ● {{ network.currentRoom.name }}
            </div>
            <button
              v-if="network.currentRoom"
              type="button"
              class="bg-red-900/60 hover:bg-red-800 text-red-200 py-2 px-3 text-xs uppercase"
              @click="leaveCurrentRoom"
            >
              Salir de Sala
            </button>
          </template>
        </div>

        <!-- Configuración avanzada del servidor (oculta por defecto) -->
        <details>
          <summary class="text-[10px] text-stone-600 hover:text-stone-400 cursor-pointer uppercase tracking-wider select-none">
            ⚙ Avanzado: servidor personalizado
          </summary>
          <div class="mt-2 bg-stone-900/60 p-3 border border-stone-800 flex gap-1.5">
            <input
              v-model="serverUrlInput"
              type="text"
              class="flex-1 bg-black border border-stone-700 px-2.5 py-1 text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
              placeholder="https://zombie-api.nekomisystems.com"
              :disabled="network.status === 'connecting'"
            />
            <button
              type="button"
              class="bg-stone-800 hover:bg-stone-700 text-stone-300 py-1 px-3 text-xs uppercase shrink-0"
              :disabled="network.status === 'connecting'"
              @click="connectToServer"
            >
              Conectar
            </button>
          </div>
        </details>

        <!-- Explorador de salas (deshabilitado: solo sala global por ahora) -->
        <div v-if="false" class="flex-1 flex-col gap-2 min-h-48">
          <div class="flex items-center justify-between text-xs text-stone-400 uppercase">
            <span>Salas Disponibles ({{ roomList.length }})</span>
            <button
              v-if="network.status === 'connected'"
              type="button"
              class="text-emerald-400 hover:underline text-[10px]"
              @click="refreshRooms"
            >
              ↻ Refrescar
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { networkManager, getSavedServerUrl } from '../../game/network/networkManager';
import type { RoomSummaryDto, ConnectionStatus } from '../../game/network/networkTypes';

const network = reactive({
  status: networkManager.status,
  currentRoom: networkManager.currentRoom,
  currentNickname: networkManager.currentNickname,
});

const showLobbyModal = ref(false);
const nicknameInput = ref(localStorage.getItem('zombie_game_nick') || `Survivor_${Math.floor(Math.random() * 900 + 100)}`);
const serverUrlInput = ref(getSavedServerUrl());

const roomList = ref<RoomSummaryDto[]>([]);

async function connectToServer() {
  const nick = nicknameInput.value.trim() || localStorage.getItem('zombie_game_nick')?.trim() || networkManager.currentNickname;
  nicknameInput.value = nick;
  localStorage.setItem('zombie_game_nick', nick);
  localStorage.setItem('zombie_game_server', serverUrlInput.value);

  const ok = await networkManager.connect(serverUrlInput.value, nick);
  if (ok) {
    refreshRooms();
  }
}

async function joinGlobal() {
  const nick = nicknameInput.value.trim() || localStorage.getItem('zombie_game_nick')?.trim() || networkManager.currentNickname;
  await networkManager.setNickname(nick);
  await networkManager.joinGlobalRoom();
  showLobbyModal.value = false;
}

async function leaveCurrentRoom() {
  await networkManager.leaveRoom();
  refreshRooms();
}

async function refreshRooms() {
  roomList.value = await networkManager.getRoomList();
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showLobbyModal.value) {
    showLobbyModal.value = false;
  }
}

let unsubs: (() => void)[] = [];

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);

  unsubs = [
    networkManager.on('statusChange', (status: ConnectionStatus) => {
      network.status = status;
      network.currentRoom = networkManager.currentRoom;
      network.currentNickname = networkManager.currentNickname;
    }),
    networkManager.on('joinedRoom', (room: RoomSummaryDto) => {
      network.currentRoom = room;
    }),
    networkManager.on('leftRoom', () => {
      network.currentRoom = null;
    }),
    networkManager.on('roomListUpdated', (rooms: RoomSummaryDto[]) => {
      roomList.value = rooms;
    }),
  ];

  // Sincronizar estado inicial
  network.status = networkManager.status;
  network.currentRoom = networkManager.currentRoom;
  network.currentNickname = networkManager.currentNickname;

  // Intentar conectar automáticamente en segundo plano si hay servidor configurado
  connectToServer();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  unsubs.forEach((u) => u());
  networkManager.disconnect();
});
</script>
