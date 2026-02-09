"use client";

import { useEffect, useRef } from "react";
import { PixelEngine } from "./pixel-engine";

export function PixelCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PixelEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // delay to let DOM sections render first
    const timer = setTimeout(() => {
      engineRef.current = new PixelEngine(canvas);
    }, 150);

    return () => {
      clearTimeout(timer);
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10"
    />
  );
}
