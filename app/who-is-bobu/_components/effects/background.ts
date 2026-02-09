import type { TimelineEffect, EffectContext } from "./types";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export class BackgroundEffect implements TimelineEffect {
  private from: [number, number, number];
  private to: [number, number, number];

  constructor(config: { from: string; to: string }) {
    this.from = hexToRgb(config.from);
    this.to = hexToRgb(config.to);
  }

  setup(_ctx: EffectContext) {}

  update(progress: number) {
    document.body.style.backgroundColor = lerpColor(
      this.from,
      this.to,
      progress,
    );
  }

  dispose() {}
}
