import type { TimelineEffect, EffectContext } from "./types";

const COLOR = "#ad936e";
const SIZE = 8;
const SPEED = 0.1;
const COUNT = 40;
const FADE_SPEED_RATE = 0.01;

class Firefly {
  private seed = Math.random() + 0.4;
  private x: number;
  private y: number;
  private dx: number;
  private dy: number;
  private fadeSpeed = 0;
  private size: number;
  private w: number;
  private h: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.size = SIZE * this.seed;
    this.dx = 2 * Math.random() * (Math.random() < 0.5 ? -1 : 1);
    this.dy = 2 * Math.random() * (Math.random() < 0.5 ? -1 : 1);
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
  }

  update(ctx: CanvasRenderingContext2D) {
    this.x += SPEED * Math.sin(this.dx);
    this.y += SPEED * Math.sin(this.dy);
    if (this.x > this.w || this.x < 0) this.dx *= -1;
    if (this.y > this.h || this.y < 0) this.dy *= -1;

    const t = this.size * Math.abs(Math.cos(this.fadeSpeed));
    ctx.fillRect(this.x, this.y, t, t);
    this.fadeSpeed += FADE_SPEED_RATE * this.seed;
  }
}

export class FirefliesEffect implements TimelineEffect {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private fireflies: Firefly[] = [];
  private raf = 0;
  private opacity = 0;

  setup(_effectCtx: EffectContext) {
    this.canvas = document.getElementById("fireflies-canvas") as HTMLCanvasElement;
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) return;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    for (let i = 0; i < COUNT; i++) {
      this.fireflies.push(new Firefly(this.canvas.width, this.canvas.height));
    }

    window.addEventListener("resize", this.onResize);
    this.draw();
  }

  private onResize = () => {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.fireflies.forEach((f) =>
      f.resize(window.innerWidth, window.innerHeight),
    );
  };

  private draw = () => {
    this.raf = requestAnimationFrame(this.draw);
    if (!this.ctx || !this.canvas) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalAlpha = this.opacity;
    this.ctx.fillStyle = COLOR;
    this.fireflies.forEach((f) => f.update(this.ctx!));
  };

  update(progress: number) {
    // fade in during first 30%, hold, fade out during last 20%
    if (progress < 0.3) {
      this.opacity = progress / 0.3;
    } else if (progress > 0.8) {
      this.opacity = (1 - progress) / 0.2;
    } else {
      this.opacity = 1;
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
  }
}
