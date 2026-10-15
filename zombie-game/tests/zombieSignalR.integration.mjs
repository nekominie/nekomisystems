import assert from 'node:assert/strict';
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr';

// Solo contra un backend efímero local: nunca modifica una sala desplegada.
const base = new URL(process.env.ZOMBIE_TEST_URL || 'http://127.0.0.1:5067');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Usar únicamente un backend de pruebas local');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(new URL('/api/health', base))).ok) break;
  } catch {}
  if (i === 59) throw new Error('No inició el backend de pruebas');
  await sleep(250);
}
const clients = [];
const received = new Map();
const joinedPlayers = new Map();
const prefix = `test_${crypto.randomUUID()}`;
async function join() {
  const hub = new HubConnectionBuilder()
    .withUrl(new URL('/hubs/game', base).href, { transport: HttpTransportType.LongPolling })
    .configureLogging(LogLevel.Error).build();
  clients.push(hub);
  hub.on('OnJoinedRoom', (_room, players) => { joinedPlayers.set(hub, players); });
  hub.on('OnZombieSyncBatch', (states) => {
    for (const s of states) {
      if (!received.has(s.id) || received.get(s.id).version < s.version) received.set(s.id, s);
    }
  });
  await hub.start();
  await hub.invoke('JoinGlobalRoom');
  return hub;
}
try {
  const a = await join(), b = await join();
  await a.invoke('SendPlayerState', { x: 0, z: 0, isPassive: true, currentAnim: 'idle' });
  await b.invoke('SendPlayerState', { x: 0, z: 0, isPassive: false, currentAnim: 'idle' });
  const spawn = (i) => ({ id: `${prefix}_${i}`, x: 4, z: 5, rot: 1.2, tier: 'slow',
    heightVar: 1.08, speed: 0, animState: 'idle', health: 100, dead: false });
  const initial = await a.invoke('SendZombieSync', [spawn(0), spawn(1)]);
  assert.equal(initial.length, 2);
  const hit = (i, damage) => ({ zombieId: spawn(i).id, eventId: crypto.randomUUID(),
    damage, impulseX: -8, impulseY: 5, impulseZ: 12, tumble: 5.5,
    physicsSeed: 12345, zombieX: 4, zombieZ: 5, zombieRot: 1.2, isCarHit: true });
  const lethal = hit(0, 100), knockdown = hit(1, 20);
  await Promise.all([b.invoke('SendZombieHit', lethal), b.invoke('SendZombieHit', knockdown)]);
  await b.invoke('SendZombieHit', knockdown); // Confirmación perdida/reintento.
  const c = await join();
  assert.equal(joinedPlayers.get(c).find((p) => p.connectionId === a.connectionId).isPassive, true);
  assert.equal(joinedPlayers.get(c).find((p) => p.connectionId === b.connectionId).isPassive, false);
  const page = await c.invoke('GetZombieRegion', 0, 0, 0);
  const dead = page.states.find((s) => s.id === lethal.zombieId);
  const down = page.states.find((s) => s.id === knockdown.zombieId);
  assert.ok(dead.dead);
  assert.equal(dead.health, 0);
  assert.ok(down.knockedDown);
  assert.equal(down.health, 80); // Reintento no duplica el daño.
  assert.equal(down.lastImpact.tumble, 5.5);
  assert.equal(down.lastImpact.physicsSeed, 12345);
  assert.equal(down.lastImpact.impulseX, -8);
  assert.ok(received.has(dead.id));
  await b.stop();
  await sleep(300);
  const claim = await c.invoke('SendZombieSync', [dead]);
  assert.equal(claim[0].ownerConnectionId, c.connectionId);
  assert.ok(claim[0].dead);
  await a.invoke('SendZombieClear', 4, 5, 10);
  const cleared = await c.invoke('GetZombieRegion', 0, 0, 0);
  assert.ok(cleared.states.filter((s) => s.id.startsWith(prefix)).every((s) => s.removed));
  console.log('PASS: SignalR real: tres clientes, ráfaga, cadáver tardío, deduplicación, concesión y eliminación.');
} finally {
  await Promise.allSettled(clients.map((hub) => hub.stop()));
}
