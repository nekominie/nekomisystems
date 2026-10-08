<template>
  <div class="fixed inset-0 z-40 bg-[#050608] flex flex-col">
    <!-- Top HUD Bar -->
    <header class="relative z-10 bg-black/80 border-b border-stone-800 px-4 py-2.5 flex items-center justify-between">
      <div class="flex items-center gap-3 flex-wrap">
        <span class="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
        <span class="font-mono text-xs uppercase font-bold text-stone-200">
          MUNDO PROCEDURAL INFINITO // CÁMARA SUPERIOR
        </span>
        <span class="text-[10px] font-mono px-2 py-0.5 bg-stone-900 border border-stone-700 text-stone-400">
          WASD: Moverse | Shift: Correr | F: Interactuar (cajas, carros, bombas) | Espacio: freno de mano | Q/E: Rotar cámara | Rueda: Zoom | Clic: Disparar | R: Recargar | 1-5: Armas | L: Armas de prueba | N: Saltar día/noche | K: Nuevo mundo
        </span>
      </div>

      <button
        type="button"
        class="steel-btn px-4 py-1.5 text-xs font-mono font-bold uppercase text-stone-300 hover:text-white flex items-center gap-2"
        @click="exit"
      >
        <i class="bi bi-box-arrow-left"></i>
        <span>Volver al Menú (ESC)</span>
      </button>
    </header>

    <!-- Canvas Container -->
    <div ref="container" class="relative flex-1 overflow-hidden">
      <canvas ref="gameCanvas" class="w-full h-full block cursor-crosshair"></canvas>

      <!-- Menú de debug de armas y físicas (Tab). onDebugMouseDown evita que los botones roben el foco del teclado sin bloquear los sliders -->
      <div class="absolute top-3 right-4 z-30 flex flex-col items-end gap-2" @mousedown="onDebugMouseDown">
        <button
          type="button"
          class="px-3 py-1 text-[11px] font-mono font-bold uppercase border bg-black/80"
          :class="debugOpen ? 'border-yellow-500 text-yellow-300' : 'border-stone-600 text-stone-400 hover:text-white'"
          @click="debugOpen = !debugOpen"
        >
          Debug / Físicas (Tab)
        </button>

        <div
          v-if="debugOpen"
          class="w-84 max-h-[82vh] overflow-y-auto bg-black/90 border border-yellow-700/60 p-3 font-mono text-[11px] text-stone-300"
        >
          <div class="text-xs font-bold text-yellow-300 uppercase tracking-wider mb-2">Selector de armas</div>

          <div
            v-for="d in debugWeapons"
            :key="d.id"
            class="border p-2 mb-1.5 cursor-pointer transition-colors"
            :class="
              weaponHud.equippedId === d.id
                ? 'border-yellow-500 bg-yellow-900/30'
                : 'border-stone-700 hover:border-stone-400'
            "
            @click="debugGive(d.id)"
          >
            <div class="flex justify-between items-baseline">
              <span class="font-bold text-stone-100">{{ d.name }}</span>
              <span class="text-[10px] uppercase text-stone-500">{{ d.category }}</span>
            </div>
            <div class="text-[10px] text-stone-400 leading-snug mt-0.5">
              Daño {{ d.damage }}<span v-if="d.pellets > 1"> × {{ d.pellets }}</span> · {{ d.rpm }} RPM
              <span v-if="d.mag"> · cargador {{ d.mag }} · recarga {{ d.reload }} s</span>
              · alcance {{ d.range }} m · ruido {{ d.noise }} m · {{ d.auto ? 'automática' : 'semi' }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-1.5 mt-3">
            <button type="button" class="border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugRefill">
              Munición completa
            </button>
            <button type="button" class="border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugGiveAll">
              Todas las armas
            </button>
            <button type="button" class="border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugSpawnZombies">
              +6 zombis (14 m)
            </button>
            <button type="button" class="border border-red-800 text-red-400 py-1 hover:border-red-500 hover:text-red-200" @click="debugSpawnExtreme">
              +1 Extremo (1%)
            </button>
            <button type="button" class="col-span-2 border border-stone-600 py-1 hover:border-yellow-500 hover:text-yellow-300" @click="debugClearZombies">
              Quitar zombis (60 m)
            </button>
            <button type="button" class="col-span-2 border border-stone-600 py-1 hover:border-red-500 hover:text-red-300" @click="debugReset">
              Reiniciar inventario (solo bate)
            </button>
          </div>

          <!-- Vehículos y Ajustes de Empuje Ragdoll -->
          <div class="mt-3 pt-2.5 border-t border-yellow-700/60">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-yellow-300 uppercase tracking-wider">Vehículo & Empuje Zombi</span>
              <button
                type="button"
                class="text-[10px] text-stone-400 hover:text-yellow-300 underline"
                @click="resetPushSliders"
              >
                Defecto
              </button>
            </div>

            <!-- Acciones de Carro -->
            <div class="grid grid-cols-2 gap-1.5 mb-2.5">
              <button
                type="button"
                class="border border-cyan-800 bg-cyan-950/40 text-cyan-200 py-1 px-1 text-center hover:border-cyan-400 hover:bg-cyan-900/50"
                @click="debugSpawnCar"
              >
                🚗 Spawnear carro
              </button>
              <button
                type="button"
                class="border border-cyan-800 bg-cyan-950/40 text-cyan-200 py-1 px-1 text-center hover:border-cyan-400 hover:bg-cyan-900/50"
                @click="debugSpawnAndEnterCar"
              >
                ⚡ Spawnear y subir
              </button>
            </div>

            <!-- Sliders Parametrizables de Empuje -->
            <div class="space-y-2 bg-stone-950/80 border border-stone-800 p-2 rounded-xs">
              <!-- Slider Fuerza Horizontal -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Fuerza empuje:</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    {{ carPushConfig.force.toFixed(2) }}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  v-model.number="carPushConfig.force"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0× (sin empuje)</span>
                  <span>0.65× (realista)</span>
                  <span>2.0× (fuerte)</span>
                </div>
              </div>

              <!-- Slider Elevación Vertical (Lift) -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Elevación vertical (Lift):</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    {{ carPushConfig.lift.toFixed(1) }} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.1"
                  v-model.number="carPushConfig.lift"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0 m/s (ras de suelo)</span>
                  <span>0.8 m/s (rasante)</span>
                  <span>5.0 m/s (vuelo)</span>
                </div>
              </div>

              <!-- Slider Dispersión Lateral -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Dispersión lateral:</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    ±{{ carPushConfig.scatter.toFixed(2) }} m/s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  v-model.number="carPushConfig.scatter"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0 (recto)</span>
                  <span>±0.25</span>
                  <span>±1.5 (abierto)</span>
                </div>
              </div>

              <!-- Slider Giros / Torsión en el aire -->
              <div>
                <div class="flex justify-between items-center text-stone-300 mb-0.5">
                  <span>Torsión / Giros (Tumble):</span>
                  <span class="font-bold text-yellow-300 bg-stone-900 px-1 py-0.2 border border-stone-700">
                    {{ carPushConfig.tumble.toFixed(1) }}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6.0"
                  step="0.5"
                  v-model.number="carPushConfig.tumble"
                  @change="blurInput"
                  @pointerup="blurInput"
                  class="w-full accent-yellow-400 cursor-pointer h-1.5 bg-stone-800 rounded"
                />
                <div class="flex justify-between text-[9px] text-stone-500">
                  <span>0 (rígido)</span>
                  <span>2.0 (natural)</span>
                  <span>6.0 (trompo)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Lectura en vivo del arma equipada -->
          <div class="mt-3 pt-2 border-t border-stone-700 text-[10px] text-stone-400 leading-relaxed">
            <div>Equipada: <span class="text-stone-100">{{ weaponHud.name }}</span></div>
            <div v-if="!weaponHud.melee">Dispersión actual: <span class="text-yellow-300">{{ weaponHud.spreadDeg.toFixed(2) }}°</span> (semi-ángulo)</div>
            <div>Bajas: <span class="text-stone-100">{{ hud.kills }}</span> · Zombis cerca: <span class="text-stone-100">{{ hud.zombies }}</span></div>
          </div>
        </div>
      </div>

      <!-- Vitals HUD -->
      <div class="absolute bottom-4 left-4 z-10 bg-black/80 border border-stone-800 p-3 rounded-xs flex items-center gap-6 font-mono text-xs">
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">SALUD SUPERVIVIENTE</div>
          <div class="w-32 h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-red-600" :style="{ width: `${playerHealth}%` }"></div>
          </div>
        </div>
        <div>
          <div class="text-[10px] text-stone-500 uppercase mb-0.5">ESTAMINA</div>
          <div class="w-32 h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-yellow-500" :style="{ width: `${playerStamina}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Armas: ranuras 1-5, arma equipada y munición -->
      <div class="absolute bottom-24 left-4 z-10 w-64 bg-black/80 border border-stone-800 p-2 font-mono text-xs">
        <div class="flex gap-1 mb-2">
          <div
            v-for="(s, i) in weaponHud.slots"
            :key="i"
            class="flex-1 h-6 border text-[10px] flex items-center justify-center"
            :class="
              i === weaponHud.equipped
                ? 'border-yellow-500 text-yellow-300 bg-yellow-900/30'
                : s
                  ? 'border-stone-600 text-stone-300'
                  : 'border-stone-800 text-stone-700'
            "
          >
            {{ i + 1 }}
          </div>
        </div>
        <div class="flex justify-between items-baseline">
          <span class="font-bold text-stone-100">{{ weaponHud.name }}</span>
          <span :class="!weaponHud.melee && weaponHud.ammo === 0 ? 'text-red-400' : 'text-yellow-300'">
            {{ weaponHud.melee ? 'Cuerpo a cuerpo' : `${weaponHud.ammo} / ${weaponHud.reserve}` }}
          </span>
        </div>
        <div v-if="weaponHud.reloading" class="mt-1">
          <div class="text-[10px] text-stone-400 uppercase">Recargando...</div>
          <div class="h-1.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div class="h-full bg-yellow-400" :style="{ width: `${Math.round(weaponHud.reloadPct * 100)}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Marcador de impacto -->
      <div
        v-if="hitMark"
        class="absolute top-1/3 left-1/2 -translate-x-1/2 z-20 font-mono text-sm font-bold uppercase tracking-widest"
        :class="{ 'text-stone-100': hitMark.tone === 'hit', 'text-yellow-300': hitMark.tone === 'head', 'text-red-400': hitMark.tone === 'kill' }"
      >
        {{ hitMark.text }}
      </div>

      <!-- Prompt de interacción (cajas, carros, bombas) -->
      <div
        v-if="prompt"
        class="absolute bottom-28 left-1/2 -translate-x-1/2 z-10 bg-black/80 border px-4 py-2 font-mono text-xs uppercase tracking-wider text-center"
        :class="{
          'border-yellow-600/70 text-yellow-300': prompt.tone === 'ok',
          'border-red-700/70 text-red-300': prompt.tone === 'bad',
          'border-stone-600 text-stone-300': prompt.tone === 'info',
        }"
      >
        {{ prompt.text }}
      </div>

      <!-- Aviso temporal -->
      <div
        v-if="toast"
        class="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-black/85 border border-stone-500 px-4 py-2 font-mono text-xs text-stone-100 uppercase tracking-wider"
      >
        {{ toast }}
      </div>

      <!-- Recarga de gasolina en curso -->
      <div
        v-if="refuelHud.active"
        class="absolute top-16 left-1/2 -translate-x-1/2 z-10 w-72 bg-black/85 border border-yellow-500/70 p-3 font-mono text-xs text-yellow-200"
      >
        <div class="flex items-center justify-between mb-1 uppercase tracking-wider">
          <span class="animate-pulse">⛽ Recargando gasolina</span>
          <span>+{{ refuelHud.added.toFixed(1) }} L</span>
        </div>
        <div class="h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
          <div class="h-full bg-yellow-400 transition-all duration-100" :style="{ width: `${Math.round(refuelHud.pct * 100)}%` }"></div>
        </div>
        <div class="mt-1 flex justify-between text-[10px] text-stone-400">
          <span>Tanque {{ Math.round(refuelHud.pct * 100) }}%</span>
          <span>Estación: {{ Math.round(refuelHud.left) }} L</span>
        </div>
      </div>

      <!-- Tablero del carro (solo al conducir) -->
      <div
        v-if="carHud.driving"
        class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/85 border border-stone-700 px-5 py-3 font-mono text-xs flex items-center gap-6"
      >
        <div class="text-center">
          <div class="text-3xl font-bold text-stone-100 leading-none">{{ carHud.speed }}</div>
          <div class="text-[10px] text-stone-500 uppercase">km/h</div>
        </div>
        <div class="w-44">
          <div class="flex justify-between text-[10px] uppercase mb-0.5" :class="carHud.fuelPct <= 0.15 ? 'text-red-400' : 'text-stone-400'">
            <span>⛽ Gasolina</span>
            <span>{{ carHud.fuel.toFixed(1) }} L</span>
          </div>
          <div class="h-2.5 bg-stone-900 border border-stone-700 overflow-hidden">
            <div
              class="h-full"
              :class="carHud.fuelPct <= 0.15 ? 'bg-red-600' : 'bg-yellow-400'"
              :style="{ width: `${Math.round(carHud.fuelPct * 100)}%` }"
            ></div>
          </div>
          <div v-if="carHud.fuel <= 0" class="mt-1 text-red-400 uppercase animate-pulse">Sin gasolina</div>
        </div>
      </div>

      <!-- World debug HUD -->
      <div class="absolute bottom-4 right-4 z-10 bg-black/80 border border-stone-800 p-3 rounded-xs font-mono text-[11px] text-stone-300 leading-relaxed">
        <div>
          <span class="text-stone-500">HORA:</span> {{ hud.clock }}
          <span :class="hud.night ? 'text-indigo-300' : 'text-yellow-300'">{{ hud.night ? 'NOCHE' : 'DÍA' }}</span>
        </div>
        <div><span class="text-stone-500">SEMILLA:</span> {{ seed }}</div>
        <div><span class="text-stone-500">POS:</span> {{ hud.x }}, {{ hud.z }}</div>
        <div><span class="text-stone-500">CHUNK:</span> {{ hud.cx }}, {{ hud.cz }} ({{ hud.chunks }} cargados)</div>
        <div><span class="text-stone-500">CIUDAD MÁS CERCANA:</span> {{ hud.city }}</div>
        <div><span class="text-stone-500">ZOMBIS CERCA:</span> {{ hud.zombies }}</div>
        <div><span class="text-stone-500">BAJAS:</span> {{ hud.kills }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { sound } from '../../audio/soundEngine';
import { WorldManager } from '../../game/world/worldManager';
import { ZombieManager, DEFAULT_CAR_PUSH_CONFIG, type CarPushConfig } from '../../game/world/zombies';
import { updateFadeTarget } from '../../game/world/fadeMaterial';
import { DayNightCycle } from '../../game/world/dayNight';
import { LampLights } from '../../game/world/lampLights';
import { setLampLevel } from '../../game/world/cabinMesh';
import { updateFireFx } from '../../game/world/chunkMesher';
import { PlayerAvatar } from '../../game/world/playerAvatar';
import { VehicleManager, type DriveInput, type DrivableCar, type VehicleTarget } from '../../game/world/vehicles';
import { RefuelSession, PUMP_CAR_RANGE } from '../../game/world/refuel';
import { FUEL_CAP, STATUS_LABEL } from '../../game/world/carData';
import { WORLD } from '../../game/world/worldConfig';
import { Arsenal, type WeaponItem } from '../../game/weapons/arsenal';
import type { Weapon } from '../../game/weapons/weapon';
import { allWeaponDefs, getWeaponDef, WEAPON_IDS } from '../../game/weapons/weaponDefs';
import { RecoilController } from '../../game/weapons/recoil';
import { MouseAim, AimReticle } from '../../game/weapons/aiming';
import { WeaponCompanion } from '../../game/weapons/weaponCompanion';
import { ShotFx } from '../../game/weapons/shotFx';
import { weaponAudio } from '../../game/weapons/weaponAudio';
import { PICKUP_RANGE, type DropSpawn } from '../../game/weapons/groundDrops';

const emit = defineEmits<{
  (e: 'exit'): void;
}>();

const container = ref<HTMLDivElement | null>(null);
const gameCanvas = ref<HTMLCanvasElement | null>(null);
const playerHealth = ref(100);
const playerStamina = ref(100);
const weaponHud = reactive({
  slots: [] as ({ name: string } | null)[],
  equipped: 0,
  name: '—',
  melee: true,
  ammo: 0,
  reserve: 0,
  reloading: false,
  reloadPct: 0,
  equippedId: '',
  spreadDeg: 0,
});

// --- Menú de debug ---
const debugOpen = ref(false);
const carPushConfig = reactive<CarPushConfig>({ ...DEFAULT_CAR_PUSH_CONFIG });
const debugWeapons = allWeaponDefs().map((d) => ({
  id: d.id,
  name: d.name,
  category: d.category,
  damage: d.damage,
  pellets: d.pellets,
  rpm: d.fireRateRPM,
  mag: d.magSize,
  reload: d.reloadDuration,
  range: d.effectiveRange,
  noise: d.noiseRadius,
  auto: d.isAutomatic,
}));
const hitMark = ref<{ text: string; tone: 'hit' | 'head' | 'kill' } | null>(null);
type Tone = 'ok' | 'bad' | 'info';
const prompt = ref<{ text: string; tone: Tone } | null>(null);
const toast = ref('');
const carHud = reactive({ driving: false, speed: 0, fuel: 0, fuelPct: 0 });
const refuelHud = reactive({ active: false, added: 0, pct: 0, left: 0 });
const seed = ref(newSeed());
const hud = reactive({ x: 0, z: 0, cx: 0, cz: 0, chunks: 0, city: '—', zombies: 0, kills: 0, clock: '06:00', night: false });

function newSeed() {
  return Math.floor(Math.random() * 0x7fffffff);
}

// --- Estado de juego ---
const player = { x: 0, z: 0, rot: 0, walkSpeed: 6, runSpeed: 10, radius: 0.4 };
const keys: Record<string, boolean> = {};

// Cámara flotante superior (estilo Project Zomboid): ángulo fijo, rotable con Q/E.
const cam = { yaw: Math.PI / 4, pitch: THREE.MathUtils.degToRad(52), dist: 34, minDist: 16, maxDist: 70 };

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let world: WorldManager | null = null;
let zombies: ZombieManager | null = null;
let playerMesh: THREE.Group | null = null;
let sun: THREE.DirectionalLight | null = null;
let cycle: DayNightCycle | null = null;
let lampLights: LampLights | null = null;
let avatar: PlayerAvatar | null = null;
let vehicles: VehicleManager | null = null;
let refuel: RefuelSession | null = null;
let camExtra = 0; // la cámara se aleja un poco al ir rápido en carro
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let hitTimer: ReturnType<typeof setTimeout> | null = null;

// --- Armas ---
function makeArsenal() {
  const a = new Arsenal();
  a.pickup({ weapon: WEAPON_IDS.bat }); // se empieza con un bate
  return a;
}
let arsenal = makeArsenal();
const recoil = new RecoilController();
const aim = new MouseAim();
let companion: WeaponCompanion | null = null;
let shotFx: ShotFx | null = null;
let reticle: AimReticle | null = null;
let fireHeld = false;
/** Un clic pendiente (armas semiautomáticas): se consume al disparar. */
let semiPending = false;
let aimHeading = 0;
const aimDir = new THREE.Vector3(0, 0, 1);
const muzzlePos = new THREE.Vector3();
let resizeObserver: ResizeObserver | null = null;
let animId = 0;

/** Marcador provisional (cápsula) mientras carga el modelo de Miku. */
function createPlayerMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
    new THREE.MeshLambertMaterial({ color: 0x1e3a8a }),
  );
  body.position.y = 0.8;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd2a679 }),
  );
  head.position.y = 1.65;
  // "Nariz" para indicar hacia dónde mira (+Z local)
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.25),
    new THREE.MeshLambertMaterial({ color: 0xe5e7eb }),
  );
  nose.position.set(0, 1.65, 0.3);
  g.add(body, head, nose);
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return g;
}

// --- Sol/luna: luz direccional con sombras que sigue al jugador ---
const SHADOW_EXTENT = 50; // semi-ancho del área con sombras alrededor del jugador (m)
const SHADOW_MAP = 2048;
const SUN_DISTANCE = 90;
const SHADOW_TEXEL = (SHADOW_EXTENT * 2) / SHADOW_MAP;
const _t = new THREE.Vector3();
const _ax = new THREE.Vector3();
const _ay = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Coloca la luz a lo largo de `dir`; el objetivo se ancla a la rejilla de texels (evita parpadeo). */
function updateSun(px: number, pz: number, dir: THREE.Vector3) {
  if (!sun) return;
  // Ejes del espacio de la luz (cambian a lo largo del día)
  _ax.crossVectors(_up, dir).normalize();
  _ay.crossVectors(dir, _ax).normalize();
  _t.set(px, 0, pz);
  const a = Math.round(_t.dot(_ax) / SHADOW_TEXEL) * SHADOW_TEXEL;
  const b = Math.round(_t.dot(_ay) / SHADOW_TEXEL) * SHADOW_TEXEL;
  const c = _t.dot(dir);
  sun.target.position
    .set(0, 0, 0)
    .addScaledVector(_ax, a)
    .addScaledVector(_ay, b)
    .addScaledVector(dir, c);
  sun.position.copy(sun.target.position).addScaledVector(dir, SUN_DISTANCE);
  sun.target.updateMatrixWorld();
}

function startWorld(newSeedValue: number) {
  if (!scene) return;
  refuel?.dispose();
  vehicles?.dispose();
  zombies?.dispose();
  world?.dispose();
  seed.value = newSeedValue;
  world = new WorldManager(scene, newSeedValue);
  zombies = new ZombieManager(scene, world);
  zombies.carPushConfig = carPushConfig;
  vehicles = new VehicleManager(scene, world);
  refuel = new RefuelSession(scene, world);
  player.x = 0;
  player.z = 0;
  arsenal = makeArsenal();
  prompt.value = null;
  carHud.driving = false;
  refuelHud.active = false;
  if (playerMesh) playerMesh.visible = true;
}

function showToast(msg: string) {
  toast.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toast.value = ''), 2400);
}

// --- Interacción (F): cajas, carros y bombas de gasolina ---------------------------------------
type Target =
  | { kind: 'crate' }
  | { kind: 'weapon'; drop: DropSpawn }
  | { kind: 'car'; veh: VehicleTarget }
  | { kind: 'pump'; pump: NonNullable<ReturnType<WorldManager['nearbyPump']>>; car: DrivableCar | null };

/** Lo más cercano con lo que se puede interactuar (la menor puntuación gana; la caja siempre gana). */
function findTarget(): Target | null {
  if (!world || !vehicles) return null;
  let best: { score: number; target: Target } | null = null;
  if (world.nearbyCrate(player.x, player.z)) best = { score: -10, target: { kind: 'crate' } };

  const wd = world.drops.nearest(player.x, player.z, PICKUP_RANGE);
  if (wd) {
    const score = wd.d - 0.6;
    if (!best || score < best.score) best = { score, target: { kind: 'weapon', drop: wd.drop } };
  }

  const pump = world.nearbyPump(player.x, player.z, 2.4);
  if (pump) {
    const car =
      vehicles.parkedCars().find((c) => Math.hypot(c.x - pump.pump.x, c.z - pump.pump.z) <= PUMP_CAR_RANGE) ?? null;
    const score = pump.d - 0.8;
    if (!best || score < best.score) best = { score, target: { kind: 'pump', pump, car } };
  }

  const veh = vehicles.findNear(player.x, player.z);
  if (veh) {
    const score = veh.d - 1.2;
    if (!best || score < best.score) best = { score, target: { kind: 'car', veh } };
  }
  return best ? best.target : null;
}

function updatePrompt() {
  if (!world || !vehicles) return;
  if (vehicles.driven) {
    prompt.value = { text: '[F] Bajar del carro', tone: 'info' };
    return;
  }
  if (refuel?.isActive) {
    prompt.value = { text: '[F] Detener la recarga', tone: 'info' };
    return;
  }
  const t = findTarget();
  if (!t) {
    prompt.value = null;
    return;
  }
  if (t.kind === 'crate') {
    prompt.value = { text: '[F] Abrir caja', tone: 'ok' };
  } else if (t.kind === 'weapon') {
    const def = getWeaponDef(t.drop.weapon);
    const owned = arsenal.slots.some((w) => w?.def.id === t.drop.weapon);
    const name = def?.name ?? t.drop.weapon;
    if (owned && def && def.magSize <= 0) prompt.value = { text: `Ya tienes: ${name}`, tone: 'info' };
    else prompt.value = { text: owned ? `[F] Recoger munición · ${name}` : `[F] Recoger ${name}`, tone: 'ok' };
  } else if (t.kind === 'car') {
    const s = t.veh.status;
    prompt.value =
      s === 'open'
        ? { text: `[F] Subir al carro · ${STATUS_LABEL[s]}`, tone: 'ok' }
        : { text: `${STATUS_LABEL[s]}${s === 'locked' ? ' · necesitas llaves' : s === 'broken' ? ' · no arranca' : ''}`, tone: 'bad' };
  } else {
    const left = Math.round(t.pump.remaining);
    if (!t.car) prompt.value = { text: `Estaciona un carro junto a la bomba · estación: ${left} L`, tone: 'info' };
    else if (t.car.fuel >= FUEL_CAP - 0.1) prompt.value = { text: 'Tanque lleno', tone: 'info' };
    else if (t.pump.remaining < 0.01) prompt.value = { text: 'Esta estación se quedó sin gasolina', tone: 'bad' };
    else {
      const pct = Math.round(t.car.fuelFraction * 100);
      prompt.value = { text: `[F] Recargar gasolina · tanque ${pct}% · estación: ${left} L`, tone: 'ok' };
    }
  }
}

function interact() {
  if (!world || !vehicles || !refuel) return;
  if (vehicles.driven) return exitCar();
  if (refuel.isActive) {
    refuel.stop('cancel');
    refuelHud.active = false;
    showToast('Recarga detenida');
    return;
  }
  const t = findTarget();
  if (!t) return;

  if (t.kind === 'crate') {
    const crate = world.nearbyCrate(player.x, player.z);
    if (!crate) return;
    world.lootCrate(crate.id);
    giveWeapon({ weapon: crate.loot });
    sound.playPlayClick();
  } else if (t.kind === 'weapon') {
    if (!giveWeapon(t.drop)) return; // ya tienes esa arma cuerpo a cuerpo: se queda en el suelo
    world.drops.take(t.drop.id);
    sound.playPlayClick();
  } else if (t.kind === 'car') {
    const dc = vehicles.enter(t.veh);
    if (!dc) {
      // Sin mecánica para abrirlos todavía: solo se informa del estado
      const s = t.veh.status;
      showToast(s === 'locked' ? 'Cerrado con llave' : s === 'broken' ? 'Averiado: no arranca' : 'Destruido');
      return;
    }
    sound.playPlayClick();
    if (playerMesh) playerMesh.visible = false;
    showToast(`Gasolina: ${dc.fuel.toFixed(1)} L (${Math.round(dc.fuelFraction * 100)}%)`);
  } else {
    if (!t.car) return showToast('No hay ningún carro junto a la bomba');
    if (t.car.fuel >= FUEL_CAP - 0.1) return showToast('El tanque ya está lleno');
    if (t.pump.remaining < 0.01) return showToast('Esta estación se quedó sin gasolina');
    refuel.start(t.pump.station, t.pump.pump, t.car);
    sound.playPlayClick();
  }
  updatePrompt();
}

/** Baja del carro por el lado izquierdo (empujado fuera de obstáculos). */
function exitCar() {
  if (!vehicles || !world) return;
  const dc = vehicles.exit();
  if (!dc) return;
  const p = dc.worldPoint(-(dc.dims.W / 2 + 1.0), 0);
  const fixed = world.resolveCollision(p.x, p.z, player.radius);
  player.x = fixed.x;
  player.z = fixed.z;
  player.rot = dc.heading;
  if (playerMesh) playerMesh.visible = true;
  carHud.driving = false;
  sound.playClick();
  updatePrompt();
}

// --- Armas: recoger, recargar, disparar -----------------------------------------------------

/** Añade un arma al inventario. Devuelve false si no se recogió (p. ej. ya la tienes cuerpo a cuerpo). */
function giveWeapon(item: WeaponItem): boolean {
  const res = arsenal.pickup(item);
  if (!res) return false;
  const name = res.weapon.def.name;
  if (res.kind === 'duplicate') {
    showToast(`Ya tienes: ${name}`);
    return false;
  }
  if (res.kind === 'ammo') showToast(`+${res.added} balas · ${name}`);
  else if (res.kind === 'new') showToast(`Obtuviste: ${name}`);
  else {
    // Inventario lleno: la equipada se cambia por la nueva y se suelta a tus pies (con su munición)
    const d = res.dropped;
    world?.drops.dropAt({ weapon: d.def.id, ammo: d.ammo, reserve: d.reserve }, player.x - aimDir.x * 0.9, player.z - aimDir.z * 0.9);
    showToast(`Cambiaste ${d.def.name} por ${name}`);
  }
  return true;
}

function reloadWeapon() {
  if (vehicles?.driven) return;
  const w = arsenal.current;
  if (w && w.startReload()) weaponAudio.reload();
}

function showHitMark(text: string, tone: 'hit' | 'head' | 'kill') {
  hitMark.value = { text, tone };
  if (hitTimer) clearTimeout(hitTimer);
  hitTimer = setTimeout(() => (hitMark.value = null), 450);
}

/** Un intento de disparo: raycast contra zombis cercanos y obstáculos, daño, ruido, FX y sonido. */
function tryFire(w: Weapon, velocity: number) {
  if (!world || !zombies || !camera || !scene) return;
  const def = w.def;
  let origin: THREE.Vector3;
  let dir: THREE.Vector3;
  if (w.isMelee) {
    // El golpe sale del pecho del jugador hacia donde mira
    dir = new THREE.Vector3(Math.sin(aimHeading), 0, Math.cos(aimHeading));
    origin = new THREE.Vector3(player.x + dir.x * 0.3, 1.0, player.z + dir.z * 0.3);
  } else {
    dir = aimDir;
    origin = muzzlePos.clone();
  }
  const range = (def.maxRange ?? def.effectiveRange * 2) + 2;
  const targets = zombies.getHitTargets(origin.x, origin.z, dir.x, dir.z, range);

  const res = w.shoot(camera, scene, velocity, {
    origin,
    direction: dir,
    targets,
    obstacle: (ox, oz, dx, dz, max) => world!.raycastObstacle(ox, oz, dx, dz, max),
    recoil,
  });

  if (!res) {
    if (w.failReason === 'empty') {
      semiPending = false;
      weaponAudio.empty();
      if (w.startReload()) weaponAudio.reload();
      else showToast('Sin munición');
    }
    return;
  }

  semiPending = false;
  shotFx?.play(res);
  if (res.melee) weaponAudio.swing();
  else weaponAudio.shot(def.category);

  const out = zombies.applyShot(res);
  zombies.alertNoise(player.x, player.z, res.noiseRadius);
  if (out.hits > 0) {
    if (res.melee) weaponAudio.meleeHit();
    else weaponAudio.hit(out.headshots > 0);
    if (out.kills > 0) showHitMark('¡Baja!', 'kill');
    else if (out.headshots > 0) showHitMark('¡Cabeza!', 'head');
    else showHitMark(res.melee ? 'Golpe' : 'Impacto', 'hit');
  }
}

/** Debug: equipa el arma (la añade si no la tienes; si el inventario está lleno reemplaza a la equipada). */
function debugGive(id: string) {
  const have = arsenal.slots.findIndex((w) => w?.def.id === id);
  if (have >= 0) {
    arsenal.select(have);
    return;
  }
  arsenal.pickup({ weapon: id }); // 'new' equipa sola; 'swap' reemplaza a la equipada
}

function debugGiveAll() {
  for (const d of allWeaponDefs()) if (!arsenal.slots.some((w) => w?.def.id === d.id)) arsenal.pickup({ weapon: d.id });
  showToast('Todas las armas en el inventario');
}

/** Debug: cargador lleno y 5 cargadores de reserva en todas las armas del inventario. */
function debugRefill() {
  for (const w of arsenal.slots) {
    if (!w || w.isMelee) continue;
    w.cancelReload();
    w.ammo = w.def.magSize;
    w.reserve = w.def.magSize * 5;
  }
  showToast('Munición completa');
}

function debugSpawnZombies() {
  zombies?.spawnTest(player.x, player.z, 6, 14);
}

function debugSpawnExtreme() {
  zombies?.spawnExtreme(player.x, player.z, 14);
  showToast('Zombi extremo (1%) generado');
}

function debugClearZombies() {
  const n = zombies?.removeNear(player.x, player.z, 60) ?? 0;
  showToast(`${n} zombis eliminados`);
}

function debugReset() {
  arsenal = makeArsenal();
  showToast('Inventario reiniciado');
}

function onDebugMouseDown(e: MouseEvent) {
  e.stopPropagation();
  const target = e.target as HTMLElement | null;
  // Previene que los botones roben el foco del teclado (para mantener WASD y Espacio activos),
  // pero permite la interacción nativa con los sliders (<input type="range">) y el scroll del panel.
  if (target?.closest('button')) {
    e.preventDefault();
  }
}

function blurInput(e: Event) {
  (e.target as HTMLElement | null)?.blur();
}

function resetPushSliders() {
  Object.assign(carPushConfig, DEFAULT_CAR_PUSH_CONFIG);
  if (zombies) zombies.carPushConfig = carPushConfig;
  showToast('Valores de empuje restablecidos por defecto');
}

function debugSpawnCar() {
  if (!vehicles) return;
  const fx = Math.sin(player.rot);
  const fz = Math.cos(player.rot);
  const spawnX = player.x + fx * 3.8;
  const spawnZ = player.z + fz * 3.8;
  vehicles.spawnCar(spawnX, spawnZ, player.rot);
  showToast('Carro utilizable creado (F para entrar)');
  sound.playPlayClick();
}

function debugSpawnAndEnterCar() {
  if (!vehicles) return;
  if (vehicles.driven) exitCar();
  const fx = Math.sin(player.rot);
  const fz = Math.cos(player.rot);
  const spawnX = player.x + fx * 1.5;
  const spawnZ = player.z + fz * 1.5;
  const dc = vehicles.spawnCar(spawnX, spawnZ, player.rot);
  vehicles.enter({ id: dc.id, status: 'open', d: 0, owned: dc });
  if (playerMesh) playerMesh.visible = false;
  carHud.driving = true;
  showToast('¡Carro abordado! Conduce con WASD');
  sound.playPlayClick();
}

function updateWeaponHud() {
  weaponHud.slots = arsenal.slots.map((w) => (w ? { name: w.def.name } : null));
  weaponHud.equipped = arsenal.equipped;
  const w = arsenal.current;
  weaponHud.equippedId = w ? w.def.id : '';
  weaponHud.name = w ? w.def.name : 'Sin arma';
  weaponHud.melee = !w || w.isMelee;
  weaponHud.ammo = w ? w.ammo : 0;
  weaponHud.reserve = w ? w.reserve : 0;
  weaponHud.reloading = !!w && w.reloading;
  weaponHud.reloadPct = w ? w.reloadProgress : 0;
}

/** Depuración (tecla L): deja las armas de prueba en el suelo alrededor del jugador. */
function debugDropWeapons() {
  if (!world) return;
  const defs = allWeaponDefs();
  defs.forEach((d, i) => {
    const a = (i / defs.length) * Math.PI * 2;
    world!.drops.dropAt({ weapon: d.id }, player.x + Math.cos(a) * 3.5, player.z + Math.sin(a) * 3.5);
  });
  showToast('Armas de prueba en el suelo a tu alrededor');
}

function onMouseMove(e: MouseEvent) {
  if (gameCanvas.value) aim.setFromEvent(e, gameCanvas.value);
}

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return;
  if (gameCanvas.value) aim.setFromEvent(e, gameCanvas.value);
  fireHeld = true;
  semiPending = true;
}

function onMouseUp(e: MouseEvent) {
  if (e.button !== 0) return;
  fireHeld = false;
  semiPending = false;
}

function handleKeyDown(e: KeyboardEvent) {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k.startsWith('arrow') || e.key === ' ') e.preventDefault();
  if (e.key === 'Escape') exit();
  if (k === 'r' && !e.repeat) reloadWeapon();
  if (k === 'k' && !e.repeat) startWorld(newSeed());
  if (k === 'l' && !e.repeat) debugDropWeapons();
  if (e.key === 'Tab') {
    e.preventDefault();
    if (!e.repeat) debugOpen.value = !debugOpen.value;
  }
  if (k === 'f' && !e.repeat) interact();
  if (k === 'n' && !e.repeat) cycle?.skipPhase();
  if (/^[1-5]$/.test(e.key) && !vehicles?.driven) arsenal.select(Number(e.key) - 1);
}

function handleKeyUp(e: KeyboardEvent) {
  keys[e.key.toLowerCase()] = false;
}

function handleWheel(e: WheelEvent) {
  e.preventDefault();
  cam.dist = THREE.MathUtils.clamp(cam.dist + Math.sign(e.deltaY) * 3, cam.minDist, cam.maxDist);
}

function exit() {
  sound.playClick();
  emit('exit');
}

function resize() {
  if (!renderer || !camera || !container.value) return;
  const w = container.value.clientWidth;
  const h = container.value.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}

let frame = 0;
let lastTime = 0;

function loop(now: number) {
  animId = requestAnimationFrame(loop);
  if (!renderer || !scene || !camera || !world || !playerMesh) return;

  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;

  // Movimiento relativo a la cámara: W = hacia "arriba" en pantalla.
  const fx = -Math.sin(cam.yaw);
  const fz = -Math.cos(cam.yaw);
  const rx = Math.cos(cam.yaw);
  const rz = -Math.sin(cam.yaw);
  let mx = 0;
  let mz = 0;
  const drv = vehicles?.driven ?? null;
  if (!drv) {
    if (keys['w'] || keys['arrowup']) { mx += fx; mz += fz; }
    if (keys['s'] || keys['arrowdown']) { mx -= fx; mz -= fz; }
    if (keys['d'] || keys['arrowright']) { mx += rx; mz += rz; }
    if (keys['a'] || keys['arrowleft']) { mx -= rx; mz -= rz; }
  }

  const moving = mx !== 0 || mz !== 0;
  const running = moving && keys['shift'] && playerStamina.value > 0;
  const speed = running ? player.runSpeed : player.walkSpeed;
  if (moving) {
    const len = Math.hypot(mx, mz);
    player.x += (mx / len) * speed * dt;
    player.z += (mz / len) * speed * dt;
    const target = Math.atan2(mx, mz);
    let diff = target - player.rot;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    player.rot += diff * Math.min(1, dt * 14);
    // Hitbox de las cabañas
    const fixed = world.resolveCollision(player.x, player.z, player.radius);
    player.x = fixed.x;
    player.z = fixed.z;
  }
  playerStamina.value = THREE.MathUtils.clamp(
    playerStamina.value + (running ? -22 : 14) * dt,
    0,
    100,
  );

  if (keys['q']) cam.yaw -= 1.6 * dt;
  if (keys['e']) cam.yaw += 1.6 * dt;

  // Conduciendo: el jugador va dentro del carro (oculto) y la cámara sigue al carro
  if (drv && vehicles) {
    const input: DriveInput = {
      throttle: (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0),
      steer: (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0),
      handbrake: !!keys[' '],
    };
    vehicles.update(dt, input, cycle?.lampFactor ?? 0);
    player.x = drv.x;
    player.z = drv.z;
    player.rot = drv.heading;
  }

  // Recarga de gasolina (si la hay): consume la estación, llena el tanque y anima el chorro
  if (refuel) {
    const wasActive = refuel.isActive;
    const rs = refuel.update(dt, player.x, player.z);
    refuelHud.active = rs.active;
    if (rs.active) {
      refuelHud.added = rs.added;
      refuelHud.pct = rs.fuelFraction;
      refuelHud.left = rs.stationLeft;
    } else if (wasActive) {
      const why = refuel.lastEnd;
      showToast(
        why === 'full'
          ? `Tanque lleno · +${rs.added.toFixed(1)} L`
          : why === 'empty'
            ? 'La estación se quedó sin gasolina'
            : why === 'away'
              ? 'Recarga interrumpida: te alejaste'
              : 'Recarga interrumpida',
      );
      updatePrompt();
    }
  }

  playerMesh.position.set(player.x, 0, player.z);
  playerMesh.rotation.y = player.rot;
  if (avatar && !drv) {
    // Correr al moverse (cadencia según la velocidad); idle al estar quieto
    avatar.setState(moving ? 'run' : 'idle', speed);
    avatar.update(dt);
  }

  // Cámara siguiendo al jugador (o al carro) desde arriba; se aleja un poco al ir rápido.
  // El retroceso de las armas empuja temporalmente el pitch/yaw y se recupera con lerp (RecoilController).
  recoil.update(dt);
  camExtra += ((drv ? Math.min(12, Math.abs(drv.speed) * 0.45) : 0) - camExtra) * Math.min(1, dt * 2);
  const camDist = cam.dist + camExtra;
  const camPitch = cam.pitch + recoil.pitch;
  const camYaw = cam.yaw + recoil.yaw;
  const cp = Math.cos(camPitch);
  camera.position.set(
    player.x + Math.sin(camYaw) * cp * camDist,
    Math.sin(camPitch) * camDist,
    player.z + Math.cos(camYaw) * cp * camDist,
  );
  camera.lookAt(player.x, 0.5, player.z);
  // Árboles y cabañas entre la cámara y el jugador se vuelven semitransparentes
  updateFadeTarget(camera, player.x, 1.0, player.z);

  // --- Armas: apuntado con el ratón, retícula, arma flotante y disparo ---
  const tSec = now / 1000;
  if (!drv) {
    arsenal.update(dt);
    const w = arsenal.current;
    companion?.setWeapon(w ? w.def.id : null);

    // Punto del suelo bajo el cursor; el jugador gira hacia él
    const hasAim = aim.update(camera);
    let heading = player.rot;
    if (hasAim) {
      const ax = aim.point.x - player.x;
      const az = aim.point.z - player.z;
      if (ax * ax + az * az > 0.09) heading = Math.atan2(ax, az);
      const diff = Math.atan2(Math.sin(heading - player.rot), Math.cos(heading - player.rot));
      player.rot += diff * Math.min(1, dt * 20);
      playerMesh.rotation.y = player.rot;
    }
    aimHeading = heading;
    companion?.update(tSec, player.x, player.z, heading, true);
    companion?.muzzle(muzzlePos);

    // Dirección de disparo: del cañón al punto apuntado (las balas pasan por el cursor)
    let dx = aim.point.x - muzzlePos.x;
    let dz = aim.point.z - muzzlePos.z;
    let len = Math.hypot(dx, dz);
    if (!hasAim || len < 1.2) {
      dx = Math.sin(heading);
      dz = Math.cos(heading);
      len = 1;
    }
    aimDir.set(dx / len, 0, dz / len);

    // Retícula: el aro muestra la dispersión actual a esa distancia
    const vel = moving ? speed : 0;
    const spread = w && !w.isMelee ? w.currentSpread(vel) : 0;
    weaponHud.spreadDeg = (spread * 180) / Math.PI;
    const dist = Math.hypot(aim.point.x - player.x, aim.point.z - player.z);
    reticle?.update(aim.point, w?.isMelee ? 0.3 : Math.tan(spread) * dist, hasAim, w?.reloading ? 0xff9a3c : 0xffffff);

    if (w && fireHeld && (w.def.isAutomatic || semiPending)) tryFire(w, vel);
  } else {
    companion?.update(tSec, player.x, player.z, player.rot, false);
    reticle?.update(aim.point, 0, false, 0xffffff);
  }
  shotFx?.update(dt);
  world.drops.update(tSec);

  if (cycle) {
    cycle.update(dt);
    setLampLevel(cycle.lampFactor);
    updateFireFx(now / 1000, cycle.lampFactor);
    updateSun(player.x, player.z, cycle.lightDir);
  }

  world.update(player.x, player.z);
  zombies?.update(dt, player.x, player.z, drv);
  if (cycle) lampLights?.update(world, player.x, player.z, cycle.lampFactor, now / 1000);

  if (frame % 4 === 0) {
    updatePrompt();
    updateWeaponHud();
    if (drv) {
      carHud.driving = true;
      carHud.speed = Math.round(Math.abs(drv.speed) * 3.6);
      carHud.fuel = drv.fuel;
      carHud.fuelPct = drv.fuelFraction;
    }
  }

  if (++frame % 8 === 0) {
    const cs = WORLD.chunkSize;
    hud.x = Math.round(player.x);
    hud.z = Math.round(player.z);
    hud.cx = Math.floor(player.x / cs);
    hud.cz = Math.floor(player.z / cs);
    hud.chunks = world.loadedCount;
    hud.zombies = zombies ? zombies.count : 0;
    hud.kills = zombies ? zombies.kills : 0;
    if (cycle) {
      hud.clock = cycle.clock;
      hud.night = cycle.isNight;
    }
    const nc = world.nearestCity(player.x, player.z);
    hud.city = nc ? `${Math.round(nc.dist)} m` : 'ninguna cerca';
  }

  renderer.render(scene, camera);
}

onMounted(() => {
  const canvas = gameCanvas.value;
  if (!canvas) return;

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Colores/intensidades iniciales; el ciclo día/noche los actualiza cada frame
  scene = new THREE.Scene();
  const background = new THREE.Color(0x8fa3b0);
  const fog = new THREE.Fog(background.clone(), 80, WORLD.chunkSize * WORLD.viewRadius + 10);
  scene.background = background;
  scene.fog = fog;

  camera = new THREE.PerspectiveCamera(40, 1, 1, 500);

  const hemi = new THREE.HemisphereLight(0xaab8c8, 0x2a3320, 0.75);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffe9c4, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP, SHADOW_MAP);
  const sc = sun.shadow.camera;
  sc.left = -SHADOW_EXTENT;
  sc.right = SHADOW_EXTENT;
  sc.top = SHADOW_EXTENT;
  sc.bottom = -SHADOW_EXTENT;
  sc.near = 1;
  sc.far = 250;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.05;
  scene.add(sun, sun.target);

  cycle = new DayNightCycle(background, fog, hemi, sun);
  lampLights = new LampLights(scene);

  companion = new WeaponCompanion(scene);
  shotFx = new ShotFx(scene);
  reticle = new AimReticle(scene);

  playerMesh = createPlayerMesh();
  scene.add(playerMesh);

  // Carga de Miku (modelo + animaciones); reemplaza a la cápsula cuando esté lista
  PlayerAvatar.load()
    .then((a) => {
      if (!playerMesh) {
        a.dispose(); // el componente se desmontó mientras cargaba
        return;
      }
      playerMesh.clear();
      playerMesh.add(a.root);
      avatar = a;
    })
    .catch((err) => console.error('[zombie-game] No se pudo cargar el avatar de Miku:', err));

  startWorld(seed.value);

  resize();
  resizeObserver = new ResizeObserver(resize);
  if (container.value) resizeObserver.observe(container.value);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('wheel', handleWheel, { passive: false });
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mouseup', onMouseUp);

  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animId);
  resizeObserver?.disconnect();
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  gameCanvas.value?.removeEventListener('wheel', handleWheel);
  gameCanvas.value?.removeEventListener('mousemove', onMouseMove);
  gameCanvas.value?.removeEventListener('mousedown', onMouseDown);
  window.removeEventListener('mouseup', onMouseUp);
  if (toastTimer) clearTimeout(toastTimer);
  if (hitTimer) clearTimeout(hitTimer);
  companion?.dispose();
  shotFx?.dispose();
  reticle?.dispose();
  companion = shotFx = reticle = null;
  refuel?.dispose();
  vehicles?.dispose();
  zombies?.dispose();
  lampLights?.dispose();
  avatar?.dispose();
  avatar = null;
  world?.dispose();
  renderer?.dispose();
  renderer = null;
  scene = null;
  playerMesh = null;
  world = null;
  zombies = null;
  vehicles = null;
  refuel = null;
  lampLights = null;
  cycle = null;
});
</script>
