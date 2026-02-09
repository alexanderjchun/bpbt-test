# The "Who is Bobu" Story

## Scene 1: Enter Bobu

1. The user lands on the page
2. The bg slowly transitions to #403e52
3. Enter fireflies (not the pixel ones we already have)
4. Zero walks into view
5. "This is Bobu"
6. Camera quickly pans to Bobu

## Scene 2: Bobu is born

1. User scrolls
   1. Azukis start loading in sequentially 1 at a time
   2. "January 12th, 2026 Azuki goes live"
2. Bobu rotates on x and scales right into his spot when it's his turn (#40)
3. "Bobu is minted onchain as Azuki #40"

## Scene 3: The Bobu Experiment

1. "Match 6th, 2022 Bobu becomes the first experiment of decentralized IP Governance"
2. Bobu comes front and center
3. User scrolls
   1. Blue lines cut across bobu in a grid
   2. Glitch effect
   3. Splits into pixels
   4. Pixels swarm together and make Pixel Bobu
   5. "WE ARE BOBU

## Scene 4: We are Bobu

...

## TODO

- [x] BG color change — CSS transition on mount, call `setBg(el, color)` to change it anytime. Demo: `/who-is-bobu/demos/bg`
- [x] Fireflies — radial gradient orbs on 2D canvas. Demo: `/who-is-bobu/demos/fireflies`
- [ ] SVG frame playback — see pipeline below
- [ ] Camera panning — `gsap.to(camera.position, { x: target })` on the ortho camera
- [ ] Azuki grid — drop images in `/public/azukis/`, grid component pops them in one at a time on scroll
- [ ] Bobu spinning into grid slot #40 — X-axis rotation (3D card flip) as he lands in position

---

## SVG Frame Playback Pipeline

For animated characters (Zero walk-in, camera pan, any future character animation).

### What it is

SVG frames drawn in Illustrator → triangulated into GPU geometry at build time → played back at runtime as frame-by-frame triangle mesh swaps. Perfectly scalable, fully GPU-rendered, flat-color vector art on WebGL.

### Step 1: Create SVG frames (you, in Illustrator)

- Each frame is a separate `.svg` file
- Each color region must be its own `<path>` with a solid fill (no gradients, no strokes — use Expand Stroke if needed)
- Name sequentially: `zero-walk-001.svg`, `zero-walk-002.svg`, ...
- Drop them in a folder like `assets/svg-frames/zero-walk/`

### Step 2: Build script triangulates all frames (one-time, at build)

- A Node script reads every SVG in the folder
- For each frame: parses `<path>` data → subdivides curves into points → triangulates via `cdt2d` (constrained Delaunay triangulation)
- Outputs a single binary or JSON file with all frame data: vertex positions, triangle indices, and per-path colors
- This runs once during build. Could take 30+ seconds for hundreds of frames — doesn't matter, it's offline.

### Step 3: Runtime playback

- Page loads the pre-built frame data file (one fetch)
- Uploads triangle geometry to the GPU as a buffer
- On each animation tick, swaps which frame's geometry is active (buffer offset or geometry swap)
- Each frame is just the GPU drawing triangles — extremely fast, no CPU path parsing at runtime
- Scroll-driven or time-driven, doesn't matter — we just pick which frame index to show

### What we need to build

1. **Build script** (`scripts/triangulate-svgs.ts`) — reads SVG folder, runs triangulation, outputs frame data file
2. **Runtime player** (`effects/svg-player.ts`) — loads frame data, manages GPU buffers, exposes `setFrame(n)` API
3. **Demo page** (`/who-is-bobu/demos/character`) — test it with a few sample SVG frames

### Dependencies

- `svg-mesh-3d` — SVG path → triangle mesh
- `load-svg` or manual SVG parsing — extract `<path>` elements
- `cdt2d` — constrained Delaunay triangulation (used internally by svg-mesh-3d)

### Constraints

- Flat colors only (no gradients, filters, masks)
- Each color region = separate path = separate draw call. Keep under ~50 regions per frame.
- Self-intersecting paths or paths with complex holes may produce triangulation artifacts — keep paths clean in Illustrator
- Thin sliver shapes can cause issues — avoid very narrow pointed regions
