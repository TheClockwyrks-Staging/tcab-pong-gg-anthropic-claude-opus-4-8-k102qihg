// The browser input layer: keyboard actions with per-frame press edges, and a
// pointer/touch sampler that reports positions in logical units. It collects raw
// events between frames and produces one `InputFrame` per frame.

import type { ActionName, InputFrame, PointerSample } from "./sim/input";
import { emptyActionMap } from "./sim/input";

/** Maps `KeyboardEvent.code` to the actions it raises. */
const KEY_ACTIONS: Record<string, ActionName[]> = {
  KeyW: ["p1-up"],
  KeyS: ["p1-down"],
  ArrowUp: ["p2-up"],
  ArrowDown: ["p2-down"],
  Enter: ["confirm"],
  Space: ["confirm"],
  Escape: ["back", "pause"],
  KeyP: ["pause"],
  KeyM: ["mute"],
};

/** A point in logical units from a client (CSS pixel) point. */
export type ToLogical = (
  clientX: number,
  clientY: number,
) => {
  x: number;
  y: number;
};

export class Input {
  private held = emptyActionMap();
  /** Edges accumulated since the last frame read. */
  private pressedSinceFrame = emptyActionMap();

  // Pointer/touch edges accumulated since the last frame read.
  private ptrX = 0;
  private ptrY = 0;
  private ptrMoved = false;
  private ptrPressed = false;
  private ptrReleased = false;
  private ptrDownX = 0;
  private ptrDownY = 0;
  private ptrActive = false;

  /** Called whenever a real user gesture happens (for arming audio). */
  onGesture: () => void = () => {};

  constructor(
    private readonly target: HTMLElement,
    private readonly toLogical: ToLogical,
  ) {}

  attach(): void {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    this.target.addEventListener("pointermove", this.handlePointerMove);
    this.target.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointerup", this.handlePointerUp);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const actions = KEY_ACTIONS[e.code];
    if (!actions) return;
    e.preventDefault();
    this.onGesture();
    for (const action of actions) {
      if (!this.held[action]) this.pressedSinceFrame[action] = true;
      this.held[action] = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const actions = KEY_ACTIONS[e.code];
    if (!actions) return;
    for (const action of actions) this.held[action] = false;
  };

  private handleBlur = (): void => {
    this.held = emptyActionMap();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const p = this.toLogical(e.clientX, e.clientY);
    this.ptrX = p.x;
    this.ptrY = p.y;
    this.ptrMoved = true;
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.onGesture();
    const p = this.toLogical(e.clientX, e.clientY);
    this.ptrX = p.x;
    this.ptrY = p.y;
    this.ptrDownX = p.x;
    this.ptrDownY = p.y;
    this.ptrPressed = true;
    this.ptrActive = true;
    this.ptrMoved = true;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (!this.ptrActive) return;
    const p = this.toLogical(e.clientX, e.clientY);
    this.ptrX = p.x;
    this.ptrY = p.y;
    this.ptrReleased = true;
    this.ptrActive = false;
  };

  /** Produce this frame's input and clear the accumulated edges. */
  sample(): InputFrame {
    const pressed = this.pressedSinceFrame;
    this.pressedSinceFrame = emptyActionMap();

    let pointer: PointerSample | null = null;
    if (this.ptrMoved || this.ptrPressed || this.ptrReleased) {
      pointer = {
        x: this.ptrX,
        y: this.ptrY,
        pressed: this.ptrPressed,
        released: this.ptrReleased,
        downX: this.ptrDownX,
        downY: this.ptrDownY,
        moved: this.ptrMoved,
      };
    }
    this.ptrMoved = false;
    this.ptrPressed = false;
    this.ptrReleased = false;

    return {
      held: { ...this.held },
      pressed,
      pointer,
    };
  }
}
