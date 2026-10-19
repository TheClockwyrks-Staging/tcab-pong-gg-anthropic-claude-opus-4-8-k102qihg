// The game's state shape and its title-screen value. The build owns the shape
// entirely; what is fixed over it is the debug surface in `debug.ts`.

import { FIELD_CX, FIELD_CY, HOLD_TIME, OBSTACLE_CENTERS } from "../constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";

export type Mode = "solo" | "versus";
export type Side = "left" | "right";

export interface Paddle {
  cy: number;
  vy: number;
  driven: boolean;
  drivenVy: number;
}

export interface TrailSample {
  x: number;
  y: number;
  t: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  held: boolean;
  holdTimer: number;
  serveSign: 1 | -1;
  trail: TrailSample[];
}

export interface Obstacle {
  index: number;
  cx: number;
  cy: number;
}

export interface GameState {
  screen: Screen;
  mode: Mode;
  menuIndex: number;
  titleIndex: number;
  resumeScreen: Extract<Screen, "countdown" | "playing">;

  score: { p1: number; p2: number };
  winner: Side | null;
  receiver: Side;

  paddles: { left: Paddle; right: Paddle };
  ai: { tracking: boolean; movement: boolean };

  ball: Ball | null;
  obstacles: Obstacle[];

  simTime: number;
  muted: boolean;
}

/** Draw a fresh serve sign: 1 and -1 each equally likely. */
export function drawServeSign(): 1 | -1 {
  return Math.random() < 0.5 ? -1 : 1;
}

/** A newly parked ball: held, at home, zero motion, empty trail, fresh sign. */
export function makeParkedBall(): Ball {
  return {
    x: FIELD_CX,
    y: FIELD_CY,
    vx: 0,
    vy: 0,
    spin: 0,
    held: true,
    holdTimer: HOLD_TIME,
    serveSign: drawServeSign(),
    trail: [],
  };
}

/** Both obstacles present at their fixed centers. */
export function makeObstacles(): Obstacle[] {
  return OBSTACLE_CENTERS.map(([cx, cy], index) => ({
    index,
    cx,
    cy,
  }));
}

function makePaddle(): Paddle {
  return { cy: FIELD_CY, vy: 0, driven: false, drivenVy: 0 };
}

/** The title-screen state, as `specs/state.md` fixes it. */
export function createTitleState(muted: boolean): GameState {
  return {
    screen: "title",
    mode: "solo",
    menuIndex: 0,
    titleIndex: 0,
    resumeScreen: "playing",
    score: { p1: 0, p2: 0 },
    winner: null,
    receiver: "left",
    paddles: { left: makePaddle(), right: makePaddle() },
    ai: { tracking: true, movement: true },
    ball: makeParkedBall(),
    obstacles: makeObstacles(),
    simTime: 0,
    muted,
  };
}
