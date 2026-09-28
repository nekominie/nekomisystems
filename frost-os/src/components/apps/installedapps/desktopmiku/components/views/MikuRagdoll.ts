/**
 * MikuRagdoll — Motor de física ragdoll 2D para Desktop Miku en pantalla completa.
 *
 * La pantalla del escritorio es la "caja":
 * - Suelo: nivel superior de la barra de tareas (Taskbar).
 * - Pared izquierda: borde izquierdo del monitor.
 * - Pared derecha: borde derecho del monitor.
 * - Techo: borde superior del monitor.
 *
 * Miku puede interactuar libremente por todo el escritorio con físicas
 * de muñeca de trapo, colisionando con los límites reales de la pantalla.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const BODY_MASS = 1.2;
const LINEAR_DAMPING = 0.4;
const ANGULAR_DAMPING = 0.7;
const EXTREMITY_ANGULAR_DAMPING = 0.92;
const MAX_ANGULAR_VELOCITY = 10;
const MAX_LINEAR_VELOCITY = 20;

export interface DesktopBoxBounds {
  w: number;      // Ancho visible 3D de la pantalla
  h: number;      // Alto visible 3D de la pantalla
  floorY: number; // Altura 3D del suelo (barra de tareas)
}

interface BoneConfig {
  key: string;
  names: string[];
  radius: number;
}

const BONE_CONFIGS: BoneConfig[] = [
  { key: 'Hips', names: ['mixamorigHips', 'Hips_05', 'Hips', 'pelvis'], radius: 0.13 },
  { key: 'Spine', names: ['mixamorigSpine', 'Spine1_06', 'Spine'], radius: 0.09 },
  { key: 'Spine1', names: ['mixamorigSpine1', 'Spine2_072', 'Spine1'], radius: 0.09 },
  { key: 'Spine2', names: ['mixamorigSpine2', 'Chest_073', 'Chest', 'Spine2'], radius: 0.10 },
  { key: 'Neck', names: ['mixamorigNeck', 'Neck_077', 'Neck'], radius: 0.05 },
  { key: 'Head', names: ['mixamorigHead', 'Head_078', 'Head'], radius: 0.13 },

  { key: 'LeftShoulder', names: ['mixamorigLeftShoulder', 'Shoulder_Left_0122', 'LeftShoulder', 'Shoulder_L'], radius: 0.06 },
  { key: 'LeftArm', names: ['mixamorigLeftArm', 'Arm_Left_0123', 'LeftArm', 'Arm_L'], radius: 0.06 },
  { key: 'LeftForeArm', names: ['mixamorigLeftForeArm', 'ForeArm_Left_0124', 'LeftForeArm', 'ForeArm_L'], radius: 0.055 },
  { key: 'LeftHand', names: ['mixamorigLeftHand', 'Hand_Left_0125', 'LeftHand', 'Hand_L'], radius: 0.065 },

  { key: 'RightShoulder', names: ['mixamorigRightShoulder', 'Shoulder_Right_0147', 'RightShoulder', 'Shoulder_R'], radius: 0.06 },
  { key: 'RightArm', names: ['mixamorigRightArm', 'Arm_Right_0148', 'RightArm', 'Arm_R'], radius: 0.06 },
  { key: 'RightForeArm', names: ['mixamorigRightForeArm', 'ForeArm_Right_0149', 'RightForeArm', 'ForeArm_R'], radius: 0.055 },
  { key: 'RightHand', names: ['mixamorigRightHand', 'Hand_Right_0150', 'RightHand', 'Hand_R'], radius: 0.065 },

  { key: 'LeftUpLeg', names: ['mixamorigLeftUpLeg', 'UpLeg_Left_0177', 'LeftUpLeg', 'UpLeg_L', 'LeftThigh'], radius: 0.08 },
  { key: 'LeftLeg', names: ['mixamorigLeftLeg', 'Leg_Left_0178', 'LeftLeg', 'Leg_L', 'LeftShin'], radius: 0.07 },
  { key: 'LeftFoot', names: ['mixamorigLeftFoot', 'Foot_Left_0179', 'LeftFoot', 'Foot_L'], radius: 0.08 },

  { key: 'RightUpLeg', names: ['mixamorigRightUpLeg', 'UpLeg_Right_0183', 'RightUpLeg', 'UpLeg_R', 'RightThigh'], radius: 0.08 },
  { key: 'RightLeg', names: ['mixamorigRightLeg', 'Leg_Right_0184', 'RightLeg', 'Leg_R', 'RightShin'], radius: 0.07 },
  { key: 'RightFoot', names: ['mixamorigRightFoot', 'Foot_Right_0185', 'RightFoot', 'Foot_R'], radius: 0.08 },
];

const BONE_LINKS: [string, string][] = [
  ['Hips', 'Spine'],
  ['Spine', 'Spine1'],
  ['Spine1', 'Spine2'],
  ['Spine2', 'Neck'],
  ['Neck', 'Head'],
  ['Spine2', 'LeftShoulder'],
  ['LeftShoulder', 'LeftArm'],
  ['LeftArm', 'LeftForeArm'],
  ['LeftForeArm', 'LeftHand'],
  ['Spine2', 'RightShoulder'],
  ['RightShoulder', 'RightArm'],
  ['RightArm', 'RightForeArm'],
  ['RightForeArm', 'RightHand'],
  ['Hips', 'LeftUpLeg'],
  ['LeftUpLeg', 'LeftLeg'],
  ['LeftLeg', 'LeftFoot'],
  ['Hips', 'RightUpLeg'],
  ['RightUpLeg', 'RightLeg'],
  ['RightLeg', 'RightFoot'],
];

interface BoneEntry {
  key: string;
  body: CANNON.Body;
  bone: THREE.Bone;
  initialWorldPos: THREE.Vector3;
  initialWorldQuat: THREE.Quaternion;
  // Rotación LOCAL (relativa al padre) del hueso en el momento de construir
  // el ragdoll, es decir, su pose de reposo real (la de la animación idle),
  // no la bind pose del esqueleto. Se usa para restaurar el cuerpo tras
  // soltar el ragdoll sin depender de la orientación actual del modelo.
  initialLocalQuat: THREE.Quaternion;
}

export class MikuRagdoll {
  private world: CANNON.World;
  private boneBodies = new Map<string, BoneEntry>();
  private constraints: CANNON.Constraint[] = [];

  private model: THREE.Group;
  private skeleton: THREE.Skeleton;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;

  private armatureWorldQuat: THREE.Quaternion | null = null;

  // Límites del escritorio
  private bounds: DesktopBoxBounds = { w: 8, h: 4.5, floorY: 0.16 };
  private floorBody: CANNON.Body;
  private leftWallBody: CANNON.Body;
  private rightWallBody: CANNON.Body;
  private ceilingBody: CANNON.Body;

  // Arrastre con ratón
  private mouseBody: CANNON.Body | null = null;
  private mouseConstraint: CANNON.PointToPointConstraint | null = null;
  private draggedBody: CANNON.Body | null = null;
  private activePointerId: number | null = null;

  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();
  private planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private _onPointerDown: (e: PointerEvent) => void;
  private _onPointerMove: (e: PointerEvent) => void;
  private _onPointerUp: (e: PointerEvent) => void;

  private _built = false;
  private _interactionEnabled = false;

  // Callbacks para UI
  onGrabStart?: (boneName: string, clientX?: number, clientY?: number) => void;
  onPointerDrag?: (clientX: number, clientY: number) => void;
  onGrabEnd?: (clientX?: number, clientY?: number) => void;

  constructor(
    model: THREE.Group,
    skeleton: THREE.Skeleton,
    camera: THREE.PerspectiveCamera,
    canvas: HTMLCanvasElement,
  ) {
    this.model = model;
    this.skeleton = skeleton;
    this.camera = camera;
    this.canvas = canvas;

    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 22;
    (this.world.solver as CANNON.GSSolver).tolerance = 0.001;

    // ─── LÍMITES FÍSICOS DEL ESCRITORIO (PANTALLA COMPLETA) ────────────
    const planeShape = new CANNON.Plane();
    const wallMaterial = new CANNON.Material({ friction: 0.35, restitution: 0.15 });

    // Suelo (Barra de tareas)
    this.floorBody = new CANNON.Body({ mass: 0, shape: planeShape, material: wallMaterial });
    this.floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.floorBody.collisionFilterGroup = 1;
    this.floorBody.collisionFilterMask = 2;
    this.world.addBody(this.floorBody);

    // Pared izquierda (Borde izquierdo de la pantalla)
    this.leftWallBody = new CANNON.Body({ mass: 0, shape: planeShape, material: wallMaterial });
    this.leftWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    this.leftWallBody.collisionFilterGroup = 1;
    this.leftWallBody.collisionFilterMask = 2;
    this.world.addBody(this.leftWallBody);

    // Pared derecha (Borde derecho de la pantalla)
    this.rightWallBody = new CANNON.Body({ mass: 0, shape: planeShape, material: wallMaterial });
    this.rightWallBody.quaternion.setFromEuler(0, -Math.PI / 2, 0);
    this.rightWallBody.collisionFilterGroup = 1;
    this.rightWallBody.collisionFilterMask = 2;
    this.world.addBody(this.rightWallBody);

    // Techo (Borde superior de la pantalla)
    this.ceilingBody = new CANNON.Body({ mass: 0, shape: planeShape, material: wallMaterial });
    this.ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    this.ceilingBody.collisionFilterGroup = 1;
    this.ceilingBody.collisionFilterMask = 2;
    this.world.addBody(this.ceilingBody);

    this.updateWallPositions();

    this._onPointerDown = this.onPointerDown.bind(this);
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerUp = this.onPointerUp.bind(this);
  }

  /** Actualiza las dimensiones de la caja física cuando cambia el tamaño de pantalla */
  setBounds(bounds: DesktopBoxBounds): void {
    this.bounds = bounds;
    this.updateWallPositions();
  }

  private updateWallPositions(): void {
    const { w, h, floorY } = this.bounds;
    this.floorBody.position.set(0, floorY, 0);
    this.leftWallBody.position.set(-w / 2, 0, 0);
    this.rightWallBody.position.set(w / 2, 0, 0);
    this.ceilingBody.position.set(0, h, 0);
  }

  private findBone(names: string[]): THREE.Bone | undefined {
    for (const name of names) {
      const found = this.skeleton.bones.find((b) => b.name === name);
      if (found) return found;
    }
    for (const name of names) {
      const lower = name.toLowerCase();
      const found = this.skeleton.bones.find((b) => b.name.toLowerCase().includes(lower));
      if (found) return found;
    }
    return undefined;
  }

  /** Construye la jerarquía de cuerpos rígidos y constraints */
  build(): void {
    if (this._built) this.clearBodies();

    this.model.updateMatrixWorld(true);

    const hipsBone = this.findBone(['mixamorigHips', 'Hips_05', 'Hips']);
    if (!hipsBone) {
      console.warn('[MikuRagdoll] Hips bone not found in skeleton');
      return;
    }

    const armatureObj = hipsBone.parent;
    if (armatureObj) {
      this.armatureWorldQuat = new THREE.Quaternion();
      armatureObj.getWorldQuaternion(this.armatureWorldQuat);
    } else {
      this.armatureWorldQuat = new THREE.Quaternion();
    }

    // 1) Crear cuerpos rígidos para cada hueso configurado
    for (const cfg of BONE_CONFIGS) {
      const bone = this.findBone(cfg.names);
      if (!bone) continue;

      const bonePos = new THREE.Vector3();
      const boneQuat = new THREE.Quaternion();
      bone.getWorldPosition(bonePos);
      bone.getWorldQuaternion(boneQuat);

      const shape = new CANNON.Sphere(cfg.radius);
      const body = new CANNON.Body({
        mass: BODY_MASS,
        position: new CANNON.Vec3(bonePos.x, bonePos.y, bonePos.z),
        shape,
        material: new CANNON.Material({ friction: 0.35, restitution: 0.08 }),
      });
      body.quaternion.set(boneQuat.x, boneQuat.y, boneQuat.z, boneQuat.w);

      const isExtremity = /Hand|Foot|Head/.test(cfg.key);
      body.linearDamping = LINEAR_DAMPING;
      body.angularDamping = isExtremity ? EXTREMITY_ANGULAR_DAMPING : ANGULAR_DAMPING;

      // Restricción estricta al plano 2D
      body.linearFactor = new CANNON.Vec3(1, 1, 0);
      body.angularFactor = new CANNON.Vec3(0, 0, 1);

      body.collisionFilterGroup = 2;
      body.collisionFilterMask = 1 | 2;
      body.allowSleep = false;

      this.world.addBody(body);

      this.boneBodies.set(cfg.key, {
        key: cfg.key,
        body,
        bone,
        initialWorldPos: bonePos.clone(),
        initialWorldQuat: boneQuat.clone(),
        initialLocalQuat: bone.quaternion.clone(),
      });
    }

    // 2) Conectar los huesos con PointToPointConstraints
    for (const [aKey, bKey] of BONE_LINKS) {
      const a = this.boneBodies.get(aKey);
      const b = this.boneBodies.get(bKey);
      if (!a || !b) continue;

      const bPos = new THREE.Vector3();
      b.bone.getWorldPosition(bPos);

      const pivotA = this.worldToLocalPivot(bPos, a.body);
      const constraint = new CANNON.PointToPointConstraint(
        a.body,
        new CANNON.Vec3(pivotA.x, pivotA.y, pivotA.z),
        b.body,
        new CANNON.Vec3(0, 0, 0),
      );
      constraint.collideConnected = false;
      this.world.addConstraint(constraint);
      this.constraints.push(constraint);
    }

    this._built = true;
  }

  private clearBodies(): void {
    this.releaseDrag();
    for (const c of this.constraints) {
      this.world.removeConstraint(c);
    }
    this.constraints = [];
    this.boneBodies.forEach(({ body }) => this.world.removeBody(body));
    this.boneBodies.clear();
    this._built = false;
  }

  enableInteraction(): void {
    if (this._interactionEnabled) return;
    window.addEventListener('pointerdown', this._onPointerDown, { capture: true });
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    this._interactionEnabled = true;
  }

  disableInteraction(): void {
    if (!this._interactionEnabled) return;
    window.removeEventListener('pointerdown', this._onPointerDown, { capture: true });
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    this.releaseDrag();
    this._interactionEnabled = false;
  }

  update(delta: number): void {
    if (!this._built) return;

    this.world.step(1 / 60, Math.min(delta, 0.05), 3);
    this.clampVelocitiesAndLockZ();
    this.syncPhysicsToBones();
  }

  dispose(): void {
    this.disableInteraction();
    this.clearBodies();
  }

  get isGrabbing(): boolean {
    return this.activePointerId !== null;
  }

  get isBuilt(): boolean {
    return this._built;
  }

  private clampVelocitiesAndLockZ(): void {
    for (const body of this.world.bodies) {
      if (body.mass <= 0) continue;

      body.position.z = 0;
      body.velocity.z = 0;
      body.angularVelocity.x = 0;
      body.angularVelocity.y = 0;

      const av = body.angularVelocity.length();
      if (av > MAX_ANGULAR_VELOCITY) {
        body.angularVelocity.scale(MAX_ANGULAR_VELOCITY / av, body.angularVelocity);
      }
      const lv = body.velocity.length();
      if (lv > MAX_LINEAR_VELOCITY) {
        body.velocity.scale(MAX_LINEAR_VELOCITY / lv, body.velocity);
      }
    }
  }

  private syncPhysicsToBones(): void {
    if (!this.armatureWorldQuat || this.boneBodies.size === 0) return;

    const armatureQuatInv = this.armatureWorldQuat.clone().invert();
    const targetWorldQuats = new Map<string, THREE.Quaternion>();

    this.boneBodies.forEach(({ body, bone }) => {
      const wq = new THREE.Quaternion(
        body.quaternion.x,
        body.quaternion.y,
        body.quaternion.z,
        body.quaternion.w,
      );
      targetWorldQuats.set(bone.uuid, wq);
    });

    this.skeleton.bones.forEach((bone) => {
      const worldQuat = targetWorldQuats.get(bone.uuid);
      if (!worldQuat) return;

      const localQuat = worldQuat.clone();
      if (bone.parent) {
        const parentWorldQuat = new THREE.Quaternion();
        bone.parent.getWorldQuaternion(parentWorldQuat);
        localQuat.premultiply(parentWorldQuat.clone().invert());
      } else {
        localQuat.premultiply(armatureQuatInv);
      }
      bone.quaternion.copy(localQuat);
    });

    this.skeleton.update();
    this.model.updateMatrixWorld(true);

    const hipsEntry = this.boneBodies.get('Hips');
    if (hipsEntry) {
      const targetHipsWorld = new THREE.Vector3(
        hipsEntry.body.position.x,
        hipsEntry.body.position.y,
        0,
      );
      const currentHipsWorld = new THREE.Vector3();
      hipsEntry.bone.getWorldPosition(currentHipsWorld);

      const posDelta = targetHipsWorld.sub(currentHipsWorld);
      posDelta.z = 0;
      this.model.position.add(posDelta);
      this.model.updateMatrixWorld(true);
    }
  }

  private updatePointerNDC(e: PointerEvent): void {
    this.pointerNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.pointerNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  private pickTarget(): { body: CANNON.Body; point: THREE.Vector3; boneName: string } | null {
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    let hitPoint: THREE.Vector3 | null = null;
    let hitBoneName = 'Hips';

    // 1) Intersección directa contra la malla visible de Miku
    const intersections = this.raycaster.intersectObject(this.model, true);
    if (intersections.length > 0) {
      hitPoint = intersections[0].point.clone();
      hitPoint.z = 0;
    }

    // 2) Fallback robusto: intersección del rayo con el plano Z=0 y distancia a los huesos Cannon
    if (!hitPoint) {
      const rayPlanePoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.planeZ, rayPlanePoint)) {
        let bestBone: CANNON.Body | null = null;
        let bestDist = Infinity;
        let bestKey = 'Hips';

        this.boneBodies.forEach(({ body, key }) => {
          const cfg = BONE_CONFIGS.find(c => c.key === key);
          const maxRadius = (cfg ? cfg.radius : 0.12) * 1.8;
          const dist = Math.hypot(body.position.x - rayPlanePoint.x, body.position.y - rayPlanePoint.y);
          if (dist <= maxRadius && dist < bestDist) {
            bestDist = dist;
            bestBone = body;
            bestKey = key;
          }
        });

        if (bestBone) {
          return { body: bestBone, point: rayPlanePoint, boneName: bestKey };
        }
      }
      return null;
    }

    let nearestBody: CANNON.Body | null = null;
    let nearestDist = Infinity;

    this.boneBodies.forEach(({ body, key }) => {
      const bodyPos = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
      const dist = bodyPos.distanceTo(hitPoint!);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestBody = body;
        hitBoneName = key;
      }
    });

    if (!nearestBody) return null;
    return { body: nearestBody, point: hitPoint, boneName: hitBoneName };
  }

  private worldToLocalPivot(point: THREE.Vector3, body: CANNON.Body): THREE.Vector3 {
    const bodyPos = new THREE.Vector3(body.position.x, body.position.y, body.position.z);
    const bodyQuat = new THREE.Quaternion(
      body.quaternion.x,
      body.quaternion.y,
      body.quaternion.z,
      body.quaternion.w,
    );
    return point.clone().sub(bodyPos).applyQuaternion(bodyQuat.clone().invert());
  }

  /**
   * Restaura SOLO los huesos que el ragdoll controla (torso, brazos,
   * piernas y cabeza) a su rotación de reposo original, capturada la
   * primera vez que se construyó el ragdoll (pose idle real del modelo).
   *
   * A propósito NO usa `THREE.Skeleton.pose()`, ya que ese método resetea
   * TODO el esqueleto (incluido el flequillo/copete, cabello y falda) a la
   * pose de "bind" del skinning, la cual puede no coincidir con la pose de
   * reposo real usada por las animaciones. Ese desajuste era la causa de
   * que el copete quedara enterrado en la frente de forma permanente en
   * cuanto se activaba el ragdoll una vez: ningún clip de animación vuelve
   * a tocar esos huesos cosméticos, así que el error nunca se corregía.
   *
   * Al operar puramente en espacio LOCAL (rotación relativa al hueso
   * padre), este reset es además independiente de cualquier rotación que
   * tenga el modelo completo (p. ej. al voltear la dirección al caminar).
   */
  resetTrackedBonesToRestPose(): void {
    this.boneBodies.forEach(({ bone, initialLocalQuat }) => {
      bone.quaternion.copy(initialLocalQuat);
    });
    this.skeleton.update();
    this.model.updateMatrixWorld(true);
  }

  syncBonesToPhysics(): void {
    if (!this._built) {
      this.build();
      return;
    }
    this.model.updateMatrixWorld(true);

    const hipsBone = this.findBone(['mixamorigHips', 'Hips_05', 'Hips']);
    if (hipsBone && hipsBone.parent && this.armatureWorldQuat) {
      hipsBone.parent.getWorldQuaternion(this.armatureWorldQuat);
    }

    for (const entry of this.boneBodies.values()) {
      const bonePos = new THREE.Vector3();
      const boneQuat = new THREE.Quaternion();
      entry.bone.getWorldPosition(bonePos);
      entry.bone.getWorldQuaternion(boneQuat);

      entry.body.position.set(bonePos.x, bonePos.y, 0);
      entry.body.quaternion.set(boneQuat.x, boneQuat.y, boneQuat.z, boneQuat.w);
      entry.body.velocity.set(0, 0, 0);
      entry.body.angularVelocity.set(0, 0, 0);
      entry.body.wakeUp();
    }
  }

  // ─── Handlers del cursor ──────────────────────────────────────────
  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    if (this.activePointerId !== null) return;

    // Ignorar si el clic fue en botones flotantes, ventanas del SO o barra de tareas
    const target = e.target as HTMLElement | null;
    if (target && target.closest('.miku-floating-tools, button, input, textarea, select, .btn, .window-frame, .taskbar')) {
      return;
    }

    if (!this._built) this.build();

    this.updatePointerNDC(e);
    const picked = this.pickTarget();
    if (!picked) {
      // El clic no tocó a Miku -> permitir que interactúe con el escritorio o iconos
      return;
    }

    // El clic tocó a Miku -> capturar interacción
    e.preventDefault();
    e.stopPropagation();

    this.canvas.style.pointerEvents = 'auto';
    this.activePointerId = e.pointerId;

    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }

    this.syncBonesToPhysics();

    const { body, point, boneName } = picked;
    this.draggedBody = body;

    const pointerBody = new CANNON.Body({
      mass: 0,
      type: CANNON.Body.KINEMATIC,
      position: new CANNON.Vec3(point.x, point.y, 0),
      shape: new CANNON.Sphere(0.02),
      collisionFilterGroup: 0,
      collisionFilterMask: 0,
    });
    this.world.addBody(pointerBody);
    this.mouseBody = pointerBody;

    const pivot = this.worldToLocalPivot(point, body);
    const constraint = new CANNON.PointToPointConstraint(
      body,
      new CANNON.Vec3(pivot.x, pivot.y, pivot.z),
      pointerBody,
      new CANNON.Vec3(0, 0, 0),
    );
    constraint.collideConnected = false;
    this.world.addConstraint(constraint);
    this.mouseConstraint = constraint;

    body.wakeUp();
    this.onGrabStart?.(boneName, e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.activePointerId !== e.pointerId) return;
    if (!this.mouseBody) return;

    this.updatePointerNDC(e);
    this.raycaster.setFromCamera(this.pointerNDC, this.camera);

    const targetPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.planeZ, targetPoint)) {
      // Clampear para que el punto de arrastre nunca supere los límites de la pantalla
      const halfW = this.bounds.w / 2 - 0.2;
      const maxY = this.bounds.h - 0.2;
      const minY = this.bounds.floorY + 0.1;

      const clampedX = Math.max(-halfW, Math.min(halfW, targetPoint.x));
      const clampedY = Math.max(minY, Math.min(maxY, targetPoint.y));

      this.mouseBody.position.set(clampedX, clampedY, 0);
      this.mouseBody.wakeUp();
      if (this.draggedBody) {
        this.draggedBody.wakeUp();
      }
    }

    this.onPointerDrag?.(e.clientX, e.clientY);
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.activePointerId !== e.pointerId) return;
    this.activePointerId = null;

    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }

    this.canvas.style.pointerEvents = 'none';

    this.releaseDrag();
    this.onGrabEnd?.(e.clientX, e.clientY);
  }

  private releaseDrag(): void {
    if (this.mouseConstraint) {
      this.world.removeConstraint(this.mouseConstraint);
      this.mouseConstraint = null;
    }
    if (this.mouseBody) {
      this.world.removeBody(this.mouseBody);
      this.mouseBody = null;
    }
    this.draggedBody = null;
  }
}
