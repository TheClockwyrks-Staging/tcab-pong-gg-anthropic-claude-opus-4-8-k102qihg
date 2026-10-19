// The input snapshot a single frame reads: the eight action states (held and
// press edges) plus the pointer and touch edges the menus take.

export type ActionName =
  | "p1-up"
  | "p1-down"
  | "p2-up"
  | "p2-down"
  | "confirm"
  | "back"
  | "pause"
  | "mute";

export interface PointerSample {
  /** Pointer position this frame, in logical units, or null if unknown. */
  x: number;
  y: number;
  /** A press edge landed this frame, at (downX, downY). */
  pressed: boolean;
  /** A release edge landed this frame, at (x, y). */
  released: boolean;
  /** Where the matching press landed, for a release this frame. */
  downX: number;
  downY: number;
  /** The pointer moved this frame (for hover selection). */
  moved: boolean;
}

export interface InputFrame {
  /** Whether each action is currently held. */
  held: Record<ActionName, boolean>;
  /** Whether each action raised a press edge this frame. */
  pressed: Record<ActionName, boolean>;
  /** Pointer and touch edges for the menus, already in logical units. */
  pointer: PointerSample | null;
}

export function emptyActionMap(): Record<ActionName, boolean> {
  return {
    "p1-up": false,
    "p1-down": false,
    "p2-up": false,
    "p2-down": false,
    confirm: false,
    back: false,
    pause: false,
    mute: false,
  };
}

export function emptyInputFrame(): InputFrame {
  return {
    held: emptyActionMap(),
    pressed: emptyActionMap(),
    pointer: null,
  };
}
