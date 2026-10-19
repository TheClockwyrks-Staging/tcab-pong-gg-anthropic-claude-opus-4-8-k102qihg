// Serving, parking, the trail, the win rule, and the after-a-point transition.

import {
  FIELD_CX,
  FIELD_CY,
  HOLD_TIME,
  SERVE_ANGLE,
  SERVE_SPEED,
  TRAIL_TIME,
  WIN_LEAD,
  WIN_SCORE,
} from "../constants";
import { drawServeSign } from "./state";
import type { GameState, Side } from "./state";

/** Park the ball at home: held, zero motion, empty trail, fresh serveSign. */
export function parkBall(state: GameState): void {
  const ball = state.ball;
  if (!ball) return;
  ball.x = FIELD_CX;
  ball.y = FIELD_CY;
  ball.vx = 0;
  ball.vy = 0;
  ball.spin = 0;
  ball.held = true;
  ball.holdTimer = HOLD_TIME;
  ball.trail = [];
  ball.serveSign = drawServeSign();
}

/** Serve the waiting ball toward `receiver`. */
export function serveBall(state: GameState): void {
  const ball = state.ball;
  if (!ball) return;
  ball.holdTimer = 0;
  ball.held = false;
  ball.trail = [];
  const dir = state.receiver === "left" ? -1 : 1;
  ball.vx = dir * SERVE_SPEED * Math.cos(SERVE_ANGLE);
  ball.vy = ball.serveSign * SERVE_SPEED * Math.sin(SERVE_ANGLE);
}

/** Append a trail sample and drop every sample older than TRAIL_TIME. */
export function recordTrail(state: GameState): void {
  const ball = state.ball;
  if (!ball) return;
  ball.trail.push({ x: ball.x, y: ball.y, t: state.simTime });
  const cutoff = state.simTime - TRAIL_TIME;
  while (ball.trail.length > 0 && ball.trail[0].t < cutoff) {
    ball.trail.shift();
  }
}

/** Whether the win rule holds for the given scorer. */
export function winRuleHolds(state: GameState): boolean {
  const { p1, p2 } = state.score;
  if (p1 >= WIN_SCORE && p1 - p2 >= WIN_LEAD) return true;
  if (p2 >= WIN_SCORE && p2 - p1 >= WIN_LEAD) return true;
  return false;
}

/** Apply a scored point: increment, then win-or-countdown transition. */
export function applyScore(state: GameState, scorer: Side): void {
  if (scorer === "left") state.score.p1 += 1;
  else state.score.p2 += 1;

  if (winRuleHolds(state)) {
    state.winner = scorer;
    state.screen = "matchover";
    state.menuIndex = 0;
    // The ball is left where it is.
    return;
  }

  parkBall(state);
  state.receiver = scorer === "left" ? "right" : "left";
  if (state.ball) state.ball.holdTimer = HOLD_TIME;
  state.screen = "countdown";
}
