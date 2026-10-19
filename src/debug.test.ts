import { describe, expect, it } from "vitest";
import { createDebug, type DebugHost } from "./debug";
import { createTitleState, type GameState } from "./sim/state";
import { update } from "./sim/update";
import { emptyInputFrame } from "./sim/input";
import { CAROM_DEBUG_VERSION, HOLD_TIME, OBSTACLE_CENTERS } from "./constants";

/** A minimal host that steps the real update, like the runtime does. */
function makeHost(): DebugHost & { auto: boolean } {
  const host = {
    state: createTitleState(false) as GameState,
    auto: true,
    setAutoStep(enabled: boolean) {
      this.auto = enabled;
    },
    isAutoStep() {
      return this.auto;
    },
    advance(seconds: number, frames: number) {
      const f = Math.max(1, Math.floor(frames));
      for (let i = 0; i < f; i++) {
        update(this.state, emptyInputFrame(), seconds / f);
      }
    },
    reset() {
      const muted = this.state.muted;
      this.state = createTitleState(muted);
    },
    reconcile() {},
    setMuted(muted: boolean) {
      this.state.muted = muted;
    },
  };
  return host;
}

describe("debug surface", () => {
  it("reports version and a full snapshot", () => {
    const c = createDebug(makeHost());
    const snap = c.snapshot() as { version: number; screen: string };
    expect(c.version).toBe(CAROM_DEBUG_VERSION);
    expect(snap.version).toBe(CAROM_DEBUG_VERSION);
    expect(snap.screen).toBe("title");
  });

  it("round-trips every posed field through the snapshot", () => {
    const c = createDebug(makeHost());
    c.setScreen("playing");
    c.setMode("versus");
    c.setMenuIndex(3);
    c.setTitleIndex(1);
    c.setResumeScreen("countdown");
    c.setScore(4, 7);
    c.setWinner("right");
    c.setReceiver("right");
    c.setPaddleCy("left", 200);
    c.setPaddleVy("right", 333);
    c.setPaddleDriven("left", true);
    c.setBallPosition(100, 120);
    c.setBallVelocity(300, -40);
    c.setBallSpin(55);
    c.setBallHeld(false);
    c.setBallHoldTimer(0.4);
    c.setBallServeSign(-1);
    c.setAiTracking(false);
    c.setAiMovement(false);
    c.setMuted(true);

    const s = c.snapshot() as Record<string, unknown> & {
      score: { p1: number; p2: number };
      paddles: {
        left: { cy: number; driven: boolean };
        right: { drivenVy: number };
      };
      ball: {
        x: number;
        speed: number;
        spin: number;
        held: boolean;
        serveSign: number;
      };
      ai: { tracking: boolean; movement: boolean };
    };
    expect(s.screen).toBe("playing");
    expect(s.mode).toBe("versus");
    expect(s.menuIndex).toBe(3);
    expect(s.titleIndex).toBe(1);
    expect(s.resumeScreen).toBe("countdown");
    expect(s.score).toEqual({ p1: 4, p2: 7 });
    expect(s.winner).toBe("right");
    expect(s.receiver).toBe("right");
    expect(s.paddles.left.cy).toBe(200);
    expect(s.paddles.left.driven).toBe(true);
    expect(s.paddles.right.drivenVy).toBe(333);
    expect(s.ball.x).toBe(100);
    expect(s.ball.speed).toBeCloseTo(Math.hypot(300, -40), 6);
    expect(s.ball.spin).toBe(55);
    expect(s.ball.held).toBe(false);
    expect(s.ball.serveSign).toBe(-1);
    expect(s.ai.tracking).toBe(false);
    expect(s.ai.movement).toBe(false);
    expect(s.muted).toBe(true);
  });

  it("clears and repopulates the world", () => {
    const c = createDebug(makeHost());
    c.clearWorld();
    let s: { ball: unknown; obstacles: { index: number }[] } = c.snapshot() as {
      ball: unknown;
      obstacles: { index: number }[];
    };
    expect(s.ball).toBeNull();
    expect(s.obstacles.length).toBe(0);

    c.spawnBall();
    c.spawnObstacle(0);
    c.spawnObstacle(1);
    s = c.snapshot() as { ball: unknown; obstacles: { index: number }[] };
    expect(s.ball).not.toBeNull();
    expect(s.obstacles.map((o) => o.index)).toEqual([0, 1]);
  });

  it("fails loudly posing a ball that is absent", () => {
    const c = createDebug(makeHost());
    c.clearWorld();
    expect(() => c.setBallPosition(1, 2)).toThrow();
    expect(() => c.setBallSpin(1)).toThrow();
  });

  it("fails loudly spawning an unknown obstacle", () => {
    const c = createDebug(makeHost());
    expect(() => c.spawnObstacle(5)).toThrow();
  });

  it("drives a paddle at its drivenVy, leaving vy to the frame", () => {
    const host = makeHost();
    const c = createDebug(host);
    c.setAutoStep(false);
    c.setScreen("playing");
    c.setPaddleDriven("left", true);
    c.setPaddleVy("left", 200);
    const before = (c.snapshot() as { paddles: { left: { vy: number } } })
      .paddles.left.vy;
    expect(before).toBe(0);
    c.advance(0.1, 1);
    const after = c.snapshot() as {
      paddles: { left: { cy: number; vy: number } };
    };
    expect(after.paddles.left.vy).toBe(200);
    expect(after.paddles.left.cy).toBeGreaterThan(360);
  });

  it("serves through the real rule on the next advanced frame", () => {
    const c = createDebug(makeHost());
    c.setAutoStep(false);
    c.setScreen("countdown");
    c.setReceiver("left");
    c.setBallHoldTimer(0);
    c.advance(0.016, 1);
    const s = c.snapshot() as { screen: string; ball: { held: boolean } };
    expect(s.ball.held).toBe(false);
    expect(s.screen).toBe("playing");
  });

  it("reset returns to title but keeps mute and autoStep", () => {
    const c = createDebug(makeHost());
    c.setMuted(true);
    c.setAutoStep(false);
    c.setScreen("playing");
    c.setScore(5, 5);
    c.reset();
    const s = c.snapshot() as {
      screen: string;
      score: { p1: number };
      muted: boolean;
      autoStep: boolean;
    };
    expect(s.screen).toBe("title");
    expect(s.score.p1).toBe(0);
    expect(s.muted).toBe(true);
    expect(s.autoStep).toBe(false);
  });

  it("menuItemRect answers for the current screen and null off-menu", () => {
    const c = createDebug(makeHost());
    c.setScreen("title");
    expect(c.menuItemRect(0)).not.toBeNull();
    expect(c.menuItemRect(9)).toBeNull();
    c.setScreen("playing");
    expect(c.menuItemRect(0)).toBeNull();
  });

  it("drawBallServeSign yields a valid sign", () => {
    const c = createDebug(makeHost());
    c.drawBallServeSign();
    const s = c.snapshot() as { ball: { serveSign: number } };
    expect([1, -1]).toContain(s.ball.serveSign);
  });

  it("knows the home point and hold time", () => {
    const c = createDebug(makeHost());
    c.spawnBall();
    const s = c.snapshot() as { ball: { holdTimer: number } };
    expect(s.ball.holdTimer).toBe(HOLD_TIME);
    expect(OBSTACLE_CENTERS.length).toBe(2);
  });
});
