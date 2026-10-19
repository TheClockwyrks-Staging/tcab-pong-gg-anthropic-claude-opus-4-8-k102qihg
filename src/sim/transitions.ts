// Screen transitions: starting a match, returning to the title.

import { FIELD_CY, HOLD_TIME } from "../constants";
import { parkBall } from "./serving";
import type { GameState, Mode } from "./state";
import { makeObstacles, makeParkedBall } from "./state";

/** Start a match in the given mode, as `specs/ui.md` states. */
export function startMatch(state: GameState, mode: Mode): void {
  state.mode = mode;
  state.screen = "countdown";
  state.resumeScreen = "playing";
  state.menuIndex = 0;
  state.score.p1 = 0;
  state.score.p2 = 0;
  state.winner = null;
  state.receiver = "left";

  // Ensure the ball is present, then park it.
  if (!state.ball) state.ball = makeParkedBall();
  parkBall(state);
  if (state.ball) state.ball.holdTimer = HOLD_TIME;

  state.paddles.left.cy = FIELD_CY;
  state.paddles.left.vy = 0;
  state.paddles.right.cy = FIELD_CY;
  state.paddles.right.vy = 0;
}

/**
 * Return to the title. Restores every declared field to its title value except
 * titleIndex, simTime, and muted, which keep their values; menuIndex becomes
 * titleIndex.
 */
export function returnToTitle(state: GameState): void {
  state.screen = "title";
  state.mode = "solo";
  state.menuIndex = state.titleIndex;
  state.resumeScreen = "playing";
  state.score.p1 = 0;
  state.score.p2 = 0;
  state.winner = null;
  state.receiver = "left";

  state.paddles.left = { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 };
  state.paddles.right = { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 };
  state.ai = { tracking: true, movement: true };

  state.ball = makeParkedBall();
  state.obstacles = makeObstacles();
  // simTime and muted keep their values; titleIndex keeps its value.
}
