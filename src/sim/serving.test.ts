import { describe, expect, it } from "vitest";
import {
  applyScore,
  parkBall,
  recordTrail,
  serveBall,
  winRuleHolds,
} from "./serving";
import { createTitleState, makeParkedBall, type GameState } from "./state";
import { FIELD_CX, FIELD_CY, HOLD_TIME, SERVE_SPEED } from "../constants";

function state(): GameState {
  const s = createTitleState(false);
  s.ball = makeParkedBall();
  return s;
}

describe("parkBall", () => {
  it("puts the ball at home, held, with no motion", () => {
    const s = state();
    s.ball!.x = 100;
    s.ball!.vx = 400;
    s.ball!.spin = 100;
    s.ball!.held = false;
    parkBall(s);
    expect(s.ball!.x).toBe(FIELD_CX);
    expect(s.ball!.y).toBe(FIELD_CY);
    expect(s.ball!.vx).toBe(0);
    expect(s.ball!.spin).toBe(0);
    expect(s.ball!.held).toBe(true);
    expect(s.ball!.holdTimer).toBe(HOLD_TIME);
    expect(s.ball!.trail.length).toBe(0);
  });
});

describe("serveBall", () => {
  it("serves toward left when the receiver is left", () => {
    const s = state();
    s.receiver = "left";
    s.ball!.serveSign = 1;
    serveBall(s);
    expect(s.ball!.held).toBe(false);
    expect(s.ball!.vx).toBeLessThan(0);
    expect(s.ball!.vy).toBeGreaterThan(0);
    expect(Math.hypot(s.ball!.vx, s.ball!.vy)).toBeCloseTo(SERVE_SPEED, 3);
  });
  it("serves toward right with an upward sign", () => {
    const s = state();
    s.receiver = "right";
    s.ball!.serveSign = -1;
    serveBall(s);
    expect(s.ball!.vx).toBeGreaterThan(0);
    expect(s.ball!.vy).toBeLessThan(0);
  });
});

describe("recordTrail", () => {
  it("appends samples and drops ones older than TRAIL_TIME", () => {
    const s = state();
    s.ball!.held = false;
    s.simTime = 0;
    recordTrail(s);
    s.simTime = 0.05;
    s.ball!.x = 10;
    recordTrail(s);
    s.simTime = 0.3;
    s.ball!.x = 20;
    recordTrail(s);
    // samples at t=0 and 0.05 are older than 0.3-0.13=0.17
    expect(s.ball!.trail.every((p) => p.t >= 0.17)).toBe(true);
    expect(s.ball!.trail.length).toBe(1);
  });
});

describe("winRuleHolds", () => {
  it("is false at 10-10", () => {
    const s = state();
    s.score = { p1: 10, p2: 10 };
    expect(winRuleHolds(s)).toBe(false);
  });
  it("needs a two-point lead at 11", () => {
    const s = state();
    s.score = { p1: 11, p2: 10 };
    expect(winRuleHolds(s)).toBe(false);
    s.score = { p1: 12, p2: 10 };
    expect(winRuleHolds(s)).toBe(true);
  });
});

describe("applyScore", () => {
  it("increments and parks for a countdown when the match continues", () => {
    const s = state();
    s.score = { p1: 3, p2: 2 };
    s.ball!.held = false;
    applyScore(s, "left");
    expect(s.score.p1).toBe(4);
    expect(s.screen).toBe("countdown");
    expect(s.receiver).toBe("right");
    expect(s.ball!.held).toBe(true);
    expect(s.ball!.holdTimer).toBe(HOLD_TIME);
  });
  it("ends the match and leaves the ball when the win rule holds", () => {
    const s = state();
    s.score = { p1: 10, p2: 5 };
    s.ball!.held = false;
    s.ball!.x = 1500;
    applyScore(s, "left");
    expect(s.score.p1).toBe(11);
    expect(s.screen).toBe("matchover");
    expect(s.winner).toBe("left");
    expect(s.menuIndex).toBe(0);
    expect(s.ball!.x).toBe(1500);
  });
});
