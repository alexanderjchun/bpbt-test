/**
 * Timeline track definitions.
 *
 * Each track maps an effect to a [start, end] range in master scroll
 * progress (0–1). The scene engine remaps the master progress to a
 * local 0–1 for each track.
 */

export interface Track {
  id: string;
  effect: string; // matches an effect key in the engine
  start: number; // master progress 0–1
  end: number; // master progress 0–1
  config?: Record<string, unknown>;
}

// Total page height = 12 viewports (sum of scrollHeight values).
// Master progress 0–1 maps across those 12 vh.

export const tracks: Track[] = [
  // ── Scene 1: Enter Bobu ──────────────────────────────────────
  {
    id: "bg-dark",
    effect: "background",
    start: 0,
    end: 0.15,
    config: { from: "#0a0a0a", to: "#403e52" },
  },
  {
    id: "fireflies",
    effect: "fireflies",
    start: 0.02,
    end: 0.35,
  },
  {
    id: "text-this-is-bobu",
    effect: "text",
    start: 0.04,
    end: 0.14,
    config: { elementId: "text-this-is-bobu" },
  },
  {
    id: "bobu-entrance",
    effect: "character",
    start: 0.06,
    end: 0.22,
    config: {
      src: "/40.png",
      from: { x: 0, y: 0, scale: 0.3, opacity: 0 },
      to: { x: 0, y: 0, scale: 1, opacity: 1 },
    },
  },

  // ── Scene 2: Bobu is born ────────────────────────────────────
  {
    id: "text-azuki-live",
    effect: "text",
    start: 0.18,
    end: 0.3,
    config: { elementId: "text-azuki-live" },
  },
  {
    id: "bobu-rotate-to-grid",
    effect: "character",
    start: 0.22,
    end: 0.4,
    config: {
      src: "/40.png",
      from: { x: 0, y: 0, scale: 1, opacity: 1, rotation: 0 },
      to: { x: 0, y: 0, scale: 0.4, opacity: 1, rotation: Math.PI * 2 },
    },
  },
  {
    id: "text-bobu-minted",
    effect: "text",
    start: 0.32,
    end: 0.44,
    config: { elementId: "text-bobu-minted" },
  },

  // ── Scene 3: The Bobu Experiment ─────────────────────────────
  {
    id: "bg-experiment",
    effect: "background",
    start: 0.4,
    end: 0.5,
    config: { from: "#403e52", to: "#1a1a2e" },
  },
  {
    id: "text-experiment",
    effect: "text",
    start: 0.42,
    end: 0.52,
    config: { elementId: "text-experiment" },
  },
  {
    id: "bobu-center",
    effect: "character",
    start: 0.44,
    end: 0.56,
    config: {
      src: "/40.png",
      from: { x: 0, y: 0, scale: 0.4, opacity: 1 },
      to: { x: 0, y: 0, scale: 1.2, opacity: 1 },
    },
  },
  {
    id: "pixel-scatter",
    effect: "pixel-grid",
    start: 0.56,
    end: 0.72,
    config: {
      src: "/40.png",
      effect: "scatter",
      resolution: 64,
    },
  },
  {
    id: "pixel-assemble",
    effect: "pixel-grid",
    start: 0.72,
    end: 0.88,
    config: {
      src: "/40.png",
      effect: "assemble",
      resolution: 64,
    },
  },
  {
    id: "text-we-are-bobu",
    effect: "text",
    start: 0.8,
    end: 0.95,
    config: { elementId: "text-we-are-bobu" },
  },

  // ── Scene 4: We are Bobu ─────────────────────────────────────
  {
    id: "bg-final",
    effect: "background",
    start: 0.88,
    end: 1,
    config: { from: "#1a1a2e", to: "#0a0a0a" },
  },
];
