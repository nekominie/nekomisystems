type PlainObj = Record<string, any>

export function deepMerge<T extends PlainObj>(base: T, patch?: Partial<T>): T {
  if (!patch) return structuredClone(base)
  const out: any = structuredClone(base)

  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = deepMerge(out[k] ?? {}, v)
    } else {
      out[k] = v
    }
  }
  return out
}
