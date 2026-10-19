// Menu layouts: the hit region of each item on each menu screen, in logical
// units. Shared by the renderer, the pointer selection, and `menuItemRect`.

import { FIELD_CX } from "../constants";
import type { GameState, Screen } from "./state";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ITEM_W = 460;
const ITEM_H = 64;
const ITEM_GAP = 20;

/** The items the given screen's menu shows, or null if it shows no menu. */
export function menuItems(state: GameState): readonly string[] | null {
  switch (state.screen) {
    case "title":
      return ["SOLO", "VERSUS", "HOW TO PLAY"];
    case "howto":
      return ["BACK"];
    case "paused":
      return ["RESUME", "RESTART", "QUIT TO MENU"];
    case "matchover":
      return ["PLAY AGAIN", "MENU"];
    default:
      return null;
  }
}

/** The y of the first menu item's top edge, by screen. */
function firstItemTop(screen: Screen, count: number): number {
  const block = count * ITEM_H + (count - 1) * ITEM_GAP;
  switch (screen) {
    case "title":
      return 330;
    case "howto":
      return 600;
    case "paused":
      return 300;
    case "matchover":
      return 420;
    default:
      return 360 - block / 2;
  }
}

/** The hit region of item `index` on the current screen, or null. */
export function menuItemRect(state: GameState, index: number): Rect | null {
  const items = menuItems(state);
  if (!items) return null;
  if (index < 0 || index >= items.length) return null;
  const top = firstItemTop(state.screen, items.length);
  const y = top + index * (ITEM_H + ITEM_GAP);
  return { x: FIELD_CX - ITEM_W / 2, y, w: ITEM_W, h: ITEM_H };
}

/** The item index whose region contains the point, or -1. */
export function itemAtPoint(state: GameState, px: number, py: number): number {
  const items = menuItems(state);
  if (!items) return -1;
  for (let i = 0; i < items.length; i++) {
    const r = menuItemRect(state, i);
    if (!r) continue;
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return i;
  }
  return -1;
}
