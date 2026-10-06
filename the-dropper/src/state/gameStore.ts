import { reactive, ref, watch } from 'vue';
import type { ActiveModal, BallSkin, BallSkinId, GameSettings, LevelInfo } from '../types/game';
import { sound } from '../utils/sound';

export const BALL_SKINS: BallSkin[] = [
  // ── DESBLOQUEADOS ──
  {
    id: 'chrome',
    name: 'Titanio Espejo',
    category: 'Metal Líquido',
    description: 'Reflexión pura con aleación de cromo pulido de alta densidad.',
    roughness: 0.05,
    metalness: 0.98,
    color: '#e6edf5',
    clearcoat: 1.0,
    isLocked: false,
    cardBackground: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 35%, #64748b 70%, #94a3b8 100%)',
  },
  {
    id: 'obsidian',
    name: 'Obsidiana Pulida',
    category: 'Mineral Lujoso',
    description: 'Cristal volcánico negro profundo con absorción de luz casi absoluta.',
    roughness: 0.1,
    metalness: 0.2,
    color: '#08080a',
    clearcoat: 0.9,
    isLocked: false,
    cardBackground: 'radial-gradient(circle at 35% 35%, #27272a 0%, #09090b 60%, #000000 100%)',
  },
  {
    id: 'frosted',
    name: 'Vidrio Esmerilado',
    category: 'Óptica Arquitectónica',
    description: 'Estructura translúcida con difusión de luz difusa inspirada en bloques de vidrio.',
    roughness: 0.35,
    metalness: 0.05,
    color: '#d6e9f8',
    transmission: 0.85,
    ior: 1.5,
    isLocked: false,
    cardBackground: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(186,230,253,0.5) 50%, rgba(125,211,252,0.3) 100%)',
  },
  {
    id: 'marble',
    name: 'Hormigón Blanco',
    category: 'Brutalismo Puro',
    description: 'Textura mineral de concreto pulido al diamante con acabado satinado.',
    roughness: 0.45,
    metalness: 0.0,
    color: '#f0f0f2',
    isLocked: false,
    cardBackground: 'linear-gradient(135deg, #f4f4f5 0%, #e4e4e7 50%, #d4d4d8 100%)',
  },
  {
    id: 'gold',
    name: 'Latón Arquitectónico',
    category: 'Metales Nobles',
    description: 'Calidez geométrica inspirada en perfiles de arquitectura moderna.',
    roughness: 0.18,
    metalness: 0.92,
    color: '#d4af37',
    clearcoat: 0.6,
    isLocked: false,
    cardBackground: 'linear-gradient(135deg, #fef08a 0%, #eab308 40%, #ca8a04 80%, #a16207 100%)',
  },
  {
    id: 'neon',
    name: 'Aqua Bioluminiscente',
    category: 'Vanguardia',
    description: 'Núcleo cuántico con radiación cian difusa bajo corteza de vidrio.',
    roughness: 0.1,
    metalness: 0.3,
    color: '#0df0d4',
    emissive: '#0df0d4',
    emissiveIntensity: 0.45,
    isLocked: false,
    cardBackground: 'radial-gradient(circle at center, #67e8f9 0%, #06b6d4 40%, #0e7490 80%, #164e63 100%)',
  },

  // ── BLOQUEADOS ──
  {
    id: 'copper',
    name: 'Cobre Oxidado',
    category: 'Pátina Arquitectónica',
    description: 'Cobre envejecido con pátina verde esmeralda y textura mineral.',
    roughness: 0.7,
    metalness: 0.8,
    color: '#2dd4bf',
    isLocked: true,
    cardBackground: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 50%, #b45309 100%)',
  },
  {
    id: 'black_marble',
    name: 'Mármol Marquina',
    category: 'Piedra Monumental',
    description: 'Mármol negro profundo con vetas blancas de calcita pura.',
    roughness: 0.15,
    metalness: 0.05,
    color: '#18181b',
    clearcoat: 1.0,
    isLocked: true,
    cardBackground: 'linear-gradient(120deg, #18181b 0%, #27272a 45%, #ffffff 47%, #18181b 50%, #09090b 100%)',
  },
  {
    id: 'forged_carbon',
    name: 'Carbono Forjado',
    category: 'Composite Avanzado',
    description: 'Hojuelas de carbono comprimidas con resina epoxi de alta resistencia.',
    roughness: 0.3,
    metalness: 0.4,
    color: '#27272a',
    clearcoat: 0.8,
    isLocked: true,
    cardBackground: 'radial-gradient(ellipse at 30% 30%, #3f3f46 0%, #27272a 50%, #09090b 100%)',
  },
  {
    id: 'dichroic_glass',
    name: 'Vidrio Dicroico',
    category: 'Óptica Prisma',
    description: 'Cristal que cambia de color según la incidencia de la luz ambiental.',
    roughness: 0.05,
    metalness: 0.1,
    color: '#f472b6',
    transmission: 0.8,
    ior: 1.6,
    isLocked: true,
    cardBackground: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 33%, #3b82f6 66%, #10b981 100%)',
  },
  {
    id: 'rose_gold',
    name: 'Oro Rosa 24K',
    category: 'Joyería Estructural',
    description: 'Aleación de oro, cobre y plata con lustre rosado reflectivo.',
    roughness: 0.12,
    metalness: 0.95,
    color: '#fbcfe8',
    clearcoat: 0.7,
    isLocked: true,
    cardBackground: 'linear-gradient(135deg, #fce7f3 0%, #f472b6 40%, #be185d 80%, #831843 100%)',
  },
  {
    id: 'graphite',
    name: 'Monolito Grafito',
    category: 'Carbono Puro',
    description: 'Bloque sólido de grafito pirolítico con brillo especular anisotropic.',
    roughness: 0.5,
    metalness: 0.6,
    color: '#334155',
    isLocked: true,
    cardBackground: 'linear-gradient(135deg, #475569 0%, #334155 50%, #1e293b 100%)',
  },
];

export const LEVELS: LevelInfo[] = [
  {
    id: 1,
    code: 'LVL.01',
    name: 'Inflexión Gravitatoria',
    subtitle: 'Introducción al plano inclinado y caída libre.',
    difficulty: 'Fácil',
    unlocked: true,
    bestTime: '00:04.22',
    piecesCount: 3,
  },
  {
    id: 2,
    code: 'LVL.02',
    name: 'Voladizo & Rebote',
    subtitle: 'Transferencia de inercia a través de vigas suspendidas.',
    difficulty: 'Fácil',
    unlocked: true,
    piecesCount: 5,
  },
  {
    id: 3,
    code: 'LVL.03',
    name: 'Canal Cóncavo',
    subtitle: 'Aceleración centrífuga mediante curvatura geométrica.',
    difficulty: 'Medio',
    unlocked: true,
    piecesCount: 7,
  },
  {
    id: 4,
    code: 'LVL.04',
    name: 'Salto Parabólico',
    subtitle: 'Calibración de ángulo de lanzamiento y absorción.',
    difficulty: 'Medio',
    unlocked: false,
    piecesCount: 8,
  },
  {
    id: 5,
    code: 'LVL.05',
    name: 'Monolito Cinético',
    subtitle: 'Estructuras móviles y temporización de precisión.',
    difficulty: 'Difícil',
    unlocked: false,
    piecesCount: 12,
  },
  {
    id: 6,
    code: 'LVL.06',
    name: 'Vórtice Brutalista',
    subtitle: 'Desafío arquitectónico en 3 dimensiones espaciales.',
    difficulty: 'Experto',
    unlocked: false,
    piecesCount: 16,
  },
];

// ── LOCAL STORAGE PERSISTENCE ──
const STORAGE_SETTINGS_KEY = 'the_dropper_settings_v1';
const STORAGE_SKIN_KEY = 'the_dropper_skin_v1';

const defaultSettings: GameSettings = {
  masterVolume: 80,
  sfxVolume: 90,
  ambientSound: true,
  graphicsQuality: 'ultra',
  glassRefractions: true,
  cameraParallax: true,
  theme: 'dark',
};

function loadStoredSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...defaultSettings };
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch (e) {
    console.warn('[The Dropper] Error loading settings from localStorage', e);
  }
  return { ...defaultSettings };
}

function loadStoredSkin(): BallSkinId {
  if (typeof window === 'undefined') return 'chrome';
  try {
    const raw = localStorage.getItem(STORAGE_SKIN_KEY) as BallSkinId | null;
    if (raw && BALL_SKINS.some((s) => s.id === raw && !s.isLocked)) {
      return raw;
    }
  } catch (e) {
    console.warn('[The Dropper] Error loading skin from localStorage', e);
  }
  return 'chrome';
}

function saveSettings(data: GameSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('[The Dropper] Error saving settings to localStorage', e);
  }
}

function saveSkin(skinId: BallSkinId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_SKIN_KEY, skinId);
  } catch (e) {
    console.warn('[The Dropper] Error saving skin to localStorage', e);
  }
}

export const selectedSkinId = ref<BallSkinId>(loadStoredSkin());
export const activeModal = ref<ActiveModal>('none');
export const currentView = ref<'menu' | 'modes' | 'locker' | 'settings' | 'sandbox' | 'sandbox_worlds'>('menu');

export function navigateToSandboxWorlds() {
  sound.playClick(0.14);
  sound.playModalTransition();
  currentView.value = 'sandbox_worlds';
}

export function navigateToModes() {
  sound.playClick(0.12);
  sound.playModalTransition();
  currentView.value = 'modes';
}

export function navigateToLocker() {
  sound.playClick(0.12);
  sound.playModalTransition();
  currentView.value = 'locker';
}

export function navigateToSettings() {
  sound.playClick(0.12);
  sound.playModalTransition();
  currentView.value = 'settings';
}

export function navigateToSandbox() {
  sound.playClick(0.16);
  sound.playModalTransition();
  currentView.value = 'sandbox';
}

export function navigateToMenu() {
  sound.playClick(0.08);
  sound.playModalTransition();
  currentView.value = 'menu';
}

export const settings = reactive<GameSettings>(loadStoredSettings());

// Watch and auto-save settings with deep tracking
watch(
  settings,
  (newSettings) => {
    saveSettings(newSettings);
    sound.setEnabled(newSettings.ambientSound);
    sound.setMasterVolume(newSettings.masterVolume);
  },
  { deep: true, immediate: true }
);

// Watch and auto-save selected skin
watch(selectedSkinId, (newSkin) => {
  saveSkin(newSkin);
});

export function openModal(modal: ActiveModal) {
  sound.playClick();
  sound.playModalTransition();
  activeModal.value = modal;
}

export function closeModal() {
  sound.playClick(0.08);
  activeModal.value = 'none';
}

export function selectSkin(id: BallSkinId) {
  const skin = BALL_SKINS.find((s) => s.id === id);
  if (skin?.isLocked) {
    sound.playClick(0.04);
    return false;
  }
  sound.playClick(0.12);
  selectedSkinId.value = id;
  return true;
}
