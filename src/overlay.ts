// The debug overlay: a corner panel of registered diagnostic sources, toggled by
// the backtick key. Each source is a pure read of the game.

export interface DiagnosticSource {
  label: string;
  read: () => string;
}

export class Overlay {
  private visible = false;
  private sources: DiagnosticSource[] = [];

  register(label: string, read: () => string): void {
    this.sources.push({ label, read });
  }

  attach(): void {
    window.addEventListener("keydown", (e) => {
      if (e.code === "Backquote") {
        this.visible = !this.visible;
      }
    });
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Draw the overlay in screen (CSS pixel) space over the canvas. */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pad = 8;
    const lineH = 16;
    ctx.font = "13px ui-monospace, monospace";
    const lines = this.sources.map((s) => `${s.label}: ${s.read()}`);
    let w = 0;
    for (const line of lines) w = Math.max(w, ctx.measureText(line).width);
    const boxW = w + pad * 2;
    const boxH = lines.length * lineH + pad * 2;
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(8, 8, boxW, boxH);
    ctx.fillStyle = "#8affc1";
    ctx.textBaseline = "top";
    let y = 8 + pad;
    for (const line of lines) {
      ctx.fillText(line, 8 + pad, y);
      y += lineH;
    }
    ctx.restore();
  }
}
