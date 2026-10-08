import * as THREE from 'three';
import type { ShotResult } from './weapon';

interface Timed {
  life: number;
  max: number;
}
interface Tracer extends Timed {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  pos: Float32Array;
}
interface Puff extends Timed {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  size: number;
}

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/**
 * Efectos visuales de disparo con pools fijos (sin crear objetos por disparo): trazadoras, fogonazo,
 * chispas / sangre en los impactos y el abanico del golpe cuerpo a cuerpo.
 */
export class ShotFx {
  private group = new THREE.Group();
  private tex = glowTexture();
  private tracers: Tracer[] = [];
  private flashes: Puff[] = [];
  private blood: Puff[] = [];
  private sparks: Puff[] = [];
  private swing: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; life: number; max: number };

  constructor(private scene: THREE.Scene) {
    for (let i = 0; i < 40; i++) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(6);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.LineBasicMaterial({
        color: 0xffe9a0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      this.group.add(line);
      this.tracers.push({ line, mat, pos, life: 0, max: 0.09 });
    }
    const makePuffs = (n: number, color: number, additive: boolean, list: Puff[]) => {
      for (let i = 0; i < n; i++) {
        const mat = new THREE.SpriteMaterial({
          map: this.tex,
          color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          fog: false,
          blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.visible = false;
        this.group.add(sprite);
        list.push({ sprite, mat, life: 0, max: 0.2, size: 1 });
      }
    };
    makePuffs(4, 0xffd27a, true, this.flashes);
    makePuffs(24, 0xb01616, false, this.blood);
    makePuffs(24, 0xffe0a0, true, this.sparks);

    // Abanico del golpe cuerpo a cuerpo (plano sobre el suelo)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    mesh.visible = false;
    this.group.add(mesh);
    this.swing = { mesh, mat, life: 0, max: 0.14 };

    scene.add(this.group);
  }

  private trigger(list: Puff[], pos: THREE.Vector3, size: number, life: number) {
    const p = list.find((x) => x.life <= 0) ?? list[0];
    p.sprite.position.copy(pos);
    p.size = size;
    p.max = life;
    p.life = life;
    p.sprite.visible = true;
  }

  /** Dibuja todo lo de un disparo: abanico (cuerpo a cuerpo) o fogonazo + trazadoras + impactos. */
  play(res: ShotResult) {
    if (res.melee) {
      this.meleeArc(res);
    } else {
      this.trigger(this.flashes, res.muzzle, res.weapon.category === 'shotgun' ? 1.8 : 1.1, 0.06);
      for (const p of res.pellets) this.tracer(p.origin, p.end);
    }
    for (const p of res.pellets) {
      if (p.hit) this.trigger(this.blood, p.hit.point, 0.55, 0.28);
      else if (p.blocked) this.trigger(this.sparks, p.end, 0.5, 0.18);
    }
  }

  /** Dibuja los efectos visuales de un disparo recibido por la red desde otro jugador. */
  playRemote(shot: {
    category: string;
    isMelee: boolean;
    muzzle: THREE.Vector3;
    direction: THREE.Vector3;
    pellets: { end: THREE.Vector3; blocked?: boolean; hit?: boolean }[];
  }) {
    if (shot.isMelee) {
      const arc = 1.7;
      const reach = 2.0;
      const s = this.swing;
      s.mesh.geometry.dispose();
      s.mesh.geometry = new THREE.RingGeometry(0.4, reach, 14, 1, -arc / 2, arc).rotateX(-Math.PI / 2);
      s.mesh.position.set(shot.muzzle.x, 0.12, shot.muzzle.z);
      s.mesh.rotation.y = Math.atan2(shot.direction.x, shot.direction.z) - Math.PI / 2;
      s.life = s.max;
      s.mesh.visible = true;
    } else {
      this.trigger(this.flashes, shot.muzzle, shot.category === 'shotgun' ? 1.8 : 1.1, 0.06);
      for (const p of shot.pellets) {
        this.tracer(shot.muzzle, p.end);
        if (p.hit) this.trigger(this.blood, p.end, 0.55, 0.28);
        else if (p.blocked) this.trigger(this.sparks, p.end, 0.5, 0.18);
      }
    }
  }

  private tracer(from: THREE.Vector3, to: THREE.Vector3) {
    const t = this.tracers.find((x) => x.life <= 0) ?? this.tracers[0];
    t.pos.set([from.x, from.y, from.z, to.x, to.y, to.z]);
    (t.line.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    t.life = t.max;
    t.line.visible = true;
  }

  private meleeArc(res: ShotResult) {
    const arc = res.weapon.meleeArc ?? 1.7;
    const reach = res.weapon.effectiveRange;
    const s = this.swing;
    s.mesh.geometry.dispose();
    // Anillo en XY con ángulos desde +X; se tumba sobre el suelo y se orienta según la dirección del golpe
    s.mesh.geometry = new THREE.RingGeometry(0.4, reach, 14, 1, -arc / 2, arc).rotateX(-Math.PI / 2);
    s.mesh.position.set(res.muzzle.x, 0.12, res.muzzle.z);
    s.mesh.rotation.y = Math.atan2(res.direction.x, res.direction.z) - Math.PI / 2;
    s.life = s.max;
    s.mesh.visible = true;
  }

  update(dt: number) {
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      t.mat.opacity = Math.max(0, t.life / t.max) * 0.9;
      if (t.life <= 0) t.line.visible = false;
    }
    const upd = (list: Puff[], grow: number) => {
      for (const p of list) {
        if (p.life <= 0) continue;
        p.life -= dt;
        const k = Math.max(0, p.life / p.max);
        p.mat.opacity = k;
        p.sprite.scale.setScalar(p.size * (1 + (1 - k) * grow));
        if (p.life <= 0) p.sprite.visible = false;
      }
    };
    upd(this.flashes, 0.6);
    upd(this.blood, 1.2);
    upd(this.sparks, 0.8);
    const s = this.swing;
    if (s.life > 0) {
      s.life -= dt;
      s.mat.opacity = Math.max(0, s.life / s.max) * 0.55;
      if (s.life <= 0) s.mesh.visible = false;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.tex.dispose();
    this.swing.mesh.geometry.dispose();
    for (const t of this.tracers) {
      t.line.geometry.dispose();
      t.mat.dispose();
    }
    for (const p of [...this.flashes, ...this.blood, ...this.sparks]) p.mat.dispose();
  }
}
