import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { transformWithEsbuild } from 'vite';

async function loadTs(path, imports = {}) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { code } = await transformWithEsbuild(source, path, { loader: 'ts', format: 'cjs' });
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, console, crypto: globalThis.crypto,
    require: (name) => imports[name] ?? {},
  });
  return module.exports;
}
const { ZombieReplicaBook } = await loadTs('../src/game/network/zombieReplication.ts');
const { impactRandom } = await loadTs('../src/game/world/impactRandom.ts');
const { ZombieRagdoll } = await loadTs('../src/game/world/zombieRagdoll.ts', {
  three: THREE, 'cannon-es': CANNON, './impactRandom': { impactRandom },
});
const { ZombieManager } = await loadTs('../src/game/world/zombies.ts', {
  three: THREE,
  './worldConfig': { WORLD: { chunkSize: 64, viewRadius: 3, zombies: { fieldMax: 8, townMin: 14, townExtra: 21 } } },
  './random': { chunkRng: () => () => 0.5 },
  '../network/zombieReplication': { ZombieReplicaBook },
});

function state(overrides = {}) {
  return { id: 'z_0_0_0', x: 4, z: 5, rot: 0.7, speed: 0, animState: 'idle',
    tier: 'slow', heightVar: 1.1, health: 100, dead: false, knockedDown: false,
    removed: false, ownerConnectionId: 'A', version: 1, combatVersion: 0, ...overrides };
}
function manager() {
  return Object.assign(Object.create(ZombieManager.prototype), {
    zombies: [], zombiesById: new Map(), queue: [], candidates: new Map(),
    replicas: new ZombieReplicaBook(), syncCursor: 0, candidateCursor: 0,
    networkRoom: 'GLOBAL', connectionId: 'B', localX: 0, localZ: 0,
    world: { seed: 42, generator: { cities: { cityNear: () => null }, towns: { townNear: () => null } } },
  });
}
function entity(id = 'z_0_0_0') {
  const root = new THREE.Group();
  const model = new THREE.Group();
  root.add(model);
  const action = { reset() { return this; }, play() { return this; } };
  return { id, x: 4, z: 5, rot: 0.7, d: 0, dead: false, health: 100, tier: 'slow',
    knockedDown: false, currentSpeed: 0, animState: 'idle', networkCombatVersion: 0,
    inst: { root, model }, hitAction: action, idleAction: action };
}

test('IDs estrictos: no impactar un vecino si falta el zombi recibido', () => {
  const m = manager();
  m.zombiesById.set('neighbor', entity('neighbor'));
  assert.equal(m.findZombie('missing', 4, 5), undefined);
});

test('versiones atrasadas no reviven muertos ni eliminados', () => {
  const book = new ZombieReplicaBook();
  assert.equal(book.accept(state({ version: 2, combatVersion: 1, dead: true, health: 0 })), true);
  assert.equal(book.accept(state()), false);
  assert.equal(book.accept(state({ version: 3 })), false);
  assert.equal(book.accept(state({ version: 4, dead: true, health: 0, removed: true })), true);
  assert.equal(book.accept(state({ version: 5, dead: true, health: 0 })), false);
});

test('guardar cadáver aunque no haya modelo para el jugador tardío', () => {
  const m = manager();
  m.applyRemoteSync([state({ dead: true, health: 0, combatVersion: 1, deadAt: Date.now() })]);
  assert.equal(m.replicas.states.size, 1);
  assert.equal(m.replicas.states.get('z_0_0_0').dead, true);
  const request = m.requestFromState(m.replicas.states.get('z_0_0_0'));
  assert.equal(request.id, 'z_0_0_0');
  assert.equal(request.tier, 'slow');
});

test('todos los clientes proponen los mismos IDs sin filtro por distancia personal', () => {
  const a = manager();
  const b = manager();
  a.planChunk(0, 0, 32, 32);
  b.planChunk(0, 0, 100, 100);
  assert.equal(a.candidates.size, 4);
  assert.deepEqual([...a.candidates.keys()], [...b.candidates.keys()]);
  const single = manager();
  single.networkRoom = null;
  single.planChunk(0, 0, 32, 32);
  assert.equal(single.queue.length, 0); // El modo solitario conserva su distancia de seguridad.
});

test('lotes rotativos incluyen más de 18 entidades, caídos y cadáveres', () => {
  const m = manager();
  for (let i = 0; i < 150; i++) {
    const z = entity(`z${i}`);
    z.dead = i % 3 === 0;
    z.knockedDown = i % 3 === 1;
    m.zombies.push(z);
    m.zombiesById.set(z.id, z);
    m.replicas.accept(state({ id: z.id, dead: z.dead, knockedDown: z.knockedDown }));
  }
  const sent = new Map();
  for (let i = 0; i < 3; i++) {
    const batch = m.getActiveZombiesSync();
    assert.ok(batch.length <= 64);
    for (const s of batch) sent.set(s.id, s);
  }
  assert.equal(sent.size, 150);
  assert.ok([...sent.values()].some((s) => s.dead));
  assert.ok([...sent.values()].some((s) => s.knockedDown));
});

test('el golpe remoto conserva impulso, giro, origen y semilla', () => {
  const m = manager();
  const z = entity();
  let received;
  m.knockDown = (target, impulse, tumble, seed) => {
    received = { id: target.id, impulse: impulse.toArray(), tumble, seed };
    target.knockedDown = true;
  };
  const hit = { eventId: 'remote-hit', zombieId: z.id, zombieX: 8, zombieZ: 9,
    zombieRot: 1.2, impulseX: -8, impulseY: 5, impulseZ: 12, tumble: 5.5, physicsSeed: 12345 };
  m.applyNetworkState(z, state({ health: 90, combatVersion: 1, knockedDown: true, lastImpact: hit }), false);
  assert.deepEqual(received, { id: z.id, impulse: [-8, 5, 12], tumble: 5.5, seed: 12345 });
  assert.equal(z.x, 8);
  assert.equal(z.z, 9);
  assert.equal(z.rot, 1.2);
});

test('el eco del impacto propio no aplica dos veces el impulso', () => {
  const m = manager();
  m.connectionId = 'A';
  const z = entity();
  z.knockedDown = true;
  z.ragdoll = { applyImpulse: () => assert.fail('Impulso duplicado') };
  m.replicas.predict('my-hit');
  m.applyNetworkState(z, state({ health: 90, combatVersion: 1, knockedDown: true,
    lastImpact: { eventId: 'my-hit' } }), false);
  assert.equal(z.health, 90);
  assert.equal(z.networkCombatVersion, 1);
});

test('la misma semilla produce las mismas condiciones aleatorias iniciales', () => {
  const a = impactRandom(12345), b = impactRandom(12345), c = impactRandom(67890);
  const samples = (random) => Array.from({ length: 100 }, random);
  const first = samples(a);
  assert.deepEqual(first, samples(b));
  assert.notDeepEqual(first, samples(c));
  assert.ok(first.every((v) => v >= 0 && v < 1));
});

test('un snapshot anterior no cura daño predicho pendiente de confirmación', () => {
  const m = manager();
  const z = entity();
  z.health = 60;
  m.replicas.predict('pending-shot', z.id);
  m.applyNetworkState(z, state({ health: 100 }), false);
  assert.equal(z.health, 60);
});

test('Cannon recibe idéntica velocidad inicial y giro con los mismos parámetros', () => {
  const build = (seed) => {
    const world = new CANNON.World();
    const root = new THREE.Group();
    root.rotation.y = 0.8;
    const model = new THREE.Group();
    const hips = new THREE.Bone();
    hips.name = 'Hips';
    hips.position.y = 1;
    model.add(hips);
    root.add(model);
    root.updateMatrixWorld(true);
    const ragdoll = new ZombieRagdoll(world, model, new THREE.Skeleton([hips]),
      new THREE.Vector3(-8, 5, 12), 5.5, seed);
    return { world, model, root, ragdoll };
  };
  const a = build(12345), b = build(12345);
  assert.deepEqual(a.world.bodies[0].velocity.toArray(), b.world.bodies[0].velocity.toArray());
  assert.deepEqual(a.world.bodies[0].angularVelocity.toArray(), b.world.bodies[0].angularVelocity.toArray());
  const before = a.model.getWorldPosition(new THREE.Vector3());
  a.ragdoll.translate(10, -6);
  const after = a.model.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(after.x - before.x - 10) < 1e-6);
  assert.ok(Math.abs(after.z - before.z + 6) < 1e-6);
  a.ragdoll.dispose();
  b.ragdoll.dispose();
});

test('un dueño pasivo sigue detectando compañeros activos, no vuelve pacífica toda la sala', () => {
  const m = manager();
  const z = entity();
  m._passiveMode = true;
  m.checkPlayerDetection = () => true;
  m.setMotion = () => {};
  m.finishWanderMotion = () => {};
  m.wander(z, 0.016, 100, 100, [{ x: 30, z: 30, connectionId: 'A', isPassive: false }]);
  assert.equal(z.alert.playerId, 'A');
  assert.equal(z.alert.x, 30);
});

test('se omiten objetivos remotos pasivos sin omitir a los demás', () => {
  const m = manager();
  const z = entity();
  m._passiveMode = false;
  m.checkPlayerDetection = (_, x) => x !== 1000;
  m.setMotion = () => {};
  m.finishWanderMotion = () => {};
  m.wander(z, 0.016, 1000, 1000, [
    { x: 20, z: 20, connectionId: 'A', isPassive: true },
    { x: 30, z: 30, connectionId: 'C', isPassive: false },
  ]);
  assert.equal(z.alert.playerId, 'C');
});

test('activar pasivo cancela solo las persecuciones del propio jugador', () => {
  const m = manager();
  const own = entity('own'), partner = entity('partner');
  own.alert = { x: 4, z: 5, playerId: 'B', timer: 10 };
  partner.alert = { x: 30, z: 30, playerId: 'A', timer: 10 };
  m.zombies.push(own, partner);
  m.passiveMode = true;
  assert.equal(own.alert, null);
  assert.equal(partner.alert.playerId, 'A');
});

test('el modo personal no silencia ruidos de compañeros activos', () => {
  const m = manager();
  const z = entity();
  m.zombies.push(z);
  m._passiveMode = true;
  m.alertNoise(4, 5, 30); // Ruido propio pasivo.
  assert.equal(z.alert, undefined);
  m.alertNoise(4, 5, 30, false, 'A');
  assert.equal(z.alert.playerId, 'A');
  m.alertNoise(10, 10, 30, true, 'C');
  assert.equal(z.alert.playerId, 'A');
});

test('una réplica no daña al jugador pasivo ni al vecino de otro objetivo', () => {
  const m = manager();
  const z = entity();
  const action = { reset() { return this; }, play() { return this; } };
  z.attackAction = action;
  z.attackCooldown = 0;
  m.setMotion = () => {};
  let damage = 0;
  m.onPlayerAttacked = (_, amount) => { damage += amount; };
  m.replicas.accept(state({ targetX: 4, targetZ: 5, targetPlayerId: 'A' }));
  m.updateReplica(z, 0.016, 4, 5);
  assert.equal(damage, 0); // El objetivo es A, aunque B está a su lado.
  m.replicas.accept(state({ version: 2, targetX: 4, targetZ: 5, targetPlayerId: 'B' }));
  m._passiveMode = true;
  m.updateReplica(z, 0.016, 4, 5);
  assert.equal(damage, 0);
  m._passiveMode = false;
  m.updateReplica(z, 0.016, 4, 5);
  assert.equal(damage, 10);
});
