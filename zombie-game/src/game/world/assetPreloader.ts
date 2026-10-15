import { preloadMikuTextures } from './mikuAssets';
import { PlayerAvatar } from './playerAvatar';
import { preloadZombieAssets } from './zombies';
import { ANIMATION_URLS, loadAnimation } from './animationAssets';

export interface PreloadProgress {
  loaded: number;
  total: number;
  percent: number;
  currentLabel: string;
  category: string;
}

let isPreloadedState = false;

export function isAllGameAssetsPreloaded(): boolean {
  return isPreloadedState && PlayerAvatar.isPreloaded();
}

/**
 * Precarga y sincroniza en memoria todos los recursos críticos (modelos 3D GLB,
 * texturas PNG y clips de animación Mixamo) antes de ingresar al mundo de juego.
 * Esto garantiza que ni el jugador local ni los jugadores remotos o zombis
 * se visualicen con mallas provisionales o genéricas (cápsulas/cilindros).
 */
export async function preloadAllGameAssets(
  onProgress?: (progress: PreloadProgress) => void
): Promise<void> {
  const TOTAL_ASSETS = 32;

  if (isPreloadedState && PlayerAvatar.isPreloaded()) {
    onProgress?.({
      loaded: TOTAL_ASSETS,
      total: TOTAL_ASSETS,
      percent: 100,
      currentLabel: 'Todos los recursos ya se encuentran en memoria caché',
      category: 'MEMORIA',
    });
    return;
  }

  let loadedCount = 0;

  const notify = (label: string, category: string) => {
    loadedCount++;
    const percent = Math.min(100, Math.round((loadedCount / TOTAL_ASSETS) * 100));
    onProgress?.({
      loaded: loadedCount,
      total: TOTAL_ASSETS,
      percent,
      currentLabel: label,
      category,
    });
  };

  try {
    // 1. Texturas principales de personaje y zombis (5 texturas)
    await preloadMikuTextures((label) => {
      notify(label, 'TEXTURAS');
    });

    // 2. Modelo 3D base Hatsune y todas las animaciones de locomoción/combate del jugador (18 items)
    await PlayerAvatar.preload((label) => {
      notify(label, label.includes('Modelo') ? 'MODELO 3D' : 'ANIMACIÓN');
    });

    // 3. Animaciones específicas de horda zombi (7 animaciones)
    await preloadZombieAssets((label) => {
      notify(label, 'ZOMBIS');
    });

    // 4. Animaciones complementarias de posturas y táctica
    const remainingKeys: { key: keyof typeof ANIMATION_URLS; label: string }[] = [
      { key: 'agachado_atras', label: 'Animación: Agachado marcha atrás' },
      { key: 'bloquear_2', label: 'Animación: Guardia secundaria' },
    ];

    for (const rem of remainingKeys) {
      await loadAnimation(rem.key);
      notify(rem.label, 'ANIMACIÓN');
    }

    isPreloadedState = true;

    onProgress?.({
      loaded: TOTAL_ASSETS,
      total: TOTAL_ASSETS,
      percent: 100,
      currentLabel: 'Sistemas listos // Modelos 3D y animaciones al 100%',
      category: 'CONFIRMADO',
    });
  } catch (err) {
    console.error('[assetPreloader] Error durante la precarga de assets:', err);
    throw err;
  }
}
