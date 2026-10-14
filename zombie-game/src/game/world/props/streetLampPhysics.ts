import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PROP_GEO, PROP_MAT, propTintedMat } from './propFactory';

interface FlyingLamp {
  body: CANNON.Body;
  group: THREE.Group; // Grupo que contiene todas las piezas del poste
  lifeTime: number;
  settled: boolean;
  x: number;
  z: number;
  rot: number; // Rotación original del poste
}

/**
 * Gestor de físicas para postes de luz que salen volando al ser atropellados.
 * Similar al sistema de ragdoll de zombies, pero para objetos rígidos cilíndricos.
 * Las físicas se simulan localmente en cada cliente; solo se sincroniza el evento de destrucción.
 */
export class StreetLampPhysicsManager {
  readonly world: CANNON.World;
  private flyingLamps: FlyingLamp[] = [];
  private scene: THREE.Scene;
  private readonly MAX_FLYING_LAMPS = 32; // Límite de postes voladores simultáneos
  private readonly SETTLED_THRESHOLD = 0.3; // m/s - velocidad bajo la cual se considera que ya cayó
  private readonly LIFETIME_MAX = 5.0; // segundos - tiempo máximo de vida de un poste volador

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Mundo de físicas compartido (podría compartirse con ragdolls si se desea)
    this.world = new CANNON.World();
    this.world.gravity.set(0, -16.0, 0); // Gravedad realista
    this.world.broadphase = new CANNON.NaiveBroadphase();
    (this.world.solver as CANNON.GSSolver).iterations = 12;

    // Suelo infinito a Y = 0 con más rebote
    const groundShape = new CANNON.Plane();
    const groundMat = new CANNON.Material({ friction: 0.45, restitution: 0.5 }); // Más rebote
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape, material: groundMat });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Normal hacia arriba +Y
    groundBody.position.set(0, 0, 0);
    this.world.addBody(groundBody);
  }

  /**
   * Activa las físicas de un poste de luz al ser atropellado.
   * @param x Posición X del poste
   * @param z Posición Z del poste
   * @param rot Rotación original del poste (hacia dónde apunta)
   * @param impulse Vector de impulso del vehículo (velocidad)
   */
  activateLamp(x: number, z: number, rot: number, impulse: THREE.Vector3): void {
    // Limitar cantidad de postes voladores simultáneos
    if (this.flyingLamps.length >= this.MAX_FLYING_LAMPS) {
      const oldest = this.flyingLamps.shift();
      if (oldest) this.disposeLamp(oldest);
    }

    // Crear cuerpo físico cilíndrico (poste completo como objeto rígido)
    const radius = 0.18;
    const height = 5.2;
    const mass = 35; // kg - masa de un poste de metal más pesado para mejor inercia
    
    const shape = new CANNON.Cylinder(radius, radius, height, 12);
    const material = new CANNON.Material({ friction: 0.6, restitution: 0.45 }); // Más rebote
    const body = new CANNON.Body({ mass, shape, material });
    
    // Posición inicial (base del poste)
    body.position.set(x, height / 2, z);
    
    // Rotación inicial del cuerpo (vertical, pero orientado según rot)
    const quat = new CANNON.Quaternion();
    quat.setFromEuler(0, rot, 0); // Solo rotación en Y (vertical)
    body.quaternion.copy(quat);

    // Aplicar impulso basado en la velocidad del vehículo - MUCHO MÁS DRAMÁTICO
    const impulseMag = Math.hypot(impulse.x, impulse.y, impulse.z);
    
    // Velocidad lineal con dispersión y mucho vuelo
    const jx = (Math.random() - 0.5) * 3.0;
    const jz = (Math.random() - 0.5) * 3.0;
    const jy = 4.5 + Math.random() * 3.5; // MUCHO impulso hacia arriba para que vuele
    
    body.velocity.set(
      impulse.x * 1.1 + jx,
      jy,
      impulse.z * 1.1 + jz
    );

    // Velocidad angular (giro/torque) - MUCHA MÁS ROTACIÓN
    const impLen = Math.max(0.001, Math.hypot(impulse.x, impulse.z));
    const dirX = impulse.x / impLen;
    const dirZ = impulse.z / impLen;
    
    // Eje perpendicular a la dirección de movimiento (eje de giro)
    const rightX = dirZ;
    const rightZ = -dirX;
    
    // MUCHO torque para rotación dramática - como si volara dando vueltas
    const flipMag = Math.min(22, impulseMag * 1.2) * (Math.random() < 0.5 ? 1 : -1);
    const tumbleMag = 8 + Math.random() * 12; // Rotación caos adicional
    
    body.angularVelocity.set(
      rightX * flipMag + (Math.random() - 0.5) * tumbleMag,
      (Math.random() - 0.5) * tumbleMag * 0.8,
      rightZ * flipMag + (Math.random() - 0.5) * tumbleMag
    );

    this.world.addBody(body);

    // Crear grupo visual del poste (todas las piezas juntas)
    const lampGroup = this.createLampGroup(rot);
    this.scene.add(lampGroup);

    this.flyingLamps.push({
      body,
      group: lampGroup,
      lifeTime: 0,
      settled: false,
      x,
      z,
      rot,
    });
  }

  /**
   * Crea el grupo visual del poste como una pieza sólida (poste + brazo + foco)
   */
  private createLampGroup(originalRot: number): THREE.Group {
    const group = new THREE.Group();
    const dx = Math.cos(originalRot);
    const dz = -Math.sin(originalRot);

    // Poste principal (cilindro) - en el origen del grupo
    const pole = new THREE.Mesh(PROP_GEO.cyl, propTintedMat(0x2f3336));
    pole.position.set(0, 0, 0);
    pole.scale.set(0.18, 5.2, 0.18);
    pole.castShadow = true;
    pole.receiveShadow = true;
    group.add(pole);

    // Brazo horizontal - relativo al poste
    const arm = new THREE.Mesh(PROP_GEO.box, propTintedMat(0x2f3336));
    arm.position.set(dx * 0.55, 5.05 - 2.6, dz * 0.55); // Ajustado al centro del poste
    arm.rotation.set(0, originalRot, 0);
    arm.scale.set(1.2, 0.12, 0.12);
    arm.castShadow = true;
    arm.receiveShadow = true;
    group.add(arm);

    // Cabeza del foco - relativa al brazo
    const head = new THREE.Mesh(PROP_GEO.box, PROP_MAT.head);
    head.position.set(dx * 1.05, 4.92 - 2.6, dz * 1.05);
    head.rotation.set(0, originalRot, 0);
    head.scale.set(0.5, 0.14, 0.26);
    head.castShadow = true;
    head.receiveShadow = true;
    group.add(head);

    return group;
  }

  /**
   * Actualiza las físicas y sincroniza los meshes con los cuerpos físicos
   */
  update(dt: number): void {
    if (this.flyingLamps.length === 0) return;

    // Simular físicas
    this.world.step(1 / 60, Math.min(dt, 0.05), 3);

    // Actualizar cada poste volador
    for (let i = this.flyingLamps.length - 1; i >= 0; i--) {
      const lamp = this.flyingLamps[i];
      lamp.lifeTime += dt;

      // Verificar si el poste ya se asentó (velocidad baja)
      if (!lamp.settled) {
        const vel = lamp.body.velocity;
        const speed = Math.hypot(vel.x, vel.y, vel.z);
        if (speed < this.SETTLED_THRESHOLD && lamp.lifeTime > 0.5) {
          lamp.settled = true;
        }
      }

      // Sincronizar posición y rotación del grupo completo con el cuerpo físico
      const pos = lamp.body.position;
      const quat = lamp.body.quaternion;

      // Convertir quaternion de Cannon a Three
      const threeQuat = new THREE.Quaternion(quat.x, quat.y, quat.z, quat.w);

      // Actualizar grupo completo - el poste se mueve como una pieza sólida
      lamp.group.position.set(pos.x, pos.y, pos.z);
      lamp.group.quaternion.copy(threeQuat);

      // Eliminar postes que llevan mucho tiempo o están muy lejos del origen
      const distFromOrigin = Math.hypot(pos.x - lamp.x, pos.z - lamp.z);
      if (lamp.lifeTime > this.LIFETIME_MAX || distFromOrigin > 150 || pos.y < -10) {
        this.disposeLamp(lamp);
        this.flyingLamps.splice(i, 1);
      }
    }
  }

  /**
   * Limpia un poste volador de la memoria
   */
  private disposeLamp(lamp: FlyingLamp): void {
    this.world.removeBody(lamp.body);
    this.scene.remove(lamp.group);
    // Liberar recursos del grupo y sus hijos
    lamp.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }

  /**
   * Limpia todos los postes voladores
   */
  dispose(): void {
    for (const lamp of this.flyingLamps) {
      this.disposeLamp(lamp);
    }
    this.flyingLamps = [];
  }
}
