import type { TimelineEffect, EffectContext } from "./types";

export class TextOverlayEffect implements TimelineEffect {
  private element: HTMLElement | null = null;
  private elementId: string;

  constructor(config: { elementId: string }) {
    this.elementId = config.elementId;
  }

  setup(_ctx: EffectContext) {
    this.element = document.getElementById(this.elementId);
  }

  update(progress: number) {
    if (!this.element) {
      this.element = document.getElementById(this.elementId);
      if (!this.element) return;
    }

    // fade in first 25%, hold, fade out last 25%
    let opacity: number;
    if (progress < 0.25) {
      opacity = progress / 0.25;
    } else if (progress > 0.75) {
      opacity = (1 - progress) / 0.25;
    } else {
      opacity = 1;
    }

    // slight upward drift
    const y = 20 * (1 - progress);

    this.element.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    this.element.style.transform = `translateY(${y}px)`;
  }

  dispose() {
    if (this.element) {
      this.element.style.opacity = "0";
      this.element.style.transform = "";
    }
  }
}
