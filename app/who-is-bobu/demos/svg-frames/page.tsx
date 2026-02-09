export default function SvgFramesDemo() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-xl space-y-6 text-sm text-white/80">
        <h1 className="text-2xl font-bold text-white">SVG Frame Playback</h1>

        <ol className="list-decimal space-y-4 pl-5">
          <li>
            <strong className="text-white">Create SVG frames in Illustrator</strong>
            <p>Each frame is a separate .svg. Each color region is its own path with a solid fill. No gradients, no strokes. Name sequentially: zero-walk-001.svg, zero-walk-002.svg, etc.</p>
          </li>
          <li>
            <strong className="text-white">Drop frames in assets folder</strong>
            <p>Put them in assets/svg-frames/zero-walk/</p>
          </li>
          <li>
            <strong className="text-white">Run build script to triangulate</strong>
            <p>A Node script parses every SVG, triangulates each path via cdt2d, and outputs a single binary file with all vertex positions, triangle indices, and colors per frame.</p>
          </li>
          <li>
            <strong className="text-white">Runtime: load and play</strong>
            <p>Page fetches the pre-built file, uploads geometry to the GPU, and swaps frames by index. Scroll-driven or time-driven.</p>
          </li>
        </ol>

        <div className="rounded bg-white/5 p-4">
          <p className="font-bold text-white">Status: waiting on SVG frames</p>
          <p>Once you drop frames in the assets folder, we build the triangulation script and test playback here.</p>
        </div>
      </div>
    </main>
  );
}
