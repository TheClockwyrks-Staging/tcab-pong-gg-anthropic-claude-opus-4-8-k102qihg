import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { render } from "./render";
import { createTitleState, makeParkedBall, type Screen } from "./sim/state";
import { FIELD_H, FIELD_W } from "./constants";

function ctx() {
  const canvas = createCanvas(FIELD_W, FIELD_H);
  return canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
}

describe("render", () => {
  const screens: Screen[] = [
    "title",
    "howto",
    "playing",
    "countdown",
    "paused",
    "matchover",
  ];

  for (const screen of screens) {
    it(`draws the ${screen} screen without throwing`, () => {
      const c = ctx();
      const state = createTitleState(false);
      state.screen = screen;
      if (screen === "matchover") state.winner = "right";
      if (screen === "countdown") {
        state.ball = makeParkedBall();
        state.ball.held = true;
      }
      expect(() => render(c, state)).not.toThrow();
    });
  }

  it("draws a flying ball with a trail", () => {
    const c = ctx();
    const state = createTitleState(false);
    state.screen = "playing";
    const ball = makeParkedBall();
    ball.held = false;
    ball.x = 400;
    ball.y = 300;
    ball.vx = 400;
    ball.trail = [
      { x: 380, y: 300, t: 0 },
      { x: 390, y: 300, t: 0.05 },
      { x: 400, y: 300, t: 0.1 },
    ];
    state.ball = ball;
    expect(() => render(c, state)).not.toThrow();
  });

  it("draws with a cleared world", () => {
    const c = ctx();
    const state = createTitleState(false);
    state.screen = "playing";
    state.ball = null;
    state.obstacles = [];
    expect(() => render(c, state)).not.toThrow();
  });
});
