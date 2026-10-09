import type { WeaponCategory } from './weaponTypes';

/**
 * Sonidos de armas sintetizados con Web Audio (ruido filtrado + golpe grave): no necesita archivos.
 * El AudioContext se crea con el primer sonido (tras un gesto del usuario, como exigen los navegadores).
 */
let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function ac(): AudioContext | null {
  if (!ctx) {
    try {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** Ráfaga de ruido con filtro y envolvente de caída exponencial. */
function burst(c: AudioContext, opts: { dur: number; freq: number; q?: number; type?: BiquadFilterType; gain: number; delay?: number }) {
  const t0 = c.currentTime + (opts.delay ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + opts.dur + 0.02);
}

/** Golpe grave: oscilador con barrido de frecuencia descendente. */
function thump(c: AudioContext, opts: { f0: number; f1: number; dur: number; gain: number; delay?: number }) {
  const t0 = c.currentTime + (opts.delay ?? 0);
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(opts.f0, t0);
  o.frequency.exponentialRampToValueAtTime(opts.f1, t0 + opts.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + opts.dur + 0.02);
}

function click(c: AudioContext, freq: number, gain: number, delay = 0) {
  burst(c, { dur: 0.035, freq, q: 3, gain, delay });
}

export const weaponAudio = {
  shot(category: WeaponCategory) {
    const c = ac();
    if (!c) return;
    switch (category) {
      case 'pistol':
        burst(c, { dur: 0.13, freq: 1900, q: 0.7, gain: 0.32 });
        thump(c, { f0: 170, f1: 60, dur: 0.12, gain: 0.35 });
        break;
      case 'smg':
      case 'rifle':
        burst(c, { dur: 0.11, freq: 2300, q: 0.7, gain: 0.3 });
        thump(c, { f0: 150, f1: 55, dur: 0.1, gain: 0.32 });
        break;
      case 'shotgun':
        burst(c, { dur: 0.3, freq: 1100, q: 0.5, type: 'lowpass', gain: 0.55 });
        thump(c, { f0: 110, f1: 38, dur: 0.22, gain: 0.55 });
        break;
      case 'sniper':
        burst(c, { dur: 0.5, freq: 900, q: 0.5, type: 'lowpass', gain: 0.5 });
        burst(c, { dur: 0.09, freq: 3200, q: 0.6, gain: 0.4 });
        thump(c, { f0: 90, f1: 30, dur: 0.35, gain: 0.6 });
        break;
      default:
        break;
    }
  },
  /** Explosión: estruendo grave con cola (big = C4/.50 y radio grande). */
  explosion(big = false) {
    const c = ac();
    if (!c) return;
    burst(c, { dur: big ? 0.9 : 0.55, freq: 320, q: 0.4, type: 'lowpass', gain: 0.7 });
    burst(c, { dur: 0.12, freq: 2800, q: 0.6, gain: 0.35 });
    thump(c, { f0: big ? 70 : 90, f1: 24, dur: big ? 0.7 : 0.45, gain: 0.7 });
  },
  /** Gatillo sin balas. */
  empty() {
    const c = ac();
    if (c) click(c, 1400, 0.25);
  },
  reload() {
    const c = ac();
    if (!c) return;
    click(c, 900, 0.3);
    click(c, 1500, 0.28, 0.35);
    click(c, 700, 0.3, 0.8);
  },
  swing() {
    const c = ac();
    if (c) burst(c, { dur: 0.16, freq: 700, q: 0.6, type: 'bandpass', gain: 0.22 });
  },
  /** Impacto del bate / golpe en un zombi. */
  meleeHit() {
    const c = ac();
    if (!c) return;
    thump(c, { f0: 140, f1: 60, dur: 0.12, gain: 0.5 });
    burst(c, { dur: 0.08, freq: 500, q: 1, gain: 0.3 });
  },
  hit(headshot: boolean) {
    const c = ac();
    if (!c) return;
    if (headshot) click(c, 2600, 0.35);
    thump(c, { f0: 220, f1: 90, dur: 0.07, gain: headshot ? 0.3 : 0.2 });
  },
};
