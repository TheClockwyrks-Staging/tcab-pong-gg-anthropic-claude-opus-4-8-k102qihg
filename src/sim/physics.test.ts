import { describe, expect, it } from "vitest";
import { advanceBall, detectScore, type Cue } from "./physics";
import {
  createTitleState,
  makeObstacles,
  makeParkedBall,
  type GameState,
} from "./state";
import {
  BALL_R,
  FIELD_H,
  OBSTACLE_CENTERS,
  P1_X1,
  SPEED_CAP,
  SPEED_MULT,
} from "../constants";

function freshPlaying(): GameState {
  const s = createTitleState(false);
  s.screen = "playing";
  s.ball = makeParkedBall();
  s.ball.held = false;
  s.obstacles = makeObstacles();
  return s;
}

const noCue: (c: Cue) => void = () => {};

describe("ball advance", () => {
  it("travels in a straight line with no spin", () => {
    const s = freshPlaying();
    s.ball!.x = 640;
    s.ball!.y = 360;
    s.ball!.vx = 300;
    s.ball!.vy = 0;
    advanceBall(s, 0.1, noCue);
    expect(s.ball!.x).toBeCloseTo(670, 5);
    expect(s.ball!.y).toBeCloseTo(360, 5);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(300, 5);
  });

  it("reflects off the top wall and keeps speed", () => {
    const s = freshPlaying();
    s.ball!.x = 640;
    s.ball!.y = BALL_R + 1;
    s.ball!.vx = 0;
    s.ball!.vy = -400;
    advanceBall(s, 0.05, noCue);
    expect(s.ball!.vy).toBeGreaterThan(0);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(400, 3);
    expect(s.ball!.y).toBeGreaterThanOrEqual(BALL_R - 0.001);
  });

  it("reflects off the bottom wall", () => {
    const s = freshPlaying();
    s.ball!.x = 640;
    s.ball!.y = FIELD_H - BALL_R - 1;
    s.ball!.vy = 400;
    advanceBall(s, 0.05, noCue);
    expect(s.ball!.vy).toBeLessThan(0);
  });

  it("curves the velocity clockwise under positive spin", () => {
    const s = freshPlaying();
    s.ball!.x = 640;
    s.ball!.y = 360;
    s.ball!.vx = 300;
    s.ball!.vy = 0;
    s.ball!.spin = 900;
    advanceBall(s, 0.1, noCue);
    // +x toward +y is clockwise on screen: vy becomes positive.
    expect(s.ball!.vy).toBeGreaterThan(0);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(300, 0);
  });

  it("decays spin by half over a half-life", () => {
    const s = freshPlaying();
    s.ball!.vx = 10;
    s.ball!.vy = 0;
    s.ball!.spin = 400;
    advanceBall(s, 0.8, noCue);
    expect(Math.abs(s.ball!.spin)).toBeCloseTo(200, 0);
  });
});

describe("paddle bounce", () => {
  it("sends a center hit straight across and bumps speed", () => {
    const s = freshPlaying();
    s.paddles.left.cy = 360;
    s.ball!.x = P1_X1 + BALL_R + 2;
    s.ball!.y = 360;
    s.ball!.vx = -400;
    s.ball!.vy = 0;
    advanceBall(s, 0.02, noCue);
    expect(s.ball!.vx).toBeGreaterThan(0);
    expect(Math.abs(s.ball!.vy)).toBeLessThan(1);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(400 * SPEED_MULT, 1);
  });

  it("adds spin from a moving paddle", () => {
    const s = freshPlaying();
    s.paddles.left.cy = 360;
    s.paddles.left.vy = 500;
    s.ball!.x = P1_X1 + BALL_R + 2;
    s.ball!.y = 360;
    s.ball!.vx = -400;
    s.ball!.vy = 0;
    advanceBall(s, 0.02, noCue);
    expect(s.ball!.spin).toBeGreaterThan(0);
  });

  it("caps speed at SPEED_CAP", () => {
    const s = freshPlaying();
    s.paddles.left.cy = 360;
    s.ball!.x = P1_X1 + BALL_R + 2;
    s.ball!.y = 360;
    s.ball!.vx = -SPEED_CAP;
    s.ball!.vy = 0;
    advanceBall(s, 0.004, noCue);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeLessThanOrEqual(
      SPEED_CAP + 0.001,
    );
  });
});

describe("obstacles", () => {
  it("bounces the ball off an obstacle without changing speed", () => {
    const s = freshPlaying();
    const [cx, cy] = OBSTACLE_CENTERS[0];
    s.ball!.x = cx - 10 - BALL_R - 2;
    s.ball!.y = cy;
    s.ball!.vx = 400;
    s.ball!.vy = 0;
    const before = Math.hypot(s.ball!.vx, s.ball!.vy);
    advanceBall(s, 0.02, noCue);
    expect(s.ball!.vx).toBeLessThan(0);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(before, 3);
  });
});

describe("scoring", () => {
  it("detects a left score when the ball exits the right edge", () => {
    const s = freshPlaying();
    s.ball!.x = 1400;
    expect(detectScore(s)).toBe("left");
  });
  it("detects a right score when the ball exits the left edge", () => {
    const s = freshPlaying();
    s.ball!.x = -40;
    expect(detectScore(s)).toBe("right");
  });
  it("no score mid-field", () => {
    const s = freshPlaying();
    s.ball!.x = 640;
    expect(detectScore(s)).toBeNull();
  });
});

describe("determinism across step sizes", () => {
  function playOut(ms: number) {
    const s = freshPlaying();
    s.paddles.left.cy = 360;
    s.paddles.right.cy = 360;
    s.ball!.x = 640;
    s.ball!.y = 360;
    s.ball!.vx = 500;
    s.ball!.vy = 120;
    s.ball!.spin = 200;
    const dt = ms / 1000;
    const total = 1.2;
    let t = 0;
    while (t < total) {
      advanceBall(s, dt, noCue);
      t += dt;
    }
    return s.ball!;
  }
  it("agrees in speed within 10 u/s between 2ms and 16ms steps", () => {
    const a = playOut(2);
    const b = playOut(16);
    const sa = Math.hypot(a.vx, a.vy);
    const sb = Math.hypot(b.vx, b.vy);
    expect(Math.abs(sa - sb)).toBeLessThan(10);
  });
});
