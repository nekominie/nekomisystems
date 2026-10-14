import * as THREE from 'three';

export const MAX_DROP_RADIUS = 3.8;

/**
 * Indicador visual 3D sobre el suelo para el arrastre y suelta de armas:
 * - Un aro exterior que delimita el radio máximo alrededor del jugador.
 * - Un relleno translúcido suave del área permitida.
 * - Una retícula en el punto de aterrizaje que cambia entre cian (válido) y rojo (fuera de rango).
 */
export class DropRangeIndicator {
  private group = new THREE.Group();
  private boundaryRing: THREE.Mesh;
  private fillDisc: THREE.Mesh;
  private targetRing: THREE.Mesh;
  private targetDot: THREE.Mesh;

  private validColor = new THREE.Color(0x06b6d4); // Cyan neón
  private invalidColor = new THREE.Color(0xef4444); // Rojo neón

  private ringMat: THREE.MeshBasicMaterial;
  private fillMat: THREE.MeshBasicMaterial;
  private targetMat: THREE.MeshBasicMaterial;

  constructor(private scene: THREE.Scene) {
    this.ringMat = new THREE.MeshBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    this.fillMat = new THREE.MeshBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.targetMat = new THREE.MeshBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    // 1. Aro exterior del radio máximo alrededor del jugador
    const ringGeo = new THREE.RingGeometry(MAX_DROP_RADIUS - 0.05, MAX_DROP_RADIUS + 0.05, 64).rotateX(-Math.PI / 2);
    this.boundaryRing = new THREE.Mesh(ringGeo, this.ringMat);
    this.boundaryRing.position.y = 0.04;
    this.group.add(this.boundaryRing);

    // 2. Relleno suave del área permitida
    const fillGeo = new THREE.CircleGeometry(MAX_DROP_RADIUS, 64).rotateX(-Math.PI / 2);
    this.fillDisc = new THREE.Mesh(fillGeo, this.fillMat);
    this.fillDisc.position.y = 0.03;
    this.group.add(this.fillDisc);

    // 3. Retícula en el punto exacto de caída del arma
    const targetRingGeo = new THREE.RingGeometry(0.32, 0.44, 32).rotateX(-Math.PI / 2);
    this.targetRing = new THREE.Mesh(targetRingGeo, this.targetMat);
    this.targetRing.position.y = 0.06;
    this.group.add(this.targetRing);

    const targetDotGeo = new THREE.CircleGeometry(0.09, 16).rotateX(-Math.PI / 2);
    this.targetDot = new THREE.Mesh(targetDotGeo, this.targetMat);
    this.targetDot.position.y = 0.06;
    this.group.add(this.targetDot);

    this.group.visible = false;
    this.scene.add(this.group);
  }

  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }

  update(playerX: number, playerZ: number, targetX: number, targetZ: number, inRange: boolean, timeSec: number) {
    if (!this.group.visible) return;

    // Centrar rango alrededor del jugador
    this.boundaryRing.position.set(playerX, 0.04, playerZ);
    this.fillDisc.position.set(playerX, 0.03, playerZ);

    // Posicionar retícula en el punto de aterrizaje
    this.targetRing.position.set(targetX, 0.06, targetZ);
    this.targetDot.position.set(targetX, 0.06, targetZ);

    // Pulso animado
    const pulse = 1 + Math.sin(timeSec * 8) * 0.08;
    this.targetRing.scale.setScalar(pulse);

    // Ajustar color según si está en rango o fuera
    const color = inRange ? this.validColor : this.invalidColor;
    this.targetMat.color.copy(color);
    this.targetMat.opacity = inRange ? 0.9 : 0.6;
    this.ringMat.color.copy(inRange ? this.validColor : this.invalidColor);
    this.fillMat.color.copy(inRange ? this.validColor : this.invalidColor);
  }

  dispose() {
    this.scene.remove(this.group);
    this.boundaryRing.geometry.dispose();
    this.fillDisc.geometry.dispose();
    this.targetRing.geometry.dispose();
    this.targetDot.geometry.dispose();
    this.ringMat.dispose();
    this.fillMat.dispose();
    this.targetMat.dispose();
  }
}
