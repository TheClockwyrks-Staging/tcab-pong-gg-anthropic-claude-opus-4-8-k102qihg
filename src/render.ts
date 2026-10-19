// The renderer: draws the field, furniture, ball, trail, scores, and each
// screen's overlay. Everything is drawn in code as shapes and text.

import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_H,
  FIELD_W,
  NET_X,
  OBSTACLE_HH,
  OBSTACLE_HW,
  P1_X0,
  P2_X0,
  PADDLE_HALF,
  PADDLE_W,
  TITLE_TEXT,
} from "./constants";
import { menuItemRect, menuItems } from "./sim/menu";
import type { GameState } from "./sim/state";

const COLORS = {
  field: "#0a0e1a",
  net: "#1d2740",
  p1: "#39d6ff",
  p2: "#ff6b9d",
  obstacle: "#b78cff",
  ball: "#ffe66d",
  trail: "#ffe66d",
  text: "#e8edf7",
  dim: "#5c6687",
  accent: "#39d6ff",
  panel: "rgba(8, 12, 24, 0.82)",
};

type Ctx = CanvasRenderingContext2D;

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawNet(ctx: Ctx): void {
  ctx.save();
  ctx.strokeStyle = COLORS.net;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 22]);
  ctx.beginPath();
  ctx.moveTo(NET_X, 10);
  ctx.lineTo(NET_X, FIELD_H - 10);
  ctx.stroke();
  ctx.restore();
}

function withGlow(ctx: Ctx, color: string, blur: number, fn: () => void): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  fn();
  ctx.restore();
}

function drawPaddles(ctx: Ctx, state: GameState): void {
  const { left, right } = state.paddles;
  withGlow(ctx, COLORS.p1, 18, () => {
    roundRect(ctx, P1_X0, left.cy - PADDLE_HALF, PADDLE_W, PADDLE_HALF * 2, 8);
    ctx.fill();
  });
  withGlow(ctx, COLORS.p2, 18, () => {
    roundRect(ctx, P2_X0, right.cy - PADDLE_HALF, PADDLE_W, PADDLE_HALF * 2, 8);
    ctx.fill();
  });
}

function drawObstacles(ctx: Ctx, state: GameState): void {
  for (const o of state.obstacles) {
    withGlow(ctx, COLORS.obstacle, 16, () => {
      roundRect(
        ctx,
        o.cx - OBSTACLE_HW,
        o.cy - OBSTACLE_HH,
        OBSTACLE_HW * 2,
        OBSTACLE_HH * 2,
        7,
      );
      ctx.fill();
    });
  }
}

function drawTrail(ctx: Ctx, state: GameState): void {
  const ball = state.ball;
  if (!ball || ball.trail.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pts = ball.trail;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const frac = i / pts.length;
    ctx.strokeStyle = COLORS.trail;
    ctx.globalAlpha = 0.5 * frac;
    ctx.lineWidth = BALL_R * 2 * frac;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBall(ctx: Ctx, state: GameState): void {
  const ball = state.ball;
  if (!ball) return;
  withGlow(ctx, COLORS.ball, 22, () => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawScores(ctx: Ctx, state: GameState): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = "700 72px system-ui, sans-serif";
  ctx.fillStyle = COLORS.p1;
  ctx.fillText(String(state.score.p1), FIELD_CX - 120, 40);
  ctx.fillStyle = COLORS.p2;
  ctx.fillText(String(state.score.p2), FIELD_CX + 120, 40);

  ctx.font = "600 22px system-ui, sans-serif";
  ctx.fillStyle = COLORS.dim;
  const label = state.mode === "solo" ? "SOLO" : "VERSUS";
  ctx.fillText(label, FIELD_CX, 24);
  ctx.restore();
}

function drawField(ctx: Ctx, state: GameState, dim: boolean): void {
  drawNet(ctx);
  if (dim) ctx.globalAlpha = 0.35;
  drawObstacles(ctx, state);
  drawPaddles(ctx, state);
  drawTrail(ctx, state);
  drawBall(ctx, state);
  ctx.globalAlpha = 1;
}

function drawMenu(ctx: Ctx, state: GameState): void {
  const items = menuItems(state);
  if (!items) return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < items.length; i++) {
    const r = menuItemRect(state, i);
    if (!r) continue;
    const selected = i === state.menuIndex;
    if (selected) {
      ctx.save();
      ctx.shadowColor = COLORS.accent;
      ctx.shadowBlur = 20;
      ctx.fillStyle = "rgba(57, 214, 255, 0.14)";
      roundRect(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      roundRect(ctx, r.x, r.y, r.w, r.h, 12);
      ctx.stroke();
    }
    ctx.fillStyle = selected ? COLORS.text : COLORS.dim;
    ctx.font = selected
      ? "700 32px system-ui, sans-serif"
      : "600 28px system-ui, sans-serif";
    ctx.fillText(items[i], r.x + r.w / 2, r.y + r.h / 2);
  }
  ctx.restore();
}

function drawPanel(ctx: Ctx): void {
  ctx.save();
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);
  ctx.restore();
}

function drawTitle(ctx: Ctx, state: GameState): void {
  drawField(ctx, state, true);
  drawPanel(ctx);
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  withGlow(ctx, COLORS.accent, 30, () => {
    ctx.font = "800 120px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(TITLE_TEXT, FIELD_CX, 180);
  });
  ctx.fillStyle = COLORS.dim;
  ctx.font = "500 24px system-ui, sans-serif";
  ctx.fillText("A top-down paddle duel with spin", FIELD_CX, 262);
  ctx.restore();
  drawMenu(ctx, state);
}

function drawHowto(ctx: Ctx, state: GameState): void {
  drawField(ctx, state, true);
  drawPanel(ctx);
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.text;
  ctx.font = "800 64px system-ui, sans-serif";
  ctx.fillText("HOW TO PLAY", FIELD_CX, 90);

  ctx.textAlign = "left";
  ctx.font = "500 24px system-ui, sans-serif";
  const lines = [
    "CONTROLS",
    "  Player 1 (left):  W up / S down",
    "  Player 2 (right): Up / Down arrows",
    "  Solo: any up/down key drives your paddle; the AI takes the right.",
    "  Enter / Space confirm    Esc / P pause    M mute",
    "",
    "SPIN",
    "  A paddle moving as it strikes the ball curves the ball's flight.",
    "  Move down on contact to curve one way, up to curve the other.",
    "",
    "OBSTACLES",
    "  Two bars sit mid-field. Bank shots off them to beat your opponent.",
    "  First to 11, win by 2.",
  ];
  let y = 170;
  for (const line of lines) {
    ctx.fillStyle =
      /^[A-Z ]+$/.test(line) && line.trim() ? COLORS.accent : COLORS.text;
    ctx.fillText(line, FIELD_CX - 420, y);
    y += 32;
  }
  ctx.restore();
  drawMenu(ctx, state);
}

function drawPlaying(ctx: Ctx, state: GameState): void {
  drawField(ctx, state, false);
  drawScores(ctx, state);
}

function drawCountdown(ctx: Ctx, state: GameState): void {
  drawPlaying(ctx, state);
  const ball = state.ball;
  if (ball && ball.held) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.text;
    ctx.font = "800 96px system-ui, sans-serif";
    const n = Math.max(1, Math.ceil(ball.holdTimer));
    ctx.globalAlpha = 0.85;
    ctx.fillText(String(n), FIELD_CX, FIELD_CY - 120);
    ctx.restore();
  }
}

function drawPaused(ctx: Ctx, state: GameState): void {
  drawPlaying(ctx, state);
  drawPanel(ctx);
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.text;
  ctx.font = "800 64px system-ui, sans-serif";
  ctx.fillText("PAUSED", FIELD_CX, 180);
  ctx.restore();
  drawMenu(ctx, state);
}

function drawMatchover(ctx: Ctx, state: GameState): void {
  drawField(ctx, state, true);
  drawScores(ctx, state);
  drawPanel(ctx);
  ctx.save();
  ctx.textAlign = "center";
  const winnerName =
    state.winner === "left"
      ? "PLAYER 1"
      : state.winner === "right"
        ? "PLAYER 2"
        : "";
  ctx.fillStyle = state.winner === "left" ? COLORS.p1 : COLORS.p2;
  ctx.font = "800 72px system-ui, sans-serif";
  ctx.fillText(`${winnerName} WINS`, FIELD_CX, 170);
  ctx.fillStyle = COLORS.text;
  ctx.font = "700 44px system-ui, sans-serif";
  ctx.fillText(`${state.score.p1} — ${state.score.p2}`, FIELD_CX, 270);
  ctx.restore();
  drawMenu(ctx, state);
}

/** Draw the whole game for the current screen into a 1280x720 logical canvas. */
export function render(ctx: Ctx, state: GameState): void {
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(0, 0, FIELD_W, FIELD_H);

  switch (state.screen) {
    case "title":
      drawTitle(ctx, state);
      break;
    case "howto":
      drawHowto(ctx, state);
      break;
    case "playing":
      drawPlaying(ctx, state);
      break;
    case "countdown":
      drawCountdown(ctx, state);
      break;
    case "paused":
      drawPaused(ctx, state);
      break;
    case "matchover":
      drawMatchover(ctx, state);
      break;
  }
}

export { COLORS };
