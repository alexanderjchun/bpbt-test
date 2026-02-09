import type { TimelineEffect, EffectContext } from "./types";
import { PixelGrid } from "../pixel-grid";
import type { PixelEffect } from "../sections-data";

export class PixelGridEffect implements TimelineEffect {
  private grid: PixelGrid;
  private ctx: EffectContext | null = null;
  private visible = false;

  constructor(config: {
    src: string;
    effect: PixelEffect;
    resolution?: number;
    morphSrc?: string;
  }) {
    this.grid = new PixelGrid(
      config.src,
      config.effect,
      config.resolution ?? 64,
      config.morphSrc,
    );
  }

  setup(ctx: EffectContext) {
    this.ctx = ctx;
    ctx.scene.add(this.grid.mesh);
  }

  update(progress: number) {
    this.grid.setProgress(progress);

    // show/hide based on whether we're in the active range
    if (progress > 0 && progress < 1) {
      if (!this.visible) {
        this.visible = true;
        if (this.ctx && !this.grid.mesh.parent) {
          this.ctx.scene.add(this.grid.mesh);
        }
      }
    }

    // position at center of screen
    this.grid.mesh.position.set(0, 0, 0);
  }

  dispose() {
    if (this.grid.mesh.parent) {
      this.grid.mesh.parent.remove(this.grid.mesh);
    }
    this.grid.dispose();
  }
}
