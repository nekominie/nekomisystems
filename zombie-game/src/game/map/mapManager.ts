import { WORLD } from '../world/worldConfig';
import { WorldGenerator } from '../world/chunkGenerator';
import type { ChunkData, Quad, Structure } from '../world/types';

const TILE_RES = 128; // Pixels per chunk tile (2 pixels per meter for 64m chunks)
const CHUNK_SIZE = WORLD.chunkSize; // 64m
const PIXELS_PER_METER = TILE_RES / CHUNK_SIZE; // 2.0

export class MapManager {
  /** Claves de chunks descubiertos por el jugador local: "cx,cz" */
  readonly unlockedChunks = new Set<string>();

  /** Caché de imágenes de chunks renderizados */
  private cachedTiles = new Map<string, HTMLCanvasElement>();

  /** Semilla del mundo para persistencia */
  private seed = 0;

  /** Bandera de cambios pendientes para guardar en localStorage */
  private isDirty = false;
  private saveTimeout: number | null = null;

  /** Canvas temporal para procesar groundColors */
  private tempGroundCanvas: HTMLCanvasElement | null = null;
  private tempGroundCtx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      this.tempGroundCanvas = document.createElement('canvas');
      this.tempGroundCanvas.width = 33;
      this.tempGroundCanvas.height = 33;
      this.tempGroundCtx = this.tempGroundCanvas.getContext('2d');
    }
  }

  /**
   * Inicializa el gestor con la semilla del mundo y restaura el progreso guardado
   */
  init(seed: number, spawnX = 0, spawnZ = 0, generator?: WorldGenerator) {
    this.seed = seed;
    this.cachedTiles.clear();
    this.unlockedChunks.clear();
    this.loadFromStorage();

    // Desbloquear al menos el área de inicio alrededor del jugador
    if (generator) {
      this.updateDiscovery(spawnX, spawnZ, generator, 1);
    }
  }

  /**
   * Actualiza los chunks descubiertos según la posición del jugador local
   * @param radiusChunks Radio de chunks a revelar alrededor del jugador (ej. 1 = 3x3 chunks)
   */
  updateDiscovery(playerX: number, playerZ: number, generator: WorldGenerator, radiusChunks = 1) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    let newlyUnlocked = false;
    for (let dz = -radiusChunks; dz <= radiusChunks; dz++) {
      for (let dx = -radiusChunks; dx <= radiusChunks; dx++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = `${cx},${cz}`;
        if (!this.unlockedChunks.has(key)) {
          this.unlockedChunks.add(key);
          newlyUnlocked = true;
          // Precargar tile en caché
          this.getTile(cx, cz, generator);
        }
      }
    }

    if (newlyUnlocked) {
      this.scheduleSave();
    }
  }

  /**
   * Obtiene o genera la imagen en caché de un chunk
   */
  getTile(cx: number, cz: number, generator: WorldGenerator): HTMLCanvasElement | null {
    const key = `${cx},${cz}`;
    let tile = this.cachedTiles.get(key);
    if (!tile && typeof document !== 'undefined') {
      const data = generator.generateChunk(cx, cz);
      tile = this.renderChunkTile(data);
      this.cachedTiles.set(key, tile);
    }
    return tile ?? null;
  }

  /**
   * Renderiza el terreno y todas las estructuras estáticas del chunk en un canvas 2D
   * (Sin entidades vivas)
   */
  private renderChunkTile(data: ChunkData): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = TILE_RES;
    canvas.height = TILE_RES;
    const ctx = canvas.getContext('2d')!;

    const ox = data.originX;
    const oz = data.originZ;
    const scale = PIXELS_PER_METER;

    // 1. Terreno base a partir de data.groundColors
    if (data.groundColors && data.groundColors.length >= 33 * 33 * 3 && this.tempGroundCtx && this.tempGroundCanvas) {
      const vn = 33;
      const imgData = this.tempGroundCtx.createImageData(vn, vn);
      const d = imgData.data;
      const gc = data.groundColors;
      let srcIdx = 0;
      let dstIdx = 0;
      for (let i = 0; i < vn * vn; i++) {
        d[dstIdx] = Math.min(255, Math.max(0, Math.round(gc[srcIdx] * 255)));
        d[dstIdx + 1] = Math.min(255, Math.max(0, Math.round(gc[srcIdx + 1] * 255)));
        d[dstIdx + 2] = Math.min(255, Math.max(0, Math.round(gc[srcIdx + 2] * 255)));
        d[dstIdx + 3] = 255;
        srcIdx += 3;
        dstIdx += 4;
      }
      this.tempGroundCtx.putImageData(imgData, 0, 0);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(this.tempGroundCanvas, 0, 0, TILE_RES, TILE_RES);
    } else {
      ctx.fillStyle = '#2d4224'; // Verde pasto de respaldo
      ctx.fillRect(0, 0, TILE_RES, TILE_RES);
    }

    // 2. Senderos y calles de tierra (dirtQuads)
    if (data.dirtQuads && data.dirtQuads.length > 0) {
      ctx.fillStyle = '#654f35';
      ctx.strokeStyle = '#4a3721';
      ctx.lineWidth = 1;
      for (const q of data.dirtQuads) {
        this.drawQuad(ctx, q, ox, oz, scale);
      }
    }

    // 3. Carreteras y calles de asfalto (roadQuads)
    if (data.roadQuads && data.roadQuads.length > 0) {
      ctx.fillStyle = '#22252a';
      ctx.strokeStyle = '#383d47';
      ctx.lineWidth = 1.2;
      for (const q of data.roadQuads) {
        this.drawQuad(ctx, q, ox, oz, scale);
      }

      // Marcas de línea de carril tenue en avenidas/carreteras
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 4]);
      for (const q of data.roadQuads) {
        // Línea central estimada
        const midX1 = ((q[0] + q[6]) * 0.5 - ox) * scale;
        const midY1 = ((q[1] + q[7]) * 0.5 - oz) * scale;
        const midX2 = ((q[2] + q[4]) * 0.5 - ox) * scale;
        const midY2 = ((q[3] + q[5]) * 0.5 - oz) * scale;
        ctx.beginPath();
        ctx.moveTo(midX1, midY1);
        ctx.lineTo(midX2, midY2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // 4. Copas de árboles (pequeños círculos verdes para dar textura satelital)
    if (data.trees && data.trees.length > 0) {
      for (const t of data.trees) {
        const tx = (t.x - ox) * scale;
        const ty = (t.z - oz) * scale;
        const tr = Math.max(1.8, (t.scale ?? 1) * 2.2);

        ctx.fillStyle = t.kind === 'pine' ? 'rgba(20, 50, 25, 0.65)' : 'rgba(35, 70, 30, 0.65)';
        ctx.beginPath();
        ctx.arc(tx, ty, tr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Estructuras (Edificios, Casas, Cabañas)
    if (data.structures && data.structures.length > 0) {
      for (const s of data.structures) {
        this.drawStructure(ctx, s, ox, oz, scale);
      }
    }

    // 6. Gasolineras
    if (data.stations && data.stations.length > 0) {
      for (const st of data.stations) {
        const sx = (st.x - ox) * scale;
        const sy = (st.z - oz) * scale;

        // Marquesina blanca y roja de la estación
        ctx.save();
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(sx - 16, sy - 9, 32, 18);
        ctx.strokeStyle = '#b91c1c';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx - 16, sy - 9, 32, 18);

        // Ícono / Franja de Gasolinera
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(sx - 16, sy - 9, 32, 4);

        // Bombas de combustible
        ctx.fillStyle = '#ef4444';
        for (const p of st.pumps) {
          const px = (p.x - ox) * scale;
          const py = (p.z - oz) * scale;
          ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
        }
        ctx.restore();
      }
    }

    // 7. Casetas de cobro (tolls)
    if (data.tolls && data.tolls.length > 0) {
      for (const t of data.tolls) {
        ctx.save();
        ctx.translate((t.x - ox) * scale, (t.z - oz) * scale);
        ctx.rotate(-t.rot);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-2, -5, 4, 10);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-6, -1, 12, 2);
        ctx.restore();
      }
    }

    // 8. Torres de guardabosques
    if (data.towers && data.towers.length > 0) {
      for (const tw of data.towers) {
        ctx.save();
        ctx.translate((tw.x - ox) * scale, (tw.z - oz) * scale);
        ctx.rotate(-tw.rot);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-4, -4, 8, 8);
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(-4, -4, 8, 8);
        ctx.restore();
      }
    }

    // 9. Tiendas de campaña (campamentos)
    if (data.tents && data.tents.length > 0) {
      for (const tent of data.tents) {
        ctx.save();
        ctx.translate((tent.x - ox) * scale, (tent.z - oz) * scale);
        ctx.rotate(-tent.rot);
        const sz = (tent.size || 3) * scale * 0.45;
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-sz, -sz, sz * 2, sz * 2);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1;
        ctx.strokeRect(-sz, -sz, sz * 2, sz * 2);
        ctx.restore();
      }
    }

    return canvas;
  }

  private drawQuad(ctx: CanvasRenderingContext2D, q: Quad, ox: number, oz: number, scale: number) {
    ctx.beginPath();
    ctx.moveTo((q[0] - ox) * scale, (q[1] - oz) * scale);
    ctx.lineTo((q[2] - ox) * scale, (q[3] - oz) * scale);
    ctx.lineTo((q[4] - ox) * scale, (q[5] - oz) * scale);
    ctx.lineTo((q[6] - ox) * scale, (q[7] - oz) * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawStructure(ctx: CanvasRenderingContext2D, s: Structure, ox: number, oz: number, scale: number) {
    const sx = (s.x - ox) * scale;
    const sy = (s.z - oz) * scale;
    const sw = s.w * scale;
    const sd = s.d * scale;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-s.rot);

    if (s.kind === 'building') {
      // Edificio comercial / rascacielos
      const wallColor = '#' + (s.wallColor || 0x475569).toString(16).padStart(6, '0');
      ctx.fillStyle = wallColor;
      ctx.fillRect(-sw / 2, -sd / 2, sw, sd);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(-sw / 2, -sd / 2, sw, sd);

      // Detalle del techo / azotea
      if (sw > 10 && sd > 10) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(-sw / 2 + 3, -sd / 2 + 3, sw - 6, sd - 6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.strokeRect(-sw / 2 + 3, -sd / 2 + 3, sw - 6, sd - 6);
      }
    } else if (s.kind === 'house') {
      // Casa residencial
      const roofColor = '#' + (s.roofColor || 0x854d0e).toString(16).padStart(6, '0');
      ctx.fillStyle = roofColor;
      ctx.fillRect(-sw / 2, -sd / 2, sw, sd);

      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-sw / 2, -sd / 2, sw, sd);

      // Línea de caballete en el techo
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(-sw / 2, 0);
      ctx.lineTo(sw / 2, 0);
      ctx.stroke();
    } else {
      // Cabaña de madera
      ctx.fillStyle = '#654321';
      ctx.fillRect(-sw / 2, -sd / 2, sw, sd);

      ctx.strokeStyle = '#38220f';
      ctx.lineWidth = 1;
      ctx.strokeRect(-sw / 2, -sd / 2, sw, sd);
    }

    ctx.restore();
  }

  /**
   * Renderiza la vista de mapa sobre un canvas arbitrario (Minimapa o Mapa Completo)
   */
  drawMap(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerX: number,
    centerZ: number,
    zoom: number, // píxeles por metro
    generator: WorldGenerator,
    playerX?: number,
    playerZ?: number,
    playerRot?: number,
  ) {
    // 1. Fondo táctico oscuro (zona no explorada)
    ctx.fillStyle = '#06080c';
    ctx.fillRect(0, 0, width, height);

    // 2. Cuadrícula de coordenadas GPS en fondo no explorado
    this.drawGPSGrid(ctx, width, height, centerX, centerZ, zoom);

    // 3. Rango de chunks visibles
    const halfW = width / (2 * zoom);
    const halfH = height / (2 * zoom);
    const minWorldX = centerX - halfW;
    const maxWorldX = centerX + halfW;
    const minWorldZ = centerZ - halfH;
    const maxWorldZ = centerZ + halfH;

    const minCx = Math.floor(minWorldX / CHUNK_SIZE);
    const maxCx = Math.floor(maxWorldX / CHUNK_SIZE);
    const minCz = Math.floor(minWorldZ / CHUNK_SIZE);
    const maxCz = Math.floor(maxWorldZ / CHUNK_SIZE);

    const chunkSizePx = CHUNK_SIZE * zoom;

    // 4. Dibujar chunks desbloqueados
    for (let cz = minCz; cz <= maxCz; cz++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const key = `${cx},${cz}`;
        if (!this.unlockedChunks.has(key)) {
          // El chunk no ha sido desbloqueado por el jugador local
          continue;
        }

        const tile = this.getTile(cx, cz, generator);
        if (!tile) continue;

        const screenX = (cx * CHUNK_SIZE - centerX) * zoom + width / 2;
        const screenY = (cz * CHUNK_SIZE - centerZ) * zoom + height / 2;

        ctx.drawImage(tile, screenX, screenY, chunkSizePx, chunkSizePx);

        // Borde tenue de cuadrícula de chunk desbloqueado
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, chunkSizePx, chunkSizePx);
      }
    }

    // 5. Marcador de posición del jugador local (GPS Navigator)
    if (playerX !== undefined && playerZ !== undefined && playerRot !== undefined) {
      this.drawPlayerMarker(ctx, width, height, centerX, centerZ, zoom, playerX, playerZ, playerRot);
    }
  }

  /**
   * Cuadrícula GPS tenue con líneas y coordenadas
   */
  private drawGPSGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerX: number,
    centerZ: number,
    zoom: number,
  ) {
    const gridSpacingMeters = zoom > 1.5 ? 32 : zoom > 0.6 ? 64 : 128;
    const gridSpacingPx = gridSpacingMeters * zoom;

    const offsetX = ((width / 2 - centerX * zoom) % gridSpacingPx + gridSpacingPx) % gridSpacingPx;
    const offsetY = ((height / 2 - centerZ * zoom) % gridSpacingPx + gridSpacingPx) % gridSpacingPx;

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSpacingPx) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSpacingPx) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  /**
   * Dibuja el cursor / flecha GPS del jugador local
   */
  private drawPlayerMarker(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerX: number,
    centerZ: number,
    zoom: number,
    px: number,
    pz: number,
    rot: number,
  ) {
    const screenX = (px - centerX) * zoom + width / 2;
    const screenY = (pz - centerZ) * zoom + height / 2;

    const isInside = screenX >= 8 && screenX <= width - 8 && screenY >= 8 && screenY <= height - 8;

    if (isInside) {
      ctx.save();
      ctx.translate(screenX, screenY);

      // Halo pulsante de señal GPS
      const pulse = (Date.now() % 1600) / 1600;
      ctx.beginPath();
      ctx.arc(0, 0, 7 + pulse * 14, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6, 182, 212, ${0.45 * (1 - pulse)})`;
      ctx.fill();

      // Círculo base de posición
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#0891b2';
      ctx.fill();

      // Dirección del jugador: rotación en Three.js hacia ángulo 2D del canvas
      const angle = Math.atan2(Math.cos(rot), Math.sin(rot));
      ctx.rotate(angle);

      // Flecha de navegación GPS
      ctx.beginPath();
      ctx.moveTo(11, 0); // Punta apuntando al frente
      ctx.lineTo(-7, -6);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 6);
      ctx.closePath();

      ctx.fillStyle = '#38bdf8'; // Cyan brillante
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    } else {
      // Indicador en el borde si el jugador está fuera de la pantalla (en modo mapa completo)
      const clampedX = Math.max(16, Math.min(width - 16, screenX));
      const clampedY = Math.max(16, Math.min(height - 16, screenY));
      const angle = Math.atan2(screenY - height / 2, screenX - width / 2);

      ctx.save();
      ctx.translate(clampedX, clampedY);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.closePath();

      ctx.fillStyle = '#f59e0b'; // Ámbar de alerta fuera de visión
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }
  }

  // --- Persistencia en LocalStorage ---

  private scheduleSave() {
    if (this.saveTimeout !== null) return;
    this.saveTimeout = window.setTimeout(() => {
      this.saveToStorage();
      this.saveTimeout = null;
    }, 2500);
  }

  private saveToStorage() {
    if (!this.seed || typeof localStorage === 'undefined') return;
    try {
      const list = Array.from(this.unlockedChunks);
      localStorage.setItem(`zombie_game_map_unlocked_${this.seed}`, JSON.stringify(list));
    } catch {
      // Ignorar cuota de almacenamiento excedida
    }
  }

  private loadFromStorage() {
    if (!this.seed || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(`zombie_game_map_unlocked_${this.seed}`);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          for (const k of list) {
            if (typeof k === 'string') this.unlockedChunks.add(k);
          }
        }
      }
    } catch {
      // Ignorar error de parsing
    }
  }
}

export const mapManager = new MapManager();
