export function recordCpu(app: { runtime: any }, ms: number) {
  const s = app.runtime.stats
  if (!s) return

  const now = Date.now()

  if (now - s.cpuWindowStartedAt >= 5000) {
    s.cpuMsLast5s = s.cpuMsWindow
    s.cpuMsWindow = 0
    s.cpuWindowStartedAt = now
  }

  s.cpuMsWindow += ms
}

export async function measureCpu<T>(app: { runtime: any }, fn: () => T | Promise<T>): Promise<T> {
    const t0 = performance.now()            
        
    try {
        return await fn()
    }
    finally {
        const dt = performance.now() - t0
        recordCpu(app, dt)
    }
}

let statsTimer: number | undefined

export function startStatsSampler(osState: any) {
  if (statsTimer) return

  statsTimer = window.setInterval(() => {
    const procs = [
      ...(osState.apps ?? []),
      ...(osState.snippets ?? []),
    ]

    for (const p of procs) {
      if (!p.runtime?.isRunning) continue
      if (!p.runtime?.stats) continue

      tickCpuWindow(p)

      // memoria: para snippets puedes pasar otro root id si quieres
      // ej: `snippet-root-${id}` si lo implementas
      sampleMemScore(p)
    }
  }, 1000)
}

export function sampleMemScore(proc: any, rootElId?: string) {
  const s = proc.runtime.stats
  if (!s) return

  const now = Date.now()
  if (now - s.lastMemSampleAt < 1500) return
  s.lastMemSampleAt = now

  const root = rootElId
    ? document.getElementById(rootElId)
    : document.getElementById(`window-content-${proc.manifest.id}`)

  const nodes = countDomNodes(root)
  const previewKb = estimateBase64Kb(proc.runtime.previewImg)

  // 1) Base "real" (dom + preview) pero escalada para que no colapse a 0.
  //    Con nodes=2 y previewKb=1 => base ~ 8 + 1 + 0.5 = 9.5 -> ~10
  const base =
    (nodes * 4) +          // DOM pesa más para que se note con pocos nodos
    (previewKb * 1.0) +    // preview suma, pero no domina
    8                      // piso mínimo (como "memoria" del proceso)

  // 2) Variación tipo Task Manager:
  //    - la mayoría de veces: jitter pequeño
  //    - a veces: jitter medio
  //    - rara vez: jitter un poco más grande
  const r = Math.random()
  let jitterPct: number

  if (r < 0.78) jitterPct = randBetween(-0.06, 0.06)      // 78%: ±6%
  else if (r < 0.96) jitterPct = randBetween(-0.14, 0.14) // 18%: ±14%
  else jitterPct = randBetween(-0.25, 0.25)               // 4%:  ±25%

  // además, que "mueva" al menos 1 punto casi siempre (si base es bajo)
  const jitterAbsMin = base < 40 ? 1 : 0

  const jitter = Math.round(base * jitterPct)
  let raw = Math.round(base + jitter)

  // asegura movimiento mínimo ocasional (no siempre, para que no sea artificial)
  if (jitterAbsMin && Math.random() < 0.65 && raw === Math.round(base)) {
    raw += Math.random() < 0.5 ? -1 : 1
  }

  // 3) Suavizado (para que no pegue saltos raros):
  //    memScore nuevo = 80% anterior + 20% nuevo
  const prev = typeof s.memScore === 'number' ? s.memScore : 0
  const smooth = Math.round(prev * 0.8 + raw * 0.2)

  // 4) Clamp: nunca negativo; y evita dispararse si un día previewKb se va alto
  const maxReasonable = Math.round(base * 1.8 + 20)
  s.memScore = clamp(smooth, 0, maxReasonable)

  // Debug opcional:
  // console.log({ id: proc.manifest.id, nodes, previewKb, base, raw, smooth: s.memScore })
}

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function estimateBase64Kb(dataUrl?: string) {
  if (!dataUrl) return 0
  const idx = dataUrl.indexOf(',')
  if (idx === -1) return 0
  const b64 = dataUrl.slice(idx + 1)
  // base64 ~ 4/3 overhead
  return Math.round((b64.length * 3) / 4 / 1024)
}

function countDomNodes(el: Element | null) {
  if (!el) return 0
  return el.querySelectorAll('*').length + 1
}

export function stopStatsSampler() {
  if (statsTimer) window.clearInterval(statsTimer)
  statsTimer = undefined
}

export function tickCpuWindow(proc: { runtime: any }) {
  const s = proc.runtime.stats
  if (!s) return

  const now = Date.now()
  if (now - s.cpuWindowStartedAt >= 5000) {
    s.cpuMsLast5s = s.cpuMsWindow
    s.cpuMsWindow = 0
    s.cpuWindowStartedAt = now
  }
}