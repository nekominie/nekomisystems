export type ActiveModal = 'none' | 'play' | 'locker' | 'settings' | 'credits';

export type BallSkinId =
  | 'chrome'
  | 'obsidian'
  | 'frosted'
  | 'marble'
  | 'gold'
  | 'neon'
  | 'copper'
  | 'black_marble'
  | 'forged_carbon'
  | 'dichroic_glass'
  | 'rose_gold'
  | 'graphite';

export interface BallSkin {
  id: BallSkinId;
  name: string;
  category: string;
  description: string;
  roughness: number;
  metalness: number;
  color: string;
  transmission?: number;
  ior?: number;
  clearcoat?: number;
  emissive?: string;
  emissiveIntensity?: number;
  isLocked?: boolean;
  cardBackground: string;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  ambientSound: boolean;
  graphicsQuality: 'ultra' | 'high' | 'medium';
  glassRefractions: boolean;
  cameraParallax: boolean;
  theme: 'dark' | 'light';
}

export interface LevelInfo {
  id: number;
  code: string;
  name: string;
  subtitle: string;
  difficulty: 'Fácil' | 'Medio' | 'Difícil' | 'Experto';
  unlocked: boolean;
  bestTime?: string;
  piecesCount: number;
}
