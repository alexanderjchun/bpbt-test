"use client";

import { useEffect, useRef, useState } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  TextureLoader,
} from "three";

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uRgbSplit;     // 0 or 1
  uniform float uSliceDisp;    // 0 or 1
  uniform float uIntensity;    // 0..1

  varying vec2 vUv;

  float random(float seed) {
    return fract(sin(seed * 78.233) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float intensity = uIntensity;

    // --- Horizontal slice displacement ---
    if (uSliceDisp > 0.5) {
      float sliceY = floor(uv.y * 20.0) / 20.0;
      float noise = random(sliceY + floor(t * 8.0));
      if (noise > 0.6) {
        float offset = (noise - 0.6) * 2.5 * intensity * 0.15;
        uv.x += offset * (noise > 0.8 ? -1.0 : 1.0);
      }
    }

    vec4 color;

    // --- RGB split ---
    if (uRgbSplit > 0.5) {
      float split = intensity * 0.02;
      float dx = sin(t * 3.0) * split;
      float dy = cos(t * 5.0) * split * 0.5;

      float r = texture2D(uTexture, uv + vec2(dx, dy)).r;
      float g = texture2D(uTexture, uv).g;
      float b = texture2D(uTexture, uv - vec2(dx, dy)).b;
      float a = texture2D(uTexture, uv).a;
      color = vec4(r, g, b, a);
    } else {
      color = texture2D(uTexture, uv);
    }

    if (color.a < 0.01) discard;
    gl_FragColor = color;
  }
`;

const loader = new TextureLoader();

export default function GlitchDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const matRef = useRef<ShaderMaterial | null>(null);

  const [rgbSplit, setRgbSplit] = useState(false);
  const [sliceDisp, setSliceDisp] = useState(false);
  const [intensity, setIntensity] = useState(0.5);

  useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uRgbSplit.value = rgbSplit ? 1 : 0;
    m.uniforms.uSliceDisp.value = sliceDisp ? 1 : 0;
    m.uniforms.uIntensity.value = intensity;
  }, [rgbSplit, sliceDisp, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { innerWidth: w, innerHeight: h } = window;
    const scene = new Scene();
    const camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
    camera.position.z = 100;

    const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uTime: { value: 0 },
        uRgbSplit: { value: 0 },
        uSliceDisp: { value: 0 },
        uIntensity: { value: 0.5 },
      },
      transparent: true,
    });
    matRef.current = material;

    loader.load("/40.png", (tex) => {
      material.uniforms.uTexture.value = tex;
      const img = tex.image as HTMLImageElement;
      const aspect = img.width / img.height;
      const size = Math.min(w, h) * 0.6;
      mesh.scale.set(size * aspect, size, 1);
    });

    const geo = new PlaneGeometry(1, 1);
    const mesh = new Mesh(geo, material);
    scene.add(mesh);

    let raf: number;
    const start = performance.now();

    function animate() {
      raf = requestAnimationFrame(animate);
      material.uniforms.uTime.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(animate);

    function onResize() {
      const { innerWidth: w, innerHeight: h } = window;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  const btnClass = (on: boolean) =>
    `rounded px-3 py-1.5 text-xs ${on ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`;

  return (
    <main className="h-screen">
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0" />

      <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-3">
        <div className="flex gap-2">
          <button onClick={() => setRgbSplit(!rgbSplit)} className={btnClass(rgbSplit)}>
            RGB Split
          </button>
          <button onClick={() => setSliceDisp(!sliceDisp)} className={btnClass(sliceDisp)}>
            Slice Displacement
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>Intensity</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-32"
          />
          <span className="w-8 font-mono">{(intensity * 100).toFixed(0)}%</span>
        </div>
      </div>
    </main>
  );
}
