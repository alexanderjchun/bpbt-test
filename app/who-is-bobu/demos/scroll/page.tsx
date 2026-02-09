"use client";

import { useEffect, useState } from "react";

const scenes = [
  { id: 1, label: "Enter Bobu", height: 3 },
  { id: 2, label: "Bobu is born", height: 3 },
  { id: 3, label: "The Bobu Experiment", height: 4 },
  { id: 4, label: "We are Bobu", height: 2 },
];

export default function ScrollDemo() {
  const [current, setCurrent] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const els = document.querySelectorAll<HTMLElement>("[data-scene]");
      for (const el of els) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          setCurrent(Number(el.dataset.scene));
          const p = (window.innerHeight / 2 - rect.top) / rect.height;
          setProgress(Math.min(1, Math.max(0, p)));
          break;
        }
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div>
      {/* debug HUD */}
      <div className="fixed top-4 left-4 z-50 rounded bg-black/80 px-4 py-3 font-mono text-sm text-white">
        <div>Scene {current}: {scenes[current - 1].label}</div>
        <div>Progress: {(progress * 100).toFixed(1)}%</div>
        <div className="mt-1 h-1.5 w-40 rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* scroll sections */}
      {scenes.map((s) => (
        <section
          key={s.id}
          data-scene={s.id}
          className="flex items-center justify-center border-b border-white/10"
          style={{ height: `${s.height * 100}vh` }}
        >
          <span className="text-2xl font-bold text-white/20">
            Scene {s.id}: {s.label}
          </span>
        </section>
      ))}
    </div>
  );
}
