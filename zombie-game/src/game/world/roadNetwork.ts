import { WORLD } from './worldConfig';
import { hash2, mulberry32 } from './random';
import { makeCar } from './cars';
import {
  buildRibbon,
  distToSeg,
  makeCurve,
  ribbonIntersects,
  ribbonQuad,
  ribbonSegmentsNear,
  segMid,
  type Ribbon,
  type Seg,
} from './curves';
import type { CityMap } from './cityGenerator';
import type { Car, City, Quad, Rect, TollBooth } from './types';

export interface HighwayPath {
  ribbon: Ribbon;
  tolls: TollBooth[];
  cars: Car[];
}

/**
 * Carreteras que interconectan ciudades. Cada ciudad se conecta con la siguiente ciudad hacia el
 * este y hacia el sur (saltando una región vacía) y, a veces, en diagonal. Los trazados son curvas
 * con ondulación determinista, por lo que se pueden regenerar en cualquier chunk sin estado global.
 *
 * Sobre cada carretera se colocan, de forma determinista, algunas casetas de cobro (muy pocas) y
 * carros abandonados (frecuencia media).
 */
export class HighwayNet {
  private byRegion = new Map<string, HighwayPath[]>();

  constructor(
    readonly seed: number,
    private cities: CityMap,
  ) {}

  /** Caminos cuyo origen es la región (rx, rz). */
  private pathsFromRegion(rx: number, rz: number): HighwayPath[] {
    const key = `${rx},${rz}`;
    const cached = this.byRegion.get(key);
    if (cached) return cached;

    const out: HighwayPath[] = [];
    const a = this.cities.getRegionCity(rx, rz);
    if (a) {
      const targets: City[] = [];
      // Este y Sur: la primera ciudad dentro de 2 regiones
      for (const [dx, dz] of [
        [1, 0],
        [0, 1],
      ]) {
        for (let k = 1; k <= 2; k++) {
          const b = this.cities.getRegionCity(rx + dx * k, rz + dz * k);
          if (b) {
            targets.push(b);
            break;
          }
        }
      }
      // Diagonal sureste, con 50% de probabilidad
      const diag = this.cities.getRegionCity(rx + 1, rz + 1);
      if (diag && mulberry32(hash2(this.seed + 505, rx, rz))() < 0.5) targets.push(diag);

      for (const b of targets) out.push(this.buildPath(a, b));
    }
    this.byRegion.set(key, out);
    return out;
  }

  private buildPath(a: City, b: City): HighwayPath {
    const rng = mulberry32(hash2(hash2(this.seed + 303, Math.floor(a.minX), Math.floor(a.minZ)), Math.floor(b.minX), Math.floor(b.minZ)));
    const { width, step, tollChance, carChance, carSpacing } = WORLD.highway;
    const pts = makeCurve({ x: a.centerX, z: a.centerZ }, { x: b.centerX, z: b.centerZ }, rng, 'highway', step);
    const ribbon = buildRibbon(pts, () => width / 2);

    const outsideCities = (x: number, z: number, margin: number) => !this.cities.cityNear(x, z, margin);
    const tangent = (i: number) => {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(p1.x - p0.x, p1.z - p0.z) || 1;
      return { tx: (p1.x - p0.x) / l, tz: (p1.z - p0.z) / l };
    };

    // Caseta de cobro (muy poco frecuente): entre el 35% y el 65% del trayecto
    const tolls: TollBooth[] = [];
    if (rng() < tollChance) {
      const i = Math.floor(pts.length * (0.35 + rng() * 0.3));
      const p = pts[i];
      if (outsideCities(p.x, p.z, 40)) {
        const { tx, tz } = tangent(i);
        tolls.push({ x: p.x, z: p.z, rot: Math.atan2(tx, tz) });
      }
    }

    // Carros abandonados: cada ~carSpacing metros, con probabilidad carChance
    const cars: Car[] = [];
    const stride = Math.max(1, Math.round(carSpacing / step));
    for (let i = stride; i < pts.length - stride; i += stride) {
      if (rng() > carChance) continue;
      const p = pts[i];
      const { tx, tz } = tangent(i);
      const nx = -tz;
      const nz = tx;
      // En un carril o sobre el arcén
      const onShoulder = rng() < 0.45;
      const side = rng() < 0.5 ? -1 : 1;
      const lateral = onShoulder ? side * (width / 2 + 1.3) : side * (width / 4 + (rng() - 0.5) * 0.8);
      const x = p.x + nx * lateral;
      const z = p.z + nz * lateral;
      const dirFlip = rng() < 0.5 ? 0 : Math.PI;
      const rot = Math.atan2(tx, tz) + dirFlip + (rng() - 0.5) * (onShoulder ? 0.3 : 0.7);
      if (!outsideCities(x, z, 18)) continue;
      if (tolls.some((t) => Math.hypot(t.x - x, t.z - z) < 16)) continue;
      cars.push(makeCar('abandoned', x, z, rot, rng));
    }

    return { ribbon, tolls, cars };
  }

  /** Carreteras cuya caja envolvente toca `rect` (+margen). Un camino puede venir de hasta 2 regiones. */
  pathsNear(rect: Rect, margin = 0): HighwayPath[] {
    const R = WORLD.regionSize;
    const r0x = Math.floor(rect.minX / R) - 2;
    const r1x = Math.floor(rect.maxX / R);
    const r0z = Math.floor(rect.minZ / R) - 2;
    const r1z = Math.floor(rect.maxZ / R);
    const out: HighwayPath[] = [];
    for (let rz = r0z; rz <= r1z; rz++) {
      for (let rx = r0x; rx <= r1x; rx++) {
        for (const p of this.pathsFromRegion(rx, rz)) {
          if (ribbonIntersects(p.ribbon, rect, margin)) out.push(p);
        }
      }
    }
    return out;
  }

  /** Segmentos cercanos (para excluir vegetación y construcciones). */
  segmentsNear(rect: Rect, margin: number): Seg[] {
    const out: Seg[] = [];
    for (const p of this.pathsNear(rect, margin)) ribbonSegmentsNear(p.ribbon, rect, margin, out);
    return out;
  }

  /** ¿El punto está a menos de `margin` metros del borde de alguna carretera? */
  near(x: number, z: number, margin: number): boolean {
    const probe: Rect = { minX: x, maxX: x, minZ: z, maxZ: z };
    for (const s of this.segmentsNear(probe, margin)) {
      if (distToSeg(x, z, s.ax, s.az, s.bx, s.bz) < s.hw + margin) return true;
    }
    return false;
  }

  /**
   * Cuadriláteros de asfalto que "pertenecen" al chunk (segmento cuyo punto medio cae dentro).
   * Se omiten los tramos dentro de ciudades: ahí mandan las calles de la ciudad.
   */
  ownedQuads(rect: Rect): Quad[] {
    const out: Quad[] = [];
    for (const p of this.pathsNear(rect, 20)) {
      for (let i = 0; i < p.ribbon.pts.length - 1; i++) {
        const m = segMid(p.ribbon, i);
        if (m.x < rect.minX || m.x >= rect.maxX || m.z < rect.minZ || m.z >= rect.maxZ) continue;
        if (this.cities.cityNear(m.x, m.z, 2)) continue;
        out.push(ribbonQuad(p.ribbon, i));
      }
    }
    return out;
  }
}
