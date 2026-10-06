class SoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private masterVolume: number = 0.8;
  private ambientGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol / 100));
  }

  // Soft tactile architectural tick / glass hover sound
  public playHover(volume = 0.05) {
    if (!this.isEnabled) return;
    const finalVol = volume * this.masterVolume;
    if (finalVol <= 0.0001) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      // High subtle water-like glass chime
      osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.04);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.Q.setValueAtTime(3, this.ctx.currentTime);

      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Clean brutalist click / water drop snap
  public playClick(volume = 0.12) {
    if (!this.isEnabled) return;
    const finalVol = volume * this.masterVolume;
    if (finalVol <= 0.0001) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.07);

      gain.gain.setValueAtTime(finalVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);

      // Micro glass harmonic ping
      const ping = this.ctx.createOscillator();
      const pingGain = this.ctx.createGain();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(1850, now);
      ping.frequency.exponentialRampToValueAtTime(1200, now + 0.06);

      pingGain.gain.setValueAtTime(finalVol * 0.35, now);
      pingGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

      ping.connect(pingGain);
      pingGain.connect(this.ctx.destination);

      ping.start(now);
      ping.stop(now + 0.065);
    } catch {
      // Ignore audio policy restriction
    }
  }

  // Modal open architectural whoosh
  public playModalTransition() {
    if (!this.isEnabled) return;
    const finalVol = 0.04 * this.masterVolume;
    if (finalVol <= 0.0001) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.14);

      gain.gain.setValueAtTime(finalVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundEngine();
