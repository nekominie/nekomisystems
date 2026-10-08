<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
    <div class="relative w-full max-w-4xl steel-panel rounded-sm overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
      <!-- Rivets -->
      <span class="rivet absolute top-3 left-3"></span>
      <span class="rivet absolute top-3 right-3"></span>
      <span class="rivet absolute bottom-3 left-3"></span>
      <span class="rivet absolute bottom-3 right-3"></span>

      <!-- Hazard Header Strip -->
      <div class="hazard-stripes h-2 -mx-8 -mt-8 mb-6"></div>

      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-stone-700/80 mb-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xs bg-stone-900 border border-stone-600 flex items-center justify-center text-red-500">
            <i class="bi bi-safe2-fill text-2xl"></i>
          </div>
          <div>
            <h2 class="text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white font-['Black_Ops_One']">
              CASILLERO // ARMERÍA DEL REFUGIO
            </h2>
            <p class="text-xs font-mono text-stone-400 tracking-wide uppercase">
              GESTIÓN DE INDUMENTARIA, ARMAS Y SUMINISTROS DE SUPERVIVENCIA
            </p>
          </div>
        </div>

        <button
          type="button"
          class="w-9 h-9 flex items-center justify-center bg-stone-900 border border-stone-700 text-stone-400 hover:text-white hover:border-red-600 transition-colors rounded-xs cursor-pointer"
          @click="close"
        >
          <i class="bi bi-x-lg text-lg"></i>
        </button>
      </div>

      <!-- Main Locker Content -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-y-auto pr-1 flex-1">
        <!-- Col 1: Equipped Slots (4 cols) -->
        <div class="lg:col-span-4 space-y-3">
          <div class="flex items-center justify-between pb-1 border-b border-stone-800">
            <span class="text-xs font-mono font-bold text-stone-300 uppercase">EQUIPAMIENTO EN CUERPO</span>
            <span class="text-[10px] font-mono text-stone-500">PESO: {{ totalWeight }} / 30 KG</span>
          </div>

          <div
            v-for="slot in equippedSlots"
            :key="slot.type"
            class="bg-black/60 border border-stone-800 p-2.5 rounded-xs flex items-center gap-3 hover:border-stone-600 transition-colors"
          >
            <div class="w-11 h-11 bg-stone-900 border border-stone-700 rounded-xs flex items-center justify-center text-xl text-stone-300">
              <i :class="slot.icon"></i>
            </div>
            <div class="flex-1 min-w-0">
              <span class="block text-[10px] font-mono text-stone-500 uppercase">{{ slot.slotLabel }}</span>
              <span class="block text-xs font-mono font-bold text-stone-100 truncate">{{ slot.item.name }}</span>
              <span class="text-[10px] font-mono text-red-400">{{ slot.item.stat }}</span>
            </div>
          </div>
        </div>

        <!-- Col 2: Locker Rack Catalog (5 cols) -->
        <div class="lg:col-span-5 space-y-3">
          <div class="flex items-center justify-between pb-1 border-b border-stone-800">
            <span class="text-xs font-mono font-bold text-stone-300 uppercase">DEPÓSITO METÁLICO</span>
            <span class="text-[10px] font-mono text-amber-500 font-bold">5 ITEMS DISPONIBLES</span>
          </div>

          <div class="space-y-2">
            <div
              v-for="weapon in lockerWeapons"
              :key="weapon.id"
              :class="[
                'p-3 rounded-xs border cursor-pointer transition-all flex items-center justify-between',
                equippedWeaponId === weapon.id
                  ? 'bg-red-950/40 border-red-500'
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-600 hover:bg-stone-800/60'
              ]"
              @click="equipWeapon(weapon)"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-black/70 border border-stone-700 rounded-xs flex items-center justify-center text-lg text-red-400">
                  <i :class="weapon.icon"></i>
                </div>
                <div>
                  <h4 class="text-xs font-bold font-mono text-stone-100 uppercase">{{ weapon.name }}</h4>
                  <p class="text-[10px] font-mono text-stone-400">{{ weapon.type }} // Peso: {{ weapon.weight }}kg</p>
                </div>
              </div>

              <div class="text-right">
                <span class="text-xs font-mono font-bold block text-red-400">{{ weapon.damage }} DMG</span>
                <span
                  :class="[
                    'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-xs',
                    equippedWeaponId === weapon.id
                      ? 'bg-red-600 text-white font-bold'
                      : 'bg-stone-800 text-stone-400'
                  ]"
                >
                  {{ equippedWeaponId === weapon.id ? 'EQUIPADO' : 'EQUIPAR' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Col 3: Survivor Vitals & Status (3 cols) -->
        <div class="lg:col-span-3 space-y-3 bg-[#0d0f14] p-4 border border-stone-800 rounded-xs">
          <div class="flex items-center gap-2 pb-2 border-b border-stone-800">
            <i class="bi bi-heart-pulse-fill text-red-500 text-base"></i>
            <span class="text-xs font-mono font-bold text-stone-200 uppercase">ESTADO BIOLÓGICO</span>
          </div>

          <div class="space-y-2.5 text-xs font-mono">
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-stone-400">SALUD</span>
                <span class="text-green-400 font-bold">100%</span>
              </div>
              <div class="w-full h-1.5 bg-stone-800 rounded-xs overflow-hidden">
                <div class="h-full bg-green-500 w-full"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-stone-400">ESTAMINA</span>
                <span class="text-yellow-400 font-bold">85%</span>
              </div>
              <div class="w-full h-1.5 bg-stone-800 rounded-xs overflow-hidden">
                <div class="h-full bg-yellow-500 w-[85%]"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-stone-400">INFECCIÓN VIRAL</span>
                <span class="text-red-400 font-bold">0% (NEGATIVO)</span>
              </div>
              <div class="w-full h-1.5 bg-stone-800 rounded-xs overflow-hidden">
                <div class="h-full bg-red-600 w-0"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-stone-400">SIGILO EN SOMBRA</span>
                <span class="text-stone-300 font-bold">70%</span>
              </div>
              <div class="w-full h-1.5 bg-stone-800 rounded-xs overflow-hidden">
                <div class="h-full bg-blue-500 w-[70%]"></div>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-stone-800">
            <span class="text-[10px] font-mono text-stone-500 block mb-1">NOTAS DEL REFUGIO</span>
            <p class="text-[11px] font-mono text-stone-400 italic leading-snug">
              "El bate con púas es silencioso y no gasta munición. Reserva la escopeta recortada para cuando estés acorralado."
            </p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between pt-4 border-t border-stone-800 mt-4">
        <span class="text-xs font-mono text-stone-500">
          CASILLERO #402 // NEKOMI BUNKER SURVIVAL WING
        </span>
        <button
          type="button"
          class="steel-btn px-6 py-2.5 text-xs uppercase font-mono tracking-wider font-bold text-stone-200 hover:text-white"
          @click="close"
        >
          Cerrar Casillero
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { sound } from '../../audio/soundEngine';

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const equippedWeaponId = ref('crowbar');

const lockerWeapons = [
  { id: 'crowbar', name: 'Palanca de Acero', type: 'Contundente / Útil', damage: 45, weight: 2.1, icon: 'bi bi-tools' },
  { id: 'spiked-bat', name: 'Bate con Alambre de Púas', type: 'Contundente Sangriento', damage: 60, weight: 2.8, icon: 'bi bi-slash-lg' },
  { id: 'machete', name: 'Machete Oxidado de Taller', type: 'Arma Cortante', damage: 75, weight: 1.8, icon: 'bi bi-scissors' },
  { id: 'shotgun', name: 'Escopeta Recortada 12G', type: 'Fuego / Dispersión', damage: 180, weight: 3.5, icon: 'bi bi-crosshair' },
  { id: 'fireaxe', name: 'Hacha de Bombero', type: 'Pesada / Demolición', damage: 90, weight: 4.2, icon: 'bi bi-hammer' },
];

const currentWeapon = computed(() => {
  return lockerWeapons.find((w) => w.id === equippedWeaponId.value) || lockerWeapons[0];
});

const equippedSlots = computed(() => [
  {
    type: 'weapon',
    slotLabel: 'ARMA EN MANO',
    icon: currentWeapon.value.icon,
    item: {
      name: currentWeapon.value.name,
      stat: `DAÑO: ${currentWeapon.value.damage} // PESO: ${currentWeapon.value.weight}KG`,
    },
  },
  {
    type: 'head',
    slotLabel: 'CABEZA / ROSTRO',
    icon: 'bi bi-shield-fill-exclamation',
    item: {
      name: 'Máscara Antigás M10',
      stat: 'DEF. QUÍMICA 100% // PESO: 0.8KG',
    },
  },
  {
    type: 'body',
    slotLabel: 'TORSO / BLINDAJE',
    icon: 'bi bi-shield-shaded',
    item: {
      name: 'Chaqueta de Cuero con Refuerzos',
      stat: 'MORDEDURA -40% // PESO: 2.5KG',
    },
  },
  {
    type: 'back',
    slotLabel: 'MOCHILA TÁCTICA',
    icon: 'bi bi-bag-fill',
    item: {
      name: 'Mochila Militar ALICE',
      stat: 'CAPACIDAD +25KG // PESO: 1.4KG',
    },
  },
]);

const totalWeight = computed(() => {
  return (currentWeapon.value.weight + 0.8 + 2.5 + 1.4).toFixed(1);
});

function equipWeapon(weapon: typeof lockerWeapons[0]) {
  equippedWeaponId.value = weapon.id;
  sound.playEquipSound();
}

function close() {
  sound.playClick();
  emit('close');
}
</script>
