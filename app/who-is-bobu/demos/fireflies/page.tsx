"use client";

import { useEffect, useRef } from "react";

const COLOR = [173, 147, 110] as const; // #ad936e in RGB
const COUNT = 40;
const SPEED = 0.15;
const FADE_RATE = 0.008;

class Firefly {
  x: number;
  y: number;
  private dx: number;
  private dy: number;
  private phase: number;
  private seed: number;
  private w: number;
  private h: number;
  readonly radius: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.seed = 0.4 + Math.random();
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.radius = (4 + Math.random() * 8) * this.seed;
    this.dx = 2 * Math.random() * (Math.random() < 0.5 ? -1 : 1);
    this.dy = 2 * Math.random() * (Math.random() < 0.5 ? -1 : 1);
    this.phase = Math.random() * Math.PI * 2;
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

    this.phase += FADE_RATE * this.seed;
    const brightness = Math.abs(Math.cos(this.phase));
    const r = this.radius * (0.6 + 0.4 * brightness);

    const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
    grad.addColorStop(0, `rgba(${COLOR[0]},${COLOR[1]},${COLOR[2]},${brightness * 0.9})`);
    grad.addColorStop(0.4, `rgba(${COLOR[0]},${COLOR[1]},${COLOR[2]},${brightness * 0.4})`);
    grad.addColorStop(1, `rgba(${COLOR[0]},${COLOR[1]},${COLOR[2]},0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function FirefliesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const flies = Array.from(
      { length: COUNT },
      () => new Firefly(canvas.width, canvas.height),
    );

    let raf: number;

    function draw() {
      raf = requestAnimationFrame(draw);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      flies.forEach((f) => f.update(ctx!));
    }

    raf = requestAnimationFrame(draw);

    function onResize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      flies.forEach((f) => f.resize(canvas!.width, canvas!.height));
    }

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <main className="h-screen bg-[#403e52]">
      <canvas ref={canvasRef} className="fixed inset-0" />
    </main>
  );
}
