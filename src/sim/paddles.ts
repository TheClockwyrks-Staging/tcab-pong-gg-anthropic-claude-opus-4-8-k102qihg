// Paddle movement: the single integration + clamp every mover shares, and the
// Solo AI's rule.

import {
  AI_DEADZONE,
  AI_HOME_DEADZONE,
  AI_HOME_Y,
  AI_REACT,
  AI_SPEED,
  PADDLE_MAX_CY,
  PADDLE_MIN_CY,
  PADDLE_SPEED,
} from "../constants";
import type { Ball, Paddle, Screen } from "./state";

function clamp(value: number, lo: number, hi: number): number {
  return value < lo ? lo : value > hi ? hi : value;
}

/**
 * Integrate a paddle given the vy a mover chose this frame. Sets vy to the
 * chosen value, integrates with clamping, and if the clamp bit, back-solves vy
 * to the paddle's actual velocity for the frame (0 when pinned against a bound).
 */
export function integratePaddle(paddle: Paddle, vy: number, dt: number): void {
  paddle.vy = vy;
  const next = clamp(paddle.cy + vy * dt, PADDLE_MIN_CY, PADDLE_MAX_CY);
  if (next !== paddle.cy + vy * dt && dt > 0) {
    paddle.vy = (next - paddle.cy) / dt;
  }
  paddle.cy = next;
}

/** A human paddle's chosen vy from its held up/down actions. */
export function humanVy(up: boolean, down: boolean): number {
  const axis = (down ? 1 : 0) - (up ? 1 : 0);
  return axis * PADDLE_SPEED;
}

/**
 * The AI's chosen vy for the right paddle. `tracking` and `movement` gate the
 * rule as the debug surface states.
 */
export function aiVy(
  paddle: Paddle,
  ball: Ball | null,
  screen: Screen,
  tracking: boolean,
  movement: boolean,
  dt: number,
): number {
  if (!movement) return 0;

  let target = AI_HOME_Y;
  let deadzone = AI_HOME_DEADZONE;
  if (tracking && screen === "playing" && ball && ball.vx > 0) {
    target = ball.y - ball.vy * AI_REACT;
    deadzone = AI_DEADZONE;
  }

  const diff = target - paddle.cy;
  if (Math.abs(diff) <= deadzone) return 0;
  if (dt <= 0) return 0;
  return Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff) / dt);
}
