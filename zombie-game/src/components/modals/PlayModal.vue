<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
    <!-- Steel Bunker Container -->
    <div
      class="relative w-full max-w-3xl steel-panel rounded-sm overflow-hidden p-5 sm:p-7 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
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
              DESPLIEGUE // MODO DE JUEGO
            </h2>
            <p class="text-[11px] font-mono text-red-400/90 tracking-wide uppercase">
              SELECCIONA TIPO DE EXPEDICIÓN: UN JUGADOR O MULTIJUGADOR
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

      <!-- Tabs / Selector Principal de Modo (Un Jugador vs Multijugador) -->
      <div class="grid grid-cols-2 gap-3 mb-5 shrink-0">
        <!-- 1. MODO UN JUGADOR -->
        <button
          type="button"
          :class="[
            'p-3.5 rounded-xs border text-left relative overflow-hidden transition-all flex flex-col justify-between cursor-pointer',
            selectedMode === 'singleplayer'
              ? 'bg-red-950/60 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.35)]'
              : 'bg-[#12151c] border-stone-700/80 hover:border-stone-500 hover:bg-[#151922]'
          ]"
          @click="selectMode('singleplayer')"
        >
          <div v-if="selectedMode === 'singleplayer'" class="absolute top-0 right-0 w-7 h-7 bg-red-600 text-white flex items-center justify-center text-xs">
            <i class="bi bi-check-lg"></i>
          </div>

          <div class="flex items-center gap-3 mb-1.5">
            <div class="text-2xl" :class="selectedMode === 'singleplayer' ? 'text-red-400' : 'text-stone-400'">
              <i class="bi bi-person-fill"></i>
            </div>
            <div>
              <h3 class="font-bold text-sm sm:text-base uppercase tracking-wider text-white">
                UN JUGADOR
              </h3>
              <span class="text-[10px] font-mono uppercase text-stone-400">
                OFFLINE // SOLITARIO
              </span>
            </div>
          </div>
          <p class="text-[11px] font-mono text-stone-400 leading-snug mt-1">
            Mundo procedural infinito, vehículos y combate sin conexión a internet.
          </p>
        </button>

        <!-- 2. MODO MULTIJUGADOR -->
        <button
          type="button"
          :class="[
            'p-3.5 rounded-xs border text-left relative overflow-hidden transition-all flex flex-col justify-between cursor-pointer',
            selectedMode === 'multiplayer'
              ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
              : 'bg-[#12151c] border-stone-700/80 hover:border-stone-500 hover:bg-[#151922]'
          ]"
          @click="selectMode('multiplayer')"
        >
          <div v-if="selectedMode === 'multiplayer'" class="absolute top-0 right-0 w-7 h-7 bg-emerald-600 text-white flex items-center justify-center text-xs">
            <i class="bi bi-check-lg"></i>
          </div>

          <div class="flex items-center gap-3 mb-1.5">
            <div class="text-2xl" :class="selectedMode === 'multiplayer' ? 'text-emerald-400' : 'text-stone-400'">
              <i class="bi bi-globe2"></i>
            </div>
            <div>
              <h3 class="font-bold text-sm sm:text-base uppercase tracking-wider text-white">
                MULTIJUGADOR
              </h3>
              <span class="text-[10px] font-mono uppercase text-emerald-400">
                EN LÍNEA // .NET SIGNALR
              </span>
            </div>
          </div>
          <p class="text-[11px] font-mono text-stone-400 leading-snug mt-1">
            Partida compartida, salas comunitarias, sincronización de zombis y chat en vivo.
          </p>
        </button>
      </div>

      <!-- Contenedor con Scroll para el contenido específico del modo -->
      <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 font-mono">
        <!-- ========================================== -->
        <!-- VISTA DE MODO: UN JUGADOR                  -->
        <!-- ========================================== -->
        <template v-if="selectedMode === 'singleplayer'">
          <!-- Resumen del Superviviente -->
          <div class="bg-black/60 border border-stone-800 p-4 rounded-xs">
            <div class="flex items-center justify-between text-xs text-stone-400 mb-2.5">
              <span class="uppercase tracking-widest text-stone-300 font-bold flex items-center gap-2">
                <i class="bi bi-person-badge text-red-500"></i> PERFIL SUPERVIVIENTE ACTIVO:
              </span>
              <span class="text-emerald-400 font-bold">ESTADO: INMUNE</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div class="bg-[#151922] p-2.5 border border-stone-800">
                <span class="text-stone-500 block text-[10px]">ROL</span>
                <span class="text-stone-200 font-bold">MECÁNICO // CHUCK</span>
              </div>
              <div class="bg-[#151922] p-2.5 border border-stone-800">
                <span class="text-stone-500 block text-[10px]">ARMA INICIAL</span>
                <span class="text-stone-200 font-bold">PALANCA DE HIERRO</span>
              </div>
              <div class="bg-[#151922] p-2.5 border border-stone-800">
                <span class="text-stone-500 block text-[10px]">MUNDO</span>
                <span class="text-stone-200 font-bold">PROCEDURAL LIBRE</span>
              </div>
              <div class="bg-[#151922] p-2.5 border border-stone-800">
                <span class="text-stone-500 block text-[10px]">CONEXIÓN</span>
                <span class="text-amber-400 font-bold">OFFLINE / LOCAL</span>
              </div>
            </div>
          </div>

          <!-- Información del modo Offline -->
          <div class="bg-stone-900/40 border border-stone-800/80 p-3.5 text-xs text-stone-300 flex flex-col gap-2">
            <div class="flex items-center gap-2 text-stone-200 font-bold uppercase text-[11px]">
              <i class="bi bi-info-circle-fill text-red-500"></i> Características del juego en solitario:
            </div>
            <ul class="list-disc list-inside text-stone-400 text-[11px] space-y-1">
              <li>Generación infinita de ciudades, gasolineras, granjas y campamentos.</li>
              <li>Vehículos manejables con física de colisiones, gasolina y reparaciones.</li>
              <li>Ciclo día/noche dinámico con farolas e iluminación ambiental.</li>
              <li>Hordas zombis locales sin consumo de red ni latencia.</li>
            </ul>
          </div>
        </template>

        <!-- ========================================== -->
        <!-- VISTA DE MODO: MULTIJUGADOR                -->
        <!-- ========================================== -->
        <template v-else>
          <!-- Barra de Configuración de Red: Nickname y Servidor -->
          <div class="bg-black/70 border border-stone-800 p-3 rounded-xs flex flex-col sm:flex-row gap-3">
            <div class="flex-1">
              <label class="block text-[10px] uppercase text-stone-400 mb-1">Tu Nombre de Superviviente:</label>
              <div class="relative">
                <input
                  v-model="nicknameInput"
                  type="text"
                  maxlength="20"
                  class="w-full bg-[#12151c] border border-stone-700 px-2.5 py-1.5 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                  placeholder="Ej: Survivor_01"
                />
              </div>
            </div>

            <div class="flex-1">
              <label class="block text-[10px] uppercase text-stone-400 mb-1">Servidor Backend (.NET):</label>
              <div class="flex gap-1.5">
                <input
                  v-model="serverUrlInput"
                  type="text"
                  class="flex-1 bg-[#12151c] border border-stone-700 px-2.5 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-emerald-500"
                  placeholder="http://localhost:5000"
                  :disabled="isConnecting"
                />
                <button
                  type="button"
                  class="px-3 py-1.5 text-xs font-bold uppercase transition-colors shrink-0"
                  :class="
                    status === 'connected'
                      ? 'bg-emerald-950 border border-emerald-600 text-emerald-400 hover:bg-emerald-900'
                      : isConnecting
                        ? 'bg-yellow-950 border border-yellow-600 text-yellow-300 animate-pulse'
                        : 'bg-stone-800 border border-stone-600 text-stone-200 hover:bg-stone-700'
                  "
                  :disabled="isConnecting"
                  @click="connectToServer"
                >
                  <span v-if="status === 'connected'"><i class="bi bi-check-circle-fill"></i> Conectado</span>
                  <span v-else-if="isConnecting"><i class="bi bi-arrow-repeat animate-spin"></i> Conectando</span>
                  <span v-else><i class="bi bi-plug-fill"></i> Conectar</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Mensaje de Error si la conexión falla -->
          <div
            v-if="errorMessage"
            class="bg-red-950/80 border border-red-600 p-2.5 text-xs text-red-200 flex items-center justify-between"
          >
            <div class="flex items-center gap-2">
              <i class="bi bi-exclamation-triangle-fill text-red-400 text-sm"></i>
              <span>{{ errorMessage }}</span>
            </div>
            <button
              type="button"
              class="text-red-400 hover:text-white text-xs underline"
              @click="errorMessage = ''"
            >
              Cerrar
            </button>
          </div>

          <!-- Banner para conectarse si está desconectado -->
          <div
            v-if="status !== 'connected' && !isConnecting"
            class="bg-stone-900/50 border border-stone-800 p-4 text-center flex flex-col items-center gap-2.5"
          >
            <div class="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 text-lg">
              <i class="bi bi-hdd-network"></i>
            </div>
            <p class="text-xs text-stone-300 max-w-md">
              Conéctate al servidor .NET para explorar las partidas activas, unirte a la Sala Global compartida o crear tu propia sala.
            </p>
            <button
              type="button"
              class="px-5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase transition-colors"
              @click="connectToServer"
            >
              Conectar al Servidor Multijugador
            </button>
          </div>

          <!-- Panel de Selección de Salas cuando está CONECTADO -->
          <template v-else-if="status === 'connected'">
            <!-- Botón Rápido: Sala Global Oficial -->
            <div class="bg-gradient-to-r from-emerald-950/40 via-stone-900/60 to-black border border-emerald-600/60 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="font-bold text-sm text-emerald-300 uppercase tracking-wide">SALA GLOBAL OFICIAL</span>
                  <span class="text-[9px] px-1.5 py-0.5 bg-emerald-900/80 border border-emerald-600 text-emerald-200 uppercase font-bold">
                    Pública / Abierta
                  </span>
                </div>
                <p class="text-[11px] text-stone-400 mt-0.5">
                  La sala principal compartida. Ideal para entrar directamente sin contraseñas.
                </p>
              </div>

              <button
                type="button"
                class="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center justify-center gap-2 transition-colors shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                :disabled="isJoining"
                @click="joinGlobalAndPlay"
              >
                <i v-if="isJoining && joiningRoomId === 'GLOBAL'" class="bi bi-arrow-repeat animate-spin"></i>
                <i v-else class="bi bi-box-arrow-in-right"></i>
                <span>UNIRSE A SALA GLOBAL Y JUGAR</span>
              </button>
            </div>

            <!-- Botones de Acción Secundaria: Crear Sala y Refrescar -->
            <div class="flex items-center justify-between pt-1">
              <button
                type="button"
                class="px-3 py-1.5 bg-stone-900 border border-stone-700 text-stone-300 hover:text-white hover:border-emerald-500 text-xs uppercase flex items-center gap-1.5 transition-colors"
                @click="showCreateRoom = !showCreateRoom"
              >
                <i :class="showCreateRoom ? 'bi bi-x-lg' : 'bi bi-plus-lg'"></i>
                <span>{{ showCreateRoom ? 'Cancelar Creación' : '+ Crear Nueva Sala' }}</span>
              </button>

              <button
                type="button"
                class="px-2.5 py-1.5 text-stone-400 hover:text-emerald-400 text-xs flex items-center gap-1 transition-colors"
                :disabled="isLoadingRooms"
                @click="refreshRooms"
              >
                <i class="bi bi-arrow-clockwise" :class="{ 'animate-spin': isLoadingRooms }"></i>
                <span>Actualizar Lista</span>
              </button>
            </div>

            <!-- Formulario Desplegable para Crear Sala -->
            <div
              v-if="showCreateRoom"
              class="bg-black/90 border border-emerald-700/60 p-3.5 flex flex-col gap-3 animate-in fade-in duration-150"
            >
              <div class="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                <i class="bi bi-plus-circle"></i> Configuración de la Nueva Sala
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] uppercase text-stone-400 mb-1">Nombre de la Sala:</label>
                  <input
                    v-model="newRoomName"
                    type="text"
                    maxlength="30"
                    placeholder="Ej: Refugio Alfa"
                    class="w-full bg-stone-900 border border-stone-700 px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase text-stone-400 mb-1">Máx Jugadores (2-64):</label>
                  <input
                    v-model.number="newRoomMaxPlayers"
                    type="number"
                    min="2"
                    max="64"
                    class="w-full bg-stone-900 border border-stone-700 px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] uppercase text-stone-400 mb-1">Contraseña (Opcional para sala privada):</label>
                <div class="flex gap-2">
                  <input
                    v-model="newRoomPassword"
                    type="password"
                    placeholder="Dejar vacío para sala pública..."
                    class="flex-1 bg-stone-900 border border-stone-700 px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase flex items-center gap-1.5 transition-colors"
                    :disabled="isCreatingRoom"
                    @click="createRoomAndPlay"
                  >
                    <i v-if="isCreatingRoom" class="bi bi-arrow-repeat animate-spin"></i>
                    <span>Crear y Entrar</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Explorador de Salas Disponibles -->
            <div class="flex flex-col gap-2">
              <div class="text-[11px] uppercase tracking-wider text-stone-400 font-bold flex items-center justify-between">
                <span>Salas Activas de la Comunidad ({{ otherRooms.length }})</span>
              </div>

              <div class="bg-black/50 border border-stone-800 max-h-48 overflow-y-auto flex flex-col divide-y divide-stone-800/60">
                <div
                  v-if="otherRooms.length === 0"
                  class="py-6 text-center text-xs text-stone-500 italic"
                >
                  No hay salas personalizadas activas en este momento. ¡Únete a la Sala Global o crea una nueva!
                </div>

                <div
                  v-for="r in otherRooms"
                  :key="r.roomId"
                  class="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-stone-900/60 transition-colors"
                >
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-xs text-stone-200">{{ r.name }}</span>
                      <span
                        v-if="r.isPrivate"
                        class="text-[9px] px-1 py-0.2 bg-yellow-950 border border-yellow-700 text-yellow-400 uppercase"
                      >
                        🔒 Con Clave
                      </span>
                    </div>
                    <div class="text-[10px] text-stone-500 mt-0.5">
                      Host: <span class="text-stone-400">{{ r.hostNickname }}</span> · ID: <span class="text-stone-500">{{ r.roomId }}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <span class="text-xs text-stone-400 font-mono">
                      {{ r.currentPlayers }}/{{ r.maxPlayers }}
                    </span>

                    <!-- Entrada de clave si la sala es privada -->
                    <input
                      v-if="r.isPrivate"
                      v-model="passwordInputs[r.roomId]"
                      type="password"
                      placeholder="Clave..."
                      class="w-20 bg-stone-900 border border-stone-700 px-1.5 py-1 text-[11px] text-stone-200 focus:outline-none focus:border-yellow-500"
                    />

                    <button
                      type="button"
                      class="px-3 py-1 bg-stone-800 hover:bg-emerald-600 hover:text-white text-stone-300 text-xs uppercase transition-colors flex items-center gap-1"
                      :disabled="isJoining && joiningRoomId === r.roomId"
                      @click="joinRoomAndPlay(r.roomId, r.isPrivate)"
                    >
                      <i v-if="isJoining && joiningRoomId === r.roomId" class="bi bi-arrow-repeat animate-spin"></i>
                      <span>Unirse</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>

      <!-- Action Footer -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-800 mt-4 shrink-0">
        <button
          type="button"
          class="steel-btn w-full sm:w-auto px-6 py-2.5 text-xs uppercase font-mono tracking-wider font-bold text-stone-300 hover:text-white"
          @click="close"
        >
          Cancelar
        </button>

        <!-- Botón principal según el modo seleccionado -->
        <template v-if="selectedMode === 'singleplayer'">
          <button
            type="button"
            class="play-btn-prominent w-full sm:w-auto px-8 py-3 text-sm uppercase font-extrabold tracking-widest text-white flex items-center justify-center gap-2 font-['Black_Ops_One'] cursor-pointer"
            @click="startSingleplayer"
          >
            <i class="bi bi-crosshair2 text-lg text-red-300"></i>
            <span>INICIAR PARTIDA EN SOLITARIO</span>
          </button>
        </template>

        <template v-else>
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span v-if="status === 'connected'" class="text-[11px] font-mono text-emerald-400 hidden sm:inline">
              ● Listo para desplegar
            </span>
            <button
              v-if="status !== 'connected'"
              type="button"
              class="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase font-mono transition-colors"
              :disabled="isConnecting"
              @click="connectToServer"
            >
              {{ isConnecting ? 'Conectando...' : 'Conectar al Servidor' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { sound } from '../../audio/soundEngine';
import { networkManager } from '../../game/network/networkManager';
import type { RoomSummaryDto, ConnectionStatus } from '../../game/network/networkTypes';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'launch-demo'): void;
}>();

type GameMode = 'singleplayer' | 'multiplayer';

const selectedMode = ref<GameMode>('singleplayer');

// Form credentials
const nicknameInput = ref(
  localStorage.getItem('zombie_game_nick') || `Survivor_${Math.floor(Math.random() * 900 + 100)}`
);
const serverUrlInput = ref(
  localStorage.getItem('zombie_game_server') || 'http://localhost:5000'
);

// Connection & status
const status = ref<ConnectionStatus>(networkManager.status);
const isConnecting = ref(false);
const errorMessage = ref('');
const isJoining = ref(false);
const joiningRoomId = ref<string | null>(null);

// Rooms
const roomList = ref<RoomSummaryDto[]>([]);
const isLoadingRooms = ref(false);
const showCreateRoom = ref(false);
const isCreatingRoom = ref(false);

const newRoomName = ref('Refugio de Supervivientes');
const newRoomMaxPlayers = ref(16);
const newRoomPassword = ref('');

const passwordInputs = ref<Record<string, string>>({});

// Filtro de salas excluyendo GLOBAL para la lista de abajo
const otherRooms = computed(() => {
  return roomList.value.filter((r) => r.roomId !== 'GLOBAL');
});

function selectMode(mode: GameMode) {
  selectedMode.value = mode;
  sound.playClick();
  if (mode === 'multiplayer' && status.value !== 'connected' && !isConnecting.value) {
    connectToServer();
  }
}

async function connectToServer() {
  if (isConnecting.value) return;
  errorMessage.value = '';
  isConnecting.value = true;

  localStorage.setItem('zombie_game_nick', nicknameInput.value);
  localStorage.setItem('zombie_game_server', serverUrlInput.value);

  try {
    const ok = await networkManager.connect(serverUrlInput.value, nicknameInput.value);
    status.value = networkManager.status;
    if (ok) {
      await refreshRooms();
    } else {
      errorMessage.value = `No se pudo conectar a ${serverUrlInput.value}. Asegúrate de que el backend de .NET esté activo.`;
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
  // Asegurarse de salir de cualquier sala previa si estaba conectado
  if (networkManager.isConnected && networkManager.currentRoom) {
    await networkManager.leaveRoom();
  }
  sound.playPlayClick();
  emit('launch-demo');
}

async function joinGlobalAndPlay() {
  if (status.value !== 'connected') {
    await connectToServer();
    if (status.value !== 'connected') return;
  }

  isJoining.value = true;
  joiningRoomId.value = 'GLOBAL';
  errorMessage.value = '';

  try {
    await networkManager.joinGlobalRoom();
    sound.playPlayClick();
    emit('launch-demo');
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al unirse a la Sala Global.';
  } finally {
    isJoining.value = false;
    joiningRoomId.value = null;
  }
}

async function joinRoomAndPlay(roomId: string, isPrivate: boolean) {
  if (status.value !== 'connected') return;

  const pwd = isPrivate ? (passwordInputs.value[roomId] || '').trim() : undefined;
  if (isPrivate && !pwd) {
    errorMessage.value = 'Por favor introduce la contraseña de la sala privada.';
    return;
  }

  isJoining.value = true;
  joiningRoomId.value = roomId;
  errorMessage.value = '';

  try {
    await networkManager.joinRoom(roomId, pwd);
    sound.playPlayClick();
    emit('launch-demo');
  } catch (err: any) {
    errorMessage.value = err?.message || 'No se pudo ingresar a la sala seleccionada.';
  } finally {
    isJoining.value = false;
    joiningRoomId.value = null;
  }
}

async function createRoomAndPlay() {
  if (status.value !== 'connected') return;
  const name = newRoomName.value.trim();
  if (!name) {
    errorMessage.value = 'El nombre de la sala no puede estar vacío.';
    return;
  }

  isCreatingRoom.value = true;
  errorMessage.value = '';

  try {
    const isPrivate = !!newRoomPassword.value.trim();
    await networkManager.createRoom(
      name,
      newRoomMaxPlayers.value || 16,
      isPrivate,
      isPrivate ? newRoomPassword.value.trim() : undefined
    );
    sound.playPlayClick();
    emit('launch-demo');
  } catch (err: any) {
    errorMessage.value = err?.message || 'Error al crear la sala.';
  } finally {
    isCreatingRoom.value = false;
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
    isCreatingRoom.value = false;
  };

  if (status.value === 'connected') {
    refreshRooms();
  }
});

onUnmounted(() => {
  networkManager.onStatusChange = undefined;
  networkManager.onRoomListUpdated = undefined;
  networkManager.onError = undefined;
});
</script>
