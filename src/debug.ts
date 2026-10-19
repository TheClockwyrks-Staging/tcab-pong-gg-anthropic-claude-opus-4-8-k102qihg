// The `window.__carom` debugging and automation surface. Every operation is a
// reading or a pose over the running game, so a scenario driven from code behaves
// exactly like one played by hand.

import { CAROM_DEBUG_VERSION, HOLD_TIME, OBSTACLE_CENTERS } from "./constants";
import { menuItemRect } from "./sim/menu";
import { makeParkedBall } from "./sim/state";
import type { GameState, Mode, Obstacle, Screen, Side } from "./sim/state";
import { drawServeSign } from "./sim/state";

/** What the debug surface needs of the host game. */
export interface DebugHost {
  readonly state: GameState;
  /** Take the game off / back onto the wall clock. */
  setAutoStep(enabled: boolean): void;
  isAutoStep(): boolean;
  /** Run `frames` whole frames covering `seconds` of game time. */
  advance(seconds: number, frames: number): void;
  /** Return the game to its title-screen state (keeps mute + autoStep). */
  reset(): void;
  /** Recompute any stored derived copies (e.g. ball speed) from the world. */
  reconcile(): void;
  /** Set the audio mute bit. */
  setMuted(muted: boolean): void;
}

function fail(message: string): never {
  throw new Error(`[__carom] ${message}`);
}

function requireBall(state: GameState) {
  if (!state.ball) fail("no ball on the playfield");
  return state.ball;
}

function speedOf(vx: number, vy: number): number {
  return Math.hypot(vx, vy);
}

export interface CaromDebug {
  version: number;
  setAutoStep(enabled: boolean): void;
  advance(seconds: number, frames?: number): void;
  clearWorld(): void;
  spawnBall(): void;
  spawnObstacle(index: number): void;
  reset(): void;
  reconcile(): void;
  setScreen(screen: Screen): void;
  setMode(mode: Mode): void;
  setMenuIndex(index: number): void;
  setTitleIndex(index: number): void;
  setResumeScreen(screen: "countdown" | "playing"): void;
  setScore(p1: number, p2: number): void;
  setWinner(side: Side | null): void;
  setReceiver(side: Side): void;
  setPaddleCy(side: Side, cy: number): void;
  setPaddleVy(side: Side, vy: number): void;
  setPaddleDriven(side: Side, driven: boolean): void;
  setBallPosition(x: number, y: number): void;
  setBallVelocity(vx: number, vy: number): void;
  setBallSpin(spin: number): void;
  setBallHeld(held: boolean): void;
  setBallHoldTimer(seconds: number): void;
  setBallServeSign(sign: 1 | -1): void;
  drawBallServeSign(): void;
  setAiTracking(enabled: boolean): void;
  setAiMovement(enabled: boolean): void;
  setMuted(muted: boolean): void;
  snapshot(): unknown;
  menuItemRect(
    index: number,
  ): { x: number; y: number; w: number; h: number } | null;
}

export function createDebug(host: DebugHost): CaromDebug {
  const s = () => host.state;

  function paddle(side: Side) {
    return side === "left" ? s().paddles.left : s().paddles.right;
  }

  return {
    version: CAROM_DEBUG_VERSION,

    setAutoStep(enabled: boolean): void {
      host.setAutoStep(enabled);
    },
    advance(seconds: number, frames = 1): void {
      host.advance(seconds, frames);
    },

    clearWorld(): void {
      s().ball = null;
      s().obstacles = [];
    },
    spawnBall(): void {
      const state = s();
      state.ball = makeParkedBall();
      state.ball.holdTimer = HOLD_TIME;
      host.reconcile();
    },
    spawnObstacle(index: number): void {
      if (index !== 0 && index !== 1) fail(`no obstacle index ${index}`);
      const [cx, cy] = OBSTACLE_CENTERS[index];
      const existing = s().obstacles.find((o: Obstacle) => o.index === index);
      if (existing) {
        existing.cx = cx;
        existing.cy = cy;
      } else {
        s().obstacles.push({ index, cx, cy });
        s().obstacles.sort((a: Obstacle, b: Obstacle) => a.index - b.index);
      }
    },
    reset(): void {
      host.reset();
    },
    reconcile(): void {
      host.reconcile();
    },

    setScreen(screen: Screen): void {
      s().screen = screen;
    },
    setMode(mode: Mode): void {
      s().mode = mode;
    },
    setMenuIndex(index: number): void {
      s().menuIndex = index;
    },
    setTitleIndex(index: number): void {
      s().titleIndex = index;
    },
    setResumeScreen(screen: "countdown" | "playing"): void {
      s().resumeScreen = screen;
    },

    setScore(p1: number, p2: number): void {
      s().score.p1 = p1;
      s().score.p2 = p2;
    },
    setWinner(side: Side | null): void {
      s().winner = side;
    },
    setReceiver(side: Side): void {
      s().receiver = side;
    },

    setPaddleCy(side: Side, cy: number): void {
      paddle(side).cy = cy;
    },
    setPaddleVy(side: Side, vy: number): void {
      paddle(side).drivenVy = vy;
    },
    setPaddleDriven(side: Side, driven: boolean): void {
      paddle(side).driven = driven;
    },

    setBallPosition(x: number, y: number): void {
      const b = requireBall(s());
      b.x = x;
      b.y = y;
    },
    setBallVelocity(vx: number, vy: number): void {
      const b = requireBall(s());
      b.vx = vx;
      b.vy = vy;
      host.reconcile();
    },
    setBallSpin(spin: number): void {
      requireBall(s()).spin = spin;
    },
    setBallHeld(held: boolean): void {
      requireBall(s()).held = held;
    },
    setBallHoldTimer(seconds: number): void {
      requireBall(s()).holdTimer = seconds;
    },
    setBallServeSign(sign: 1 | -1): void {
      requireBall(s()).serveSign = sign;
    },
    drawBallServeSign(): void {
      requireBall(s()).serveSign = drawServeSign();
    },

    setAiTracking(enabled: boolean): void {
      s().ai.tracking = enabled;
    },
    setAiMovement(enabled: boolean): void {
      s().ai.movement = enabled;
    },

    setMuted(muted: boolean): void {
      host.setMuted(muted);
    },

    snapshot(): unknown {
      const state = s();
      const b = state.ball;
      return {
        version: CAROM_DEBUG_VERSION,
        screen: state.screen,
        mode: state.mode,
        menuIndex: state.menuIndex,
        titleIndex: state.titleIndex,
        resumeScreen: state.resumeScreen,
        score: { p1: state.score.p1, p2: state.score.p2 },
        winner: state.winner,
        muted: state.muted,
        paddles: {
          left: {
            cy: state.paddles.left.cy,
            vy: state.paddles.left.vy,
            drivenVy: state.paddles.left.drivenVy,
            driven: state.paddles.left.driven,
          },
          right: {
            cy: state.paddles.right.cy,
            vy: state.paddles.right.vy,
            drivenVy: state.paddles.right.drivenVy,
            driven: state.paddles.right.driven,
          },
        },
        ai: { tracking: state.ai.tracking, movement: state.ai.movement },
        receiver: state.receiver,
        ball: b
          ? {
              x: b.x,
              y: b.y,
              vx: b.vx,
              vy: b.vy,
              speed: speedOf(b.vx, b.vy),
              spin: b.spin,
              held: b.held,
              holdTimer: b.holdTimer,
              serveSign: b.serveSign,
              trail: b.trail.map((t) => ({ x: t.x, y: t.y, t: t.t })),
            }
          : null,
        obstacles: state.obstacles.map((o) => ({
          index: o.index,
          cx: o.cx,
          cy: o.cy,
        })),
        autoStep: host.isAutoStep(),
        simTime: state.simTime,
      };
    },

    menuItemRect(index: number) {
      return menuItemRect(s(), index);
    },
  };
}
