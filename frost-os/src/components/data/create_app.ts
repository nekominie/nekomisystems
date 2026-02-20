import type { App, Manifest, Runtime, UserSettings } from './app'
import { DEFAULT_MANIFEST, DEFAULT_RUNTIME, DEFAULT_USER } from './app_defaults'
import { deepMerge } from './merge'

export function createApp(
  manifest: Manifest,
  userSaved?: Partial<UserSettings>,
  runtimeSaved?: Partial<Runtime>,
): App {
  // 1) manifest con defaults
  const m = deepMerge(DEFAULT_MANIFEST as Manifest, manifest)

  // 2) user con defaults
  const u = deepMerge(DEFAULT_USER as UserSettings, userSaved)

  // 3) runtime con defaults (y usando manifest.window.defaultSize)
  const rBase = structuredClone(DEFAULT_RUNTIME)
  rBase.size = { ...m.window!.defaultSize }  // default size viene del manifest
  const r = deepMerge(rBase, runtimeSaved)

  return { manifest: m, user: u, runtime: r }
}
