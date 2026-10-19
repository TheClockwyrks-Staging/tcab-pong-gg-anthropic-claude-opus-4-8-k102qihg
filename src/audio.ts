// The audio layer: four short synthesized cues, a mute bit, and arming on the
// first real user gesture. No audio files; everything is generated with the
// Web Audio API.

import type { Cue } from "./sim/physics";

interface CueSpec {
  freq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  sweep: number;
}

const CUES: Record<Cue, CueSpec> = {
  "paddle-hit": {
    freq: 440,
    duration: 0.07,
    type: "square",
    gain: 0.18,
    sweep: 1.5,
  },
  "wall-bounce": {
    freq: 220,
    duration: 0.06,
    type: "triangle",
    gain: 0.14,
    sweep: 0.9,
  },
  "obstacle-bounce": {
    freq: 320,
    duration: 0.08,
    type: "sawtooth",
    gain: 0.12,
    sweep: 0.7,
  },
  score: { freq: 660, duration: 0.22, type: "sine", gain: 0.2, sweep: 2.0 },
};

export class Audio {
  private ctx: AudioContext | null = null;
  private muted = false;

  /** The game's readable copy of the mute bit. */
  isMuted(): boolean {
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  toggleMuted(): void {
    this.muted = !this.muted;
  }

  /** Arm the audio context on a real user gesture. Safe to call repeatedly. */
  arm(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    type Win = typeof globalThis & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const w = globalThis as Win;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
  }

  /** Play a cue by name. A muted game starts no sound at all. */
  play(cue: Cue): void {
    if (this.muted) return;
    const ctx = this.ctx;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const spec = CUES[cue];
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    osc.frequency.exponentialRampToValueAtTime(
      spec.freq * spec.sweep,
      now + spec.duration,
    );

    gain.gain.setValueAtTime(spec.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + spec.duration);
  }
}
