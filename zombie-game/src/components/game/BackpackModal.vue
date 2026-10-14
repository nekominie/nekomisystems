<template>
  <div
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 font-mono select-none"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <!-- Contenedor Táctico de la Mochila -->
    <div
      class="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-stone-950/95 border border-cyan-500/50 rounded-xs shadow-[0_0_40px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(6,182,212,0.05)] text-stone-200 overflow-hidden"
    >
      <!-- Cabecera de la Mochila -->
      <header class="px-5 py-3 border-b border-cyan-500/30 bg-black/90 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7" v-html="HUD_ICONS.backpack"></div>
          <div>
            <h2 class="text-sm font-bold tracking-wider text-cyan-300 uppercase">
              MOCHILA DE SUPERVIVENCIA // INVENTARIO TÁCTICO
            </h2>
            <p class="text-[10px] text-stone-400">
              Selecciona cualquier objeto para equiparlo o administrar tu equipamiento de combate.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="px-3 py-1 bg-stone-900 border border-stone-700 hover:border-red-500 hover:bg-red-950/40 text-stone-300 hover:text-red-200 text-xs font-bold transition-colors cursor-pointer"
          @click="$emit('close')"
        >
          ✕ CERRAR (ESC)
        </button>
      </header>

      <!-- Pestañas de Categoría -->
      <div class="flex border-b border-stone-800 bg-stone-900/50 text-xs overflow-x-auto">
        <button
          v-for="cat in categories"
          :key="cat.id"
          type="button"
          class="px-4 py-2 border-b-2 font-bold uppercase transition-all whitespace-nowrap cursor-pointer"
          :class="
            selectedCategory === cat.id
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
          "
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>

      <!-- Cuadrícula de Objetos -->
      <div class="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        <!-- Tarjeta de Arma / Objeto -->
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="relative bg-stone-900/40 border border-stone-800 rounded-xs p-3 flex flex-col justify-between transition-all hover:border-cyan-500/60 hover:bg-cyan-950/20 group"
        >
          <div>
            <!-- Encabezado con Icono y Nombre -->
            <div class="flex items-center gap-3 mb-2.5">
              <div
                class="w-12 h-12 bg-black/60 border border-stone-700/80 rounded-xs p-1 flex items-center justify-center shrink-0 group-hover:border-cyan-400/80 transition-colors"
                v-html="HUD_ICONS[item.id] || HUD_ICONS.combat_knife"
              ></div>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-bold text-stone-100 truncate group-hover:text-cyan-200">
                  {{ item.name }}
                </div>
                <div class="text-[9px] text-cyan-400/80 uppercase tracking-wider font-semibold">
                  {{ item.categoryName }}
                </div>
              </div>
            </div>

            <!-- Estadísticas del Objeto -->
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-stone-400 bg-black/40 p-2 rounded-xs border border-stone-800/60 mb-3">
              <div>Daño: <span class="text-stone-200 font-bold">{{ item.damage }}</span></div>
              <div v-if="item.fireRate">Cadencia: <span class="text-stone-200 font-bold">{{ item.fireRate }} RPM</span></div>
              <div v-if="item.magSize !== undefined">Cargador: <span class="text-stone-200 font-bold">{{ item.magSize > 0 ? item.magSize : 'Cuerpo a cuerpo' }}</span></div>
              <div v-if="item.range">Alcance: <span class="text-stone-200 font-bold">{{ item.range }} m</span></div>
              <div v-if="item.count !== undefined">Cantidad: <span class="text-yellow-300 font-bold">{{ item.count }}</span></div>
            </div>
          </div>

          <!-- Botón de Acción -->
          <button
            type="button"
            class="w-full py-1.5 px-3 bg-cyan-950/60 border border-cyan-600/70 hover:bg-cyan-500 hover:text-black text-cyan-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            @click="equipItem(item)"
          >
            <i class="bi bi-box-arrow-in-down-right"></i>
            <span>{{ isEquipped(item.id) ? 'EQUIPADO ✓' : 'EQUIPAR' }}</span>
          </button>
        </div>

        <!-- Opción Especial: Blindaje / Placa de Armadura -->
        <div
          v-if="selectedCategory === 'all' || selectedCategory === 'supplies'"
          class="relative bg-stone-900/40 border border-sky-800/60 rounded-xs p-3 flex flex-col justify-between transition-all hover:border-sky-400 hover:bg-sky-950/20 group"
        >
          <div>
            <div class="flex items-center gap-3 mb-2.5">
              <div class="w-12 h-12 bg-black/60 border border-sky-700/80 rounded-xs p-2 flex items-center justify-center shrink-0" v-html="HUD_ICONS.shield"></div>
              <div>
                <div class="text-xs font-bold text-sky-200">Placas de Blindaje</div>
                <div class="text-[9px] text-sky-400 uppercase font-semibold">Defensa Corporal</div>
              </div>
            </div>
            <p class="text-[10px] text-stone-400 bg-black/40 p-2 rounded-xs border border-stone-800/60 mb-3">
              Restaura la barra de armadura al 100% para amortiguar impactos de zombis y proyectiles.
            </p>
          </div>
          <button
            type="button"
            class="w-full py-1.5 px-3 bg-sky-950/60 border border-sky-600/70 hover:bg-sky-400 hover:text-black text-sky-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            @click="restoreArmor"
          >
            <i class="bi bi-shield-plus"></i>
            <span>REPARAR BLINDAJE</span>
          </button>
        </div>

        <!-- Opción Especial: Botiquín Médico -->
        <div
          v-if="selectedCategory === 'all' || selectedCategory === 'supplies'"
          class="relative bg-stone-900/40 border border-emerald-800/60 rounded-xs p-3 flex flex-col justify-between transition-all hover:border-emerald-400 hover:bg-emerald-950/20 group"
        >
          <div>
            <div class="flex items-center gap-3 mb-2.5">
              <div class="w-12 h-12 bg-black/60 border border-emerald-700/80 rounded-xs p-2 flex items-center justify-center shrink-0" v-html="HUD_ICONS.heart"></div>
              <div>
                <div class="text-xs font-bold text-emerald-200">Botiquín Médico</div>
                <div class="text-[9px] text-emerald-400 uppercase font-semibold">Salud Vital</div>
              </div>
            </div>
            <p class="text-[10px] text-stone-400 bg-black/40 p-2 rounded-xs border border-stone-800/60 mb-3">
              Cura todas tus heridas y restablece la vida al 100%.
            </p>
          </div>
          <button
            type="button"
            class="w-full py-1.5 px-3 bg-emerald-950/60 border border-emerald-600/70 hover:bg-emerald-400 hover:text-black text-emerald-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
            @click="restoreHealth"
          >
            <i class="bi bi-heart-pulse-fill"></i>
            <span>CURAR HERIDAS</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { HUD_ICONS } from './hudIcons';
import { allWeaponDefs } from '../../game/weapons/weaponDefs';
import { allExplosiveDefs } from '../../game/explosives/explosiveDefs';
import { sound } from '../../audio/soundEngine';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  categoryName: string;
  damage?: number;
  fireRate?: number;
  magSize?: number;
  range?: number;
  count?: number;
  isThrowable?: boolean;
}

const props = defineProps<{
  equippedWeaponId?: string;
  equippedIds?: string[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'equipWeapon', id: string): void;
  (e: 'selectExplosive', id: string): void;
  (e: 'restoreArmor'): void;
  (e: 'restoreHealth'): void;
}>();

const selectedCategory = ref('all');

const categories = [
  { id: 'all', name: 'Todos los Objetos' },
  { id: 'melee', name: 'Cuerpo a Cuerpo' },
  { id: 'pistol', name: 'Pistolas' },
  { id: 'shotgun', name: 'Escopetas' },
  { id: 'assault', name: 'Rifles de Asalto' },
  { id: 'smg', name: 'Subfusiles' },
  { id: 'sniper', name: 'Francotirador' },
  { id: 'throwables', name: 'Arrojadizos' },
  { id: 'supplies', name: 'Suministros' },
];

const allItems = computed<InventoryItem[]>(() => {
  const list: InventoryItem[] = [];

  // Armas de fuego y cuerpo a cuerpo
  for (const w of allWeaponDefs()) {
    let catName = 'Arma';
    if (w.category === 'melee') catName = 'Cuerpo a Cuerpo';
    else if (w.category === 'pistol') catName = 'Pistola';
    else if (w.category === 'shotgun') catName = 'Escopeta';
    else if (w.category === 'rifle') catName = 'Rifle';
    else if (w.category === 'smg') catName = 'Subfusil';
    else if (w.category === 'sniper') catName = 'Francotirador';

    list.push({
      id: w.id,
      name: w.name,
      category: w.category,
      categoryName: catName,
      damage: w.damage,
      fireRate: w.fireRateRPM,
      magSize: w.magSize,
      range: Math.round(w.effectiveRange),
      isThrowable: false,
    });
  }

  // Arrojadizos
  for (const exp of allExplosiveDefs()) {
    list.push({
      id: exp.id,
      name: exp.name,
      category: 'throwables',
      categoryName: 'Arrojadizo',
      damage: exp.maxDamage,
      range: exp.damageRadius,
      isThrowable: true,
    });
  }

  return list;
});

const filteredItems = computed(() => {
  if (selectedCategory.value === 'all') return allItems.value;
  if (selectedCategory.value === 'supplies') return [];
  if (selectedCategory.value === 'assault') {
    return allItems.value.filter((i) => i.category === 'rifle');
  }
  return allItems.value.filter((i) => i.category === selectedCategory.value);
});

function isEquipped(id: string): boolean {
  if (props.equippedWeaponId === id) return true;
  return props.equippedIds?.includes(id) ?? false;
}

function equipItem(item: InventoryItem) {
  sound.playClick();
  if (item.isThrowable) {
    emit('selectExplosive', item.id);
  } else {
    emit('equipWeapon', item.id);
  }
}

function restoreArmor() {
  sound.playClick();
  emit('restoreArmor');
}

function restoreHealth() {
  sound.playClick();
  emit('restoreHealth');
}
</script>
