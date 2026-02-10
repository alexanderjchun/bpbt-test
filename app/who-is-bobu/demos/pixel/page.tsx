"use client"; // Required for hooks (useEffect, useRef, useState) in Next.js App Router

// React hooks for side effects, DOM refs, and local state
import { useEffect, useRef, useState } from "react";
// Three.js imports for building the WebGL pixel scene
import {
  InstancedBufferAttribute, // Material that uses custom vertex/fragment shaders
  InstancedMesh, // Per-instance data (position, color, etc.) sent to the GPU
  Object3D, // Container that holds all 3D objects, lights, cameras
  OrthographicCamera, // Renders the scene using WebGL
  PlaneGeometry,
  Scene, // A flat rectangular shape — used as the base quad for each pixel
  ShaderMaterial, // Camera with no perspective distortion (flat 2D look)
  WebGLRenderer, // Renders the scene using WebGL
} from "three";

// ─── VERTEX SHADER ───
// Runs once per vertex of every instanced pixel quad.
// Handles the two-phase animation: image A → scatter → image B.
const vertexShader = /* glsl */ `
  attribute vec2 aGridPosA;    // Grid position of this pixel in image A (centered at origin)
  attribute vec2 aGridPosB;    // Grid position of this pixel in image B
  attribute vec3 aScatterPos;  // Random 3D position this pixel flies to when scattered
  attribute vec4 aColorA;      // RGBA color of this pixel from image A (0–1 range)
  attribute vec4 aColorB;      // RGBA color of this pixel from image B
  attribute float aRandom;     // Random value 0–1 used to stagger animation per pixel

  uniform float uProgress;     // Animation progress: 0 = image A, 0.5 = scattered, 1 = image B
  uniform float uPixelSize;    // World-space size of each pixel quad

  varying vec4 vColor;         // Color passed to the fragment shader

  // Deceleration curve — fast start, slow end
  float easeOutCubic(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
  }

  // Acceleration curve — slow start, fast end
  float easeInCubic(float t) {
    return t * t * t;
  }

  void main() {
    float stagger = 0.3; // How much to stagger animation start per pixel (0 = all at once)
    vec3 pos;            // Final world-space center position for this pixel instance

    if (uProgress <= 0.5) {
      // ── Phase 1: image A grid → scatter ──
      // Remap uProgress 0..0.5 → t 0..1
      float t = clamp(uProgress * 2.0, 0.0, 1.0);
      // Per-pixel staggered progress: each pixel starts at a different time based on aRandom
      float local = clamp((t - aRandom * stagger) / (1.0 - stagger), 0.0, 1.0);
      // Apply easing so pixels accelerate out of the grid
      float eased = easeInCubic(local);
      // Interpolate between grid position A and the random scatter position
      pos = mix(vec3(aGridPosA, 0.0), aScatterPos, eased);
      // Keep image A's color during scatter
      vColor = aColorA;
    } else {
      // ── Phase 2: scatter → image B grid ──
      // Remap uProgress 0.5..1 → t 0..1
      float t = clamp((uProgress - 0.5) * 2.0, 0.0, 1.0);
      // Per-pixel staggered progress (same stagger logic)
      float local = clamp((t - aRandom * stagger) / (1.0 - stagger), 0.0, 1.0);
      // Apply easing so pixels decelerate into the grid
      float eased = easeOutCubic(local);
      // Interpolate from scatter position to grid position B
      pos = mix(aScatterPos, vec3(aGridPosB, 0.0), eased);
      // Crossfade color from A to B as pixels reassemble
      vColor = mix(aColorA, aColorB, eased);
    }

    // Scale the grid center by uPixelSize so pixels are spaced correctly,
    // then offset by the quad vertex position (also scaled) to form the quad
    vec3 vertexPos = pos * uPixelSize + position * uPixelSize;
    // Apply camera projection to get final clip-space position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPos, 1.0);
  }
`;

// ─── FRAGMENT SHADER ───
// Runs once per pixel of every rendered quad.
const fragmentShader = /* glsl */ `
  varying vec4 vColor; // Interpolated color from the vertex shader
  void main() {
    // Discard nearly transparent pixels so background shows through
    if (vColor.a < 0.01) discard;
    // Output the pixel color
    gl_FragColor = vColor;
  }
`;

// ─── loadImage ───
// Loads an image from a URL, downsamples it to `resolution` pixels on its
// longest side, and returns raw ImageData (pixel RGBA values).
function loadImage(
  src: string, // Image URL
  resolution: number, // Target pixel count for the longest side
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image(); // Create an HTML Image element
    img.crossOrigin = "anonymous"; // Allow loading cross-origin images
    img.onload = () => {
      const aspect = img.width / img.height; // Calculate aspect ratio
      let w: number, h: number;
      if (aspect >= 1) {
        // Landscape or square — width gets full resolution
        w = resolution;
        h = Math.round(resolution / aspect);
      } else {
        // Portrait — height gets full resolution
        h = resolution;
        w = Math.round(resolution * aspect);
      }
      // Draw onto an offscreen canvas at the target resolution
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h); // Downsample by drawing at smaller size
      resolve(ctx.getImageData(0, 0, w, h)); // Extract raw pixel data
    };
    img.onerror = reject; // Reject the promise if the image fails to load
    img.src = src; // Begin loading
  });
}

// ─── extractColors ───
// Converts ImageData (0–255 RGBA) to a Float32Array (0–1 RGBA)
// suitable for passing to the GPU as an instanced attribute.
function extractColors(data: ImageData): Float32Array {
  const { width, height, data: px } = data; // Destructure pixel data
  const out = new Float32Array(width * height * 4); // 4 floats per pixel (RGBA)
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = px[i * 4] / 255; // R
    out[i * 4 + 1] = px[i * 4 + 1] / 255; // G
    out[i * 4 + 2] = px[i * 4 + 2] / 255; // B
    out[i * 4 + 3] = px[i * 4 + 3] / 255; // A
  }
  return out;
}

// ─── gridPositions ───
// Generates a Float32Array of (x, y) grid positions centered at the origin.
// Each pixel is 1 unit apart; the shader scales these by uPixelSize.
function gridPositions(w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 2); // 2 floats per pixel (x, y)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x; // Flat index
      out[i * 2] = x - w / 2 + 0.5; // X: centered horizontally
      out[i * 2 + 1] = -(y - h / 2 + 0.5); // Y: centered vertically, flipped (screen Y is down)
    }
  }
  return out;
}

// ─── Parse hex color to RGB floats ───
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// ─── Extract pixel data from the PixelBobu SVG string ───
// Returns centered grid positions and RGBA colors in the same format
// as gridPositions() + extractColors(), but for the sparse SVG data.
function extractPixelBobuData(): {
  positions: Float32Array;
  colors: Float32Array;
  count: number;
} {
  const rectRegex =
    /x="(\d+)"(?:\s+y="(\d+)")?\s+width="1"\s+height="1"\s+fill="(#[0-9a-fA-F]{6})"/g;
  const pixels: Array<{ x: number; y: number; r: number; g: number; b: number }> = [];
  let match;

  while ((match = rectRegex.exec(PIXEL_BOBU_SVG)) !== null) {
    const x = parseInt(match[1], 10);
    const y = match[2] ? parseInt(match[2], 10) : 0;
    const [r, g, b] = hexToRgb(match[3]);
    pixels.push({ x, y, r, g, b });
  }

  const count = pixels.length;
  const positions = new Float32Array(count * 2);
  const colors = new Float32Array(count * 4);

  const halfW = PIXEL_BOBU_WIDTH / 2;
  const halfH = PIXEL_BOBU_HEIGHT / 2;

  for (let i = 0; i < count; i++) {
    const p = pixels[i];
    positions[i * 2] = p.x - halfW + 0.5;
    positions[i * 2 + 1] = -(p.y - halfH + 0.5);
    colors[i * 4] = p.r;
    colors[i * 4 + 1] = p.g;
    colors[i * 4 + 2] = p.b;
    colors[i * 4 + 3] = 1.0;
  }

  return { positions, colors, count };
}

// ─── Constants ───
const RES = 64; // Pixel resolution — images are downsampled to 64px on their longest side
const SRC_A = "/40.png"; // Source image A

// ─── PixelDemo Component ───
export default function PixelDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Ref to the <canvas> DOM element
  const progressRef = useRef(0); // Animation progress (0–1), stored in ref to avoid re-renders
  // Tracks which phase the UI is in to show the correct button
  const [phase, setPhase] = useState<"assembled" | "scattered" | "reformed">(
    "assembled",
  );

  // ─── Three.js Setup (runs once on mount) ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // Guard: bail if canvas not mounted

    // Get viewport dimensions
    const { innerWidth: w, innerHeight: h } = window;

    // Create the scene graph
    const scene = new Scene();

    // Orthographic camera: maps world units 1:1 to screen pixels, centered at origin
    const camera = new OrthographicCamera(
      -w / 2,
      w / 2,
      h / 2,
      -h / 2,
      0.1,
      1000,
    );
    camera.position.z = 100; // Pull camera back so it can see the scene

    // WebGL renderer attached to our canvas
    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
    });
    renderer.setSize(w, h); // Match canvas to viewport
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap at 2x for performance

    // Shader material with two uniforms controlled from JS
    const material = new ShaderMaterial({
      vertexShader, // Custom vertex shader (above)
      fragmentShader, // Custom fragment shader (above)
      uniforms: {
        uProgress: { value: 0 }, // Animation progress, updated each frame
        uPixelSize: { value: (Math.min(w, h) / RES) * 0.6 }, // Size of each pixel quad in world units
      },
      transparent: true, // Enable alpha blending
      depthTest: false, // Disable depth testing (2D scene, no z-fighting needed)
    });

    let mesh: InstancedMesh | null = null; // Will hold the instanced mesh once images load
    let raf: number; // Stores requestAnimationFrame ID for cleanup

    // ─── Async init: load images, build geometry, create mesh ───
    async function init() {
      // Load image A (raster), extract pixel Bobu data (static SVG)
      const imgA = await loadImage(SRC_A, RES);
      const bobu = extractPixelBobuData();

      // Image A: dense grid, Image B: sparse pixel art
      const countA = imgA.width * imgA.height;
      const countB = bobu.count;
      const count = Math.max(countA, countB); // Instance count = larger of the two

      // Generate centered grid positions for image A; use parsed SVG positions for B
      const gridA = gridPositions(imgA.width, imgA.height);
      const gridB = bobu.positions;

      // Extract normalized RGBA colors from image A; use parsed SVG colors for B
      const colorsA = extractColors(imgA);
      const colorsB = bobu.colors;

      // If the two images have different pixel counts, pad the smaller arrays
      // with zeros so all instanced attributes have the same length
      const padFloat = (arr: Float32Array, targetLen: number) => {
        if (arr.length >= targetLen) return arr; // Already big enough
        const padded = new Float32Array(targetLen); // Zeros by default
        padded.set(arr); // Copy original data at the start
        return padded;
      };

      const gridAPadded = padFloat(gridA, count * 2); // 2 floats per instance (x, y)
      const gridBPadded = padFloat(gridB, count * 2);
      const colorsAPadded = padFloat(colorsA, count * 4); // 4 floats per instance (r, g, b, a)
      const colorsBPadded = padFloat(colorsB, count * 4);

      // Generate random scatter positions and per-pixel random values
      const scatterPos = new Float32Array(count * 3); // 3 floats per instance (x, y, z)
      const randoms = new Float32Array(count); // 1 float per instance

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2; // Random direction in 2D
        const dist = 30 + Math.random() * 80; // Random distance from grid pos (30–110 units)
        // Use grid A position if available, otherwise grid B position as scatter origin
        const baseX = i < countA ? gridAPadded[i * 2] : gridBPadded[i * 2];
        const baseY = i < countA ? gridAPadded[i * 2 + 1] : gridBPadded[i * 2 + 1];
        scatterPos[i * 3] = baseX + Math.cos(angle) * dist; // X
        scatterPos[i * 3 + 1] = baseY + Math.sin(angle) * dist; // Y
        scatterPos[i * 3 + 2] = (Math.random() - 0.5) * 20; // Z: slight depth variation
        randoms[i] = Math.random(); // Used for per-pixel animation staggering
      }

      // Create a 1x1 plane — each instance is one pixel quad
      const geo = new PlaneGeometry(1, 1);

      // Attach per-instance attributes to the geometry
      geo.setAttribute(
        "aGridPosA",
        new InstancedBufferAttribute(gridAPadded, 2),
      ); // Grid pos in image A
      geo.setAttribute(
        "aGridPosB",
        new InstancedBufferAttribute(gridBPadded, 2),
      ); // Grid pos in image B
      geo.setAttribute(
        "aScatterPos",
        new InstancedBufferAttribute(scatterPos, 3),
      ); // Scatter destination
      geo.setAttribute(
        "aColorA",
        new InstancedBufferAttribute(colorsAPadded, 4),
      ); // Color from image A
      geo.setAttribute(
        "aColorB",
        new InstancedBufferAttribute(colorsBPadded, 4),
      ); // Color from image B
      geo.setAttribute("aRandom", new InstancedBufferAttribute(randoms, 1)); // Random stagger value

      // Create a dummy Object3D to generate identity matrices for each instance
      const dummy = new Object3D();
      // Create the instanced mesh: `count` copies of `geo` using `material`
      mesh = new InstancedMesh(geo, material, count);
      mesh.frustumCulled = false; // Don't cull — scattered pixels may leave the default bounds
      // Set each instance's transform to identity (position handled by shader, not matrix)
      for (let i = 0; i < count; i++) {
        dummy.updateMatrix(); // Compute identity matrix
        mesh.setMatrixAt(i, dummy.matrix); // Assign it to instance i
      }
      mesh.instanceMatrix.needsUpdate = true; // Tell Three.js to upload matrices to GPU
      scene.add(mesh); // Add the mesh to the scene
    }

    init(); // Kick off async initialization

    // ─── Render loop ───
    function animate() {
      raf = requestAnimationFrame(animate); // Schedule next frame
      material.uniforms.uProgress.value = progressRef.current; // Sync progress to GPU
      renderer.render(scene, camera); // Draw the scene
    }
    raf = requestAnimationFrame(animate); // Start the loop

    // ─── Handle window resize ───
    function onResize() {
      const { innerWidth: w, innerHeight: h } = window;
      // Update orthographic camera bounds to match new viewport
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix(); // Recompute projection matrix
      renderer.setSize(w, h); // Resize the renderer
      // Recalculate pixel size so the image scales with the viewport
      material.uniforms.uPixelSize.value = (Math.min(w, h) / RES) * 0.6;
    }

    window.addEventListener("resize", onResize);

    // ─── Cleanup on unmount ───
    return () => {
      cancelAnimationFrame(raf); // Stop the render loop
      window.removeEventListener("resize", onResize); // Remove resize listener
      mesh?.geometry.dispose(); // Free GPU geometry memory
      material.dispose(); // Free GPU material/shader memory
      renderer.dispose(); // Free WebGL context
    };
  }, []); // Empty deps = run once on mount

  // ─── animateTo ───
  // Smoothly transitions progressRef.current from its current value to `target`
  // over `duration` ms using an ease-in-out curve.
  function animateTo(target: number, duration = 1500) {
    const start = progressRef.current; // Starting progress value
    const startTime = performance.now(); // Timestamp when animation begins

    function tick() {
      const elapsed = performance.now() - startTime; // Time since animation started
      const t = Math.min(1, elapsed / duration); // Linear progress 0→1, clamped
      // Ease in-out quadratic: slow start, fast middle, slow end
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      // Interpolate between start and target using the eased value
      progressRef.current = start + (target - start) * eased;
      if (t < 1) requestAnimationFrame(tick); // Keep going until done
    }
    requestAnimationFrame(tick); // Start the animation
  }

  // ─── Phase transition handlers ───
  // Each one animates to a specific progress value and updates the UI phase

  function scatter() {
    animateTo(0.5); // Animate to the midpoint (fully scattered)
    setPhase("scattered"); // Show the "Reform" button
  }

  function reform() {
    animateTo(1); // Animate to the end (image B assembled)
    setPhase("reformed"); // Show the "Reset" button
  }

  function reset() {
    animateTo(0); // Animate back to the start (image A assembled)
    setPhase("assembled"); // Show the "Scatter" button
  }

  // ─── Render ───
  return (
    <main className="h-screen">
      {/* Full-screen canvas for the Three.js scene; pointer-events-none so buttons stay clickable */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />
      {/* Centered button bar at the bottom — shows one button depending on current phase */}
      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-2">
        {phase === "assembled" && (
          <button
            onClick={scatter}
            className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Scatter
          </button>
        )}
        {phase === "scattered" && (
          <button
            onClick={reform}
            className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Reform into Pixel Bobu
          </button>
        )}
        {phase === "reformed" && (
          <button
            onClick={reset}
            className="rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          >
            Reset
          </button>
        )}
      </div>
    </main>
  );
}

// ─── PixelBobu SVG data ───
// 56x67 pixel art grid, ~1909 filled pixels. Stored as a string for regex parsing.
const PIXEL_BOBU_WIDTH = 56;
const PIXEL_BOBU_HEIGHT = 67;
const PIXEL_BOBU_SVG = `
      <rect x="37" y="66" width="1" height="1" fill="#261a15" />
      <rect x="36" y="66" width="1" height="1" fill="#261a15" />
      <rect x="35" y="66" width="1" height="1" fill="#261a15" />
      <rect x="34" y="66" width="1" height="1" fill="#261a15" />
      <rect x="33" y="66" width="1" height="1" fill="#261a15" />
      <rect x="32" y="66" width="1" height="1" fill="#261a15" />
      <rect x="31" y="66" width="1" height="1" fill="#261a15" />
      <rect x="30" y="66" width="1" height="1" fill="#261a15" />
      <rect x="29" y="66" width="1" height="1" fill="#261a15" />
      <rect x="28" y="66" width="1" height="1" fill="#261a15" />
      <rect x="27" y="66" width="1" height="1" fill="#261a15" />
      <rect x="26" y="66" width="1" height="1" fill="#261a15" />
      <rect x="25" y="66" width="1" height="1" fill="#261a15" />
      <rect x="24" y="66" width="1" height="1" fill="#261a15" />
      <rect x="23" y="66" width="1" height="1" fill="#261a15" />
      <rect x="22" y="66" width="1" height="1" fill="#261a15" />
      <rect x="21" y="66" width="1" height="1" fill="#261a15" />
      <rect x="20" y="66" width="1" height="1" fill="#261a15" />
      <rect x="42" y="65" width="1" height="1" fill="#261a15" />
      <rect x="41" y="65" width="1" height="1" fill="#261a15" />
      <rect x="40" y="65" width="1" height="1" fill="#261a15" />
      <rect x="39" y="65" width="1" height="1" fill="#261a15" />
      <rect x="38" y="65" width="1" height="1" fill="#261a15" />
      <rect x="37" y="65" width="1" height="1" fill="#261a15" />
      <rect x="36" y="65" width="1" height="1" fill="#261a15" />
      <rect x="35" y="65" width="1" height="1" fill="#261a15" />
      <rect x="34" y="65" width="1" height="1" fill="#261a15" />
      <rect x="33" y="65" width="1" height="1" fill="#261a15" />
      <rect x="32" y="65" width="1" height="1" fill="#261a15" />
      <rect x="31" y="65" width="1" height="1" fill="#261a15" />
      <rect x="30" y="65" width="1" height="1" fill="#261a15" />
      <rect x="29" y="65" width="1" height="1" fill="#261a15" />
      <rect x="28" y="65" width="1" height="1" fill="#261a15" />
      <rect x="27" y="65" width="1" height="1" fill="#261a15" />
      <rect x="26" y="65" width="1" height="1" fill="#261a15" />
      <rect x="25" y="65" width="1" height="1" fill="#261a15" />
      <rect x="24" y="65" width="1" height="1" fill="#261a15" />
      <rect x="23" y="65" width="1" height="1" fill="#261a15" />
      <rect x="22" y="65" width="1" height="1" fill="#261a15" />
      <rect x="21" y="65" width="1" height="1" fill="#261a15" />
      <rect x="20" y="65" width="1" height="1" fill="#261a15" />
      <rect x="19" y="65" width="1" height="1" fill="#261a15" />
      <rect x="18" y="65" width="1" height="1" fill="#261a15" />
      <rect x="17" y="65" width="1" height="1" fill="#261a15" />
      <rect x="16" y="65" width="1" height="1" fill="#261a15" />
      <rect x="15" y="65" width="1" height="1" fill="#261a15" />
      <rect x="45" y="64" width="1" height="1" fill="#261a15" />
      <rect x="44" y="64" width="1" height="1" fill="#261a15" />
      <rect x="43" y="64" width="1" height="1" fill="#261a15" />
      <rect x="42" y="64" width="1" height="1" fill="#261a15" />
      <rect x="41" y="64" width="1" height="1" fill="#261a15" />
      <rect x="40" y="64" width="1" height="1" fill="#261a15" />
      <rect x="39" y="64" width="1" height="1" fill="#261a15" />
      <rect x="38" y="64" width="1" height="1" fill="#261a15" />
      <rect x="37" y="64" width="1" height="1" fill="#261a15" />
      <rect x="36" y="64" width="1" height="1" fill="#261a15" />
      <rect x="35" y="64" width="1" height="1" fill="#261a15" />
      <rect x="34" y="64" width="1" height="1" fill="#261a15" />
      <rect x="33" y="64" width="1" height="1" fill="#261a15" />
      <rect x="32" y="64" width="1" height="1" fill="#261a15" />
      <rect x="31" y="64" width="1" height="1" fill="#261a15" />
      <rect x="30" y="64" width="1" height="1" fill="#261a15" />
      <rect x="29" y="64" width="1" height="1" fill="#261a15" />
      <rect x="28" y="64" width="1" height="1" fill="#261a15" />
      <rect x="27" y="64" width="1" height="1" fill="#261a15" />
      <rect x="26" y="64" width="1" height="1" fill="#261a15" />
      <rect x="25" y="64" width="1" height="1" fill="#261a15" />
      <rect x="24" y="64" width="1" height="1" fill="#261a15" />
      <rect x="23" y="64" width="1" height="1" fill="#261a15" />
      <rect x="22" y="64" width="1" height="1" fill="#261a15" />
      <rect x="21" y="64" width="1" height="1" fill="#261a15" />
      <rect x="20" y="64" width="1" height="1" fill="#261a15" />
      <rect x="19" y="64" width="1" height="1" fill="#261a15" />
      <rect x="18" y="64" width="1" height="1" fill="#261a15" />
      <rect x="17" y="64" width="1" height="1" fill="#261a15" />
      <rect x="16" y="64" width="1" height="1" fill="#261a15" />
      <rect x="15" y="64" width="1" height="1" fill="#261a15" />
      <rect x="14" y="64" width="1" height="1" fill="#261a15" />
      <rect x="13" y="64" width="1" height="1" fill="#261a15" />
      <rect x="12" y="64" width="1" height="1" fill="#261a15" />
      <rect x="45" y="63" width="1" height="1" fill="#261a15" />
      <rect x="44" y="63" width="1" height="1" fill="#261a15" />
      <rect x="43" y="63" width="1" height="1" fill="#261a15" />
      <rect x="42" y="63" width="1" height="1" fill="#261a15" />
      <rect x="41" y="63" width="1" height="1" fill="#261a15" />
      <rect x="40" y="63" width="1" height="1" fill="#261a15" />
      <rect x="39" y="63" width="1" height="1" fill="#261a15" />
      <rect x="38" y="63" width="1" height="1" fill="#261a15" />
      <rect x="37" y="63" width="1" height="1" fill="#261a15" />
      <rect x="36" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="35" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="34" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="33" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="32" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="31" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="30" y="63" width="1" height="1" fill="#261a15" />
      <rect x="29" y="63" width="1" height="1" fill="#261a15" />
      <rect x="28" y="63" width="1" height="1" fill="#261a15" />
      <rect x="27" y="63" width="1" height="1" fill="#261a15" />
      <rect x="26" y="63" width="1" height="1" fill="#261a15" />
      <rect x="25" y="63" width="1" height="1" fill="#261a15" />
      <rect x="24" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="23" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="22" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="21" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="20" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="19" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="18" y="63" width="1" height="1" fill="#7e6848" />
      <rect x="17" y="63" width="1" height="1" fill="#261a15" />
      <rect x="16" y="63" width="1" height="1" fill="#261a15" />
      <rect x="15" y="63" width="1" height="1" fill="#261a15" />
      <rect x="14" y="63" width="1" height="1" fill="#261a15" />
      <rect x="13" y="63" width="1" height="1" fill="#261a15" />
      <rect x="12" y="63" width="1" height="1" fill="#261a15" />
      <rect x="42" y="62" width="1" height="1" fill="#261a15" />
      <rect x="41" y="62" width="1" height="1" fill="#261a15" />
      <rect x="40" y="62" width="1" height="1" fill="#261a15" />
      <rect x="39" y="62" width="1" height="1" fill="#261a15" />
      <rect x="38" y="62" width="1" height="1" fill="#261a15" />
      <rect x="37" y="62" width="1" height="1" fill="#261a15" />
      <rect x="36" y="62" width="1" height="1" fill="#7e6848" />
      <rect x="35" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="34" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="33" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="62" width="1" height="1" fill="#7e6848" />
      <rect x="31" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="62" width="1" height="1" fill="#261a15" />
      <rect x="29" y="62" width="1" height="1" fill="#261a15" />
      <rect x="28" y="62" width="1" height="1" fill="#261a15" />
      <rect x="27" y="62" width="1" height="1" fill="#261a15" />
      <rect x="26" y="62" width="1" height="1" fill="#261a15" />
      <rect x="25" y="62" width="1" height="1" fill="#261a15" />
      <rect x="24" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="62" width="1" height="1" fill="#7e6848" />
      <rect x="22" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="62" width="1" height="1" fill="#7e6848" />
      <rect x="18" y="62" width="1" height="1" fill="#d7938a" />
      <rect x="17" y="62" width="1" height="1" fill="#261a15" />
      <rect x="16" y="62" width="1" height="1" fill="#261a15" />
      <rect x="15" y="62" width="1" height="1" fill="#261a15" />
      <rect x="37" y="61" width="1" height="1" fill="#261a15" />
      <rect x="36" y="61" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="61" width="1" height="1" fill="#7e6848" />
      <rect x="34" y="61" width="1" height="1" fill="#7e6848" />
      <rect x="33" y="61" width="1" height="1" fill="#7e6848" />
      <rect x="32" y="61" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="61" width="1" height="1" fill="#261a15" />
      <rect x="30" y="61" width="1" height="1" fill="#261a15" />
      <rect x="29" y="61" width="1" height="1" fill="#261a15" />
      <rect x="28" y="61" width="1" height="1" fill="#261a15" />
      <rect x="27" y="61" width="1" height="1" fill="#261a15" />
      <rect x="26" y="61" width="1" height="1" fill="#261a15" />
      <rect x="25" y="61" width="1" height="1" fill="#261a15" />
      <rect x="24" y="61" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="61" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="61" width="1" height="1" fill="#7e6848" />
      <rect x="21" y="61" width="1" height="1" fill="#7e6848" />
      <rect x="20" y="61" width="1" height="1" fill="#7e6848" />
      <rect x="19" y="61" width="1" height="1" fill="#261a15" />
      <rect x="18" y="61" width="1" height="1" fill="#261a15" />
      <rect x="37" y="60" width="1" height="1" fill="#261a15" />
      <rect x="36" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="35" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="34" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="33" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="32" y="60" width="1" height="1" fill="#261a15" />
      <rect x="25" y="60" width="1" height="1" fill="#261a15" />
      <rect x="24" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="23" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="60" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="60" width="1" height="1" fill="#261a15" />
      <rect x="37" y="59" width="1" height="1" fill="#261a15" />
      <rect x="36" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="35" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="34" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="33" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="32" y="59" width="1" height="1" fill="#261a15" />
      <rect x="25" y="59" width="1" height="1" fill="#261a15" />
      <rect x="24" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="23" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="59" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="59" width="1" height="1" fill="#261a15" />
      <rect x="37" y="58" width="1" height="1" fill="#261a15" />
      <rect x="36" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="35" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="34" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="33" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="32" y="58" width="1" height="1" fill="#261a15" />
      <rect x="25" y="58" width="1" height="1" fill="#261a15" />
      <rect x="24" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="23" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="58" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="58" width="1" height="1" fill="#261a15" />
      <rect x="37" y="57" width="1" height="1" fill="#261a15" />
      <rect x="36" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="35" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="34" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="33" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="32" y="57" width="1" height="1" fill="#261a15" />
      <rect x="25" y="57" width="1" height="1" fill="#261a15" />
      <rect x="24" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="23" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="57" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="57" width="1" height="1" fill="#261a15" />
      <rect x="37" y="56" width="1" height="1" fill="#261a15" />
      <rect x="36" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="35" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="34" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="33" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="32" y="56" width="1" height="1" fill="#261a15" />
      <rect x="25" y="56" width="1" height="1" fill="#261a15" />
      <rect x="24" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="23" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="56" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="56" width="1" height="1" fill="#261a15" />
      <rect x="37" y="55" width="1" height="1" fill="#261a15" />
      <rect x="36" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="55" width="1" height="1" fill="#261a15" />
      <rect x="25" y="55" width="1" height="1" fill="#261a15" />
      <rect x="24" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="55" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="55" width="1" height="1" fill="#261a15" />
      <rect x="37" y="54" width="1" height="1" fill="#261a15" />
      <rect x="36" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="54" width="1" height="1" fill="#261a15" />
      <rect x="26" y="54" width="1" height="1" fill="#261a15" />
      <rect x="25" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="54" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="54" width="1" height="1" fill="#261a15" />
      <rect x="37" y="53" width="1" height="1" fill="#261a15" />
      <rect x="36" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="53" width="1" height="1" fill="#261a15" />
      <rect x="26" y="53" width="1" height="1" fill="#261a15" />
      <rect x="25" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="53" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="53" width="1" height="1" fill="#261a15" />
      <rect x="37" y="52" width="1" height="1" fill="#261a15" />
      <rect x="36" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="52" width="1" height="1" fill="#261a15" />
      <rect x="27" y="52" width="1" height="1" fill="#261a15" />
      <rect x="26" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="52" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="52" width="1" height="1" fill="#261a15" />
      <rect x="38" y="51" width="1" height="1" fill="#261a15" />
      <rect x="37" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="51" width="1" height="1" fill="#261a15" />
      <rect x="27" y="51" width="1" height="1" fill="#261a15" />
      <rect x="26" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="51" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="51" width="1" height="1" fill="#261a15" />
      <rect x="42" y="50" width="1" height="1" fill="#261a15" />
      <rect x="41" y="50" width="1" height="1" fill="#261a15" />
      <rect x="40" y="50" width="1" height="1" fill="#261a15" />
      <rect x="39" y="50" width="1" height="1" fill="#261a15" />
      <rect x="38" y="50" width="1" height="1" fill="#261a15" />
      <rect x="37" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="50" width="1" height="1" fill="#261a15" />
      <rect x="27" y="50" width="1" height="1" fill="#261a15" />
      <rect x="26" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="50" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="50" width="1" height="1" fill="#261a15" />
      <rect x="43" y="49" width="1" height="1" fill="#261a15" />
      <rect x="42" y="49" width="1" height="1" fill="#b16f67" />
      <rect x="41" y="49" width="1" height="1" fill="#b16f67" />
      <rect x="40" y="49" width="1" height="1" fill="#b16f67" />
      <rect x="39" y="49" width="1" height="1" fill="#261a15" />
      <rect x="38" y="49" width="1" height="1" fill="#261a15" />
      <rect x="37" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="49" width="1" height="1" fill="#261a15" />
      <rect x="27" y="49" width="1" height="1" fill="#261a15" />
      <rect x="26" y="49" width="1" height="1" fill="#261a15" />
      <rect x="25" y="49" width="1" height="1" fill="#261a15" />
      <rect x="24" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="49" width="1" height="1" fill="#261a15" />
      <rect x="22" y="49" width="1" height="1" fill="#261a15" />
      <rect x="21" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="49" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="49" width="1" height="1" fill="#261a15" />
      <rect x="43" y="48" width="1" height="1" fill="#261a15" />
      <rect x="42" y="48" width="1" height="1" fill="#b16f67" />
      <rect x="41" y="48" width="1" height="1" fill="#b16f67" />
      <rect x="40" y="48" width="1" height="1" fill="#b16f67" />
      <rect x="39" y="48" width="1" height="1" fill="#261a15" />
      <rect x="38" y="48" width="1" height="1" fill="#261a15" />
      <rect x="37" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="48" width="1" height="1" fill="#261a15" />
      <rect x="26" y="48" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="48" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="48" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="48" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="48" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="48" width="1" height="1" fill="#261a15" />
      <rect x="43" y="47" width="1" height="1" fill="#261a15" />
      <rect x="42" y="47" width="1" height="1" fill="#261a15" />
      <rect x="41" y="47" width="1" height="1" fill="#261a15" />
      <rect x="40" y="47" width="1" height="1" fill="#261a15" />
      <rect x="39" y="47" width="1" height="1" fill="#261a15" />
      <rect x="38" y="47" width="1" height="1" fill="#261a15" />
      <rect x="37" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="47" width="1" height="1" fill="#261a15" />
      <rect x="26" y="47" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="47" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="47" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="47" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="47" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="47" width="1" height="1" fill="#261a15" />
      <rect x="18" y="47" width="1" height="1" fill="#261a15" />
      <rect x="17" y="47" width="1" height="1" fill="#261a15" />
      <rect x="44" y="46" width="1" height="1" fill="#261a15" />
      <rect x="43" y="46" width="1" height="1" fill="#533e3b" />
      <rect x="42" y="46" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="46" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="46" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="46" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="46" width="1" height="1" fill="#261a15" />
      <rect x="37" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="46" width="1" height="1" fill="#261a15" />
      <rect x="26" y="46" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="46" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="46" width="1" height="1" fill="#261a15" />
      <rect x="23" y="46" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="46" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="46" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="46" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="46" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="46" width="1" height="1" fill="#ad936e" />
      <rect x="16" y="46" width="1" height="1" fill="#261a15" />
      <rect x="44" y="45" width="1" height="1" fill="#261a15" />
      <rect x="43" y="45" width="1" height="1" fill="#533e3b" />
      <rect x="42" y="45" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="45" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="45" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="45" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="45" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="45" width="1" height="1" fill="#261a15" />
      <rect x="36" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="45" width="1" height="1" fill="#261a15" />
      <rect x="26" y="45" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="45" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="45" width="1" height="1" fill="#261a15" />
      <rect x="23" y="45" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="45" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="45" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="45" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="45" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="45" width="1" height="1" fill="#ad936e" />
      <rect x="16" y="45" width="1" height="1" fill="#261a15" />
      <rect x="44" y="44" width="1" height="1" fill="#261a15" />
      <rect x="43" y="44" width="1" height="1" fill="#533e3b" />
      <rect x="42" y="44" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="44" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="44" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="44" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="44" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="44" width="1" height="1" fill="#261a15" />
      <rect x="36" y="44" width="1" height="1" fill="#261a15" />
      <rect x="35" y="44" width="1" height="1" fill="#261a15" />
      <rect x="34" y="44" width="1" height="1" fill="#261a15" />
      <rect x="33" y="44" width="1" height="1" fill="#261a15" />
      <rect x="32" y="44" width="1" height="1" fill="#261a15" />
      <rect x="31" y="44" width="1" height="1" fill="#261a15" />
      <rect x="30" y="44" width="1" height="1" fill="#261a15" />
      <rect x="29" y="44" width="1" height="1" fill="#261a15" />
      <rect x="28" y="44" width="1" height="1" fill="#261a15" />
      <rect x="27" y="44" width="1" height="1" fill="#261a15" />
      <rect x="26" y="44" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="44" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="44" width="1" height="1" fill="#261a15" />
      <rect x="23" y="44" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="44" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="44" width="1" height="1" fill="#261a15" />
      <rect x="20" y="44" width="1" height="1" fill="#261a15" />
      <rect x="19" y="44" width="1" height="1" fill="#7e6848" />
      <rect x="18" y="44" width="1" height="1" fill="#7e6848" />
      <rect x="17" y="44" width="1" height="1" fill="#ad936e" />
      <rect x="16" y="44" width="1" height="1" fill="#261a15" />
      <rect x="44" y="43" width="1" height="1" fill="#261a15" />
      <rect x="43" y="43" width="1" height="1" fill="#533e3b" />
      <rect x="42" y="43" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="43" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="43" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="43" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="43" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="43" width="1" height="1" fill="#261a15" />
      <rect x="36" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="35" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="34" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="33" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="32" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="31" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="30" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="29" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="28" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="27" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="26" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="23" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="20" y="43" width="1" height="1" fill="#3e4b5c" />
      <rect x="19" y="43" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="43" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="43" width="1" height="1" fill="#261a15" />
      <rect x="16" y="43" width="1" height="1" fill="#261a15" />
      <rect x="15" y="43" width="1" height="1" fill="#261a15" />
      <rect x="14" y="43" width="1" height="1" fill="#261a15" />
      <rect x="44" y="42" width="1" height="1" fill="#261a15" />
      <rect x="43" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="42" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="36" y="42" width="1" height="1" fill="#261a15" />
      <rect x="35" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="34" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="33" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="32" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="31" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="30" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="29" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="28" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="27" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="26" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="25" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="24" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="23" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="22" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="21" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="20" y="42" width="1" height="1" fill="#3e4b5c" />
      <rect x="19" y="42" width="1" height="1" fill="#261a15" />
      <rect x="18" y="42" width="1" height="1" fill="#261a15" />
      <rect x="17" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="42" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="42" width="1" height="1" fill="#3d2c28" />
      <rect x="14" y="42" width="1" height="1" fill="#3d2c28" />
      <rect x="13" y="42" width="1" height="1" fill="#261a15" />
      <rect x="44" y="41" width="1" height="1" fill="#261a15" />
      <rect x="43" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="42" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="36" y="41" width="1" height="1" fill="#261a15" />
      <rect x="35" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="34" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="33" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="32" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="31" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="30" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="29" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="28" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="27" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="26" y="41" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="24" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="23" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="22" y="41" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="20" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="19" y="41" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="17" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="41" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="41" width="1" height="1" fill="#3d2c28" />
      <rect x="14" y="41" width="1" height="1" fill="#3d2c28" />
      <rect x="13" y="41" width="1" height="1" fill="#261a15" />
      <rect x="43" y="40" width="1" height="1" fill="#261a15" />
      <rect x="42" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="41" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="36" y="40" width="1" height="1" fill="#261a15" />
      <rect x="35" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="34" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="33" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="32" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="31" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="30" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="29" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="28" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="27" y="40" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="25" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="24" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="23" y="40" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="21" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="20" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="19" y="40" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="17" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="40" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="40" width="1" height="1" fill="#3d2c28" />
      <rect x="14" y="40" width="1" height="1" fill="#3d2c28" />
      <rect x="13" y="40" width="1" height="1" fill="#261a15" />
      <rect x="42" y="39" width="1" height="1" fill="#261a15" />
      <rect x="41" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="36" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="35" y="39" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="33" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="32" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="31" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="30" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="29" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="28" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="27" y="39" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="25" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="24" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="23" y="39" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="21" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="20" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="19" y="39" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="17" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="39" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="39" width="1" height="1" fill="#3d2c28" />
      <rect x="14" y="39" width="1" height="1" fill="#3d2c28" />
      <rect x="13" y="39" width="1" height="1" fill="#261a15" />
      <rect x="3" y="39" width="1" height="1" fill="#261a15" />
      <rect x="2" y="39" width="1" height="1" fill="#261a15" />
      <rect x="1" y="39" width="1" height="1" fill="#261a15" />
      <rect x="42" y="38" width="1" height="1" fill="#261a15" />
      <rect x="41" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="40" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="39" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="38" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="37" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="36" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="35" y="38" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="38" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="32" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="31" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="30" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="29" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="28" y="38" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="26" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="25" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="24" y="38" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="22" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="21" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="20" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="19" y="38" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="17" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="38" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="38" width="1" height="1" fill="#b16f67" />
      <rect x="14" y="38" width="1" height="1" fill="#b16f67" />
      <rect x="13" y="38" width="1" height="1" fill="#261a15" />
      <rect x="5" y="38" width="1" height="1" fill="#261a15" />
      <rect x="4" y="38" width="1" height="1" fill="#261a15" />
      <rect x="3" y="38" width="1" height="1" fill="#9d3944" />
      <rect x="2" y="38" width="1" height="1" fill="#9d3944" />
      <rect x="1" y="38" width="1" height="1" fill="#9d3944" />
      <rect y="38" width="1" height="1" fill="#261a15" />
      <rect x="41" y="37" width="1" height="1" fill="#261a15" />
      <rect x="40" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="32" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="31" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="30" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="29" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="28" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="26" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="25" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="24" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="37" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="17" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="37" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="37" width="1" height="1" fill="#b16f67" />
      <rect x="14" y="37" width="1" height="1" fill="#b16f67" />
      <rect x="13" y="37" width="1" height="1" fill="#261a15" />
      <rect x="7" y="37" width="1" height="1" fill="#261a15" />
      <rect x="6" y="37" width="1" height="1" fill="#261a15" />
      <rect x="5" y="37" width="1" height="1" fill="#9d3944" />
      <rect x="4" y="37" width="1" height="1" fill="#9d3944" />
      <rect x="3" y="37" width="1" height="1" fill="#9d3944" />
      <rect x="2" y="37" width="1" height="1" fill="#9d3944" />
      <rect x="1" y="37" width="1" height="1" fill="#9d3944" />
      <rect y="37" width="1" height="1" fill="#261a15" />
      <rect x="42" y="36" width="1" height="1" fill="#261a15" />
      <rect x="41" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="40" y="36" width="1" height="1" fill="#261a15" />
      <rect x="39" y="36" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="36" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="36" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="36" width="1" height="1" fill="#533e3b" />
      <rect x="27" y="36" width="1" height="1" fill="#533e3b" />
      <rect x="26" y="36" width="1" height="1" fill="#533e3b" />
      <rect x="25" y="36" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="36" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="36" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="36" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="36" width="1" height="1" fill="#533e3b" />
      <rect x="17" y="36" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="36" width="1" height="1" fill="#533e3b" />
      <rect x="15" y="36" width="1" height="1" fill="#b16f67" />
      <rect x="14" y="36" width="1" height="1" fill="#b16f67" />
      <rect x="13" y="36" width="1" height="1" fill="#b16f67" />
      <rect x="12" y="36" width="1" height="1" fill="#261a15" />
      <rect x="9" y="36" width="1" height="1" fill="#261a15" />
      <rect x="8" y="36" width="1" height="1" fill="#261a15" />
      <rect x="7" y="36" width="1" height="1" fill="#9d3944" />
      <rect x="6" y="36" width="1" height="1" fill="#9d3944" />
      <rect x="5" y="36" width="1" height="1" fill="#9d3944" />
      <rect x="4" y="36" width="1" height="1" fill="#9d3944" />
      <rect x="3" y="36" width="1" height="1" fill="#9d3944" />
      <rect x="2" y="36" width="1" height="1" fill="#261a15" />
      <rect x="1" y="36" width="1" height="1" fill="#261a15" />
      <rect x="42" y="35" width="1" height="1" fill="#261a15" />
      <rect x="41" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="40" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="39" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="38" y="35" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="35" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="35" width="1" height="1" fill="#533e3b" />
      <rect x="27" y="35" width="1" height="1" fill="#533e3b" />
      <rect x="26" y="35" width="1" height="1" fill="#533e3b" />
      <rect x="25" y="35" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="35" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="35" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="35" width="1" height="1" fill="#533e3b" />
      <rect x="16" y="35" width="1" height="1" fill="#261a15" />
      <rect x="15" y="35" width="1" height="1" fill="#261a15" />
      <rect x="14" y="35" width="1" height="1" fill="#b16f67" />
      <rect x="13" y="35" width="1" height="1" fill="#b16f67" />
      <rect x="12" y="35" width="1" height="1" fill="#b16f67" />
      <rect x="11" y="35" width="1" height="1" fill="#261a15" />
      <rect x="10" y="35" width="1" height="1" fill="#261a15" />
      <rect x="9" y="35" width="1" height="1" fill="#9d3944" />
      <rect x="8" y="35" width="1" height="1" fill="#9d3944" />
      <rect x="7" y="35" width="1" height="1" fill="#9d3944" />
      <rect x="6" y="35" width="1" height="1" fill="#9d3944" />
      <rect x="5" y="35" width="1" height="1" fill="#9d3944" />
      <rect x="4" y="35" width="1" height="1" fill="#261a15" />
      <rect x="3" y="35" width="1" height="1" fill="#261a15" />
      <rect x="51" y="34" width="1" height="1" fill="#261a15" />
      <rect x="50" y="34" width="1" height="1" fill="#261a15" />
      <rect x="49" y="34" width="1" height="1" fill="#261a15" />
      <rect x="48" y="34" width="1" height="1" fill="#261a15" />
      <rect x="47" y="34" width="1" height="1" fill="#261a15" />
      <rect x="46" y="34" width="1" height="1" fill="#261a15" />
      <rect x="43" y="34" width="1" height="1" fill="#261a15" />
      <rect x="42" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="41" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="40" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="39" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="38" y="34" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="34" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="34" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="34" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="34" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="34" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="22" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="34" width="1" height="1" fill="#ad936e" />
      <rect x="16" y="34" width="1" height="1" fill="#261a15" />
      <rect x="14" y="34" width="1" height="1" fill="#261a15" />
      <rect x="13" y="34" width="1" height="1" fill="#b16f67" />
      <rect x="12" y="34" width="1" height="1" fill="#d7938a" />
      <rect x="11" y="34" width="1" height="1" fill="#d7938a" />
      <rect x="10" y="34" width="1" height="1" fill="#261a15" />
      <rect x="9" y="34" width="1" height="1" fill="#9d3944" />
      <rect x="8" y="34" width="1" height="1" fill="#9d3944" />
      <rect x="7" y="34" width="1" height="1" fill="#9d3944" />
      <rect x="6" y="34" width="1" height="1" fill="#261a15" />
      <rect x="5" y="34" width="1" height="1" fill="#261a15" />
      <rect x="52" y="33" width="1" height="1" fill="#261a15" />
      <rect x="51" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="50" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="49" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="48" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="47" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="46" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="45" y="33" width="1" height="1" fill="#261a15" />
      <rect x="42" y="33" width="1" height="1" fill="#261a15" />
      <rect x="41" y="33" width="1" height="1" fill="#261a15" />
      <rect x="40" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="39" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="38" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="37" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="30" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="27" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="26" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="25" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="24" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="22" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="33" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="33" width="1" height="1" fill="#261a15" />
      <rect x="15" y="33" width="1" height="1" fill="#261a15" />
      <rect x="14" y="33" width="1" height="1" fill="#261a15" />
      <rect x="13" y="33" width="1" height="1" fill="#d7938a" />
      <rect x="12" y="33" width="1" height="1" fill="#d7938a" />
      <rect x="11" y="33" width="1" height="1" fill="#d7938a" />
      <rect x="10" y="33" width="1" height="1" fill="#261a15" />
      <rect x="9" y="33" width="1" height="1" fill="#9d3944" />
      <rect x="8" y="33" width="1" height="1" fill="#261a15" />
      <rect x="7" y="33" width="1" height="1" fill="#261a15" />
      <rect x="53" y="32" width="1" height="1" fill="#261a15" />
      <rect x="52" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="51" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="50" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="49" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="48" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="47" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="46" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="45" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="44" y="32" width="1" height="1" fill="#261a15" />
      <rect x="40" y="32" width="1" height="1" fill="#261a15" />
      <rect x="39" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="38" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="37" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="30" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="32" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="32" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="32" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="32" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="22" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="32" width="1" height="1" fill="#ad936e" />
      <rect x="17" y="32" width="1" height="1" fill="#261a15" />
      <rect x="16" y="32" width="1" height="1" fill="#261a15" />
      <rect x="15" y="32" width="1" height="1" fill="#9d3944" />
      <rect x="14" y="32" width="1" height="1" fill="#261a15" />
      <rect x="13" y="32" width="1" height="1" fill="#d7938a" />
      <rect x="12" y="32" width="1" height="1" fill="#d7938a" />
      <rect x="11" y="32" width="1" height="1" fill="#d7938a" />
      <rect x="10" y="32" width="1" height="1" fill="#261a15" />
      <rect x="9" y="32" width="1" height="1" fill="#261a15" />
      <rect x="54" y="31" width="1" height="1" fill="#261a15" />
      <rect x="53" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="52" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="51" y="31" width="1" height="1" fill="#e7d8c1" />
      <rect x="50" y="31" width="1" height="1" fill="#e7d8c1" />
      <rect x="49" y="31" width="1" height="1" fill="#e7d8c1" />
      <rect x="48" y="31" width="1" height="1" fill="#e7d8c1" />
      <rect x="47" y="31" width="1" height="1" fill="#e7d8c1" />
      <rect x="46" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="45" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="44" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="43" y="31" width="1" height="1" fill="#261a15" />
      <rect x="40" y="31" width="1" height="1" fill="#261a15" />
      <rect x="39" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="38" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="37" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="30" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="31" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="31" width="1" height="1" fill="#b16f67" />
      <rect x="26" y="31" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="31" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="22" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="31" width="1" height="1" fill="#ad936e" />
      <rect x="18" y="31" width="1" height="1" fill="#261a15" />
      <rect x="17" y="31" width="1" height="1" fill="#9d3944" />
      <rect x="16" y="31" width="1" height="1" fill="#9d3944" />
      <rect x="15" y="31" width="1" height="1" fill="#9d3944" />
      <rect x="14" y="31" width="1" height="1" fill="#261a15" />
      <rect x="13" y="31" width="1" height="1" fill="#d7938a" />
      <rect x="12" y="31" width="1" height="1" fill="#d7938a" />
      <rect x="11" y="31" width="1" height="1" fill="#261a15" />
      <rect x="10" y="31" width="1" height="1" fill="#261a15" />
      <rect x="55" y="30" width="1" height="1" fill="#261a15" />
      <rect x="54" y="30" width="1" height="1" fill="#ad936e" />
      <rect x="53" y="30" width="1" height="1" fill="#ad936e" />
      <rect x="52" y="30" width="1" height="1" fill="#e7d8c1" />
      <rect x="51" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="50" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="49" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="48" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="47" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="46" y="30" width="1" height="1" fill="#e7d8c1" />
      <rect x="45" y="30" width="1" height="1" fill="#ad936e" />
      <rect x="44" y="30" width="1" height="1" fill="#ad936e" />
      <rect x="43" y="30" width="1" height="1" fill="#ad936e" />
      <rect x="42" y="30" width="1" height="1" fill="#261a15" />
      <rect x="39" y="30" width="1" height="1" fill="#261a15" />
      <rect x="38" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="37" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="36" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="35" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="34" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="33" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="32" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="31" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="30" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="29" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="28" y="30" width="1" height="1" fill="#b16f67" />
      <rect x="27" y="30" width="1" height="1" fill="#b16f67" />
      <rect x="26" y="30" width="1" height="1" fill="#b16f67" />
      <rect x="25" y="30" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="23" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="22" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="21" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="20" y="30" width="1" height="1" fill="#7e6848" />
      <rect x="19" y="30" width="1" height="1" fill="#261a15" />
      <rect x="18" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="17" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="16" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="15" y="30" width="1" height="1" fill="#9d3944" />
      <rect x="14" y="30" width="1" height="1" fill="#261a15" />
      <rect x="13" y="30" width="1" height="1" fill="#261a15" />
      <rect x="12" y="30" width="1" height="1" fill="#261a15" />
      <rect x="55" y="29" width="1" height="1" fill="#261a15" />
      <rect x="54" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="53" y="29" width="1" height="1" fill="#e7d8c1" />
      <rect x="52" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="51" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="50" y="29" width="1" height="1" fill="#e7d8c1" />
      <rect x="49" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="48" y="29" width="1" height="1" fill="#e7d8c1" />
      <rect x="47" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="46" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="45" y="29" width="1" height="1" fill="#e7d8c1" />
      <rect x="44" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="43" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="42" y="29" width="1" height="1" fill="#261a15" />
      <rect x="39" y="29" width="1" height="1" fill="#261a15" />
      <rect x="38" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="37" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="35" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="30" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="29" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="29" width="1" height="1" fill="#b16f67" />
      <rect x="27" y="29" width="1" height="1" fill="#b16f67" />
      <rect x="26" y="29" width="1" height="1" fill="#b16f67" />
      <rect x="25" y="29" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="22" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="29" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="29" width="1" height="1" fill="#261a15" />
      <rect x="18" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="17" y="29" width="1" height="1" fill="#9d3944" />
      <rect x="16" y="29" width="1" height="1" fill="#261a15" />
      <rect x="15" y="29" width="1" height="1" fill="#261a15" />
      <rect x="55" y="28" width="1" height="1" fill="#261a15" />
      <rect x="54" y="28" width="1" height="1" fill="#d8b78a" />
      <rect x="53" y="28" width="1" height="1" fill="#e7d8c1" />
      <rect x="52" y="28" width="1" height="1" fill="#9d3944" />
      <rect x="51" y="28" width="1" height="1" fill="#e7d8c1" />
      <rect x="50" y="28" width="1" height="1" fill="#9d3944" />
      <rect x="49" y="28" width="1" height="1" fill="#9d3944" />
      <rect x="48" y="28" width="1" height="1" fill="#9d3944" />
      <rect x="47" y="28" width="1" height="1" fill="#e7d8c1" />
      <rect x="46" y="28" width="1" height="1" fill="#9d3944" />
      <rect x="45" y="28" width="1" height="1" fill="#e7d8c1" />
      <rect x="44" y="28" width="1" height="1" fill="#d8b78a" />
      <rect x="43" y="28" width="1" height="1" fill="#d8b78a" />
      <rect x="42" y="28" width="1" height="1" fill="#261a15" />
      <rect x="39" y="28" width="1" height="1" fill="#261a15" />
      <rect x="38" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="37" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="36" y="28" width="1" height="1" fill="#261a15" />
      <rect x="35" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="34" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="33" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="32" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="31" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="30" y="28" width="1" height="1" fill="#b16f67" />
      <rect x="29" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="28" y="28" width="1" height="1" fill="#b16f67" />
      <rect x="27" y="28" width="1" height="1" fill="#b16f67" />
      <rect x="26" y="28" width="1" height="1" fill="#b16f67" />
      <rect x="25" y="28" width="1" height="1" fill="#261a15" />
      <rect x="24" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="23" y="28" width="1" height="1" fill="#261a15" />
      <rect x="22" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="21" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="20" y="28" width="1" height="1" fill="#ad936e" />
      <rect x="19" y="28" width="1" height="1" fill="#261a15" />
      <rect x="18" y="28" width="1" height="1" fill="#261a15" />
      <rect x="17" y="28" width="1" height="1" fill="#261a15" />
      <rect x="55" y="27" width="1" height="1" fill="#261a15" />
      <rect x="54" y="27" width="1" height="1" fill="#ad936e" />
      <rect x="53" y="27" width="1" height="1" fill="#e7d8c1" />
      <rect x="52" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="51" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="50" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="49" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="48" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="47" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="46" y="27" width="1" height="1" fill="#9d3944" />
      <rect x="45" y="27" width="1" height="1" fill="#e7d8c1" />
      <rect x="44" y="27" width="1" height="1" fill="#ad936e" />
      <rect x="43" y="27" width="1" height="1" fill="#ad936e" />
      <rect x="42" y="27" width="1" height="1" fill="#261a15" />
      <rect x="41" y="27" width="1" height="1" fill="#261a15" />
      <rect x="40" y="27" width="1" height="1" fill="#261a15" />
      <rect x="39" y="27" width="1" height="1" fill="#261a15" />
      <rect x="38" y="27" width="1" height="1" fill="#261a15" />
      <rect x="37" y="27" width="1" height="1" fill="#261a15" />
      <rect x="36" y="27" width="1" height="1" fill="#261a15" />
      <rect x="35" y="27" width="1" height="1" fill="#261a15" />
      <rect x="34" y="27" width="1" height="1" fill="#261a15" />
      <rect x="33" y="27" width="1" height="1" fill="#261a15" />
      <rect x="32" y="27" width="1" height="1" fill="#261a15" />
      <rect x="31" y="27" width="1" height="1" fill="#b16f67" />
      <rect x="30" y="27" width="1" height="1" fill="#b16f67" />
      <rect x="29" y="27" width="1" height="1" fill="#b16f67" />
      <rect x="28" y="27" width="1" height="1" fill="#b16f67" />
      <rect x="27" y="27" width="1" height="1" fill="#b16f67" />
      <rect x="26" y="27" width="1" height="1" fill="#261a15" />
      <rect x="25" y="27" width="1" height="1" fill="#261a15" />
      <rect x="24" y="27" width="1" height="1" fill="#261a15" />
      <rect x="23" y="27" width="1" height="1" fill="#261a15" />
      <rect x="22" y="27" width="1" height="1" fill="#261a15" />
      <rect x="21" y="27" width="1" height="1" fill="#261a15" />
      <rect x="20" y="27" width="1" height="1" fill="#261a15" />
      <rect x="19" y="27" width="1" height="1" fill="#261a15" />
      <rect x="55" y="26" width="1" height="1" fill="#261a15" />
      <rect x="54" y="26" width="1" height="1" fill="#d8b78a" />
      <rect x="53" y="26" width="1" height="1" fill="#e7d8c1" />
      <rect x="52" y="26" width="1" height="1" fill="#9d3944" />
      <rect x="51" y="26" width="1" height="1" fill="#9d3944" />
      <rect x="50" y="26" width="1" height="1" fill="#e7d8c1" />
      <rect x="49" y="26" width="1" height="1" fill="#e7d8c1" />
      <rect x="48" y="26" width="1" height="1" fill="#e7d8c1" />
      <rect x="47" y="26" width="1" height="1" fill="#9d3944" />
      <rect x="46" y="26" width="1" height="1" fill="#9d3944" />
      <rect x="45" y="26" width="1" height="1" fill="#e7d8c1" />
      <rect x="44" y="26" width="1" height="1" fill="#d8b78a" />
      <rect x="43" y="26" width="1" height="1" fill="#d8b78a" />
      <rect x="42" y="26" width="1" height="1" fill="#261a15" />
      <rect x="41" y="26" width="1" height="1" fill="#261a15" />
      <rect x="40" y="26" width="1" height="1" fill="#261a15" />
      <rect x="39" y="26" width="1" height="1" fill="#261a15" />
      <rect x="38" y="26" width="1" height="1" fill="#261a15" />
      <rect x="37" y="26" width="1" height="1" fill="#261a15" />
      <rect x="36" y="26" width="1" height="1" fill="#261a15" />
      <rect x="35" y="26" width="1" height="1" fill="#261a15" />
      <rect x="34" y="26" width="1" height="1" fill="#261a15" />
      <rect x="33" y="26" width="1" height="1" fill="#261a15" />
      <rect x="32" y="26" width="1" height="1" fill="#261a15" />
      <rect x="31" y="26" width="1" height="1" fill="#b16f67" />
      <rect x="30" y="26" width="1" height="1" fill="#b16f67" />
      <rect x="29" y="26" width="1" height="1" fill="#b16f67" />
      <rect x="28" y="26" width="1" height="1" fill="#b16f67" />
      <rect x="27" y="26" width="1" height="1" fill="#261a15" />
      <rect x="26" y="26" width="1" height="1" fill="#261a15" />
      <rect x="25" y="26" width="1" height="1" fill="#261a15" />
      <rect x="24" y="26" width="1" height="1" fill="#261a15" />
      <rect x="23" y="26" width="1" height="1" fill="#261a15" />
      <rect x="22" y="26" width="1" height="1" fill="#261a15" />
      <rect x="21" y="26" width="1" height="1" fill="#261a15" />
      <rect x="55" y="25" width="1" height="1" fill="#261a15" />
      <rect x="54" y="25" width="1" height="1" fill="#ad936e" />
      <rect x="53" y="25" width="1" height="1" fill="#ad936e" />
      <rect x="52" y="25" width="1" height="1" fill="#e7d8c1" />
      <rect x="51" y="25" width="1" height="1" fill="#9d3944" />
      <rect x="50" y="25" width="1" height="1" fill="#9d3944" />
      <rect x="49" y="25" width="1" height="1" fill="#9d3944" />
      <rect x="48" y="25" width="1" height="1" fill="#9d3944" />
      <rect x="47" y="25" width="1" height="1" fill="#9d3944" />
      <rect x="46" y="25" width="1" height="1" fill="#e7d8c1" />
      <rect x="45" y="25" width="1" height="1" fill="#ad936e" />
      <rect x="44" y="25" width="1" height="1" fill="#261a15" />
      <rect x="43" y="25" width="1" height="1" fill="#261a15" />
      <rect x="42" y="25" width="1" height="1" fill="#261a15" />
      <rect x="41" y="25" width="1" height="1" fill="#261a15" />
      <rect x="40" y="25" width="1" height="1" fill="#261a15" />
      <rect x="39" y="25" width="1" height="1" fill="#261a15" />
      <rect x="38" y="25" width="1" height="1" fill="#261a15" />
      <rect x="37" y="25" width="1" height="1" fill="#261a15" />
      <rect x="36" y="25" width="1" height="1" fill="#261a15" />
      <rect x="35" y="25" width="1" height="1" fill="#261a15" />
      <rect x="34" y="25" width="1" height="1" fill="#261a15" />
      <rect x="33" y="25" width="1" height="1" fill="#261a15" />
      <rect x="32" y="25" width="1" height="1" fill="#b16f67" />
      <rect x="31" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="25" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="25" width="1" height="1" fill="#261a15" />
      <rect x="21" y="25" width="1" height="1" fill="#261a15" />
      <rect x="54" y="24" width="1" height="1" fill="#261a15" />
      <rect x="53" y="24" width="1" height="1" fill="#d8b78a" />
      <rect x="52" y="24" width="1" height="1" fill="#d8b78a" />
      <rect x="51" y="24" width="1" height="1" fill="#e7d8c1" />
      <rect x="50" y="24" width="1" height="1" fill="#e7d8c1" />
      <rect x="49" y="24" width="1" height="1" fill="#e7d8c1" />
      <rect x="48" y="24" width="1" height="1" fill="#e7d8c1" />
      <rect x="47" y="24" width="1" height="1" fill="#e7d8c1" />
      <rect x="46" y="24" width="1" height="1" fill="#d8b78a" />
      <rect x="45" y="24" width="1" height="1" fill="#d8b78a" />
      <rect x="44" y="24" width="1" height="1" fill="#261a15" />
      <rect x="43" y="24" width="1" height="1" fill="#261a15" />
      <rect x="42" y="24" width="1" height="1" fill="#261a15" />
      <rect x="41" y="24" width="1" height="1" fill="#261a15" />
      <rect x="40" y="24" width="1" height="1" fill="#261a15" />
      <rect x="39" y="24" width="1" height="1" fill="#261a15" />
      <rect x="38" y="24" width="1" height="1" fill="#261a15" />
      <rect x="37" y="24" width="1" height="1" fill="#261a15" />
      <rect x="36" y="24" width="1" height="1" fill="#261a15" />
      <rect x="35" y="24" width="1" height="1" fill="#261a15" />
      <rect x="34" y="24" width="1" height="1" fill="#b16f67" />
      <rect x="33" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="24" width="1" height="1" fill="#b9867f" />
      <rect x="28" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="24" width="1" height="1" fill="#b9867f" />
      <rect x="26" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="24" width="1" height="1" fill="#b9867f" />
      <rect x="24" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="24" width="1" height="1" fill="#b9867f" />
      <rect x="22" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="24" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="24" width="1" height="1" fill="#261a15" />
      <rect x="17" y="24" width="1" height="1" fill="#261a15" />
      <rect x="53" y="23" width="1" height="1" fill="#261a15" />
      <rect x="52" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="51" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="50" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="49" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="48" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="47" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="46" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="45" y="23" width="1" height="1" fill="#d8b78a" />
      <rect x="44" y="23" width="1" height="1" fill="#261a15" />
      <rect x="43" y="23" width="1" height="1" fill="#261a15" />
      <rect x="42" y="23" width="1" height="1" fill="#261a15" />
      <rect x="41" y="23" width="1" height="1" fill="#261a15" />
      <rect x="40" y="23" width="1" height="1" fill="#261a15" />
      <rect x="39" y="23" width="1" height="1" fill="#261a15" />
      <rect x="38" y="23" width="1" height="1" fill="#261a15" />
      <rect x="37" y="23" width="1" height="1" fill="#261a15" />
      <rect x="36" y="23" width="1" height="1" fill="#261a15" />
      <rect x="35" y="23" width="1" height="1" fill="#b16f67" />
      <rect x="34" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="33" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="23" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="23" width="1" height="1" fill="#261a15" />
      <rect x="17" y="23" width="1" height="1" fill="#261a15" />
      <rect x="16" y="23" width="1" height="1" fill="#261a15" />
      <rect x="52" y="22" width="1" height="1" fill="#261a15" />
      <rect x="51" y="22" width="1" height="1" fill="#d8b78a" />
      <rect x="50" y="22" width="1" height="1" fill="#d8b78a" />
      <rect x="49" y="22" width="1" height="1" fill="#d8b78a" />
      <rect x="48" y="22" width="1" height="1" fill="#d8b78a" />
      <rect x="47" y="22" width="1" height="1" fill="#d8b78a" />
      <rect x="46" y="22" width="1" height="1" fill="#d8b78a" />
      <rect x="45" y="22" width="1" height="1" fill="#261a15" />
      <rect x="43" y="22" width="1" height="1" fill="#261a15" />
      <rect x="42" y="22" width="1" height="1" fill="#261a15" />
      <rect x="41" y="22" width="1" height="1" fill="#261a15" />
      <rect x="40" y="22" width="1" height="1" fill="#261a15" />
      <rect x="39" y="22" width="1" height="1" fill="#261a15" />
      <rect x="38" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="37" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="36" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="34" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="33" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="22" width="1" height="1" fill="#ece4e4" />
      <rect x="27" y="22" width="1" height="1" fill="#ece4e4" />
      <rect x="26" y="22" width="1" height="1" fill="#ece4e4" />
      <rect x="25" y="22" width="1" height="1" fill="#ece4e4" />
      <rect x="24" y="22" width="1" height="1" fill="#b16f67" />
      <rect x="23" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="22" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="22" width="1" height="1" fill="#261a15" />
      <rect x="17" y="22" width="1" height="1" fill="#261a15" />
      <rect x="16" y="22" width="1" height="1" fill="#261a15" />
      <rect x="51" y="21" width="1" height="1" fill="#261a15" />
      <rect x="50" y="21" width="1" height="1" fill="#ad936e" />
      <rect x="49" y="21" width="1" height="1" fill="#ad936e" />
      <rect x="48" y="21" width="1" height="1" fill="#ad936e" />
      <rect x="47" y="21" width="1" height="1" fill="#ad936e" />
      <rect x="46" y="21" width="1" height="1" fill="#261a15" />
      <rect x="45" y="21" width="1" height="1" fill="#261a15" />
      <rect x="44" y="21" width="1" height="1" fill="#261a15" />
      <rect x="43" y="21" width="1" height="1" fill="#261a15" />
      <rect x="42" y="21" width="1" height="1" fill="#261a15" />
      <rect x="41" y="21" width="1" height="1" fill="#261a15" />
      <rect x="40" y="21" width="1" height="1" fill="#261a15" />
      <rect x="39" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="38" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="37" y="21" width="1" height="1" fill="#b16f67" />
      <rect x="36" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="34" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="33" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="21" width="1" height="1" fill="#b9867f" />
      <rect x="29" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="21" width="1" height="1" fill="#b9867f" />
      <rect x="21" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="21" width="1" height="1" fill="#d7938a" />
      <rect x="18" y="21" width="1" height="1" fill="#261a15" />
      <rect x="17" y="21" width="1" height="1" fill="#261a15" />
      <rect x="16" y="21" width="1" height="1" fill="#261a15" />
      <rect x="51" y="20" width="1" height="1" fill="#261a15" />
      <rect x="50" y="20" width="1" height="1" fill="#7e6848" />
      <rect x="49" y="20" width="1" height="1" fill="#7e6848" />
      <rect x="48" y="20" width="1" height="1" fill="#7e6848" />
      <rect x="47" y="20" width="1" height="1" fill="#7e6848" />
      <rect x="46" y="20" width="1" height="1" fill="#261a15" />
      <rect x="44" y="20" width="1" height="1" fill="#261a15" />
      <rect x="43" y="20" width="1" height="1" fill="#261a15" />
      <rect x="42" y="20" width="1" height="1" fill="#261a15" />
      <rect x="41" y="20" width="1" height="1" fill="#261a15" />
      <rect x="40" y="20" width="1" height="1" fill="#261a15" />
      <rect x="39" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="38" y="20" width="1" height="1" fill="#b16f67" />
      <rect x="37" y="20" width="1" height="1" fill="#b16f67" />
      <rect x="36" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="34" y="20" width="1" height="1" fill="#261a15" />
      <rect x="33" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="20" width="1" height="1" fill="#b9867f" />
      <rect x="27" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="20" width="1" height="1" fill="#b9867f" />
      <rect x="23" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="20" width="1" height="1" fill="#d7938a" />
      <rect x="18" y="20" width="1" height="1" fill="#261a15" />
      <rect x="17" y="20" width="1" height="1" fill="#261a15" />
      <rect x="16" y="20" width="1" height="1" fill="#261a15" />
      <rect x="15" y="20" width="1" height="1" fill="#261a15" />
      <rect x="53" y="19" width="1" height="1" fill="#261a15" />
      <rect x="52" y="19" width="1" height="1" fill="#261a15" />
      <rect x="51" y="19" width="1" height="1" fill="#3d2c28" />
      <rect x="50" y="19" width="1" height="1" fill="#3d2c28" />
      <rect x="49" y="19" width="1" height="1" fill="#3d2c28" />
      <rect x="48" y="19" width="1" height="1" fill="#3d2c28" />
      <rect x="47" y="19" width="1" height="1" fill="#3d2c28" />
      <rect x="46" y="19" width="1" height="1" fill="#3d2c28" />
      <rect x="45" y="19" width="1" height="1" fill="#261a15" />
      <rect x="44" y="19" width="1" height="1" fill="#261a15" />
      <rect x="43" y="19" width="1" height="1" fill="#261a15" />
      <rect x="42" y="19" width="1" height="1" fill="#261a15" />
      <rect x="41" y="19" width="1" height="1" fill="#261a15" />
      <rect x="40" y="19" width="1" height="1" fill="#261a15" />
      <rect x="39" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="38" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="37" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="36" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="34" y="19" width="1" height="1" fill="#261a15" />
      <rect x="33" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="19" width="1" height="1" fill="#d7938a" />
      <rect x="18" y="19" width="1" height="1" fill="#261a15" />
      <rect x="17" y="19" width="1" height="1" fill="#261a15" />
      <rect x="16" y="19" width="1" height="1" fill="#261a15" />
      <rect x="15" y="19" width="1" height="1" fill="#261a15" />
      <rect x="51" y="18" width="1" height="1" fill="#261a15" />
      <rect x="50" y="18" width="1" height="1" fill="#261a15" />
      <rect x="49" y="18" width="1" height="1" fill="#261a15" />
      <rect x="48" y="18" width="1" height="1" fill="#261a15" />
      <rect x="47" y="18" width="1" height="1" fill="#261a15" />
      <rect x="46" y="18" width="1" height="1" fill="#261a15" />
      <rect x="44" y="18" width="1" height="1" fill="#261a15" />
      <rect x="43" y="18" width="1" height="1" fill="#261a15" />
      <rect x="42" y="18" width="1" height="1" fill="#261a15" />
      <rect x="41" y="18" width="1" height="1" fill="#261a15" />
      <rect x="40" y="18" width="1" height="1" fill="#261a15" />
      <rect x="39" y="18" width="1" height="1" fill="#261a15" />
      <rect x="38" y="18" width="1" height="1" fill="#261a15" />
      <rect x="37" y="18" width="1" height="1" fill="#261a15" />
      <rect x="36" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="34" y="18" width="1" height="1" fill="#261a15" />
      <rect x="33" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="32" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="31" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="30" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="29" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="18" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="18" width="1" height="1" fill="#b16f67" />
      <rect x="19" y="18" width="1" height="1" fill="#261a15" />
      <rect x="18" y="18" width="1" height="1" fill="#261a15" />
      <rect x="17" y="18" width="1" height="1" fill="#261a15" />
      <rect x="16" y="18" width="1" height="1" fill="#261a15" />
      <rect x="15" y="18" width="1" height="1" fill="#261a15" />
      <rect x="49" y="17" width="1" height="1" fill="#261a15" />
      <rect x="48" y="17" width="1" height="1" fill="#7e6848" />
      <rect x="47" y="17" width="1" height="1" fill="#261a15" />
      <rect x="45" y="17" width="1" height="1" fill="#261a15" />
      <rect x="44" y="17" width="1" height="1" fill="#261a15" />
      <rect x="43" y="17" width="1" height="1" fill="#261a15" />
      <rect x="42" y="17" width="1" height="1" fill="#261a15" />
      <rect x="41" y="17" width="1" height="1" fill="#261a15" />
      <rect x="40" y="17" width="1" height="1" fill="#261a15" />
      <rect x="39" y="17" width="1" height="1" fill="#261a15" />
      <rect x="38" y="17" width="1" height="1" fill="#261a15" />
      <rect x="37" y="17" width="1" height="1" fill="#261a15" />
      <rect x="36" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="17" width="1" height="1" fill="#261a15" />
      <rect x="34" y="17" width="1" height="1" fill="#261a15" />
      <rect x="33" y="17" width="1" height="1" fill="#ece4e4" />
      <rect x="32" y="17" width="1" height="1" fill="#261a15" />
      <rect x="31" y="17" width="1" height="1" fill="#261a15" />
      <rect x="30" y="17" width="1" height="1" fill="#ece4e4" />
      <rect x="29" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="17" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="17" width="1" height="1" fill="#ece4e4" />
      <rect x="22" y="17" width="1" height="1" fill="#261a15" />
      <rect x="21" y="17" width="1" height="1" fill="#261a15" />
      <rect x="20" y="17" width="1" height="1" fill="#ece4e4" />
      <rect x="19" y="17" width="1" height="1" fill="#261a15" />
      <rect x="18" y="17" width="1" height="1" fill="#261a15" />
      <rect x="17" y="17" width="1" height="1" fill="#261a15" />
      <rect x="16" y="17" width="1" height="1" fill="#261a15" />
      <rect x="15" y="17" width="1" height="1" fill="#261a15" />
      <rect x="49" y="16" width="1" height="1" fill="#261a15" />
      <rect x="48" y="16" width="1" height="1" fill="#d8b78a" />
      <rect x="47" y="16" width="1" height="1" fill="#261a15" />
      <rect x="46" y="16" width="1" height="1" fill="#261a15" />
      <rect x="45" y="16" width="1" height="1" fill="#d8b78a" />
      <rect x="44" y="16" width="1" height="1" fill="#d8b78a" />
      <rect x="43" y="16" width="1" height="1" fill="#261a15" />
      <rect x="42" y="16" width="1" height="1" fill="#261a15" />
      <rect x="41" y="16" width="1" height="1" fill="#261a15" />
      <rect x="40" y="16" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="16" width="1" height="1" fill="#261a15" />
      <rect x="38" y="16" width="1" height="1" fill="#261a15" />
      <rect x="37" y="16" width="1" height="1" fill="#261a15" />
      <rect x="36" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="16" width="1" height="1" fill="#261a15" />
      <rect x="34" y="16" width="1" height="1" fill="#261a15" />
      <rect x="33" y="16" width="1" height="1" fill="#261a15" />
      <rect x="32" y="16" width="1" height="1" fill="#261a15" />
      <rect x="31" y="16" width="1" height="1" fill="#261a15" />
      <rect x="30" y="16" width="1" height="1" fill="#261a15" />
      <rect x="29" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="16" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="16" width="1" height="1" fill="#261a15" />
      <rect x="22" y="16" width="1" height="1" fill="#261a15" />
      <rect x="21" y="16" width="1" height="1" fill="#261a15" />
      <rect x="20" y="16" width="1" height="1" fill="#261a15" />
      <rect x="19" y="16" width="1" height="1" fill="#261a15" />
      <rect x="18" y="16" width="1" height="1" fill="#261a15" />
      <rect x="17" y="16" width="1" height="1" fill="#261a15" />
      <rect x="16" y="16" width="1" height="1" fill="#261a15" />
      <rect x="15" y="16" width="1" height="1" fill="#261a15" />
      <rect x="50" y="15" width="1" height="1" fill="#261a15" />
      <rect x="49" y="15" width="1" height="1" fill="#7e6848" />
      <rect x="48" y="15" width="1" height="1" fill="#7e6848" />
      <rect x="47" y="15" width="1" height="1" fill="#ad936e" />
      <rect x="46" y="15" width="1" height="1" fill="#d8b78a" />
      <rect x="45" y="15" width="1" height="1" fill="#261a15" />
      <rect x="44" y="15" width="1" height="1" fill="#261a15" />
      <rect x="43" y="15" width="1" height="1" fill="#261a15" />
      <rect x="42" y="15" width="1" height="1" fill="#261a15" />
      <rect x="41" y="15" width="1" height="1" fill="#261a15" />
      <rect x="40" y="15" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="15" width="1" height="1" fill="#261a15" />
      <rect x="38" y="15" width="1" height="1" fill="#261a15" />
      <rect x="37" y="15" width="1" height="1" fill="#261a15" />
      <rect x="36" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="15" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="15" width="1" height="1" fill="#261a15" />
      <rect x="33" y="15" width="1" height="1" fill="#261a15" />
      <rect x="32" y="15" width="1" height="1" fill="#b16f67" />
      <rect x="31" y="15" width="1" height="1" fill="#b16f67" />
      <rect x="30" y="15" width="1" height="1" fill="#b16f67" />
      <rect x="29" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="15" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="15" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="15" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="15" width="1" height="1" fill="#b16f67" />
      <rect x="20" y="15" width="1" height="1" fill="#261a15" />
      <rect x="19" y="15" width="1" height="1" fill="#261a15" />
      <rect x="18" y="15" width="1" height="1" fill="#261a15" />
      <rect x="17" y="15" width="1" height="1" fill="#261a15" />
      <rect x="16" y="15" width="1" height="1" fill="#261a15" />
      <rect x="15" y="15" width="1" height="1" fill="#261a15" />
      <rect x="50" y="14" width="1" height="1" fill="#261a15" />
      <rect x="49" y="14" width="1" height="1" fill="#7e6848" />
      <rect x="48" y="14" width="1" height="1" fill="#261a15" />
      <rect x="47" y="14" width="1" height="1" fill="#d8b78a" />
      <rect x="46" y="14" width="1" height="1" fill="#261a15" />
      <rect x="43" y="14" width="1" height="1" fill="#261a15" />
      <rect x="42" y="14" width="1" height="1" fill="#261a15" />
      <rect x="41" y="14" width="1" height="1" fill="#261a15" />
      <rect x="40" y="14" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="14" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="14" width="1" height="1" fill="#261a15" />
      <rect x="37" y="14" width="1" height="1" fill="#261a15" />
      <rect x="36" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="14" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="14" width="1" height="1" fill="#261a15" />
      <rect x="33" y="14" width="1" height="1" fill="#261a15" />
      <rect x="32" y="14" width="1" height="1" fill="#261a15" />
      <rect x="31" y="14" width="1" height="1" fill="#261a15" />
      <rect x="30" y="14" width="1" height="1" fill="#b16f67" />
      <rect x="29" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="14" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="14" width="1" height="1" fill="#b16f67" />
      <rect x="22" y="14" width="1" height="1" fill="#b16f67" />
      <rect x="21" y="14" width="1" height="1" fill="#261a15" />
      <rect x="20" y="14" width="1" height="1" fill="#261a15" />
      <rect x="19" y="14" width="1" height="1" fill="#261a15" />
      <rect x="18" y="14" width="1" height="1" fill="#261a15" />
      <rect x="17" y="14" width="1" height="1" fill="#261a15" />
      <rect x="16" y="14" width="1" height="1" fill="#261a15" />
      <rect x="15" y="14" width="1" height="1" fill="#261a15" />
      <rect x="50" y="13" width="1" height="1" fill="#261a15" />
      <rect x="49" y="13" width="1" height="1" fill="#d8b78a" />
      <rect x="48" y="13" width="1" height="1" fill="#d8b78a" />
      <rect x="47" y="13" width="1" height="1" fill="#d8b78a" />
      <rect x="46" y="13" width="1" height="1" fill="#261a15" />
      <rect x="43" y="13" width="1" height="1" fill="#261a15" />
      <rect x="42" y="13" width="1" height="1" fill="#3d2c28" />
      <rect x="41" y="13" width="1" height="1" fill="#261a15" />
      <rect x="40" y="13" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="13" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="13" width="1" height="1" fill="#261a15" />
      <rect x="37" y="13" width="1" height="1" fill="#261a15" />
      <rect x="36" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="13" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="13" width="1" height="1" fill="#261a15" />
      <rect x="33" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="13" width="1" height="1" fill="#d39087" />
      <rect x="31" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="13" width="1" height="1" fill="#261a15" />
      <rect x="29" y="13" width="1" height="1" fill="#261a15" />
      <rect x="28" y="13" width="1" height="1" fill="#261a15" />
      <rect x="27" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="13" width="1" height="1" fill="#261a15" />
      <rect x="23" y="13" width="1" height="1" fill="#261a15" />
      <rect x="22" y="13" width="1" height="1" fill="#261a15" />
      <rect x="21" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="13" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="13" width="1" height="1" fill="#261a15" />
      <rect x="18" y="13" width="1" height="1" fill="#261a15" />
      <rect x="17" y="13" width="1" height="1" fill="#261a15" />
      <rect x="16" y="13" width="1" height="1" fill="#261a15" />
      <rect x="15" y="13" width="1" height="1" fill="#261a15" />
      <rect x="49" y="12" width="1" height="1" fill="#261a15" />
      <rect x="48" y="12" width="1" height="1" fill="#261a15" />
      <rect x="47" y="12" width="1" height="1" fill="#261a15" />
      <rect x="43" y="12" width="1" height="1" fill="#261a15" />
      <rect x="42" y="12" width="1" height="1" fill="#3d2c28" />
      <rect x="41" y="12" width="1" height="1" fill="#261a15" />
      <rect x="40" y="12" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="12" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="12" width="1" height="1" fill="#261a15" />
      <rect x="37" y="12" width="1" height="1" fill="#261a15" />
      <rect x="36" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="12" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="12" width="1" height="1" fill="#261a15" />
      <rect x="33" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="12" width="1" height="1" fill="#d18f86" />
      <rect x="29" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="12" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="12" width="1" height="1" fill="#261a15" />
      <rect x="18" y="12" width="1" height="1" fill="#261a15" />
      <rect x="17" y="12" width="1" height="1" fill="#261a15" />
      <rect x="16" y="12" width="1" height="1" fill="#261a15" />
      <rect x="43" y="11" width="1" height="1" fill="#261a15" />
      <rect x="42" y="11" width="1" height="1" fill="#3d2c28" />
      <rect x="41" y="11" width="1" height="1" fill="#261a15" />
      <rect x="40" y="11" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="11" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="11" width="1" height="1" fill="#261a15" />
      <rect x="37" y="11" width="1" height="1" fill="#261a15" />
      <rect x="36" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="11" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="11" width="1" height="1" fill="#261a15" />
      <rect x="33" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="32" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="11" width="1" height="1" fill="#d7938a" />
      <rect x="19" y="11" width="1" height="1" fill="#261a15" />
      <rect x="18" y="11" width="1" height="1" fill="#261a15" />
      <rect x="17" y="11" width="1" height="1" fill="#261a15" />
      <rect x="16" y="11" width="1" height="1" fill="#261a15" />
      <rect x="43" y="10" width="1" height="1" fill="#261a15" />
      <rect x="42" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="41" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="40" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="10" width="1" height="1" fill="#261a15" />
      <rect x="36" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="35" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="10" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="10" width="1" height="1" fill="#261a15" />
      <rect x="32" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="10" width="1" height="1" fill="#d7938a" />
      <rect x="20" y="10" width="1" height="1" fill="#261a15" />
      <rect x="19" y="10" width="1" height="1" fill="#261a15" />
      <rect x="18" y="10" width="1" height="1" fill="#261a15" />
      <rect x="17" y="10" width="1" height="1" fill="#261a15" />
      <rect x="16" y="10" width="1" height="1" fill="#261a15" />
      <rect x="43" y="9" width="1" height="1" fill="#261a15" />
      <rect x="42" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="41" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="40" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="9" width="1" height="1" fill="#261a15" />
      <rect x="35" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="9" width="1" height="1" fill="#261a15" />
      <rect x="32" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="31" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="22" y="9" width="1" height="1" fill="#d7938a" />
      <rect x="21" y="9" width="1" height="1" fill="#261a15" />
      <rect x="20" y="9" width="1" height="1" fill="#261a15" />
      <rect x="19" y="9" width="1" height="1" fill="#261a15" />
      <rect x="18" y="9" width="1" height="1" fill="#261a15" />
      <rect x="17" y="9" width="1" height="1" fill="#3d2c28" />
      <rect x="16" y="9" width="1" height="1" fill="#261a15" />
      <rect x="42" y="8" width="1" height="1" fill="#261a15" />
      <rect x="41" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="40" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="8" width="1" height="1" fill="#261a15" />
      <rect x="31" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="30" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="29" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="28" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="27" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="26" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="25" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="24" y="8" width="1" height="1" fill="#d7938a" />
      <rect x="23" y="8" width="1" height="1" fill="#261a15" />
      <rect x="22" y="8" width="1" height="1" fill="#261a15" />
      <rect x="21" y="8" width="1" height="1" fill="#261a15" />
      <rect x="20" y="8" width="1" height="1" fill="#261a15" />
      <rect x="19" y="8" width="1" height="1" fill="#261a15" />
      <rect x="18" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="17" y="8" width="1" height="1" fill="#3d2c28" />
      <rect x="16" y="8" width="1" height="1" fill="#261a15" />
      <rect x="42" y="7" width="1" height="1" fill="#261a15" />
      <rect x="41" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="40" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="39" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="7" width="1" height="1" fill="#261a15" />
      <rect x="31" y="7" width="1" height="1" fill="#261a15" />
      <rect x="30" y="7" width="1" height="1" fill="#261a15" />
      <rect x="29" y="7" width="1" height="1" fill="#261a15" />
      <rect x="28" y="7" width="1" height="1" fill="#261a15" />
      <rect x="27" y="7" width="1" height="1" fill="#261a15" />
      <rect x="26" y="7" width="1" height="1" fill="#261a15" />
      <rect x="25" y="7" width="1" height="1" fill="#261a15" />
      <rect x="24" y="7" width="1" height="1" fill="#261a15" />
      <rect x="23" y="7" width="1" height="1" fill="#261a15" />
      <rect x="22" y="7" width="1" height="1" fill="#261a15" />
      <rect x="21" y="7" width="1" height="1" fill="#261a15" />
      <rect x="20" y="7" width="1" height="1" fill="#261a15" />
      <rect x="19" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="17" y="7" width="1" height="1" fill="#3d2c28" />
      <rect x="16" y="7" width="1" height="1" fill="#261a15" />
      <rect x="41" y="6" width="1" height="1" fill="#261a15" />
      <rect x="40" y="6" width="1" height="1" fill="#654740" />
      <rect x="39" y="6" width="1" height="1" fill="#654740" />
      <rect x="38" y="6" width="1" height="1" fill="#654740" />
      <rect x="37" y="6" width="1" height="1" fill="#654740" />
      <rect x="36" y="6" width="1" height="1" fill="#654740" />
      <rect x="35" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="6" width="1" height="1" fill="#654740" />
      <rect x="33" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="6" width="1" height="1" fill="#261a15" />
      <rect x="23" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="6" width="1" height="1" fill="#3d2c28" />
      <rect x="17" y="6" width="1" height="1" fill="#261a15" />
      <rect x="40" y="5" width="1" height="1" fill="#261a15" />
      <rect x="39" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="38" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="5" width="1" height="1" fill="#261a15" />
      <rect x="22" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="20" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="19" y="5" width="1" height="1" fill="#3d2c28" />
      <rect x="18" y="5" width="1" height="1" fill="#261a15" />
      <rect x="39" y="4" width="1" height="1" fill="#261a15" />
      <rect x="38" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="37" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="36" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="4" width="1" height="1" fill="#261a15" />
      <rect x="22" y="4" width="1" height="1" fill="#3d2c28" />
      <rect x="21" y="4" width="1" height="1" fill="#261a15" />
      <rect x="20" y="4" width="1" height="1" fill="#261a15" />
      <rect x="19" y="4" width="1" height="1" fill="#261a15" />
      <rect x="38" y="3" width="1" height="1" fill="#261a15" />
      <rect x="37" y="3" width="1" height="1" fill="#261a15" />
      <rect x="36" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="35" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="34" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="33" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="32" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="31" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="30" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="29" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="28" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="27" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="26" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="3" width="1" height="1" fill="#261a15" />
      <rect x="23" y="3" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="3" width="1" height="1" fill="#261a15" />
      <rect x="36" y="2" width="1" height="1" fill="#261a15" />
      <rect x="35" y="2" width="1" height="1" fill="#261a15" />
      <rect x="34" y="2" width="1" height="1" fill="#261a15" />
      <rect x="33" y="2" width="1" height="1" fill="#261a15" />
      <rect x="32" y="2" width="1" height="1" fill="#261a15" />
      <rect x="31" y="2" width="1" height="1" fill="#261a15" />
      <rect x="30" y="2" width="1" height="1" fill="#261a15" />
      <rect x="29" y="2" width="1" height="1" fill="#261a15" />
      <rect x="28" y="2" width="1" height="1" fill="#261a15" />
      <rect x="27" y="2" width="1" height="1" fill="#261a15" />
      <rect x="26" y="2" width="1" height="1" fill="#261a15" />
      <rect x="25" y="2" width="1" height="1" fill="#261a15" />
      <rect x="24" y="2" width="1" height="1" fill="#261a15" />
      <rect x="23" y="2" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="2" width="1" height="1" fill="#261a15" />
      <rect x="27" y="1" width="1" height="1" fill="#261a15" />
      <rect x="26" y="1" width="1" height="1" fill="#3d2c28" />
      <rect x="25" y="1" width="1" height="1" fill="#3d2c28" />
      <rect x="24" y="1" width="1" height="1" fill="#3d2c28" />
      <rect x="23" y="1" width="1" height="1" fill="#3d2c28" />
      <rect x="22" y="1" width="1" height="1" fill="#261a15" />
      <rect x="26" width="1" height="1" fill="#261a15" />
      <rect x="25" width="1" height="1" fill="#261a15" />
      <rect x="24" width="1" height="1" fill="#261a15" />
      <rect x="23" width="1" height="1" fill="#261a15" />
`;
