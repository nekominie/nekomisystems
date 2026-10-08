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

        <!-- Configuración de Conexión y Nombre de Usuario -->
        <div class="grid grid-cols-2 gap-3 bg-stone-900/60 p-3 border border-stone-800">
          <div>
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
          <div>
            <label class="block text-[10px] uppercase text-stone-400 mb-1">Servidor Backend (.NET):</label>
            <input
              v-model="serverUrlInput"
              type="text"
              class="w-full bg-black border border-stone-700 px-2.5 py-1 text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
              placeholder="http://localhost:5000"
              :disabled="network.status === 'connecting'"
            />
          </div>
        </div>

        <!-- Botones de Acción de Conexión -->
        <div class="flex items-center gap-2">
          <button
            v-if="network.status !== 'connected'"
            type="button"
            class="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2 px-3 text-xs uppercase transition-colors"
            :disabled="network.status === 'connecting'"
            @click="connectToServer"
          >
            {{ network.status === 'connecting' ? 'Conectando...' : 'Conectar al Servidor' }}
          </button>
          <template v-else>
            <button
              type="button"
              class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 text-xs uppercase"
              @click="joinGlobal"
            >
              Unirse a Sala Global Abierta
            </button>
            <button
              type="button"
              class="bg-stone-800 hover:bg-stone-700 text-stone-300 py-2 px-3 text-xs uppercase"
              @click="showCreateRoomForm = !showCreateRoomForm"
            >
              {{ showCreateRoomForm ? 'Cancelar' : '+ Crear Sala' }}
            </button>
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

        <!-- Formulario para Crear Sala -->
        <div
          v-if="showCreateRoomForm && network.status === 'connected'"
          class="bg-black/90 border border-emerald-700/60 p-3 flex flex-col gap-2.5"
        >
          <div class="text-xs font-bold text-emerald-400 uppercase">Nueva Sala Personalizada</div>
          <div class="grid grid-cols-2 gap-2">
            <input
              v-model="newRoomName"
              type="text"
              placeholder="Nombre de la partida..."
              class="bg-stone-900 border border-stone-700 px-2 py-1 text-xs text-stone-200"
            />
            <input
              v-model.number="newRoomMaxPlayers"
              type="number"
              min="2"
              max="64"
              placeholder="Máx jugadores (2-64)"
              class="bg-stone-900 border border-stone-700 px-2 py-1 text-xs text-stone-200"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="newRoomPassword"
              type="password"
              placeholder="Contraseña (opcional)..."
              class="flex-1 bg-stone-900 border border-stone-700 px-2 py-1 text-xs text-stone-200"
            />
            <button
              type="button"
              class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-4 text-xs uppercase"
              @click="createRoom"
            >
              Crear
            </button>
          </div>
        </div>

        <!-- Explorador de Salas Públicas -->
        <div class="flex-1 flex flex-col gap-2 min-h-48">
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

          <div class="flex-1 overflow-y-auto max-h-56 flex flex-col gap-1.5 pr-1">
            <div
              v-if="roomList.length === 0"
              class="text-center py-6 text-stone-600 text-xs italic"
            >
              {{ network.status === 'connected' ? 'No hay salas creadas. ¡Sé el primero o únete a la global!' : 'Conéctate para ver las salas activas.' }}
            </div>

            <div
              v-for="r in roomList"
              :key="r.roomId"
              class="bg-stone-900/90 border border-stone-800 p-2.5 flex items-center justify-between hover:border-stone-600 transition-colors"
              :class="{ 'border-emerald-500/80 bg-emerald-950/20': network.currentRoom?.roomId === r.roomId }"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-bold text-stone-200 text-xs">{{ r.name }}</span>
                  <span
                    v-if="r.roomId === 'GLOBAL'"
                    class="text-[9px] px-1 py-0.2 bg-blue-900/60 border border-blue-600 text-blue-300 uppercase"
                  >
                    Oficial
                  </span>
                  <span
                    v-if="r.isPrivate"
                    class="text-[9px] px-1 py-0.2 bg-yellow-900/60 border border-yellow-600 text-yellow-300 uppercase"
                  >
                    🔒 Con Clave
                  </span>
                </div>
                <div class="text-[10px] text-stone-500 mt-0.5">
                  Host: {{ r.hostNickname }} · ID: <span class="text-stone-400">{{ r.roomId }}</span>
                </div>
              </div>

              <div class="flex items-center gap-3">
                <span class="text-xs font-mono text-stone-400">
                  {{ r.currentPlayers }}/{{ r.maxPlayers }}
                </span>
                <button
                  v-if="network.currentRoom?.roomId !== r.roomId"
                  type="button"
                  class="bg-stone-800 hover:bg-emerald-600 hover:text-white text-stone-300 py-1 px-3 text-xs uppercase transition-colors"
                  @click="joinSpecificRoom(r.roomId, r.isPrivate)"
                >
                  Unirse
                </button>
                <span
                  v-else
                  class="text-xs text-emerald-400 font-bold uppercase px-2"
                >
                  Dentro
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sistema de Chat Flotante en Pantalla (Esquina inferior izquierda) -->
    <div
      class="fixed bottom-4 left-4 z-20 flex flex-col gap-1 w-80 sm:w-96 font-mono text-xs select-none pointer-events-auto"
      @mousedown.stop
    >
      <!-- Historial de mensajes -->
      <div
        ref="chatHistoryEl"
        class="bg-black/75 border border-stone-800/80 p-2.5 max-h-48 overflow-y-auto flex flex-col gap-1 shadow-lg text-[11px] leading-relaxed transition-all"
        :class="{ 'opacity-90': chatOpen, 'opacity-65 hover:opacity-90': !chatOpen }"
      >
        <div v-if="messages.length === 0" class="text-stone-500 italic text-[10px]">
          Presiona [ENTER] para chatear con otros supervivientes.
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="break-words"
        >
          <span
            class="text-[9px] font-bold uppercase px-1 py-0.2 mr-1 rounded-xs"
            :class="
              msg.channel === 'global'
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : msg.channel === 'system'
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
            "
          >
            {{ msg.channel }}
          </span>
          <span class="font-bold text-stone-300 mr-1">{{ msg.senderName }}:</span>
          <span
            :class="
              msg.channel === 'system' ? 'text-amber-200 italic' : 'text-stone-100'
            "
          >
            {{ msg.message }}
          </span>
        </div>
      </div>

      <!-- Barra de Input del Chat -->
      <div v-if="chatOpen" class="flex items-center gap-1 bg-black/90 border border-emerald-600 p-1">
        <select
          v-model="chatChannel"
          class="bg-stone-900 border border-stone-700 text-stone-300 text-[10px] px-1 py-1 focus:outline-none"
        >
          <option value="room">SALA</option>
          <option value="global">GLOBAL</option>
        </select>
        <input
          ref="chatInputEl"
          v-model="chatDraft"
          type="text"
          maxlength="180"
          placeholder="Escribe un mensaje... (Enter para enviar, Esc para salir)"
          class="flex-1 bg-transparent text-white px-2 py-0.5 text-xs focus:outline-none"
          @keydown.enter.stop="sendChat"
          @keydown.esc.stop="closeChat"
        />
        <button
          type="button"
          class="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 text-[10px] font-bold uppercase"
          @click="sendChat"
        >
          Enviar
        </button>
      </div>
      <div v-else class="text-[10px] text-stone-500 font-mono flex items-center gap-2">
        <span>Presiona <kbd class="px-1 py-0.2 bg-stone-900 border border-stone-700 text-stone-300">ENTER</kbd> para abrir el chat</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick } from 'vue';
import { networkManager } from '../../game/network/networkManager';
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
const showCreateRoomForm = ref(false);
const nicknameInput = ref(localStorage.getItem('zombie_game_nick') || `Survivor_${Math.floor(Math.random() * 900 + 100)}`);
const serverUrlInput = ref(localStorage.getItem('zombie_game_server') || 'http://localhost:5000');

const newRoomName = ref('Partida de Supervivencia');
const newRoomMaxPlayers = ref(16);
const newRoomPassword = ref('');
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
  await networkManager.joinGlobalRoom();
  showLobbyModal.value = false;
}

async function createRoom() {
  if (!newRoomName.value.trim()) return;
  await networkManager.createRoom(
    newRoomName.value.trim(),
    newRoomMaxPlayers.value,
    !!newRoomPassword.value.trim(),
    newRoomPassword.value.trim() || undefined,
  );
  showCreateRoomForm.value = false;
  showLobbyModal.value = false;
}

async function joinSpecificRoom(roomId: string, isPrivate: boolean) {
  let pwd: string | undefined = undefined;
  if (isPrivate) {
    const input = prompt('Introduce la contraseña de la sala:');
    if (!input) return;
    pwd = input;
  }
  await networkManager.joinRoom(roomId, pwd);
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
