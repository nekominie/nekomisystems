// Procedural Web Audio API sound generator for industrial zombie survival horror
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private isAmbientRunning: boolean = false;
  private masterGain: GainNode | null = null;
  private volume: number = 0.7;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Heavy metallic bolt / lever clank on hover
  public playHover() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.Q.setValueAtTime(5, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(860, now);
      osc2.frequency.exponentialRampToValueAtTime(240, now + 0.06);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.1);
      osc2.stop(now + 0.1);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Metallic switch / button click
  public playClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      // Low impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain);

      // Noise burst for mechanical latch
      const bufferSize = this.ctx.sampleRate * 0.05;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(2200, now);
      noiseFilter.Q.setValueAtTime(3, now);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.12, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      osc.start(now);
      noise.start(now);
      osc.stop(now + 0.18);
    } catch {}
  }

  // Visceral Gore + Heavy Blast for PLAY button
  public playPlayClick() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;

      // 1. Deep Sub-impact (Doom boom)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, now);
      subOsc.frequency.exponentialRampToValueAtTime(25, now + 0.6);

      subGain.gain.setValueAtTime(0.4, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      subOsc.connect(subGain);
      subGain.connect(this.masterGain);
      subOsc.start(now);
      subOsc.stop(now + 0.7);

      // 2. Fleshy / Blood Squish filter sweep
      const squishOsc = this.ctx.createOscillator();
      const squishGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.3);

      squishOsc.type = 'sawtooth';
      squishOsc.frequency.setValueAtTime(70, now);
      squishOsc.frequency.linearRampToValueAtTime(140, now + 0.15);
      squishOsc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

      squishGain.gain.setValueAtTime(0.25, now);
      squishGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      squishOsc.connect(filter);
      filter.connect(squishGain);
      squishGain.connect(this.masterGain);

      squishOsc.start(now);
      squishOsc.stop(now + 0.4);

      // 3. Eerie warning harmonic
      const alarmOsc = this.ctx.createOscillator();
      const alarmGain = this.ctx.createGain();
      alarmOsc.type = 'triangle';
      alarmOsc.frequency.setValueAtTime(440, now);
      alarmOsc.frequency.exponentialRampToValueAtTime(220, now + 0.8);
      alarmGain.gain.setValueAtTime(0.12, now);
      alarmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      alarmOsc.connect(alarmGain);
      alarmGain.connect(this.masterGain);
      alarmOsc.start(now);
      alarmOsc.stop(now + 0.9);
    } catch {}
  }

  // Equipment / Gun rack cocking / metal slide sound
  public playEquipSound() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      const now = this.ctx.currentTime;
      // Rack slide 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(650, now);
      osc1.frequency.linearRampToValueAtTime(1100, now + 0.08);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.11);

      // Heavy lock click at +0.12s
      setTimeout(() => {
        if (!this.ctx || !this.masterGain || this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(320, t);
        osc2.frequency.exponentialRampToValueAtTime(80, t + 0.12);
        gain2.gain.setValueAtTime(0.2, t);
        gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
        osc2.connect(gain2);
        gain2.connect(this.masterGain);
        osc2.start(t);
        osc2.stop(t + 0.14);
      }, 110);
    } catch {}
  }

  // Dark industrial bunker ambient drone
  public startAmbient() {
    if (this.isAmbientRunning) return;
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);

      // Low hum
      const humOsc = this.ctx.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.setValueAtTime(55, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      humOsc.connect(filter);
      filter.connect(this.ambientGain);
      humOsc.start();

      this.isAmbientRunning = true;
    } catch {}
  }

  public stopAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
    }
    this.isAmbientRunning = false;
  }
}

export const sound = new SoundEngine();
