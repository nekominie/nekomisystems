// Utilidades y constantes para thumbnails e imágenes en Frost-OS
export const SYSTEM_WALLPAPERS_MAP: Record<string, string> = {
  // Identificadores de muestra
  'file-sample-pic': '/wallpapers/default-wallpaper.jpg',
  'file-sample-pic-1': '/wallpapers/default-wallpaper.jpg',
  'file-sample-pic-2': '/wallpapers/default-wallpaper1.jpg',
  'file-sample-pic-3': '/wallpapers/default-wallpaper2.jpg',
  'file-sample-pic-4': '/wallpapers/default-wallpaper3.jpg',
  'file-sample-pic-5': '/wallpapers/default-wallpaper4.jpg',
  'file-sample-pic-6': '/wallpapers/default-wallpaper5.jpg',
  'file-sample-pic-7': '/wallpapers/default-wallpaper7.jpg',
  'file-sample-pic-8': '/wallpapers/nekodrive-bg.png',
  'file-sample-pic-9': '/wallpapers/pexels-pacific-17665455.jpg',
  'file-sample-pic-10': '/wallpapers/pexels-nadezhda-moryak-7127449.jpg',
  'file-sample-pic-11': '/wallpapers/pexels-dade85-10121052.jpg',

  // Nombres de archivo normalizados
  'nekomi_wallpaper.jpg': '/wallpapers/default-wallpaper.jpg',
  'aurora_nordica.jpg': '/wallpapers/default-wallpaper1.jpg',
  'horizonte_ciberpunk.jpg': '/wallpapers/default-wallpaper2.jpg',
  'montanas_atardecer.jpg': '/wallpapers/default-wallpaper3.jpg',
  'montanas_al_atardecer.jpg': '/wallpapers/default-wallpaper3.jpg',
  'bosque_niebla.jpg': '/wallpapers/default-wallpaper4.jpg',
  'bosque_de_niebla.jpg': '/wallpapers/default-wallpaper4.jpg',
  'oceano_calmo.jpg': '/wallpapers/default-wallpaper5.jpg',
  'geometria_abstracta.jpg': '/wallpapers/default-wallpaper6.jpg',
  'flor_de_loto.jpg': '/wallpapers/default-wallpaper7.jpg',
  'luces_de_neon.jpg': '/wallpapers/default-wallpaper8.jpg',
  'cosmos_espacial.jpg': '/wallpapers/default-wallpaper9.jpg',
  'aurora_boreal.jpg': '/wallpapers/default-wallpaper10.jpg',
  'nekodrive_space.png': '/wallpapers/nekodrive-bg.png',
  'nekodrive_bg.png': '/wallpapers/nekodrive-bg.png',
  'playa_pacifico.jpg': '/wallpapers/pexels-pacific-17665455.jpg',
  'foto_vacaciones_playa.jpg': '/wallpapers/pexels-pacific-17665455.jpg',
  'sesion_fotografica.jpg': '/wallpapers/pexels-nadezhda-moryak-7127449.jpg',
  'paisaje_urbano.jpg': '/wallpapers/pexels-dade85-10121052.jpg',
};

export function isImageFile(item: { type?: string; mimeType?: string; name: string }): boolean {
  if (item.type !== 'file') return false;
  if (item.mimeType?.startsWith('image/')) return true;
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(item.name);
}

export function resolveSystemImageUrl(id: string, name: string): string | null {
  if (SYSTEM_WALLPAPERS_MAP[id]) return SYSTEM_WALLPAPERS_MAP[id];
  const lowerName = name.toLowerCase();
  if (SYSTEM_WALLPAPERS_MAP[lowerName]) return SYSTEM_WALLPAPERS_MAP[lowerName];
  if (SYSTEM_WALLPAPERS_MAP[name]) return SYSTEM_WALLPAPERS_MAP[name];

  if (lowerName.startsWith('default-wallpaper') && /\.(jpg|jpeg|png|webp)$/i.test(lowerName)) {
    return `/wallpapers/${name}`;
  }

  return null;
}
