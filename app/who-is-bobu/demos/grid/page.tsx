"use client";

import { useEffect, useState } from "react";

const COLS = 10;
const ROWS = 10;
const TOTAL = COLS * ROWS;
const BOBU_INDEX = 39; // #40 is zero-indexed

// Placeholder colors until we have real Azuki images
function placeholderColor(i: number) {
  const hue = (i * 137.5) % 360; // golden angle spread
  return `hsl(${hue}, 50%, 45%)`;
}

export default function GridDemo() {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    function onScroll() {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return;
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      setRevealed(Math.floor(progress * TOTAL));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main style={{ height: "600vh" }}>
      <div className="fixed inset-0 flex items-center justify-center">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            width: `min(80vw, 80vh)`,
            aspectRatio: "1",
          }}
        >
          {Array.from({ length: TOTAL }, (_, i) => {
            const isRevealed = i < revealed;
            const isBobu = i === BOBU_INDEX;

            return (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-sm"
                style={{
                  backgroundColor: isRevealed
                    ? isBobu
                      ? "#C84B31"
                      : placeholderColor(i)
                    : "rgba(255,255,255,0.05)",
                  transform: isRevealed
                    ? isBobu
                      ? "scale(1) rotateX(0deg)"
                      : "scale(1)"
                    : "scale(0)",
                  transition: isBobu
                    ? "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.3s"
                    : "transform 0.3s ease-out, background-color 0.3s",
                }}
              >
                {isBobu && isRevealed && (
                  <span className="absolute inset-0 flex items-center justify-center text-[0.5rem] font-bold text-white">
                    #40
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Debug HUD */}
      <div className="fixed top-4 left-4 z-50 rounded bg-black/80 px-3 py-2 font-mono text-xs text-white/60">
        <div>Revealed: {revealed} / {TOTAL}</div>
        <div>Bobu (#40): {revealed > BOBU_INDEX ? "✓" : "waiting..."}</div>
      </div>

      <div className="fixed bottom-4 left-4 z-50 rounded bg-black/80 px-3 py-2 font-mono text-xs text-white/40">
        Placeholder colors — drop Azuki images in /public/azukis/ to use real images
      </div>
    </main>
  );
}
