import { describe, expect, it } from "vitest";
import { aiVy, humanVy, integratePaddle } from "./paddles";
import { createTitleState, makeParkedBall, type Paddle } from "./state";
import {
  AI_HOME_Y,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
} from "../constants";

function paddle(cy = 360): Paddle {
  return { cy, vy: 0, driven: false, drivenVy: 0 };
}

describe("humanVy", () => {
  it("is zero with nothing held", () => {
    expect(humanVy(false, false)).toBe(0);
  });
  it("is negative moving up", () => {
    expect(humanVy(true, false)).toBe(-PADDLE_SPEED);
  });
  it("is positive moving down", () => {
    expect(humanVy(false, true)).toBe(PADDLE_SPEED);
  });
  it("is zero when both held", () => {
    expect(humanVy(true, true)).toBe(0);
  });
});

describe("integratePaddle", () => {
  it("moves and records velocity", () => {
    const p = paddle(360);
    integratePaddle(p, 720, 0.1);
    expect(p.cy).toBeCloseTo(432, 5);
    expect(p.vy).toBe(720);
  });
  it("clamps at the bottom and back-solves vy to the actual velocity", () => {
    const p = paddle(PADDLE_MAX_CY - 1);
    integratePaddle(p, 720, 0.1);
    expect(p.cy).toBe(PADDLE_MAX_CY);
    expect(p.vy).toBeCloseTo((PADDLE_MAX_CY - (PADDLE_MAX_CY - 1)) / 0.1, 5);
  });
  it("pins vy to 0 when already against a bound", () => {
    const p = paddle(PADDLE_MAX_CY);
    integratePaddle(p, 720, 0.1);
    expect(p.cy).toBe(PADDLE_MAX_CY);
    expect(p.vy).toBe(0);
  });
  it("clamps at the top", () => {
    const p = paddle(PADDLE_MIN_CY + 1);
    integratePaddle(p, -720, 0.1);
    expect(p.cy).toBe(PADDLE_MIN_CY);
  });
});

describe("aiVy", () => {
  it("returns zero when movement is off", () => {
    const p = paddle(100);
    expect(aiVy(p, null, "playing", true, false, 0.016)).toBe(0);
  });
  it("heads home when the ball moves away", () => {
    const p = paddle(100);
    const ball = makeParkedBall();
    ball.held = false;
    ball.vx = -300;
    const v = aiVy(p, ball, "playing", true, true, 0.016);
    // target is home (360) > 100, so vy positive.
    expect(v).toBeGreaterThan(0);
  });
  it("tracks the incoming ball with lead", () => {
    const p = paddle(360);
    const ball = makeParkedBall();
    ball.held = false;
    ball.vx = 300;
    ball.y = 500;
    ball.vy = 0;
    const v = aiVy(p, ball, "playing", true, true, 0.016);
    expect(v).toBeGreaterThan(0);
  });
  it("ignores the ball without tracking, targeting home", () => {
    const p = paddle(360 + 5);
    const ball = makeParkedBall();
    ball.held = false;
    ball.vx = 300;
    ball.y = 700;
    // Within home deadzone of 18 of AI_HOME_Y, so stationary.
    expect(aiVy(p, ball, "playing", false, true, 0.016)).toBe(0);
    expect(AI_HOME_Y).toBe(360);
  });
});

describe("title state", () => {
  it("opens with both paddles centered and AI faculties on", () => {
    const s = createTitleState(false);
    expect(s.paddles.left.cy).toBe(360);
    expect(s.paddles.right.cy).toBe(360);
    expect(s.ai.tracking).toBe(true);
    expect(s.ai.movement).toBe(true);
    expect(s.ball?.held).toBe(true);
    expect(s.obstacles.length).toBe(2);
  });
});
