// Carom's entry point: build the game on the page's canvas, install the debug
// surface, and start the frame loop.

import { createDebug } from "./debug";
import type { CaromDebug } from "./debug";
import { Game } from "./runtime";

declare global {
  interface Window {
    __carom: CaromDebug;
  }
}

const canvas = document.getElementById("stage");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Carom: #stage canvas not found");
}

const game = new Game(canvas);
window.__carom = createDebug(game);
game.start();
