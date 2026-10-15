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
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { networkManager, DEFAULT_SERVER_URL } from '../../game/network/networkManager';
import type { ChatMessageDto, RoomSummaryDto } from '../../game/network/networkTypes';

const emit = defineEmits<{
  (e: 'chatFocusChange', isFocused: boolean): void;
}>();

const network = reactive({
  status: networkManager.status,
  currentRoom: networkManager.currentRoom,
  currentNickname: networkManager.currentNickname,
});

const showLobbyModal = ref(false);
const nicknameInput = ref(localStorage.getItem('zombie_game_nick') || `Survivor_${Math.floor(Math.random() * 900 + 100)}`);
const serverUrlInput = ref(localStorage.getItem('zombie_game_server') || DEFAULT_SERVER_URL);

const roomList = ref<RoomSummaryDto[]>([]);

// Chat
const messages = ref<ChatMessageDto[]>([]);
const chatOpen = ref(false);
const chatDraft = ref('');
const chatChannel = ref<'room' | 'global'>('room');
const chatHistoryEl = ref<HTMLDivElement | null>(null);
const chatInputEl = ref<HTMLInputElement | null>(null);

function scrollChatBottom() {
  nextTick(() => {
    if (chatHistoryEl.value) {
      chatHistoryEl.value.scrollTop = chatHistoryEl.value.scrollHeight;
    }
  });
}

async function connectToServer() {
  localStorage.setItem('zombie_game_nick', nicknameInput.value);
  localStorage.setItem('zombie_game_server', serverUrlInput.value);

  const ok = await networkManager.connect(serverUrlInput.value, nicknameInput.value);
  if (ok) {
    refreshRooms();
  }
}

async function joinGlobal() {
  // Asegurar que el nickname elegido se aplique al entrar
  if (nicknameInput.value.trim() && nicknameInput.value.trim() !== networkManager.currentNickname) {
    await networkManager.setNickname(nicknameInput.value);
  }
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

function openChat() {
  chatOpen.value = true;
  emit('chatFocusChange', true);
  nextTick(() => {
    chatInputEl.value?.focus();
  });
}

function closeChat() {
  chatOpen.value = false;
  emit('chatFocusChange', false);
}

function sendChat() {
  if (!chatDraft.value.trim()) {
    closeChat();
    return;
  }

  networkManager.sendChatMessage(chatDraft.value, chatChannel.value);
  chatDraft.value = '';
  closeChat();
}

function onGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    if (!chatOpen.value && !showLobbyModal.value) {
      e.preventDefault();
      openChat();
    }
  } else if (e.key === 'Escape') {
    if (chatOpen.value) {
      closeChat();
    } else if (showLobbyModal.value) {
      showLobbyModal.value = false;
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);

  networkManager.onStatusChange = (status) => {
    network.status = status;
    network.currentRoom = networkManager.currentRoom;
    network.currentNickname = networkManager.currentNickname;
  };

  networkManager.onJoinedRoom = (room) => {
    network.currentRoom = room;
  };

  networkManager.onRoomListUpdated = (rooms) => {
    roomList.value = rooms;
  };

  networkManager.onReceiveChatMessage = (msg) => {
    messages.value.push(msg);
    if (messages.value.length > 50) messages.value.shift();
    scrollChatBottom();
  };

  networkManager.onError = (err) => {
    messages.value.push({
      roomId: 'system',
      senderName: 'Error',
      senderConnectionId: 'system',
      message: err,
      channel: 'system',
      timestamp: new Date(),
    });
    scrollChatBottom();
  };

  // Intentar conectar automáticamente en segundo plano si hay servidor configurado
  connectToServer();
});

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  networkManager.disconnect();
});
</script>
