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
  uniform float uIntensity;    // 0..1

  varying vec2 vUv;

  float random(float seed) {
    return fract(sin(seed * 78.233) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float intensity = uIntensity;

    vec4 color;

    // --- RGB split (frame-by-frame glitch) ---
    if (uRgbSplit > 0.5) {
      float frame = floor(t * 10.0);
      float split = intensity * 0.02;
      float dx = (random(frame) - 0.5) * 2.0 * split;
      float dy = (random(frame + 37.0) - 0.5) * 2.0 * split;

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

  useEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uRgbSplit.value = rgbSplit ? 1 : 0;
  }, [rgbSplit]);

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
        uIntensity: { value: 0.75 },
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

      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <button onClick={() => setRgbSplit(!rgbSplit)} className={btnClass(rgbSplit)}>
          RGB Split
        </button>
      </div>
    </main>
  );
}
