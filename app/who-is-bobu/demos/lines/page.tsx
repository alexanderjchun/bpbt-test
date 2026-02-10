"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  TextureLoader,
  DataTexture,
  FloatType,
  RGBAFormat,
  NearestFilter,
} from "three";

// ── Types ──────────────────────────────────────────────────────────
interface LineEvent {
  startTime: number;
  drawDuration: number;
  drawOrder: number;
  texIndex: number;
}

// ── Texture index: V lines 0-30, H lines 31-61 ────────────────────
// Level L (0-based): 2^L lines, base index = 2^L - 1
function texIdx(dir: "v" | "h", level: number, k: number) {
  const i = (1 << level) - 1 + k;
  return dir === "v" ? i : 31 + i;
}

// ── Timeline builder (spawn-on-finish event simulation) ───────────
function buildTimeline(
  maxLevel: number,
  flood: number = 3,
  jitter: number = 0.3,
): { lines: LineEvent[]; totalDrawTime: number } {
  const FPS = 12;

  // Seeded pseudo-random for consistent jitter
  let seed = 42;
  function rand() {
    seed = (seed * 1664525 + 1013904223) | 0;
    return ((seed >>> 0) % 10000) / 10000;
  }

  let popCount = 0;
  // Dynamic stagger: starts at 2 frames, decays as more lines pop
  function currentStagger(): number {
    if (popCount <= 3) return 2;
    const t = popCount - 3;
    const rate = 0.1 + flood * 0.08; // flood 1→0.18, flood 5→0.50
    return Math.max(0, 2 * Math.exp(-rate * t));
  }

  // Draw duration in frames per level: floor(12 × 0.6^level), min 1
  function durFrames(level: number): number {
    return Math.max(1, Math.floor(12 * Math.pow(0.6, level)));
  }

  // Internal scheduled line (frame units)
  interface SchedLine {
    dir: "v" | "h";
    level: number;
    k: number;
    startFrame: number;
    dur: number;
  }
  const scheduled: SchedLine[] = [];

  // Event types: finish (pri 0) processed before queue-pop (pri 1) at same frame
  type Ev =
    | { frame: number; pri: 0; type: "finish"; dir: "v" | "h"; level: number; k: number }
    | { frame: number; pri: 1; type: "qpop" };

  const events: Ev[] = [];
  function pushEv(ev: Ev) {
    events.push(ev);
    events.sort((a, b) => a.frame - b.frame || a.pri - b.pri);
  }

  // FIFO stagger queue
  const fifo: Array<{ dir: "v" | "h"; level: number; k: number }> = [];
  let blocked = false;
  let lastQueueFrame = -Infinity;
  let queuePopPending = false;

  function startLine(dir: "v" | "h", level: number, k: number, frame: number) {
    const d = durFrames(level);
    scheduled.push({ dir, level, k, startFrame: frame, dur: d });
    pushEv({ frame: frame + d, pri: 0, type: "finish", dir, level, k });
  }

  function tryQueuePop(now: number) {
    if (blocked || fifo.length === 0 || queuePopPending) return;
    const stagger = currentStagger();
    const t = Math.max(now, lastQueueFrame + stagger);
    pushEv({ frame: t, pri: 1, type: "qpop" });
    queuePopPending = true;
  }

  // Track finished V lines per level for child spawning
  const finishedV = new Map<number, Array<{ level: number; k: number }>>();
  const childrenSpawned = new Set<string>();

  // Seed: V 1/2
  fifo.push({ dir: "v", level: 0, k: 0 });
  tryQueuePop(0);

  let safety = 0;
  while (events.length > 0 && safety++ < 5000) {
    const ev = events.shift()!;

    if (ev.type === "qpop") {
      queuePopPending = false;
      if (blocked || fifo.length === 0) continue;
      const item = fifo.shift()!;
      popCount++;
      // Add jitter for organic feel at higher levels
      const j = item.level >= 2 ? jitter * (rand() * 2 - 1) * 1.5 : 0;
      const actualFrame = Math.max(0, ev.frame + j);
      lastQueueFrame = ev.frame;
      startLine(item.dir, item.level, item.k, actualFrame);
      tryQueuePop(ev.frame);
      continue;
    }

    // ── Finish event ──
    const { dir, level, k } = ev;

    if (dir === "v") {
      if (!finishedV.has(level)) finishedV.set(level, []);
      finishedV.get(level)!.push({ level, k });

      if (level <= 1) {
        // Levels 0–1: H twin starts immediately, queue blocks
        startLine("h", level, k, ev.frame);
        blocked = true;
      } else {
        // Level 2+: left V child starts immediately
        if (level + 1 < maxLevel) {
          startLine("v", level + 1, k * 2, ev.frame);
          fifo.push({ dir: "v", level: level + 1, k: k * 2 + 1 });
        }
        // H twin enters queue
        fifo.push({ dir: "h", level, k });
        tryQueuePop(ev.frame);
      }
    } else if (dir === "h" && level <= 1) {
      // First H finish at this level → unblock, spawn children
      blocked = false;
      if (level + 1 < maxLevel) {
        const fv = finishedV.get(level) || [];
        for (const v of fv) {
          const key = `${v.level}-${v.k}`;
          if (!childrenSpawned.has(key)) {
            childrenSpawned.add(key);
            fifo.push({ dir: "v", level: v.level + 1, k: v.k * 2 });
            fifo.push({ dir: "v", level: v.level + 1, k: v.k * 2 + 1 });
          }
        }
      }
      tryQueuePop(ev.frame);
    }
    // H finish at level 2+: no special action
  }

  // Convert to seconds, assign draw order
  const lines: LineEvent[] = scheduled.map((s) => ({
    startTime: s.startFrame / FPS,
    drawDuration: s.dur / FPS,
    drawOrder: 0,
    texIndex: texIdx(s.dir, s.level, s.k),
  }));

  lines.sort((a, b) => a.startTime - b.startTime || a.texIndex - b.texIndex);
  lines.forEach((l, i) => (l.drawOrder = i));

  const totalDrawTime = Math.max(...lines.map((l) => l.startTime + l.drawDuration));
  return { lines, totalDrawTime };
}

// ── Shaders ────────────────────────────────────────────────────────
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uLineData;   // 64×1 RGBA float: drawProg, opacity, widthScale, glowIntensity
  uniform vec3 uLineColor;
  uniform float uLineWidth;
  uniform float uGlowRadius;

  varying vec2 vUv;

  // Arch glow: parabolic, brightest at center, gentle falloff to ends
  float spatialGlow(float fp, float dp) {
    float t = clamp(fp / max(dp, 0.001), 0.0, 1.0);
    return 4.0 * t * (1.0 - t);
  }

  // Compute line contribution for a given distance and spatial glow
  // Returns vec2(contribution, colorMix)
  vec2 lineContrib(float dist, float sg, float ws, float mask, float op) {
    float dg = mix(uGlowRadius * 0.3, uGlowRadius * 0.6, sg) * ws;
    float dw = mix(uLineWidth  * 0.5, uLineWidth  * 1.2, sg) * ws;

    float core = smoothstep(dw, dw * 0.02, dist);
    float glow = exp(-dist * dist / max(dg * dg, 1e-6));
    float c = (core * 2.0 + glow * 0.2) * mask * op;

    return vec2(c, sg);
  }

  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    if (texColor.a < 0.01) discard;

    float maxContrib = 0.0;
    vec3  bestColor  = vec3(1.0);

    for (int level = 0; level < 5; level++) {
      float n   = pow(2.0, float(level));
      float div = pow(2.0, float(level + 1));
      float base = n - 1.0;

      // ── Nearest V line ──
      float gx = vUv.x * div;
      float oddX = 2.0 * floor((gx - 1.0) / 2.0 + 0.5) + 1.0;
      oddX = clamp(oddX, 1.0, div - 1.0);
      float kV = (oddX - 1.0) / 2.0;
      float vDist = abs(vUv.x - oddX / div);
      float vI = base + kV;

      vec4 vs = texture2D(uLineData, vec2((vI + 0.5) / 64.0, 0.5));
      if (vs.r > 0.0 && vs.g > 0.0) {
        float dp = vs.r;
        float op = vs.g;
        float ws = vs.b;
        float gi = vs.a;

        float fp = 1.0 - vUv.y;
        float mask = smoothstep(dp + 0.015, dp - 0.005, fp);

        float sg = spatialGlow(fp, dp) * gi;
        vec2 lc = lineContrib(vDist, sg, ws, mask, op);
        vec3 col = mix(vec3(1.0), uLineColor * 2.0, lc.y);
        if (lc.x > maxContrib) {
          maxContrib = lc.x;
          bestColor  = col;
        }
      }

      // ── Nearest H line ──
      float gy = vUv.y * div;
      float oddY = 2.0 * floor((gy - 1.0) / 2.0 + 0.5) + 1.0;
      oddY = clamp(oddY, 1.0, div - 1.0);
      float kH = (oddY - 1.0) / 2.0;
      float hDist = abs(vUv.y - oddY / div);
      float hI = 31.0 + base + kH;

      vec4 hs = texture2D(uLineData, vec2((hI + 0.5) / 64.0, 0.5));
      if (hs.r > 0.0 && hs.g > 0.0) {
        float dp = hs.r;
        float op = hs.g;
        float ws = hs.b;
        float gi = hs.a;

        float fp = vUv.x;
        float mask = smoothstep(dp + 0.015, dp - 0.005, fp);

        float sg = spatialGlow(fp, dp) * gi;
        vec2 lc = lineContrib(hDist, sg, ws, mask, op);
        vec3 col = mix(vec3(1.0), uLineColor * 2.0, lc.y);
        if (lc.x > maxContrib) {
          maxContrib = lc.x;
          bestColor  = col;
        }
      }
    }

    if (maxContrib > 0.001) {
      float a = min(maxContrib, 1.0);
      vec3 fc = mix(texColor.rgb, bestColor, a * 0.85);
      gl_FragColor = vec4(fc, texColor.a);
    } else {
      gl_FragColor = texColor;
    }
  }
`;

// ── Helpers ────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const loader = new TextureLoader();

// ── Component ──────────────────────────────────────────────────────
export default function LinesDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matRef = useRef<ShaderMaterial | null>(null);
  const dataTexRef = useRef<DataTexture | null>(null);

  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  const timeline = useMemo(() => buildTimeline(5, 1, 1), []);

  // Fade config
  const fadeDelay = 0.3;
  const fadeStagger = 0.04;
  const fadeDuration = 0.3;
  const fadeStart = timeline.totalDrawTime + fadeDelay;
  const totalTime =
    fadeStart + Math.max(0, timeline.lines.length - 1) * fadeStagger + fadeDuration;

  // ── Update data texture each frame ──
  useEffect(() => {
    const dt = dataTexRef.current;
    if (!dt) return;
    const t = progress * totalTime;
    const d = dt.image.data as Float32Array;
    d.fill(0);

    const settleDuration = 0.6;
    const glowPeak = 4.0;

    for (const line of timeline.lines) {
      const rawDraw = clamp((t - line.startTime) / line.drawDuration, 0, 1);
      const draw = rawDraw === 0 ? 0 : Math.pow(2, 10 * (rawDraw - 1));
      const fs = fadeStart + line.drawOrder * fadeStagger;
      const fp = clamp((t - fs) / fadeDuration, 0, 1);
      const opacity = 1 - fp;
      const widthScale = 1 - fp;

      let glowIntensity: number;
      if (rawDraw < 1) {
        glowIntensity = draw * glowPeak;
      } else {
        const timeSinceFinish = t - (line.startTime + line.drawDuration);
        const settleT = clamp(timeSinceFinish / settleDuration, 0, 1);
        glowIntensity = glowPeak * (1 - settleT * settleT);
      }

      const i = line.texIndex * 4;
      d[i] = draw;
      d[i + 1] = opacity;
      d[i + 2] = widthScale;
      d[i + 3] = glowIntensity;
    }
    dt.needsUpdate = true;
  }, [progress, timeline, fadeStart, fadeStagger, fadeDuration, totalTime]);

  // ── Playback ──
  const totalTimeRef = useRef(totalTime);
  totalTimeRef.current = totalTime;

  useEffect(() => {
    if (!playing) return;
    const t0 = performance.now();
    const p0 = progress;
    let raf: number;
    function tick() {
      const elapsed = (performance.now() - t0) / 1000;
      const p = Math.min((p0 * totalTimeRef.current + elapsed) / totalTimeRef.current, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setPlaying(false);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // ── Three.js setup ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { innerWidth: w, innerHeight: h } = window;
    const scene = new Scene();
    const cam = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
    cam.position.z = 100;

    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

    // Data texture: 64×1 RGBA float
    const buf = new Float32Array(64 * 4);
    const dt = new DataTexture(buf, 64, 1, RGBAFormat, FloatType);
    dt.minFilter = NearestFilter;
    dt.magFilter = NearestFilter;
    dt.needsUpdate = true;
    dataTexRef.current = dt;

    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uLineData: { value: dt },
        uLineColor: { value: hexToRgb("#85baff") },
        uLineWidth: { value: 0.002 },
        uGlowRadius: { value: 0.015 },
      },
      transparent: true,
    });
    matRef.current = mat;

    const geo = new PlaneGeometry(1, 1);
    const mesh = new Mesh(geo, mat);
    scene.add(mesh);

    loader.load("/40.png", (tex) => {
      mat.uniforms.uTexture.value = tex;
      const img = tex.image as HTMLImageElement;
      const a = img.width / img.height;
      const s = Math.min(w, h) * 0.6;
      mesh.scale.set(s * a, s, 1);
    });

    let raf: number;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);

    const onResize = () => {
      const { innerWidth: w, innerHeight: h } = window;
      cam.left = -w / 2;
      cam.right = w / 2;
      cam.top = h / 2;
      cam.bottom = -h / 2;
      cam.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      dt.dispose();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);


  return (
    <main className="h-screen">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4">
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0);
            setPlaying((p) => !p);
          }}
          className="rounded bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20"
        >
          {playing ? "Pause" : progress >= 1 ? "Replay" : "Play"}
        </button>

        <div className="flex items-center gap-2 text-xs text-white/60">
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            onChange={(e) => {
              setPlaying(false);
              setProgress(Number(e.target.value));
            }}
            className="w-48"
          />
          <span className="w-8 font-mono">{(progress * 100).toFixed(0)}%</span>
        </div>
      </div>
    </main>
  );
}
