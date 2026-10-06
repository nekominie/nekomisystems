import * as THREE from 'three';
import { SHAPE_TONES, SandboxWorld, type ShapeType } from './sandboxPhysics';
import { buildDecor, isDecorType } from './sandboxDecor';
import { buildMachine } from './sandboxMachines';
import type { BallSkin } from '../types/game';

/**
 * 3D Holographic Drag Preview System for Sandbox Mode.
 * Renders a glowing translucent ghost mesh with edge wireframes,
 * a ground projection landing ring, and a vertical alignment beam.
 */
export class SandboxDragPreview {
  private scene: THREE.Scene;
  public group: THREE.Group;
  
  private currentShapeMesh: THREE.Object3D | null = null;
  private groundRing: THREE.Mesh;
  private groundDot: THREE.Mesh;
  private guideLine: THREE.Line;
  
  private hologramMaterial: THREE.MeshStandardMaterial;
  private edgeMaterial: THREE.LineBasicMaterial;
  
  private currentKey: string = '';
  public lastDropPosition: THREE.Vector3 = new THREE.Vector3(0, 1.2, 0);
  public isVisible: boolean = false;
  private currentYOffset: number = 0.8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.visible = false;

    // 1. Hologram Glass/Glow Material
    this.hologramMaterial = new THREE.MeshStandardMaterial({
      color: 0x0df0d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    // 2. High-Tech Wireframe Edge Material
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.9,
      linewidth: 1.5,
      depthWrite: false,
    });

    // 3. Ground Landing Projection Ring (Floor Decal)
    const ringGeo = new THREE.RingGeometry(0.7, 0.85, 36);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0df0d4,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.groundRing = new THREE.Mesh(ringGeo, ringMat);
    this.groundRing.position.set(0, 0.02, 0);
    this.group.add(this.groundRing);

    // Center pulse dot
    const dotGeo = new THREE.CircleGeometry(0.12, 16);
    dotGeo.rotateX(-Math.PI / 2);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.groundDot = new THREE.Mesh(dotGeo, dotMat);
    this.groundDot.position.set(0, 0.025, 0);
    this.group.add(this.groundDot);

    // 4. Vertical Dashed Drop Guideline
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.03, 0),
      new THREE.Vector3(0, 2.5, 0),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x0df0d4,
      dashSize: 0.12,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.guideLine = new THREE.Line(lineGeo, lineMat);
    this.guideLine.computeLineDistances();
    this.group.add(this.guideLine);

    this.scene.add(this.group);
  }

  /**
   * Updates or builds the preview 3D mesh when shape or ball changes
   */
  public setPreviewTarget(kind: 'shape' | 'ball', shapeType?: ShapeType, skin?: BallSkin) {
    const key = kind === 'shape' ? `shape_${shapeType}` : `ball_${skin?.id}`;
    if (key === this.currentKey && this.currentShapeMesh) {
      return;
    }

    this.currentKey = key;

    // Clean old mesh
    if (this.currentShapeMesh) {
      this.group.remove(this.currentShapeMesh);
      this.disposeObject(this.currentShapeMesh);
      this.currentShapeMesh = null;
    }

    if (kind === 'shape' && shapeType) {
      this.buildShapeMesh(shapeType);
    } else if (kind === 'ball' && skin) {
      this.buildBallMesh(skin);
    }
  }

  private buildShapeMesh(type: ShapeType) {
    const tone = SHAPE_TONES[type];
    if (tone) {
      this.hologramMaterial.color.setHex(tone.color);
      this.hologramMaterial.emissive.setHex(tone.color);
      this.edgeMaterial.color.setHex(tone.color);
      (this.groundRing.material as THREE.MeshBasicMaterial).color.setHex(tone.color);
      (this.guideLine.material as THREE.LineDashedMaterial).color.setHex(tone.color);
    }
    let mesh: THREE.Object3D;

    switch (type) {
      case 'cube': {
        this.currentYOffset = 0.8;
        const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const m = new THREE.Mesh(geo, this.hologramMaterial);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMaterial);
        m.add(edges);
        m.position.set(0, this.currentYOffset, 0);
        mesh = m;
        this.groundRing.scale.set(1.4, 1.4, 1.4);
        break;
      }

      case 'beam': {
        this.currentYOffset = 0.225;
        const geo = new THREE.BoxGeometry(3.6, 0.45, 0.9);
        const m = new THREE.Mesh(geo, this.hologramMaterial);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMaterial);
        m.add(edges);
        m.position.set(0, this.currentYOffset, 0);
        mesh = m;
        this.groundRing.scale.set(2.4, 2.4, 2.4);
        break;
      }

      case 'cylinder': {
        this.currentYOffset = 1.1;
        const geo = new THREE.CylinderGeometry(0.65, 0.65, 2.2, 32);
        const m = new THREE.Mesh(geo, this.hologramMaterial);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 20), this.edgeMaterial);
        m.add(edges);
        m.position.set(0, this.currentYOffset, 0);
        mesh = m;
        this.groundRing.scale.set(1.1, 1.1, 1.1);
        break;
      }

      case 'ramp': {
        this.currentYOffset = 0.75;
        const wedgeShape = new THREE.Shape();
        wedgeShape.moveTo(0, 0);
        wedgeShape.lineTo(3.2, 0);
        wedgeShape.lineTo(3.2, 1.5);
        wedgeShape.closePath();

        const extrudeSettings = { depth: 1.4, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(wedgeShape, extrudeSettings);
        geo.center();

        const m = new THREE.Mesh(geo, this.hologramMaterial);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), this.edgeMaterial);
        m.add(edges);
        m.position.set(0, this.currentYOffset, 0);
        mesh = m;
        this.groundRing.scale.set(2.0, 2.0, 2.0);
        break;
      }

      case 'arch': {
        this.currentYOffset = 1.2;
        const group = new THREE.Group();

        // Pillars
        const pillarGeo = new THREE.BoxGeometry(0.5, 2.4, 0.7);
        const leftP = new THREE.Mesh(pillarGeo, this.hologramMaterial);
        leftP.position.set(-1.1, 0, 0);
        leftP.add(new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), this.edgeMaterial));
        group.add(leftP);

        const rightP = new THREE.Mesh(pillarGeo, this.hologramMaterial);
        rightP.position.set(1.1, 0, 0);
        rightP.add(new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), this.edgeMaterial));
        group.add(rightP);

        // Lintel
        const topGeo = new THREE.BoxGeometry(2.7, 0.5, 0.7);
        const topM = new THREE.Mesh(topGeo, this.hologramMaterial);
        topM.position.set(0, 1.45, 0);
        topM.add(new THREE.LineSegments(new THREE.EdgesGeometry(topGeo), this.edgeMaterial));
        group.add(topM);

        group.position.set(0, this.currentYOffset, 0);
        mesh = group;
        this.groundRing.scale.set(1.8, 1.8, 1.8);
        break;
      }

      case 'pipe': {
        this.currentYOffset = 1.0;
        const pipeGeo = new THREE.CylinderGeometry(1.0, 1.0, 3.0, 32, 1, true);
        const pipeMat = new THREE.MeshStandardMaterial({
          color: 0x0df0d4,
          emissive: 0x06b6d4,
          emissiveIntensity: 0.6,
          roughness: 0.2,
          metalness: 0.1,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
        const m = new THREE.Mesh(pipeGeo, pipeMat);
        m.rotation.z = Math.PI / 2;
        m.add(new THREE.LineSegments(new THREE.EdgesGeometry(pipeGeo, 20), this.edgeMaterial));
        m.position.set(0, this.currentYOffset, 0);
        mesh = m;
        this.groundRing.scale.set(2.0, 2.0, 2.0);
        break;
      }

      case 'slide_straight': {
        this.currentYOffset = 0.09;
        const group = new THREE.Group();
        const length = 4.0;
        const channelWidth = 0.95;
        const floorThick = 0.18;
        const railHeight = 0.46;
        const railThick = 0.22;

        const fGeo = new THREE.BoxGeometry(length, floorThick, channelWidth);
        const fMesh = new THREE.Mesh(fGeo, this.hologramMaterial);
        fMesh.position.set(0, floorThick / 2, 0);
        fMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(fGeo), this.edgeMaterial));
        group.add(fMesh);

        const lGeo = new THREE.BoxGeometry(length, railHeight, railThick);
        const lMesh = new THREE.Mesh(lGeo, this.hologramMaterial);
        lMesh.position.set(0, railHeight / 2, -(channelWidth / 2 + railThick / 2));
        lMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(lGeo), this.edgeMaterial));
        group.add(lMesh);

        const rGeo = new THREE.BoxGeometry(length, railHeight, railThick);
        const rMesh = new THREE.Mesh(rGeo, this.hologramMaterial);
        rMesh.position.set(0, railHeight / 2, channelWidth / 2 + railThick / 2);
        rMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(rGeo), this.edgeMaterial));
        group.add(rMesh);

        mesh = group;
        this.groundRing.scale.set(2.4, 2.4, 2.4);
        break;
      }

      case 'slide_u': {
        this.currentYOffset = 0.09;
        mesh = this.buildCurvedChutePreview(Math.PI, 0);
        this.groundRing.scale.set(2.6, 2.6, 2.6);
        break;
      }

      case 'slide_u_drop': {
        this.currentYOffset = 0.09;
        mesh = this.buildCurvedChutePreview(Math.PI, 1.6);
        this.groundRing.scale.set(2.6, 2.6, 2.6);
        break;
      }

      case 'slide_quarter': {
        this.currentYOffset = 0.09;
        mesh = this.buildCurvedChutePreview(Math.PI / 2, 0);
        this.groundRing.scale.set(2.2, 2.2, 2.2);
        break;
      }

      case 'spinner_wheel': {
        this.currentYOffset = 0.0;
        const group = new THREE.Group();

        // Base Plate
        const baseGeo = new THREE.BoxGeometry(1.6, 0.2, 1.4);
        const baseMesh = new THREE.Mesh(baseGeo, this.hologramMaterial);
        baseMesh.position.set(0, 0.1, 0);
        baseMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), this.edgeMaterial));
        group.add(baseMesh);

        // Pillars
        const pillarGeo = new THREE.BoxGeometry(0.26, 2.2, 0.26);
        const leftP = new THREE.Mesh(pillarGeo, this.hologramMaterial);
        leftP.position.set(0, 1.1, -0.6);
        leftP.add(new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), this.edgeMaterial));
        group.add(leftP);

        const rightP = new THREE.Mesh(pillarGeo, this.hologramMaterial);
        rightP.position.set(0, 1.1, 0.6);
        rightP.add(new THREE.LineSegments(new THREE.EdgesGeometry(pillarGeo), this.edgeMaterial));
        group.add(rightP);

        // Rotor
        const rotorGroup = new THREE.Group();
        rotorGroup.position.set(0, 2.0, 0);

        const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.35, 16);
        hubGeo.rotateX(Math.PI / 2);
        const hubMesh = new THREE.Mesh(hubGeo, this.hologramMaterial);
        hubMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(hubGeo), this.edgeMaterial));
        rotorGroup.add(hubMesh);

        for (let k = 0; k < 4; k++) {
          const phi = k * (Math.PI / 2);
          const armGroup = new THREE.Group();
          armGroup.rotation.z = phi;

          const armGeo = new THREE.BoxGeometry(0.56, 0.08, 0.14);
          const armM = new THREE.Mesh(armGeo, this.hologramMaterial);
          armM.position.set(0.42, 0, 0);
          armM.add(new THREE.LineSegments(new THREE.EdgesGeometry(armGeo), this.edgeMaterial));
          armGroup.add(armM);

          const scoopGeo = new THREE.BoxGeometry(0.32, 0.06, 0.44);
          const scoopM = new THREE.Mesh(scoopGeo, this.hologramMaterial);
          scoopM.position.set(0.82, 0, 0);
          scoopM.add(new THREE.LineSegments(new THREE.EdgesGeometry(scoopGeo), this.edgeMaterial));
          armGroup.add(scoopM);

          const lipGeo = new THREE.BoxGeometry(0.06, 0.22, 0.44);
          const lipM = new THREE.Mesh(lipGeo, this.hologramMaterial);
          lipM.position.set(0.82, 0.12, 0);
          lipM.add(new THREE.LineSegments(new THREE.EdgesGeometry(lipGeo), this.edgeMaterial));
          armGroup.add(lipM);

          rotorGroup.add(armGroup);
        }

        group.add(rotorGroup);
        mesh = group;
        this.groundRing.scale.set(2.2, 2.2, 2.2);
        break;
      }

      case 'escalator':
      case 'ball_lift': {
        // Same model as the real machine, rendered as a hologram
        this.currentYOffset = 0;
        const built = buildMachine(type, { body: this.hologramMaterial, preview: true });
        const meshes: THREE.Mesh[] = [];
        built.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
        });
        for (const m of meshes) {
          m.castShadow = false;
          m.receiveShadow = false;
          m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), this.edgeMaterial));
        }
        mesh = built.group;
        this.groundRing.scale.set(built.footprint, built.footprint, built.footprint);
        break;
      }

      default: {
        if (isDecorType(type)) {
          // Decoration: same model as the real piece, rendered as a hologram (no lights)
          this.currentYOffset = 0;
          const built = buildDecor(type, { lights: false });
          const meshes: THREE.Mesh[] = [];
          built.group.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
          });
          for (const m of meshes) {
            m.material = this.hologramMaterial;
            m.castShadow = false;
            m.receiveShadow = false;
            m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), this.edgeMaterial));
          }
          mesh = built.group;
          const s = Math.max(0.6, built.footprint);
          this.groundRing.scale.set(s, s, s);
          break;
        }
        this.currentYOffset = 0.8;
        const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
        const m = new THREE.Mesh(geo, this.hologramMaterial);
        m.position.set(0, this.currentYOffset, 0);
        mesh = m;
      }
    }

    this.currentShapeMesh = mesh;
    this.group.add(mesh);
    this.updateGuideLine();
  }

  private buildCurvedChutePreview(angleRad: number, dropHeight: number): THREE.Group {
    // Same swept channel as the real piece, rendered as a hologram
    const group = new THREE.Group();
    const params = SandboxWorld.getChuteParams(angleRad, dropHeight);
    const geo = SandboxWorld.buildChuteGeometry({ angleRad, dropHeight, ...params });
    const mesh = new THREE.Mesh(geo, this.hologramMaterial);
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), this.edgeMaterial));
    group.add(mesh);
    return group;
  }

  private buildBallMesh(skin: BallSkin) {
    this.edgeMaterial.color.setHex(0x67e8f9);
    (this.groundRing.material as THREE.MeshBasicMaterial).color.setHex(0x0df0d4);
    (this.guideLine.material as THREE.LineDashedMaterial).color.setHex(0x0df0d4);
    this.currentYOffset = 3.5; // Hover height before drop
    const radius = 0.32;
    const geo = new THREE.SphereGeometry(radius, 32, 32);

    const ballMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(skin.color),
      metalness: skin.metalness,
      roughness: skin.roughness,
      clearcoat: 1.0,
      transmission: skin.transmission ?? 0.3,
      emissive: skin.emissive ? new THREE.Color(skin.emissive) : new THREE.Color(0x0df0d4),
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, ballMat);
    mesh.position.set(0, this.currentYOffset, 0);

    // Subtle equatorial glow halo
    const haloGeo = new THREE.RingGeometry(0.34, 0.38, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotateX(Math.PI / 2);
    mesh.add(halo);

    this.groundRing.scale.set(0.65, 0.65, 0.65);
    this.currentShapeMesh = mesh;
    this.group.add(mesh);
    this.updateGuideLine();
  }

  public get spawnHeight(): number {
    return this.currentYOffset;
  }

  public adjustHeight(deltaY: number): number {
    const step = 0.3;
    const change = deltaY < 0 ? step : -step;
    this.currentYOffset = Math.max(0.4, Math.min(18.0, Math.round((this.currentYOffset + change) * 100) / 100));

    if (this.currentShapeMesh) {
      this.currentShapeMesh.position.y = this.currentYOffset;
    }

    this.updateGuideLine();
    this.lastDropPosition.y = this.group.position.y + this.currentYOffset;
    return this.currentYOffset;
  }

  public updateGuideLine() {
    const points = [
      new THREE.Vector3(0, 0.03, 0),
      new THREE.Vector3(0, Math.max(0.05, this.currentYOffset), 0),
    ];
    this.guideLine.geometry.dispose();
    this.guideLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.guideLine.computeLineDistances();
  }

  /**
   * Projects cursor screen coordinates to world coordinates onto the platform or existing items
   */
  public updatePositionFromScreen(
    screenX: number,
    screenY: number,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
    sandboxWorld: SandboxWorld,
    snap: boolean = false
  ) {
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((screenX - rect.left) / rect.width) * 2 - 1,
      -((screenY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);

    // 1. Check intersection with platform and existing meshes
    const meshesToTest: THREE.Object3D[] = [];
    if (sandboxWorld.platformMesh) {
      meshesToTest.push(sandboxWorld.platformMesh);
    }
    sandboxWorld.items.forEach((item) => {
      if (item.mesh instanceof THREE.Group) {
        meshesToTest.push(...item.mesh.children);
      } else {
        meshesToTest.push(item.mesh);
      }
    });

    const intersects = raycaster.intersectObjects(meshesToTest, false);
    let worldHitPoint: THREE.Vector3 | null = null;

    if (intersects.length > 0) {
      worldHitPoint = intersects[0].point;
    } else {
      // Intersect virtual plane at y = 0
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const hit = new THREE.Vector3();
      if (raycaster.ray.intersectPlane(groundPlane, hit)) {
        worldHitPoint = hit;
      }
    }

    if (!worldHitPoint) {
      this.hide();
      return;
    }

    // Clamp within platform radius bounds or wide bounds if infinite
    const isInf = sandboxWorld.platformConfig?.isInfinite ?? false;
    const halfW = isInf ? 400 : Math.max(1, ((sandboxWorld.platformConfig?.width ?? 18) / 2) - 0.4);
    const halfD = isInf ? 400 : Math.max(1, ((sandboxWorld.platformConfig?.depth ?? 18) / 2) - 0.4);
    const clampedX = Math.max(-halfW, Math.min(halfW, worldHitPoint.x));
    const clampedZ = Math.max(-halfD, Math.min(halfD, worldHitPoint.z));
    let finalX = clampedX;
    let finalZ = clampedZ;
    let finalY = Math.max(0, worldHitPoint.y);

    if (snap) {
      finalX = Math.round(finalX * 2) / 2;
      finalZ = Math.round(finalZ * 2) / 2;
    }

    // Set group position on ground landing spot
    this.group.position.set(finalX, finalY, finalZ);
    this.lastDropPosition.set(finalX, finalY + this.currentYOffset, finalZ);

    this.show();
  }

  public show() {
    this.isVisible = true;
    this.group.visible = true;
  }

  public hide() {
    this.isVisible = false;
    this.group.visible = false;
  }

  /**
   * Animation tick to pulse the ground ring and hologram emissive
   */
  public animate(elapsedTime: number) {
    if (!this.isVisible) return;

    // Pulse ground ring opacity and scale slightly
    const pulse = 0.5 + Math.sin(elapsedTime * 6) * 0.15;
    (this.groundRing.material as THREE.MeshBasicMaterial).opacity = 0.65 + pulse * 0.3;
    (this.groundDot.material as THREE.MeshBasicMaterial).opacity = 0.8 + Math.sin(elapsedTime * 8) * 0.2;

    // Hologram material subtle breathing glow
    this.hologramMaterial.emissiveIntensity = 0.6 + Math.sin(elapsedTime * 4) * 0.25;

    // If shape is a ball, gentle bob
    if (this.currentKey.startsWith('ball_') && this.currentShapeMesh) {
      this.currentShapeMesh.position.y = this.currentYOffset + Math.sin(elapsedTime * 5) * 0.08;
    }
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine) {
        const m = child as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      }
    });
  }

  public dispose() {
    this.hide();
    this.scene.remove(this.group);
    if (this.currentShapeMesh) {
      this.disposeObject(this.currentShapeMesh);
    }
    this.groundRing.geometry.dispose();
    (this.groundRing.material as THREE.Material).dispose();
    this.groundDot.geometry.dispose();
    (this.groundDot.material as THREE.Material).dispose();
    this.guideLine.geometry.dispose();
    (this.guideLine.material as THREE.Material).dispose();
    this.hologramMaterial.dispose();
    this.edgeMaterial.dispose();
  }
}
