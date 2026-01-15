import Ammo from 'ammo.js';

let AmmoLib;

export async function initPhysicsWorld(){

    if (!AmmoLib) {
        AmmoLib = await Ammo();  // espera la promesa y guarda la instancia
    }

    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();

    const physicsWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfiguration
    );
    physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0));

    return physicsWorld;
}

/**
 * Crea un cuerpo rígido para un objeto
 * @param {THREE.Vector3} position Posición inicial
 * @param {Ammo.btCollisionShape} shape La forma física (colisionador)
 * @param {number} mass Masa del cuerpo
 * @returns {Ammo.btRigidBody} El cuerpo rígido creado
 */

export function createRigidBodyForBone(position, shape, mass){
    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

    const motionState = new Ammo.btDefaultMotionState(transform);

    const localInertia = new Ammo.btVector3(0, 0, 0);
    if (mass > 0) {
        shape.calculateLocalInertia(mass, localInertia);
    }

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
        mass,
        motionState,
        shape,
        localInertia
    );

    const body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body);

    return body;
}

/**
 * Actualiza el mundo físico.
 * Debe llamarse cada frame.
 * @param {number} delta Tiempo en segundos desde el último frame
 */
export function updatePhysics(delta) {
    if (!physicsWorld) return;
    physicsWorld.stepSimulation(delta, 10);
}