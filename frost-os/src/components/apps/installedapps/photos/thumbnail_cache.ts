// Cache y motor de miniaturas de alto rendimiento para Frost-OS Fotos
const thumbnailCache = new Map<string, string>();
const inflightPromises = new Map<string, Promise<string>>();
const createdBlobUrls = new Set<string>();

/**
 * Obtiene la miniatura en caché o la genera de forma asíncrona en segundo plano
 * reduciendo el peso de texturas 4K/8K (8MB) a ligeras miniaturas WebP/JPEG (~20KB).
 */
export async function getOrCreateThumbnail(url: string, maxDim: number = 320): Promise<string> {
  if (!url) return '';
  if (thumbnailCache.has(url)) {
    return thumbnailCache.get(url)!;
  }

  if (inflightPromises.has(url)) {
    return inflightPromises.get(url)!;
  }

  const promise = (async () => {
    try {
      // 1. Descargar Blob
      const response = await fetch(url);
      const blob = await response.blob();

      // 2. Usar createImageBitmap con resize nativo si está disponible (Chromium / WebKit modernos)
      if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
        try {
          const bitmap = await createImageBitmap(blob, {
            resizeWidth: maxDim,
            resizeQuality: 'medium',
          });

          let thumbUrl = '';

          if (typeof OffscreenCanvas !== 'undefined') {
            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0);
              const thumbBlob = await canvas.convertToBlob({
                type: 'image/webp',
                quality: 0.82,
              });
              thumbUrl = URL.createObjectURL(thumbBlob);
              createdBlobUrls.add(thumbUrl);
            }
          } else {
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0);
              thumbUrl = canvas.toDataURL('image/jpeg', 0.8);
            }
          }

          bitmap.close();

          if (thumbUrl) {
            thumbnailCache.set(url, thumbUrl);
            return thumbUrl;
          }
        } catch {
          // Si falla createImageBitmap, continúa al fallback estándar
        }
      }

      // 3. Fallback: Escalado tradicional con canvas
      return await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
          const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
          const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            thumbnailCache.set(url, dataUrl);
            resolve(dataUrl);
          } else {
            resolve(url);
          }
        };
        img.onerror = () => resolve(url);
        img.src = url;
      });
    } catch (e) {
      console.warn('No se pudo generar miniatura para:', url, e);
      return url;
    } finally {
      inflightPromises.delete(url);
    }
  })();

  inflightPromises.set(url, promise);
  return promise;
}

export function getCachedThumbnail(url: string): string | undefined {
  return thumbnailCache.get(url);
}

export function clearThumbnailCache() {
  for (const blobUrl of createdBlobUrls) {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }
  createdBlobUrls.clear();
  thumbnailCache.clear();
  inflightPromises.clear();
}
