"use client";

import { useEffect, useRef } from "react";
import { SceneEngine } from "./scene-engine";

export function SceneCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SceneEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // delay slightly so DOM text elements exist
    const timer = setTimeout(() => {
      const scrollContainer = document.getElementById("bobu-scroll")!;
      engineRef.current = new SceneEngine(canvas, scrollContainer);
    }, 100);

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
