// The ball's physics: sub-steps, spin, collisions, the paddle bounce, serving,
// and scoring. This is the render-free core; it reads nothing from a renderer.

import {
  BALL_R,
  FIELD_H,
  FIELD_W,
  MAX_BOUNCE_ANGLE,
  MAX_SUBSTEP,
  OBSTACLE_HH,
  OBSTACLE_HW,
  P1_X0,
  P1_X1,
  P2_X0,
  PADDLE_HALF,
  PADDLE_W,
  SPEED_CAP,
  SPEED_MULT,
  SPIN_CLAMP,
  SPIN_FROM_PADDLE,
  SPIN_HALFLIFE,
} from "../constants";
import type { Ball, GameState, Obstacle, Paddle } from "./state";

/** The cue names the audio layer plays. */
export type Cue = "paddle-hit" | "wall-bounce" | "obstacle-bounce" | "score";

export interface CueSink {
  (cue: Cue): void;
}

function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

/** Face of a circle-vs-rectangle contact. */
type Face = "left" | "right" | "top" | "bottom" | null;

/**
 * Resolve the ball against the axis-aligned rectangle [x0,x1]x[y0,y1] by the
 * expand-and-pick-smallest-penetration rule. Returns the struck face, or null
 * when the ball does not overlap. Repositions and reflects the normal component.
 */
function resolveRect(
  ball: Ball,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): Face {
  const insideX = ball.x > x0 - BALL_R && ball.x < x1 + BALL_R;
  const insideY = ball.y > y0 - BALL_R && ball.y < y1 + BALL_R;
  if (!insideX || !insideY) return null;

  const left = ball.x - (x0 - BALL_R);
  const right = x1 + BALL_R - ball.x;
  const top = ball.y - (y0 - BALL_R);
  const bottom = y1 + BALL_R - ball.y;

  // Smallest depth wins; ties resolve left, right, top, bottom.
  let face: Face = "left";
  let min = left;
  if (right < min) {
    face = "right";
    min = right;
  }
  if (top < min) {
    face = "top";
    min = top;
  }
  if (bottom < min) {
    face = "bottom";
  }

  switch (face) {
    case "left":
      ball.x = x0 - BALL_R;
      if (ball.vx > 0) ball.vx = -ball.vx;
      break;
    case "right":
      ball.x = x1 + BALL_R;
      if (ball.vx < 0) ball.vx = -ball.vx;
      break;
    case "top":
      ball.y = y0 - BALL_R;
      if (ball.vy > 0) ball.vy = -ball.vy;
      break;
    case "bottom":
      ball.y = y1 + BALL_R;
      if (ball.vy < 0) ball.vy = -ball.vy;
      break;
  }
  return face;
}

/** The paddle bounce: reflection angle, speed bump, spin, placement. */
function paddleBounce(
  ball: Ball,
  paddle: Paddle,
  dir: 1 | -1,
  frontX: number,
): void {
  const offset = clamp((ball.y - paddle.cy) / PADDLE_HALF, -1, 1);
  const theta = offset * MAX_BOUNCE_ANGLE;

  const speed = Math.min(Math.hypot(ball.vx, ball.vy) * SPEED_MULT, SPEED_CAP);
  ball.vx = dir * speed * Math.cos(theta);
  ball.vy = speed * Math.sin(theta);

  ball.spin = clamp(
    ball.spin + paddle.vy * SPIN_FROM_PADDLE,
    -SPIN_CLAMP,
    SPIN_CLAMP,
  );

  ball.x = frontX + dir * BALL_R;
}

/**
 * Resolve the ball against one paddle. A left/right face is a paddle hit (spin);
 * an end cap is resolved like a wall. Plays the matching cue.
 */
function resolvePaddle(
  ball: Ball,
  paddle: Paddle,
  side: "left" | "right",
  cue: CueSink,
): void {
  const x0 = side === "left" ? P1_X0 : P2_X0;
  const x1 = x0 + PADDLE_W;
  const y0 = paddle.cy - PADDLE_HALF;
  const y1 = paddle.cy + PADDLE_HALF;

  const face = resolveRect(ball, x0, x1, y0, y1);
  if (face === null) return;

  if (face === "left" || face === "right") {
    const dir = side === "left" ? 1 : -1;
    const frontX = side === "left" ? P1_X1 : P2_X0;
    paddleBounce(ball, paddle, dir, frontX);
    cue("paddle-hit");
  } else {
    // End cap: resolveRect already placed and reversed vy; it is a wall bounce.
    cue("wall-bounce");
  }
}

function resolveObstacle(ball: Ball, obstacle: Obstacle, cue: CueSink): void {
  const face = resolveRect(
    ball,
    obstacle.cx - OBSTACLE_HW,
    obstacle.cx + OBSTACLE_HW,
    obstacle.cy - OBSTACLE_HH,
    obstacle.cy + OBSTACLE_HH,
  );
  if (face !== null) cue("obstacle-bounce");
}

function resolveWalls(ball: Ball, cue: CueSink): void {
  if (ball.y - BALL_R < 0 && ball.vy < 0) {
    ball.y = BALL_R;
    ball.vy = -ball.vy;
    cue("wall-bounce");
  } else if (ball.y + BALL_R > FIELD_H && ball.vy > 0) {
    ball.y = FIELD_H - BALL_R;
    ball.vy = -ball.vy;
    cue("wall-bounce");
  }
}

/** Advance the ball over one frame in sub-steps, resolving all collisions. */
export function advanceBall(state: GameState, dt: number, cue: CueSink): void {
  const ball = state.ball;
  if (!ball || ball.held) return;

  const startSpeed = Math.hypot(ball.vx, ball.vy);
  const n = Math.max(1, Math.ceil((startSpeed * dt) / MAX_SUBSTEP));
  const h = dt / n;

  const left = state.paddles.left;
  const right = state.paddles.right;
  const obsA = state.obstacles.find((o) => o.index === 0) ?? null;
  const obsB = state.obstacles.find((o) => o.index === 1) ?? null;

  for (let i = 0; i < n; i++) {
    // 1. Spin turns the velocity.
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > 0) {
      const angle = (ball.spin / speed) * h;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = ball.vx * cos - ball.vy * sin;
      const vy = ball.vx * sin + ball.vy * cos;
      ball.vx = vx;
      ball.vy = vy;
    }

    // 2. Spin decays.
    ball.spin *= Math.pow(0.5, h / SPIN_HALFLIFE);

    // 3. Advance.
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    // 4. Collisions, in order.
    resolveWalls(ball, cue);
    resolvePaddle(ball, left, "left", cue);
    resolvePaddle(ball, right, "right", cue);
    if (obsA) resolveObstacle(ball, obsA, cue);
    if (obsB) resolveObstacle(ball, obsB, cue);
  }
}

/**
 * Detect and apply a scored point after the ball has been advanced. Returns the
 * scorer, or null. Does not change the screen or park the ball; the caller does.
 */
export function detectScore(state: GameState): Side | null {
  const ball = state.ball;
  if (!ball || ball.held) return null;
  if (ball.x - BALL_R > FIELD_W) return "left";
  if (ball.x + BALL_R < 0) return "right";
  return null;
}

export type Side = "left" | "right";
