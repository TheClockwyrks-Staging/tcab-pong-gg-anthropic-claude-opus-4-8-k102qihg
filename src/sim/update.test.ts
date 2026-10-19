import { describe, expect, it, vi } from "vitest";
import { update } from "./update";
import type { UpdateEffects } from "./update";
import { emptyInputFrame } from "./input";
import type { ActionName, InputFrame } from "./input";
import { createTitleState, type GameState } from "./state";
import { menuItemRect } from "./menu";
import { FIELD_CY, HOLD_TIME } from "../constants";

function press(...actions: ActionName[]): InputFrame {
  const f = emptyInputFrame();
  for (const a of actions) {
    f.pressed[a] = true;
    f.held[a] = true;
  }
  return f;
}

function hold(...actions: ActionName[]): InputFrame {
  const f = emptyInputFrame();
  for (const a of actions) f.held[a] = true;
  return f;
}

const effects: UpdateEffects = { cue: () => {}, toggleMute: () => {} };

describe("simTime", () => {
  it("accumulates on every screen", () => {
    const s = createTitleState(false);
    update(s, emptyInputFrame(), 0.5, effects);
    update(s, emptyInputFrame(), 0.25, effects);
    expect(s.simTime).toBeCloseTo(0.75, 6);
  });
});

describe("title menu navigation", () => {
  it("wraps upward from the first item", () => {
    const s = createTitleState(false);
    update(s, press("p1-up"), 0.016, effects);
    expect(s.menuIndex).toBe(2);
  });
  it("moves down and wraps", () => {
    const s = createTitleState(false);
    update(s, press("p2-down"), 0.016, effects);
    expect(s.menuIndex).toBe(1);
  });
  it("a frame with both up and down moves up only", () => {
    const s = createTitleState(false);
    s.menuIndex = 1;
    update(s, press("p1-up", "p1-down"), 0.016, effects);
    expect(s.menuIndex).toBe(0);
  });
  it("confirm on SOLO starts a solo match", () => {
    const s = createTitleState(false);
    s.menuIndex = 0;
    update(s, press("confirm"), 0.016, effects);
    expect(s.screen).toBe("countdown");
    expect(s.mode).toBe("solo");
    expect(s.titleIndex).toBe(0);
  });
  it("confirm on HOW TO PLAY opens howto", () => {
    const s = createTitleState(false);
    s.menuIndex = 2;
    update(s, press("confirm"), 0.016, effects);
    expect(s.screen).toBe("howto");
    expect(s.menuIndex).toBe(0);
    expect(s.titleIndex).toBe(2);
  });
  it("a movement+confirm frame moves only", () => {
    const s = createTitleState(false);
    update(s, press("p1-down", "confirm"), 0.016, effects);
    expect(s.menuIndex).toBe(1);
    expect(s.screen).toBe("title");
  });
});

describe("howto", () => {
  it("returns to the title on back", () => {
    const s = createTitleState(false);
    s.screen = "howto";
    s.titleIndex = 2;
    update(s, press("back"), 0.016, effects);
    expect(s.screen).toBe("title");
    expect(s.menuIndex).toBe(2);
  });
});

describe("countdown and serving", () => {
  function started(): GameState {
    const s = createTitleState(false);
    s.screen = "countdown";
    s.ball!.holdTimer = HOLD_TIME;
    return s;
  }
  it("counts down the hold timer", () => {
    const s = started();
    update(s, emptyInputFrame(), 0.3, effects);
    expect(s.ball!.holdTimer).toBeCloseTo(0.7, 5);
    expect(s.screen).toBe("countdown");
  });
  it("serves and switches to playing when the timer elapses", () => {
    const s = started();
    s.ball!.holdTimer = 0.1;
    update(s, emptyInputFrame(), 0.2, effects);
    expect(s.ball!.held).toBe(false);
    expect(s.screen).toBe("playing");
  });
  it("moves the human paddle during countdown", () => {
    const s = started();
    update(s, hold("p1-down"), 0.1, effects);
    expect(s.paddles.left.cy).toBeGreaterThan(FIELD_CY);
  });
});

describe("pause", () => {
  it("opens from playing and holds state", () => {
    const s = createTitleState(false);
    s.screen = "playing";
    update(s, press("pause"), 0.016, effects);
    expect(s.screen).toBe("paused");
    expect(s.resumeScreen).toBe("playing");
    expect(s.menuIndex).toBe(0);
  });
  it("Escape opens the pause menu and leaves it open", () => {
    const s = createTitleState(false);
    s.screen = "playing";
    // Escape raises both pause and back on the same frame.
    update(s, press("pause", "back"), 0.016, effects);
    expect(s.screen).toBe("paused");
  });
  it("resumes once on a single Escape from paused", () => {
    const s = createTitleState(false);
    s.screen = "paused";
    s.resumeScreen = "playing";
    update(s, press("pause", "back"), 0.016, effects);
    expect(s.screen).toBe("playing");
  });
  it("RESTART from pause starts a fresh match", () => {
    const s = createTitleState(false);
    s.mode = "versus";
    s.screen = "paused";
    s.score = { p1: 5, p2: 3 };
    s.menuIndex = 1;
    update(s, press("confirm"), 0.016, effects);
    expect(s.screen).toBe("countdown");
    expect(s.score).toEqual({ p1: 0, p2: 0 });
    expect(s.mode).toBe("versus");
  });
  it("QUIT returns to the title", () => {
    const s = createTitleState(false);
    s.screen = "paused";
    s.menuIndex = 2;
    update(s, press("confirm"), 0.016, effects);
    expect(s.screen).toBe("title");
  });
});

describe("matchover", () => {
  it("PLAY AGAIN restarts in the same mode", () => {
    const s = createTitleState(false);
    s.screen = "matchover";
    s.mode = "solo";
    s.winner = "left";
    s.menuIndex = 0;
    update(s, press("confirm"), 0.016, effects);
    expect(s.screen).toBe("countdown");
    expect(s.winner).toBeNull();
  });
  it("MENU returns to the title", () => {
    const s = createTitleState(false);
    s.screen = "matchover";
    s.menuIndex = 1;
    update(s, press("confirm"), 0.016, effects);
    expect(s.screen).toBe("title");
  });
});

describe("mute", () => {
  it("toggles on every screen", () => {
    const s = createTitleState(false);
    const toggleMute = vi.fn();
    update(s, press("mute"), 0.016, { cue: () => {}, toggleMute });
    expect(toggleMute).toHaveBeenCalledOnce();
  });
});

describe("pointer menu", () => {
  it("selects an item on hover", () => {
    const s = createTitleState(false);
    const r = menuItemRect(s, 1)!;
    const f = emptyInputFrame();
    f.pointer = {
      x: r.x + r.w / 2,
      y: r.y + r.h / 2,
      moved: true,
      pressed: false,
      released: false,
      downX: 0,
      downY: 0,
    };
    update(s, f, 0.016, effects);
    expect(s.menuIndex).toBe(1);
  });
  it("confirms on a press+release inside one item", () => {
    const s = createTitleState(false);
    const r = menuItemRect(s, 0)!;
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const f = emptyInputFrame();
    f.pointer = {
      x: cx,
      y: cy,
      moved: true,
      pressed: true,
      released: true,
      downX: cx,
      downY: cy,
    };
    update(s, f, 0.016, effects);
    expect(s.screen).toBe("countdown");
  });
  it("does not confirm when press and release fall in different items", () => {
    const s = createTitleState(false);
    const r0 = menuItemRect(s, 0)!;
    const r1 = menuItemRect(s, 1)!;
    const f = emptyInputFrame();
    f.pointer = {
      x: r1.x + r1.w / 2,
      y: r1.y + r1.h / 2,
      moved: true,
      pressed: true,
      released: true,
      downX: r0.x + r0.w / 2,
      downY: r0.y + r0.h / 2,
    };
    update(s, f, 0.016, effects);
    expect(s.screen).toBe("title");
    expect(s.menuIndex).toBe(1);
  });
});
