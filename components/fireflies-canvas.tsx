"use client";

import { useEffect, useRef } from "react";

const COLOR = "#ad936e";
const SIZE = 8;
const SPEED = 0.1;
const COUNT = 40;
const FADE_SPEED_RATE = 0.01;

class Firefly {
  private seed = Math.random() + 0.4;
  private context: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private x: number;
  private y: number;
  private dx: number;
  private dy: number;
  private fadeSpeed = 0;
  private size: number;

  constructor(canvas: {
    canvasContext: CanvasRenderingContext2D;
    width: number;
    height: number;
  }) {
    this.context = canvas.canvasContext;
    this.width = canvas.width;
    this.height = canvas.height;

    this.x = Math.random() * this.width;
    this.y = Math.random() * this.height;
    this.size = SIZE * this.seed;

    this.dx = 2 * Math.random() * (Math.random() < 0.5 ? -1 : 1);
    this.dy = 2 * Math.random() * (Math.random() < 0.5 ? -1 : 1);
  }

  private move() {
    this.x += SPEED * Math.sin(this.dx);
    this.y += SPEED * Math.sin(this.dy);

    if (this.x > this.width || this.x < 0) this.dx *= -1;
    if (this.y > this.height || this.y < 0) this.dy *= -1;
  }

  private show() {
    const t = this.size * Math.abs(Math.cos(this.fadeSpeed));
    this.context.fillRect(this.x, this.y, t, t);
    this.fadeSpeed += FADE_SPEED_RATE * this.seed;
  }

  updateCanvasSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  update() {
    this.move();
    this.show();
  }
}

export default function FirefliesCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    setCanvasSize();

    const fireflies: Firefly[] = [];
    const canvasInfo = {
      canvasContext: ctx,
      width: canvas.width,
      height: canvas.height,
    };

    for (let i = 0; i < COUNT; i++) {
      fireflies.push(new Firefly(canvasInfo));
    }

    let rafId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = COLOR;
      fireflies.forEach((f) => f.update());
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    const onResize = () => {
      setCanvasSize();
      fireflies.forEach((f) =>
        f.updateCanvasSize(window.innerWidth, window.innerHeight),
      );
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
}
