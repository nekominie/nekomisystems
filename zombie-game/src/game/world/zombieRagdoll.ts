import * as THREE from 'three';
import * as CANNON from 'cannon-es';

interface BoneConfig {
  key: string;
  names: string[];
  radius: number;
  mass: number;
}

const BONE_CONFIGS: BoneConfig[] = [
  { key: 'Hips', names: ['mixamorigHips', 'Hips_05', 'Hips', 'pelvis'], radius: 0.14, mass: 2.5 },
  { key: 'Spine', names: ['mixamorigSpine', 'Spine1_06', 'Spine'], radius: 0.10, mass: 1.4 },
  { key: 'Spine1', names: ['mixamorigSpine1', 'Spine2_072', 'Spine1'], radius: 0.10, mass: 1.4 },
  { key: 'Spine2', names: ['mixamorigSpine2', 'Chest_073', 'Chest', 'Spine2'], radius: 0.11, mass: 1.6 },
  { key: 'Head', names: ['mixamorigHead', 'Head_078', 'Head'], radius: 0.13, mass: 1.2 },

  { key: 'LeftArm', names: ['mixamorigLeftArm', 'Arm_Left_0123', 'LeftArm', 'Arm_L'], radius: 0.065, mass: 0.8 },
  { key: 'LeftForeArm', names: ['mixamorigLeftForeArm', 'ForeArm_Left_0124', 'LeftForeArm', 'ForeArm_L'], radius: 0.055, mass: 0.6 },
  { key: 'RightArm', names: ['mixamorigRightArm', 'Arm_Right_0148', 'RightArm', 'Arm_R'], radius: 0.065, mass: 0.8 },
  { key: 'RightForeArm', names: ['mixamorigRightForeArm', 'ForeArm_Right_0149', 'RightForeArm', 'ForeArm_R'], radius: 0.055, mass: 0.6 },

  { key: 'LeftUpLeg', names: ['mixamorigLeftUpLeg', 'UpLeg_Left_0177', 'LeftUpLeg', 'UpLeg_L', 'LeftThigh'], radius: 0.085, mass: 1.6 },
  { key: 'LeftLeg', names: ['mixamorigLeftLeg', 'Leg_Left_0178', 'LeftLeg', 'Leg_L', 'LeftShin'], radius: 0.075, mass: 1.1 },
  { key: 'RightUpLeg', names: ['mixamorigRightUpLeg', 'UpLeg_Right_0183', 'RightUpLeg', 'UpLeg_R', 'RightThigh'], radius: 0.085, mass: 1.6 },
  { key: 'RightLeg', names: ['mixamorigRightLeg', 'Leg_Right_0184', 'RightLeg', 'Leg_R', 'RightShin'], radius: 0.075, mass: 1.1 },
];

const BONE_LINKS: [string, string][] = [
  ['Hips', 'Spine'],
  ['Spine', 'Spine1'],
  ['Spine1', 'Spine2'],
  ['Spine2', 'Head'],
  ['Spine2', 'LeftArm'],
  ['LeftArm', 'LeftForeArm'],
  ['Spine2', 'RightArm'],
  ['RightArm', 'RightForeArm'],
  ['Hips', 'LeftUpLeg'],
  ['LeftUpLeg', 'LeftLeg'],
  ['Hips', 'RightUpLeg'],
  ['RightUpLeg', 'RightLeg'],
];

interface BoneEntry {
  key: string;
  body: CANNON.Body;
  bone: THREE.Bone;
}

/**
 * Instancia de muñeca de trapo (Ragdoll) en 3D para un zombi.
 * Inspirado en MikuRagdoll.ts de desktopmiku, adaptado a espacio 3D completo.
 */
export class ZombieRagdoll {
  private boneBodies = new Map<string, BoneEntry>();
  private constraints: CANNON.Constraint[] = [];
  private armatureWorldQuat: THREE.Quaternion | null = null;
  private settled = false;
  private lifeTime = 0;
  private isDisposed = false;

  constructor(
    private world: CANNON.World,
    private model: THREE.Object3D,
    private skeleton: THREE.Skeleton,
    impulse?: THREE.Vector3,
    tumble?: number,
  ) {
    this.build(impulse, tumble);
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

  private build(impulse?: THREE.Vector3, tumble?: number) {
    this.model.updateMatrixWorld(true);

    const hipsBone = this.findBone(['mixamorigHips', 'Hips_05', 'Hips']);
    if (!hipsBone) {
      console.warn('[ZombieRagdoll] No se encontró el hueso Hips');
      return;
    }

    const armatureObj = hipsBone.parent;
    this.armatureWorldQuat = new THREE.Quaternion();
    if (armatureObj) {
      armatureObj.getWorldQuaternion(this.armatureWorldQuat);
    }

    const ragdollMat = new CANNON.Material({ friction: 0.5, restitution: 0.15 });

    // 1) Crear cuerpos rígidos 3D por cada hueso
    for (const cfg of BONE_CONFIGS) {
      const bone = this.findBone(cfg.names);
      if (!bone) continue;

      const bonePos = new THREE.Vector3();
      const boneQuat = new THREE.Quaternion();
      bone.getWorldPosition(bonePos);
      bone.getWorldQuaternion(boneQuat);

      const shape = new CANNON.Sphere(cfg.radius);
      const body = new CANNON.Body({
        mass: cfg.mass,
        position: new CANNON.Vec3(bonePos.x, Math.max(0.1, bonePos.y), bonePos.z),
        shape,
        material: ragdollMat,
      });
      body.quaternion.set(boneQuat.x, boneQuat.y, boneQuat.z, boneQuat.w);

      body.linearDamping = 0.35;
      body.angularDamping = 0.65;
      body.collisionFilterGroup = 2; // Grupo de zombis
      body.collisionFilterMask = 1; // Choca exclusivamente con el suelo (1)

      // Aplicar impulso si fue atropellado o disparado
      if (impulse) {
        // Ligera variación por masa/extremidad
        const factor = cfg.key === 'Hips' || cfg.key === 'Spine2' ? 1.0 : 0.85;
        body.velocity.set(
          impulse.x * factor,
          impulse.y * factor,
          impulse.z * factor,
        );
        // Torsión angular ajustable para rotar al caer
        const t = tumble ?? 0.5;
        body.angularVelocity.set(
          (Math.random() - 0.5) * t * 2,
          (Math.random() - 0.5) * t * 2,
          (Math.random() - 0.5) * t * 2,
        );
      }

      this.world.addBody(body);
      this.boneBodies.set(cfg.key, { key: cfg.key, body, bone });
    }

    // 2) Conectar articulaciones con PointToPointConstraint
    for (const [aKey, bKey] of BONE_LINKS) {
      const a = this.boneBodies.get(aKey);
      const b = this.boneBodies.get(bKey);
      if (!a || !b) continue;

      const bPos = new THREE.Vector3();
      b.bone.getWorldPosition(bPos);

      // Calcular punto de anclaje relativo al cuerpo A
      const p = new CANNON.Vec3(bPos.x, bPos.y, bPos.z);
      const pivotA = new CANNON.Vec3();
      a.body.pointToLocalFrame(p, pivotA);

      const constraint = new CANNON.PointToPointConstraint(
        a.body,
        pivotA,
        b.body,
        new CANNON.Vec3(0, 0, 0),
      );
      constraint.collideConnected = false;
      this.world.addConstraint(constraint);
      this.constraints.push(constraint);
    }
  }

  /** Aplica un impulso cinético (p. ej. si un carro atropella un cadáver en el suelo) */
  applyImpulse(impulse: THREE.Vector3, tumble?: number) {
    this.settled = false;
    const t = tumble ?? 0.5;
    for (const { body } of this.boneBodies.values()) {
      body.wakeUp();
      body.velocity.x += impulse.x;
      body.velocity.y += impulse.y;
      body.velocity.z += impulse.z;
      body.angularVelocity.x += (Math.random() - 0.5) * t * 2;
      body.angularVelocity.y += (Math.random() - 0.5) * t * 2;
      body.angularVelocity.z += (Math.random() - 0.5) * t * 2;
    }
  }

  update(dt: number) {
    if (this.isDisposed) return;
    this.lifeTime += dt;

    if (!this.settled) {
      // Verificar si ya reposó en el suelo
      const hips = this.boneBodies.get('Hips');
      if (hips) {
        const vel = hips.body.velocity.length();
        const y = hips.body.position.y;
        if ((vel < 0.12 && y < 0.4 && this.lifeTime > 0.8) || this.lifeTime > 4.5) {
          this.settled = true;
          // Poner a dormir los cuerpos para liberar CPU
          for (const { body } of this.boneBodies.values()) {
            body.sleep();
          }
        }
      }
      this.syncPhysicsToBones();
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
        const parentTargetQuat = targetWorldQuats.get(bone.parent.uuid);
        if (parentTargetQuat) {
          localQuat.premultiply(parentTargetQuat.clone().invert());
        } else {
          const parentWorldQuat = new THREE.Quaternion();
          bone.parent.getWorldQuaternion(parentWorldQuat);
          localQuat.premultiply(parentWorldQuat.invert());
        }
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
        hipsEntry.body.position.z,
      );
      const currentHipsWorld = new THREE.Vector3();
      hipsEntry.bone.getWorldPosition(currentHipsWorld);

      const targetHipsLocal = this.model.parent
        ? this.model.parent.worldToLocal(targetHipsWorld.clone())
        : targetHipsWorld.clone();
      const currentHipsLocal = this.model.parent
        ? this.model.parent.worldToLocal(currentHipsWorld.clone())
        : currentHipsWorld.clone();

      const posDelta = targetHipsLocal.sub(currentHipsLocal);
      this.model.position.add(posDelta);
      this.model.updateMatrixWorld(true);
    }
  }

  dispose() {
    if (this.isDisposed) return;
    this.isDisposed = true;
    for (const c of this.constraints) {
      this.world.removeConstraint(c);
    }
    this.constraints = [];
    for (const { body } of this.boneBodies.values()) {
      this.world.removeBody(body);
    }
    this.boneBodies.clear();
  }
}

/**
 * Gestor global de simulación de físicas para cadáveres ragdoll.
 */
export class RagdollManager {
  readonly world: CANNON.World;
  private ragdolls: ZombieRagdoll[] = [];

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -17.5, 0); // Gravedad potente para impactos contundentes
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 12;

    // Suelo infinito a Y = 0
    const groundShape = new CANNON.Plane();
    const groundMat = new CANNON.Material({ friction: 0.65, restitution: 0.1 });
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material: groundMat });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Normal hacia arriba +Y
    groundBody.position.set(0, 0, 0);
    groundBody.collisionFilterGroup = 1;
    groundBody.collisionFilterMask = 2;
    this.world.addBody(groundBody);
  }

  createRagdoll(model: THREE.Object3D, impulse?: THREE.Vector3, tumble?: number): ZombieRagdoll | null {
    let skeleton: THREE.Skeleton | null = null;
    model.traverse((o: any) => {
      if (!skeleton && o.isSkinnedMesh && o.skeleton) {
        skeleton = o.skeleton;
      }
    });

    if (!skeleton) return null;

    // Limitar ragdolls simultáneos activos para rendimiento óptimo
    if (this.ragdolls.length > 24) {
      const oldest = this.ragdolls.shift();
      oldest?.dispose();
    }

    const rd = new ZombieRagdoll(this.world, model, skeleton, impulse, tumble);
    this.ragdolls.push(rd);
    return rd;
  }

  removeRagdoll(rd: ZombieRagdoll) {
    const idx = this.ragdolls.indexOf(rd);
    if (idx !== -1) {
      this.ragdolls.splice(idx, 1);
    }
    rd.dispose();
  }

  update(dt: number) {
    if (this.ragdolls.length === 0) return;
    this.world.step(1 / 60, Math.min(dt, 0.05), 3);
    for (const rd of this.ragdolls) {
      rd.update(dt);
    }
  }

  dispose() {
    for (const rd of this.ragdolls) rd.dispose();
    this.ragdolls = [];
  }
}
