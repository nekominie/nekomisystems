import * as THREE from 'three';

/**
 * Apuntado con el ratón en una cámara cenital: el cursor se proyecta con un rayo desde la cámara
 * contra el plano del suelo; el disparo sale hacia ese punto.
 */
export class MouseAim {
  /** Coordenadas normalizadas del cursor (-1..1). */
  readonly ndc = new THREE.Vector2();
  /** true tras el primer movimiento del ratón (antes no hay punto de apuntado válido). */
  seen = false;
  /** Punto del suelo bajo el cursor. */
  readonly point = new THREE.Vector3();

  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  setFromEvent(e: MouseEvent, canvas: HTMLElement) {
    const r = canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
    this.seen = true;
  }

  /** Recalcula `point` para la cámara actual. Devuelve false si el rayo no toca el suelo. */
  update(camera: THREE.Camera): boolean {
    if (!this.seen) return false;
    camera.updateMatrixWorld();
    this.ray.setFromCamera(this.ndc, camera);
    return this.ray.ray.intersectPlane(this.plane, this.point) !== null;
  }
}

/**
 * Retícula sobre el suelo en el punto de apuntado: un aro cuyo radio es el de la dispersión actual
 * a esa distancia (el aro se abre al moverte o disparar en ráfaga y se cierra al estabilizarte).
 */
export class AimReticle {
  private ring: THREE.Mesh;
  private dot: THREE.Mesh;
  private mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
    depthWrite: false,
    fog: false,
  });

  constructor(private scene: THREE.Scene) {
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2), this.mat);
    this.dot = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12).rotateX(-Math.PI / 2), this.mat);
    for (const m of [this.ring, this.dot]) {
      m.renderOrder = 999;
      m.visible = false;
      scene.add(m);
    }
  }

  update(point: THREE.Vector3, radius: number, visible: boolean, color: number) {
    this.ring.visible = this.dot.visible = visible;
    if (!visible) return;
    const r = THREE.MathUtils.clamp(radius, 0.12, 6);
    this.ring.position.set(point.x, 0.1, point.z);
    this.dot.position.set(point.x, 0.1, point.z);
    this.ring.scale.setScalar(r);
    this.mat.color.setHex(color);
  }

  dispose() {
    this.scene.remove(this.ring, this.dot);
    this.ring.geometry.dispose();
    this.dot.geometry.dispose();
    this.mat.dispose();
  }
}
