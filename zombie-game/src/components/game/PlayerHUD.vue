<template>
  <div class="fixed bottom-4 left-4 z-20 flex flex-col items-start gap-3 pointer-events-none select-none font-mono">
    <!-- 1. CHAT DE LA SALA (ARRIBA, SOLO MULTIJUGADOR, FONDO TRANSPARENTE) -->
    <div
      v-if="isMultiplayerActive"
      class="w-80 sm:w-96 flex flex-col gap-1 pointer-events-auto bg-transparent"
    >
      <!-- Historial de Mensajes Flotante con Fondo Transparente -->
      <div
        ref="chatHistoryEl"
        class="max-h-36 overflow-y-auto flex flex-col gap-1 text-[11px] leading-snug p-1 text-stone-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
      >
        <div v-if="messages.length === 0" class="text-stone-400/80 text-[10px] italic">
          [SALA MULTIJUGADOR] Presiona ENTER para chatear.
        </div>
        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="break-words"
        >
          <span
            class="text-[9px] font-bold uppercase px-1 py-0.2 rounded-xs border"
            :class="
              msg.channel === 'room'
                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                : 'border-cyan-600 bg-cyan-950/60 text-cyan-300'
            "
          >
            {{ msg.senderName }}
          </span>
          <span class="text-stone-100 font-medium text-shadow ml-1">{{ msg.message }}</span>
        </div>
      </div>

      <!-- Barra de Input del Chat -->
      <div v-if="chatOpen" class="flex items-center gap-1 border border-cyan-500/70 p-1 bg-black/60 backdrop-blur-xs rounded-xs">
        <input
          ref="chatInputEl"
          v-model="chatDraft"
          type="text"
          maxlength="150"
          placeholder="Escribe un mensaje... (Enter para enviar, Esc para salir)"
          class="flex-1 bg-transparent text-white px-2 py-0.5 text-xs focus:outline-none placeholder-stone-500"
          @keydown.enter.stop="submitChat"
          @keydown.esc.stop="closeChat"
        />
        <button
          type="button"
          class="bg-cyan-700 hover:bg-cyan-600 text-white px-2 py-0.5 text-[10px] font-bold uppercase transition-colors cursor-pointer"
          @click="submitChat"
        >
          ENVIAR
        </button>
      </div>
    </div>

    <!-- 2. INVENTARIO Y ARROJADIZOS (EN MEDIO, FONDO TRANSPARENTE) -->
    <div class="flex flex-col gap-1.5 pointer-events-auto bg-transparent">
      <!-- Fila de 7 Slots Horizontales (6 Ranuras de Armas + 1 Mochila) -->
      <div class="flex items-center gap-2 bg-transparent">
        <!-- Slots 1 al 6: Acceso Rápido de Armas -->
        <div
          v-for="(slot, idx) in displaySlots"
          :key="idx"
          class="relative w-14 h-14 rounded-xs border transition-all cursor-pointer flex flex-col justify-between p-1 group bg-transparent"
          :class="
            equippedIndex === idx
              ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.45),inset_0_0_8px_rgba(6,182,212,0.2)]'
              : slot
                ? 'border-stone-700 hover:border-stone-400 hover:shadow-[0_0_10px_rgba(255,255,255,0.15)]'
                : 'border-stone-800/80 hover:border-stone-700'
          "
          @click="onSelectSlot(idx)"
        >
          <!-- Efecto de Bisel Metálico Flotante -->
          <div class="absolute inset-0 border border-white/5 pointer-events-none rounded-xs"></div>

          <!-- Cabecera del Slot: Número y Munición -->
          <div class="flex items-center justify-between z-10">
            <span
              class="text-[9px] font-black leading-none px-1 rounded-xxs"
              :class="equippedIndex === idx ? 'bg-cyan-500 text-black font-bold' : 'text-stone-400'"
            >
              {{ idx + 1 }}
            </span>
            <span
              v-if="slot && !slot.isMelee"
              class="text-[8px] font-bold tracking-tighter"
              :class="slot.ammo === 0 ? 'text-red-400' : 'text-cyan-300'"
            >
              {{ slot.ammo }}
            </span>
          </div>

          <!-- Icono / Render Vectorial del Arma -->
          <div class="flex-1 flex items-center justify-center p-0.5 z-10">
            <div
              v-if="slot"
              class="w-10 h-8 flex items-center justify-center transition-transform group-hover:scale-105"
              v-html="getWeaponIcon(slot.id)"
            ></div>
            <div v-else class="text-stone-700/60 text-xs font-mono">
              —
            </div>
          </div>

          <!-- Área Inferior: Nombre Corto del Objeto -->
          <div class="text-center z-10 truncate">
            <span
              v-if="slot"
              class="text-[8px] font-black uppercase tracking-wider block truncate"
              :class="equippedIndex === idx ? 'text-cyan-300' : 'text-stone-300'"
            >
              {{ getShortName(slot.id) }}
            </span>
            <span v-else class="text-[7px] text-stone-600 uppercase block">
              VACÍO
            </span>
          </div>

          <!-- Destello de Esquina Metálica -->
          <div class="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-white/40 pointer-events-none"></div>
          <div class="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-white/40 pointer-events-none"></div>
        </div>

        <!-- Slot 7: Icono de Mochila (Abre Modal de Inventario) -->
        <div
          class="relative w-14 h-14 rounded-xs border border-amber-600/70 hover:border-amber-400 hover:shadow-[0_0_18px_rgba(245,158,11,0.4)] transition-all cursor-pointer flex flex-col justify-between p-1 group bg-transparent"
          title="Abrir Mochila / Todos los Objetos [B]"
          @click="$emit('openBackpack')"
        >
          <div class="absolute inset-0 border border-amber-500/10 pointer-events-none rounded-xs"></div>

          <div class="flex items-center justify-between z-10">
            <span class="text-[9px] font-black leading-none px-1 bg-amber-500 text-black rounded-xxs">7</span>
            <span class="text-[8px] text-amber-400 font-bold">[B]</span>
          </div>

          <div class="flex-1 flex items-center justify-center p-0.5 z-10">
            <div class="w-9 h-9 transition-transform group-hover:scale-110" v-html="HUD_ICONS.backpack"></div>
          </div>

          <div class="text-center z-10 truncate">
            <span class="text-[8px] font-black uppercase tracking-wider text-amber-300 block">
              MOCHILA
            </span>
          </div>

          <div class="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t border-l border-amber-400 pointer-events-none"></div>
          <div class="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b border-r border-amber-400 pointer-events-none"></div>
        </div>
      </div>

      <!-- Debajo: 2 Slots de Granadas / Arrojadizos (Más Pequeños) -->
      <div class="flex items-center gap-2 bg-transparent">
        <div
          v-for="(expId, eIdx) in throwableSlots"
          :key="eIdx"
          class="relative w-11 h-11 rounded-xs border transition-all cursor-pointer flex flex-col justify-between p-1 group bg-transparent"
          :class="
            selectedExplosive === expId
              ? 'border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]'
              : 'border-stone-800 hover:border-stone-600'
          "
          :title="`Arrojadizo: ${expId} [G lanzar / H cambiar]`"
          @click="$emit('selectExplosive', expId)"
        >
          <div class="flex items-center justify-between z-10">
            <span class="text-[8px] font-black text-orange-400">
              {{ eIdx === 0 ? 'G' : 'H' }}
            </span>
            <span class="text-[8px] font-bold text-stone-200">
              ×{{ explosiveCounts[expId] ?? 0 }}
            </span>
          </div>

          <div class="flex-1 flex items-center justify-center z-10">
            <div class="w-6 h-6 transition-transform group-hover:scale-110" v-html="HUD_ICONS[expId] || HUD_ICONS.frag_grenade"></div>
          </div>

          <div class="text-center z-10 truncate">
            <span class="text-[7px] font-black uppercase tracking-wider text-orange-300 block">
              {{ getShortName(expId) }}
            </span>
          </div>

          <div class="absolute -top-[1px] -left-[1px] w-1 h-1 border-t border-l border-orange-400/50 pointer-events-none"></div>
          <div class="absolute -bottom-[1px] -right-[1px] w-1 h-1 border-b border-r border-orange-400/50 pointer-events-none"></div>
        </div>
      </div>
    </div>

    <!-- 3. BARRAS DE ESTADO EN FILA (vida / escudo / stamina) -->
    <div class="flex flex-row items-center gap-2.5 pointer-events-auto bg-transparent">
      <!-- VIDA -->
      <div class="flex items-center gap-1.5">
        <div class="w-4 h-4 flex items-center justify-center shrink-0 drop-shadow-[0_0_6px_rgba(74,222,128,0.75)]" v-html="HUD_ICONS.heart"></div>
        <div class="relative w-28 sm:w-32 h-2.5 bg-black/50 border border-stone-500/90 rounded-xxs p-px shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden">
          <div class="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,#fff_3px,#fff_4px)] pointer-events-none"></div>
          <div
            class="h-full rounded-xxs transition-all duration-200 relative overflow-hidden"
            :style="{
              width: `${Math.min(100, Math.max(0, health))}%`,
              background: 'linear-gradient(90deg, #059669 0%, #10b981 50%, #4ade80 85%, #bbf7d0 100%)',
              boxShadow: '0 0 8px rgba(74, 222, 128, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.55)',
            }"
          >
            <div class="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/45 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>

      <!-- ESCUDO / ARMADURA -->
      <div class="flex items-center gap-1.5">
        <div class="w-4 h-4 flex items-center justify-center shrink-0 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]" v-html="HUD_ICONS.shield"></div>
        <div class="relative w-28 sm:w-32 h-2.5 bg-black/50 border border-stone-600/80 rounded-xxs p-px shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden">
          <div class="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,#fff_3px,#fff_4px)] pointer-events-none"></div>
          <div
            class="h-full rounded-xxs transition-all duration-150 relative overflow-hidden"
            :style="{
              width: `${Math.min(100, Math.max(0, armor))}%`,
              background: 'linear-gradient(90deg, #0284c7 0%, #0ea5e9 50%, #7dd3fc 100%)',
              boxShadow: '0 0 8px rgba(56, 189, 248, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
            }"
          >
            <div class="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>

      <!-- STAMINA -->
      <div class="flex items-center gap-1.5">
        <div class="w-4 h-4 flex items-center justify-center shrink-0 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]" v-html="HUD_ICONS.sprint"></div>
        <div class="relative w-28 sm:w-32 h-2.5 bg-black/50 border border-stone-600/80 rounded-xxs p-px shadow-[inset_0_1px_3px_rgba(0,0,0,0.8)] overflow-hidden">
          <div class="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,#fff_3px,#fff_4px)] pointer-events-none"></div>
          <div
            class="h-full rounded-xxs transition-all duration-100 relative overflow-hidden"
            :style="{
              width: `${Math.min(100, Math.max(0, stamina))}%`,
              background: 'linear-gradient(90deg, #d97706 0%, #eab308 50%, #fef08a 100%)',
              boxShadow: '0 0 8px rgba(234, 179, 8, 0.65), inset 0 1px 1px rgba(255, 255, 255, 0.5)',
            }"
          >
            <div class="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { HUD_ICONS, WEAPON_SHORT_NAMES } from './hudIcons';
import type { ChatMessageDto } from '../../game/network/networkTypes';
import { sound } from '../../audio/soundEngine';

export interface HudWeaponSlot {
  id: string;
  name: string;
  ammo?: number;
  reserve?: number;
  isMelee?: boolean;
}

const props = defineProps<{
  health: number;
  armor: number;
  stamina: number;
  slots: (HudWeaponSlot | null)[];
  equippedIndex: number;
  selectedExplosive: string;
  explosiveCounts: Record<string, number>;
  isMultiplayerActive: boolean;
  messages: ChatMessageDto[];
}>();

const emit = defineEmits<{
  (e: 'selectSlot', idx: number): void;
  (e: 'selectExplosive', id: string): void;
  (e: 'openBackpack'): void;
  (e: 'sendChat', msg: string): void;
  (e: 'chatFocusChange', isFocused: boolean): void;
}>();

// Arrojadizos para los 2 slots pequeños inferiores
const throwableSlots = computed(() => {
  const current = props.selectedExplosive;
  const secondary = current === 'frag_grenade' ? 'molotov' : 'frag_grenade';
  return [current, secondary];
});

// Chat state
const chatOpen = ref(false);
const chatDraft = ref('');
const chatHistoryEl = ref<HTMLDivElement | null>(null);
const chatInputEl = ref<HTMLInputElement | null>(null);

// Normalización a 6 slots de acceso rápido
const displaySlots = computed<(HudWeaponSlot | null)[]>(() => {
  const result: (HudWeaponSlot | null)[] = [];
  for (let i = 0; i < 6; i++) {
    result.push(props.slots && props.slots[i] ? props.slots[i] : null);
  }
  return result;
});

function getWeaponIcon(id?: string): string {
  if (!id) return '';
  return HUD_ICONS[id] || HUD_ICONS.combat_knife || '';
}

function getShortName(id?: string): string {
  if (!id) return '';
  return WEAPON_SHORT_NAMES[id] || id.slice(0, 7).toUpperCase();
}

function onSelectSlot(idx: number) {
  sound.playClick();
  emit('selectSlot', idx);
}

function openChat() {
  if (!props.isMultiplayerActive) return;
  chatOpen.value = true;
  emit('chatFocusChange', true);
  nextTick(() => {
    chatInputEl.value?.focus();
  });
}

function closeChat() {
  chatOpen.value = false;
  chatDraft.value = '';
  emit('chatFocusChange', false);
}

function submitChat() {
  const text = chatDraft.value.trim();
  if (text) {
    emit('sendChat', text);
    chatDraft.value = '';
  }
  closeChat();
}

// Expone métodos para abrir chat desde teclas globales (Enter)
defineExpose({
  openChat,
  closeChat,
  isChatOpen: () => chatOpen.value,
});
</script>
