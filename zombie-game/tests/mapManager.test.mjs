import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { transformWithEsbuild } from 'vite';

// Probar el renderer sin navegador ni WebGL; solo se sustituye el canvas.
const source = await readFile(new URL('../src/game/map/mapManager.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'mapManager.ts', { loader: 'ts', format: 'cjs' });
const exports = {};
const sandbox = {
  module: { exports },
  exports,
  require: () => ({ WORLD: { chunkSize: 64 } }),
  document: { createElement: () => ({ getContext: () => null }) },
};
vm.runInNewContext(code, sandbox);
const { MapManager } = sandbox.module.exports;

function context() {
  const calls = [];
  const ctx = new Proxy({}, {
    get: (_, key) => (...args) => calls.push([key, ...args]),
    set: () => true,
  });
  return { ctx, calls };
}

function marker(overrides = {}) {
  return { id: 'remote-1', nickname: 'Jugador', x: 16, z: 16, heading: 0, ...overrides };
}

test('descubrimiento usa floor también en coordenadas negativas', () => {
  const map = new MapManager();
  map.unlockedChunks.add('-1,-1');
  assert.equal(map.isDiscovered(-0.1, -63.9), true);
  assert.equal(map.isDiscovered(-64.1, -1), false);
  assert.equal(map.isDiscovered(0, 0), false);
  assert.equal(map.isDiscovered(NaN, 0), false);
});

test('no revela jugadores en chunks ocultos ni fuera del viewport', () => {
  const map = new MapManager();
  const { ctx, calls } = context();
  map.drawRemotePlayers(ctx, 210, 210, 16, 16, 1.15, [marker()]);
  assert.equal(calls.length, 0);
  map.unlockedChunks.add('0,0');
  map.drawRemotePlayers(ctx, 210, 210, 1000, 1000, 1.15, [marker()]);
  assert.equal(calls.length, 0);
  map.drawRemotePlayers(ctx, 210, 210, 16, 16, 1.15, [marker({ heading: NaN })]);
  assert.equal(calls.length, 0);
});

test('flechas respetan los cuatro rumbos y se recortan al chunk explorado', () => {
  const map = new MapManager();
  map.unlockedChunks.add('0,0');
  for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const { ctx, calls } = context();
    map.drawRemotePlayers(ctx, 210, 210, 16, 16, 1.15, [marker({ heading })]);
    assert.equal(calls.find(([name]) => name === 'rotate')[1], Math.PI / 2 - heading);
    assert.ok(calls.find(([name]) => name === 'clip'));
    assert.equal(calls.find(([name]) => name === 'fillText')[1], 'Jugador');
    assert.equal(calls.filter(([name]) => name === 'save').length,
      calls.filter(([name]) => name === 'restore').length);
  }
});

test('caché de tiles tiene límite LRU sin perder el descubrimiento', () => {
  const map = new MapManager();
  map.renderChunkTile = () => ({});
  let generated = 0;
  const generator = { generateChunk: () => { generated++; return {}; } };
  map.unlockedChunks.add('0,0');
  const first = map.getTile(0, 0, generator);
  for (let i = 1; i < 256; i++) map.getTile(i, 0, generator);
  assert.equal(map.getTile(0, 0, generator), first);
  map.getTile(256, 0, generator);
  assert.equal(map.getTile(0, 0, generator), first);
  assert.equal(generated, 257);
  map.getTile(1, 0, generator); // El menos usado fue expulsado.
  assert.equal(generated, 258);
  assert.equal(map.isDiscovered(0, 0), true);
});

test('cambiar de mundo invalida la revisión y el terreno anterior', () => {
  const map = new MapManager();
  map.unlockedChunks.add('0,0');
  const previous = map.revision;
  map.init(123);
  assert.ok(map.revision > previous);
  assert.equal(map.isDiscovered(0, 0), false);
});
