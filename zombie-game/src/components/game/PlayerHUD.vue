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
          :data-slot-idx="idx"
          class="relative w-14 h-14 rounded-xs border transition-all cursor-pointer flex flex-col justify-between p-1 group bg-transparent select-none touch-none"
          :class="[
            equippedIndex === idx
              ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.45),inset_0_0_8px_rgba(6,182,212,0.2)]'
              : slot
                ? 'border-stone-700 hover:border-stone-400 hover:shadow-[0_0_10px_rgba(255,255,255,0.15)]'
                : 'border-stone-800/80 hover:border-stone-700',
            dragState.active && dragState.slotIdx === idx ? 'opacity-30 scale-95 border-dashed border-cyan-400' : '',
            dragState.active && dragState.hoverSlotIdx === idx && dragState.slotIdx !== idx
              ? 'ring-2 ring-emerald-400 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.7)] scale-105 z-20'
              : ''
          ]"
          :title="slot ? `${slot.name} [${idx + 1}] · Arrastra a otro slot para reacomodar o al terreno para soltar` : `Ranura ${idx + 1} (Vacía)`"
          @pointerdown="onSlotPointerDown($event, idx, slot)"
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

          <!-- Overlay de Destino al Reacomodar Ranura -->
          <div
            v-if="dragState.active && dragState.hoverSlotIdx === idx && dragState.slotIdx !== idx"
            class="absolute inset-0 bg-emerald-950/85 backdrop-blur-xxs flex flex-col items-center justify-center rounded-xs z-30 pointer-events-none border border-emerald-400 animate-pulse"
          >
            <span class="text-[8px] font-black text-emerald-300 uppercase tracking-wider">
              {{ slot ? 'CAMBIAR' : 'MOVER' }}
            </span>
            <span class="text-[7px] text-emerald-200/90 font-mono">
              RANURA {{ idx + 1 }}
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
          :title="`Arrojadizo: ${expId} [G lanzar / J cambiar]`"
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

    <!-- 3. BARRAS DE ESTADO EN FILA (vida / escudo / stamina), alineadas abajo -->
    <div class="flex flex-row items-end gap-2.5 mt-2 pointer-events-auto bg-transparent">
      <!-- VIDA -->
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1 pl-5">
          <svg
            v-for="i in 3"
            :key="i"
            viewBox="0 0 24 24"
            class="w-3.5 h-3.5 shrink-0"
            :style="{ filter: i <= (lives ?? 3) ? 'drop-shadow(0 0 4px rgba(239,68,68,0.8))' : 'none' }"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              :fill="i <= (lives ?? 3) ? '#ef4444' : '#44403c'"
              :stroke="i <= (lives ?? 3) ? '#fca5a5' : '#57534e'"
              stroke-width="1.5"
            />
          </svg>
        </div>
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

    <!-- Insignia Flotante al Arrastrar Arma -->
    <div
      v-if="dragState.active && dragState.slot"
      class="fixed pointer-events-none z-[100] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-2.5 py-1.5 bg-stone-950/95 border rounded-xs backdrop-blur-xs font-mono transition-colors"
      :class="
        dragState.hoverSlotIdx >= 0 && dragState.hoverSlotIdx !== dragState.slotIdx
          ? 'border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.75)]'
          : 'border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.65)]'
      "
      :style="{ left: `${dragState.currentX}px`, top: `${dragState.currentY}px` }"
    >
      <div class="w-8 h-8 flex items-center justify-center shrink-0" v-html="getWeaponIcon(dragState.slot.id)"></div>
      <div class="flex flex-col pr-1">
        <span
          class="text-[10px] font-bold uppercase leading-none"
          :class="dragState.hoverSlotIdx >= 0 && dragState.hoverSlotIdx !== dragState.slotIdx ? 'text-emerald-300' : 'text-cyan-300'"
        >
          {{ dragState.slot.name }}
        </span>
        <span
          v-if="dragState.hoverSlotIdx >= 0 && dragState.hoverSlotIdx !== dragState.slotIdx"
          class="text-[8px] text-emerald-400 font-mono mt-0.5 tracking-tight font-bold"
        >
          ⇄ Reacomodar en Ranura {{ dragState.hoverSlotIdx + 1 }}
        </span>
        <span v-else class="text-[8px] text-stone-400 font-mono mt-0.5 tracking-tight">Soltar en el terreno</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
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
  lives?: number;
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
  (e: 'dragSlotStart', payload: { idx: number; slot: HudWeaponSlot; x: number; y: number }): void;
  (e: 'dragSlotMove', payload: { idx: number; slot: HudWeaponSlot; x: number; y: number; hoverSlotIdx?: number }): void;
  (e: 'dragSlotEnd', payload: { idx: number; slot: HudWeaponSlot; x: number; y: number }): void;
  (e: 'swapSlots', payload: { from: number; to: number }): void;
}>();

// --- Arrastre de armas hacia el entorno o reacomodo entre ranuras ---
interface DragState {
  active: boolean;
  slotIdx: number;
  hoverSlotIdx: number;
  slot: HudWeaponSlot | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const dragState = reactive<DragState>({
  active: false,
  slotIdx: -1,
  hoverSlotIdx: -1,
  slot: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
});

let isPointerDownOnSlot = false;
let pendingSlotIdx = -1;
let pendingSlot: HudWeaponSlot | null = null;

function onSlotPointerDown(e: PointerEvent, idx: number, slot: HudWeaponSlot | null) {
  if (e.button !== 0) return;
  if (!slot) return;
  isPointerDownOnSlot = true;
  pendingSlotIdx = idx;
  pendingSlot = slot;
  dragState.startX = e.clientX;
  dragState.startY = e.clientY;
  dragState.currentX = e.clientX;
  dragState.currentY = e.clientY;

  window.addEventListener('pointermove', onWindowPointerMove);
  window.addEventListener('pointerup', onWindowPointerUp);
}

function onWindowPointerMove(e: PointerEvent) {
  if (!isPointerDownOnSlot) return;
  dragState.currentX = e.clientX;
  dragState.currentY = e.clientY;

  if (!dragState.active) {
    const dist = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
    if (dist > 8) {
      dragState.active = true;
      dragState.slotIdx = pendingSlotIdx;
      dragState.slot = pendingSlot;
      emit('dragSlotStart', { idx: pendingSlotIdx, slot: pendingSlot!, x: e.clientX, y: e.clientY });
    }
  }

  if (dragState.active) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const targetSlotEl = el?.closest('[data-slot-idx]');
    if (targetSlotEl) {
      const idxAttr = targetSlotEl.getAttribute('data-slot-idx');
      const parsedIdx = idxAttr !== null ? parseInt(idxAttr, 10) : -1;
      dragState.hoverSlotIdx = parsedIdx >= 0 && parsedIdx < 6 ? parsedIdx : -1;
    } else {
      dragState.hoverSlotIdx = -1;
    }

    emit('dragSlotMove', {
      idx: dragState.slotIdx,
      slot: dragState.slot!,
      x: e.clientX,
      y: e.clientY,
      hoverSlotIdx: dragState.hoverSlotIdx,
    });
  }
}

function onWindowPointerUp(e: PointerEvent) {
  window.removeEventListener('pointermove', onWindowPointerMove);
  window.removeEventListener('pointerup', onWindowPointerUp);

  if (dragState.active) {
    const fromIdx = dragState.slotIdx;
    const toIdx = dragState.hoverSlotIdx;
    const slot = dragState.slot;

    dragState.active = false;
    dragState.slotIdx = -1;
    dragState.hoverSlotIdx = -1;
    dragState.slot = null;
    isPointerDownOnSlot = false;
    pendingSlotIdx = -1;
    pendingSlot = null;

    if (slot) {
      if (toIdx >= 0 && toIdx < 6 && toIdx !== fromIdx) {
        sound.playEquipSound();
        emit('swapSlots', { from: fromIdx, to: toIdx });
      } else {
        emit('dragSlotEnd', { idx: fromIdx, slot, x: e.clientX, y: e.clientY });
      }
    }
  } else {
    if (isPointerDownOnSlot && pendingSlotIdx >= 0) {
      sound.playClick();
      emit('selectSlot', pendingSlotIdx);
    }
    isPointerDownOnSlot = false;
    pendingSlotIdx = -1;
    pendingSlot = null;
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onWindowPointerMove);
  window.removeEventListener('pointerup', onWindowPointerUp);
});

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
