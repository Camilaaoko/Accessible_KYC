/**
 * AudioRadar provides real-time spatial audio pitch feedback, Geiger-counter audio clicks,
 * and spoken voice prompts for blind and low-vision users.
 */
export class AudioRadar {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private speechEnabled: boolean = true;
  private lastSpokenTime: number = 0;
  private lastSpokenPhrase: string = "";
  private lastGeigerClickTime: number = 0;

  constructor() {
    // AudioContext is initialized on user interaction
  }

  private initContext(): AudioContext | null {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    return this.ctx;
  }

  startRadar() {
    if (this.isPlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume();
    }

    try {
      this.osc = ctx.createOscillator();
      this.gain = ctx.createGain();

      this.osc.type = "sine";
      this.osc.frequency.setValueAtTime(320, ctx.currentTime);
      this.gain.gain.setValueAtTime(this.isMuted ? 0 : 0.04, ctx.currentTime);

      this.osc.connect(this.gain);
      this.gain.connect(ctx.destination);

      this.osc.start();
      this.isPlaying = true;
    } catch {
      // Audio context error handling
    }
  }

  stopRadar() {
    if (!this.isPlaying) return;
    try {
      this.osc?.stop();
      this.osc?.disconnect();
      this.gain?.disconnect();
    } catch {
      // Ignore cleanup error
    }
    this.osc = null;
    this.gain = null;
    this.isPlaying = false;
  }

  /**
   * Produces authentic Geiger-counter clicks that accelerate in pitch & frequency as user steers to center
   * @param distance Distance from face center (0.0 = perfect center, 0.5 = far edge)
   */
  updatePosition(distance: number) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    // Closeness normalized (0.0 = far away, 1.0 = dead center)
    const closeness = Math.max(0, Math.min(1, 1 - distance * 2.8));

    // 1. Continuous sine frequency (280 Hz up to 750 Hz)
    if (this.osc && this.gain && this.isPlaying) {
      const targetFreq = 280 + closeness * 470;
      this.osc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.05);
      const targetGain = 0.02 + closeness * 0.04;
      this.gain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
    }

    // 2. Geiger-counter audio clicks
    // Interval between clicks accelerates from 650ms (far) down to 60ms (centered)
    const clickIntervalMs = 650 - closeness * 580;
    const now = Date.now();
    if (now - this.lastGeigerClickTime >= clickIntervalMs) {
      this.lastGeigerClickTime = now;
      this.playGeigerClick(ctx, 400 + closeness * 600);
    }
  }

  private playGeigerClick(ctx: AudioContext, clickPitch: number) {
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(clickPitch, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.018);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.022);
    } catch {
      // Audio node cleanup
    }
  }

  playSuccessChime() {
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const playNote = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.2, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };

    // Major double-tone celebratory chime: E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    playNote(659.25, now, 0.25);
    playNote(783.99, now + 0.12, 0.35);
    playNote(1046.5, now + 0.28, 0.85);
  }

  playFailureTone() {
    const ctx = this.initContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.35);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  speakGuidance(phrase: string, force = false) {
    if (!this.speechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const now = Date.now();
    if (!force && phrase === this.lastSpokenPhrase && now - this.lastSpokenTime < 3500) {
      return;
    }
    if (!force && now - this.lastSpokenTime < 2200) {
      return;
    }

    this.lastSpokenPhrase = phrase;
    this.lastSpokenTime = now;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = this.isMuted ? 0 : 0.95;
    window.speechSynthesis.speak(utterance);
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.gain && this.ctx) {
      this.gain.gain.setValueAtTime(muted ? 0 : 0.04, this.ctx.currentTime);
    }
    if (muted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  setSpeechEnabled(enabled: boolean) {
    this.speechEnabled = enabled;
  }
}

export const audioRadarInstance = new AudioRadar();
