# Carom

**Carom** is a top-down paddle duel that runs entirely in the browser. Two
paddles face each other across a dark field while a ball ricochets between them,
off the top and bottom walls, and off a pair of obstacles in the middle of the
field. A player scores when the ball passes the far edge behind their opponent's
paddle.

Carom's defining mechanic is **spin**: the motion of a paddle at the moment it
strikes the ball curves that ball's flight afterward. The two mid-field obstacles
turn the open field into a bank-shot puzzle.

The game runs on no engine. The frame loop, the canvas fit, input, audio, the
diagnostics overlay, the physics, and the renderer are all written here, in
TypeScript, and everything is drawn in code — the build ships no art or audio
files and fetches nothing at runtime.

## Modes

- **Solo** — you take the left paddle; an AI opponent takes the right.
- **Versus** — two players share the keyboard, one per side.

First to **11 points**, win by **2**.

## Controls

| Action | Keys |
| --- | --- |
| Player 1 up / down | `W` / `S` |
| Player 2 up / down | `↑` / `↓` |
| Confirm | `Enter`, `Space` |
| Pause / resume | `P`, `Esc` |
| Back (in menus) | `Esc` |
| Mute | `M` |

In **Solo**, any of the four up/down keys drives your (left) paddle. In
**Versus**, `W`/`S` drive the left paddle and `↑`/`↓` drive the right.

The menus can also be driven with the mouse or by touch: hover or tap to
highlight an item, click or tap to confirm it.

Press the backtick key (`` ` ``) at any time to toggle a diagnostics overlay.

## Spin, in a sentence

Move your paddle as the ball hits it. A paddle sweeping downward on contact bends
the ball's path one way; sweeping upward bends it the other. Combine spin with the
obstacles to curve a shot into a gap your opponent cannot reach.

## Requirements

- Node.js 20+ and npm.

## Install

```sh
npm ci
```

## Run in development

```sh
npm run dev
```

Vite serves the game with hot reload and prints the local URL.

## Production build

```sh
npm run build
```

This type-checks and emits a complete, self-contained static site into `dist/`,
with `index.html` at its root. The directory runs as-is on any static file
server, served at the root or from a sub-path.

```sh
npm run preview
```

serves the built `dist/` for a final check.

## Checks

| Command | Checks |
| --- | --- |
| `npm run typecheck` | The code type-checks (`tsc --noEmit`). |
| `npm run lint` | The code is lint-clean (ESLint). |
| `npm run format` | The code is formatted (Prettier, check mode). |
| `npm test` | The unit tests pass (Vitest), with coverage over `src/`. |

## Automation surface

Once the game has initialized it installs `window.__carom`, a debugging and
automation surface that drives and inspects the running game from code without
the keyboard or real time. It can take the game off the wall clock
(`setAutoStep`, `advance`), pose the world (screens, scores, the paddles, the
ball, the obstacles), and read it back (`snapshot`, `menuItemRect`). See
`specs/instrumentation.md` for the full surface.
