import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
import { parse, compileScript } from '@vue/compiler-sfc';
import { createSSRApp } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { transformWithEsbuild } from 'vite';

const require = createRequire(import.meta.url);
const file = new URL('../src/components/game/DebugModal.vue', import.meta.url);
const { descriptor } = parse(await readFile(file, 'utf8'), { filename: file.pathname });
const compiled = compileScript(descriptor, {
  id: 'debug-modes-test', inlineTemplate: true, templateOptions: { ssr: true },
});
const { code } = await transformWithEsbuild(compiled.content, 'DebugModal.ts', { loader: 'ts', format: 'cjs' });
const module = { exports: {} };
vm.runInNewContext(code, {
  module, exports: module.exports,
  require: (id) => id === './hudIcons' ? { HUD_ICONS: { combat_knife: '<svg></svg>' } } : require(id),
});
const component = module.exports.default;
const defaults = {
  enabled: false, passiveMode: false, weapons: [], equippedId: '', equippedName: '',
  melee: true, spreadDeg: 0, worldInfo: { clock: '', seed: 42, x: 0, z: 0, cx: 0, cz: 0,
    chunks: 0, city: '', zombies: 0, kills: 0, night: false },
  archetypeOptions: [], selectedArchetype: 'sedan', carHud: { driving: false },
  pushConfig: { force: 1, lift: 3, scatter: 0.6, tumble: 3 },
  explosives: [], explosiveCounts: {},
};

test('multijugador sin debug ON: no hay interruptor maestro y el modo personal está disponible', async () => {
  const html = await renderToString(createSSRApp(component, { ...defaults, multiplayer: true }));
  assert.ok(html.includes('spawns compartidos'));
  assert.ok(html.includes('Solo tú'));
  assert.ok(!html.includes('Habilitar o deshabilitar todos los efectos'));
  assert.ok(!html.includes('Requiere debug'));
  assert.ok(!html.includes('disabled'));
});

test('solitario conserva interruptor maestro y bloqueo predeterminado', async () => {
  const html = await renderToString(createSSRApp(component, { ...defaults, multiplayer: false }));
  assert.ok(html.includes('Habilitar o deshabilitar todos los efectos'));
  assert.ok(html.includes('Requiere debug'));
  assert.ok(html.includes('disabled'));
});

test('modo personal activo no crea un interruptor global en multijugador', async () => {
  const html = await renderToString(createSSRApp(component, { ...defaults, multiplayer: true, passiveMode: true }));
  assert.ok(html.includes('aria-checked="true"'));
  assert.ok(!html.includes('Habilitar o deshabilitar todos los efectos'));
});
