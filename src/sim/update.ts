// The per-frame update: read input, then advance the screen the input left us
// on. One update reads the input its starting screen reads; a screen reached
// this update takes its first input next update.

import { aiVy, humanVy, integratePaddle } from "./paddles";
import { advanceBall, detectScore } from "./physics";
import type { Cue, CueSink } from "./physics";
import { applyScore, recordTrail, serveBall } from "./serving";
import { startMatch, returnToTitle } from "./transitions";
import { itemAtPoint, menuItems } from "./menu";
import type { InputFrame } from "./input";
import type { GameState, Side } from "./state";

/** Side-effects a frame can request of the runtime (sounds, mute). */
export interface UpdateEffects {
  cue: CueSink;
  /** Called when the mute action toggles, so the runtime flips its bit. */
  toggleMute: () => void;
}

const noEffects: UpdateEffects = {
  cue: () => {},
  toggleMute: () => {},
};

function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/** Move both paddles for one frame (countdown and playing share this). */
function movePaddles(state: GameState, input: InputFrame, dt: number): void {
  const { left, right } = state.paddles;

  // Left paddle.
  if (left.driven) {
    integratePaddle(left, left.drivenVy, dt);
  } else {
    const up = input.held["p1-up"] || input.held["p2-up"];
    const down = input.held["p1-down"] || input.held["p2-down"];
    integratePaddle(left, humanVy(up, down), dt);
  }

  // Right paddle.
  if (right.driven) {
    integratePaddle(right, right.drivenVy, dt);
  } else if (state.mode === "solo") {
    const vy = aiVy(
      right,
      state.ball,
      state.screen,
      state.ai.tracking,
      state.ai.movement,
      dt,
    );
    integratePaddle(right, vy, dt);
  } else {
    integratePaddle(
      right,
      humanVy(input.held["p2-up"], input.held["p2-down"]),
      dt,
    );
  }
}

/** Confirm the current menu item on the current screen. */
function confirmItem(state: GameState, effects: UpdateEffects): void {
  const items = menuItems(state);
  if (!items) return;
  const label = items[state.menuIndex];
  switch (state.screen) {
    case "title":
      state.titleIndex = state.menuIndex;
      if (label === "SOLO") startMatch(state, "solo");
      else if (label === "VERSUS") startMatch(state, "versus");
      else if (label === "HOW TO PLAY") {
        state.screen = "howto";
        state.menuIndex = 0;
      }
      break;
    case "howto":
      returnToTitle(state);
      break;
    case "paused":
      if (label === "RESUME") state.screen = state.resumeScreen;
      else if (label === "RESTART") startMatch(state, state.mode);
      else if (label === "QUIT TO MENU") returnToTitle(state);
      break;
    case "matchover":
      if (label === "PLAY AGAIN") startMatch(state, state.mode);
      else if (label === "MENU") returnToTitle(state);
      break;
    default:
      break;
  }
  void effects;
}

/** Keyboard + pointer menu navigation for a menu screen. */
function updateMenu(
  state: GameState,
  input: InputFrame,
  effects: UpdateEffects,
): void {
  const items = menuItems(state);
  if (!items) return;
  const count = items.length;

  // On paused, pause/back are read before menu edges and resume on their own.
  if (state.screen === "paused") {
    if (input.pressed.pause || input.pressed.back) {
      state.screen = state.resumeScreen;
      return;
    }
  }

  if (state.screen === "howto") {
    if (input.pressed.confirm || input.pressed.back) {
      returnToTitle(state);
      return;
    }
  }

  if (state.screen === "matchover" && input.pressed.back) {
    returnToTitle(state);
    return;
  }

  // Movement edges (up before down; a frame with both moves up only).
  const up = input.pressed["p1-up"] || input.pressed["p2-up"];
  const down = input.pressed["p1-down"] || input.pressed["p2-down"];
  let moved = false;
  if (up) {
    state.menuIndex = wrap(state.menuIndex - 1, count);
    moved = true;
  } else if (down) {
    state.menuIndex = wrap(state.menuIndex + 1, count);
    moved = true;
  }

  // Keyboard confirm (only if no movement edge this frame).
  let keyboardConfirmed = false;
  if (!moved && input.pressed.confirm && state.screen !== "howto") {
    confirmItem(state, effects);
    keyboardConfirmed = true;
  }

  // Pointer/touch, applied after keyboard edges.
  const ptr = input.pointer;
  if (ptr) {
    // Hover/move or touch move selection.
    if (ptr.moved) {
      const hovered = itemAtPoint(state, ptr.x, ptr.y);
      if (hovered >= 0) state.menuIndex = hovered;
    }
    // A confirm requires both edges inside one item's region.
    if (ptr.released) {
      const downItem = ptr.pressed
        ? itemAtPoint(state, ptr.downX, ptr.downY)
        : itemAtPoint(state, ptr.downX, ptr.downY);
      const upItem = itemAtPoint(state, ptr.x, ptr.y);
      if (downItem >= 0 && downItem === upItem && !keyboardConfirmed) {
        state.menuIndex = upItem;
        confirmItem(state, effects);
      } else if (upItem >= 0) {
        state.menuIndex = upItem;
      }
    } else if (ptr.pressed) {
      const downItem = itemAtPoint(state, ptr.downX, ptr.downY);
      if (downItem >= 0) state.menuIndex = downItem;
    }
  }
}

/** Advance a countdown or playing frame: paddles, ball, scoring, trail. */
function advancePlay(
  state: GameState,
  input: InputFrame,
  effects: UpdateEffects,
  dt: number,
): void {
  // Pause edge opens the pause menu and leaves it open.
  if (input.pressed.pause) {
    state.resumeScreen = state.screen as "countdown" | "playing";
    state.screen = "paused";
    state.menuIndex = 0;
    return;
  }

  movePaddles(state, input, dt);

  const ball = state.ball;

  if (state.screen === "countdown") {
    if (ball && ball.held) {
      ball.holdTimer -= dt;
      if (ball.holdTimer <= 0) {
        ball.holdTimer = 0;
        serveBall(state);
        state.screen = "playing";
        // The ball is not advanced on the frame it is served.
        recordTrail(state);
        return;
      }
    }
    recordTrail(state);
    return;
  }

  // playing
  if (ball && !ball.held) {
    advanceBall(state, dt, effects.cue);
    const scorer: Side | null = detectScore(state);
    if (scorer) {
      effects.cue("score");
      applyScore(state, scorer);
      // After a point the ball is parked (countdown) or left (matchover).
    }
  }
  recordTrail(state);
}

/**
 * Run one whole update for `dt` seconds. Reads input first, then advances the
 * screen the input left us on.
 */
export function update(
  state: GameState,
  input: InputFrame,
  dt: number,
  effects: UpdateEffects = noEffects,
): void {
  state.simTime += dt;

  // Mute toggle is read on every screen.
  if (input.pressed.mute) {
    effects.toggleMute();
  }

  const screen = state.screen;
  if (screen === "countdown" || screen === "playing") {
    advancePlay(state, input, effects, dt);
  } else {
    updateMenu(state, input, effects);
  }
}

export type { Cue };
