// The runtime: the canvas fit, the frame loop and its delta time, and the Game
// host that owns the state, runs updates, and backs the debug surface.

import { Audio } from "./audio";
import { FIELD_H, FIELD_W } from "./constants";
import type { DebugHost } from "./debug";
import { Input } from "./input";
import type { ToLogical } from "./input";
import { Overlay } from "./overlay";
import { render } from "./render";
import type { Cue } from "./sim/physics";
import { createTitleState } from "./sim/state";
import type { GameState } from "./sim/state";
import { update } from "./sim/update";
import type { UpdateEffects } from "./sim/update";

/** The largest delta time a single frame is allowed to represent, in seconds. */
const MAX_FRAME_DT = 1 / 20;

export class Game implements DebugHost {
  state: GameState;

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly audio = new Audio();
  private readonly overlay = new Overlay();
  private readonly input: Input;

  // Canvas fit: uniform scale and letterbox offsets, in CSS pixels.
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;
  private dpr = 1;

  private autoStep = true;
  private lastTime = 0;

  private readonly effects: UpdateEffects;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;

    this.state = createTitleState(this.audio.isMuted());

    const toLogical: ToLogical = (clientX, clientY) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left - this.offsetX) / this.scale;
      const y = (clientY - rect.top - this.offsetY) / this.scale;
      return { x, y };
    };
    this.input = new Input(canvas, toLogical);
    this.input.onGesture = () => this.audio.arm();

    this.effects = {
      cue: (cue: Cue) => this.audio.play(cue),
      toggleMute: () => {
        this.audio.toggleMuted();
        this.state.muted = this.audio.isMuted();
      },
    };

    this.registerDiagnostics();
  }

  start(): void {
    this.input.attach();
    this.overlay.attach();
    window.addEventListener("resize", () => this.fit());
    this.fit();
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  private registerDiagnostics(): void {
    const o = this.overlay;
    const n = (v: number) => v.toFixed(0);
    o.register("screen", () => this.state.screen);
    o.register("mode", () => this.state.mode);
    o.register("score", () => `${this.state.score.p1}-${this.state.score.p2}`);
    o.register("ball.pos", () => {
      const b = this.state.ball;
      return b ? `${n(b.x)}, ${n(b.y)}` : "—";
    });
    o.register("ball.vel", () => {
      const b = this.state.ball;
      return b ? `${n(b.vx)}, ${n(b.vy)}` : "—";
    });
    o.register("ball.speed", () => {
      const b = this.state.ball;
      return b ? n(Math.hypot(b.vx, b.vy)) : "—";
    });
    o.register("ball.spin", () => {
      const b = this.state.ball;
      return b ? n(b.spin) : "—";
    });
    o.register(
      "pad.L",
      () =>
        `cy ${n(this.state.paddles.left.cy)} vy ${n(this.state.paddles.left.vy)}`,
    );
    o.register(
      "pad.R",
      () =>
        `cy ${n(this.state.paddles.right.cy)} vy ${n(this.state.paddles.right.vy)}`,
    );
  }

  /** Fit the fixed logical field onto the canvas element and window. */
  private fit(): void {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.scale = Math.min(cssW / FIELD_W, cssH / FIELD_H);
    this.offsetX = (cssW - FIELD_W * this.scale) / 2;
    this.offsetY = (cssH - FIELD_H * this.scale) / 2;
  }

  private readonly frame = (now: number): void => {
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.autoStep) {
      const dt = Math.min(Math.max(rawDt, 0), MAX_FRAME_DT);
      this.step(dt);
    }
    this.draw();
    requestAnimationFrame(this.frame);
  };

  /** One simulation step for dt seconds: read input, update, mirror mute. */
  private step(dt: number): void {
    const input = this.input.sample();
    this.state.muted = this.audio.isMuted();
    update(this.state, input, dt, this.effects);
    this.state.muted = this.audio.isMuted();
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // Letterbox bars are the field background color.
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);
    // Clip to the field so nothing spills into the letterbox.
    ctx.beginPath();
    ctx.rect(0, 0, FIELD_W, FIELD_H);
    ctx.clip();
    render(ctx, this.state);
    ctx.restore();

    this.overlay.draw(ctx);
  }

  // --- DebugHost ----------------------------------------------------------

  setAutoStep(enabled: boolean): void {
    this.autoStep = enabled;
    this.lastTime = performance.now();
  }

  isAutoStep(): boolean {
    return this.autoStep;
  }

  advance(seconds: number, frames: number): void {
    const f = Math.max(1, Math.floor(frames));
    const per = seconds / f;
    for (let i = 0; i < f; i++) {
      this.step(per);
      this.draw();
    }
  }

  reset(): void {
    const muted = this.audio.isMuted();
    this.state = createTitleState(muted);
  }

  reconcile(): void {
    // Speed is derived at the read, so there is no stored copy to rebuild.
    this.state.muted = this.audio.isMuted();
  }

  setMuted(muted: boolean): void {
    this.audio.setMuted(muted);
    this.state.muted = muted;
  }
}
