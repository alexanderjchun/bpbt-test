"use client";

import { useEffect, useRef, useState } from "react";
import {
  Scene,
  OrthographicCamera,
  WebGLRenderer,
  PlaneGeometry,
  ShaderMaterial,
  InstancedMesh,
  InstancedBufferAttribute,
  Object3D,
} from "three";

// Two-phase shader: A → scatter → B
const vertexShader = /* glsl */ `
  attribute vec2 aGridPosA;
  attribute vec2 aGridPosB;
  attribute vec3 aScatterPos;
  attribute vec4 aColorA;
  attribute vec4 aColorB;
  attribute float aRandom;

  uniform float uProgress; // 0 = image A, 0.5 = scattered, 1 = image B
  uniform float uPixelSize;

  varying vec4 vColor;

  float easeOutCubic(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
  }

  float easeInCubic(float t) {
    return t * t * t;
  }

  void main() {
    float stagger = 0.3;
    vec3 pos;

    if (uProgress <= 0.5) {
      // Phase 1: grid A → scatter (0..0.5 mapped to 0..1)
      float t = clamp(uProgress * 2.0, 0.0, 1.0);
      float local = clamp((t - aRandom * stagger) / (1.0 - stagger), 0.0, 1.0);
      float eased = easeInCubic(local);
      pos = mix(vec3(aGridPosA, 0.0), aScatterPos, eased);
      vColor = aColorA;
    } else {
      // Phase 2: scatter → grid B (0.5..1 mapped to 0..1)
      float t = clamp((uProgress - 0.5) * 2.0, 0.0, 1.0);
      float local = clamp((t - aRandom * stagger) / (1.0 - stagger), 0.0, 1.0);
      float eased = easeOutCubic(local);
      pos = mix(aScatterPos, vec3(aGridPosB, 0.0), eased);
      // Transition colors during reassembly
      vColor = mix(aColorA, aColorB, eased);
    }

    vec3 vertexPos = pos + position * uPixelSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vertexPos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec4 vColor;
  void main() {
    if (vColor.a < 0.01) discard;
    gl_FragColor = vColor;
  }
`;

function loadImage(
  src: string,
  resolution: number,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const aspect = img.width / img.height;
      let w: number, h: number;
      if (aspect >= 1) {
        w = resolution;
        h = Math.round(resolution / aspect);
      } else {
        h = resolution;
        w = Math.round(resolution * aspect);
      }
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(ctx.getImageData(0, 0, w, h));
    };
    img.onerror = reject;
    img.src = src;
  });
}

function extractColors(data: ImageData): Float32Array {
  const { width, height, data: px } = data;
  const out = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = px[i * 4] / 255;
    out[i * 4 + 1] = px[i * 4 + 1] / 255;
    out[i * 4 + 2] = px[i * 4 + 2] / 255;
    out[i * 4 + 3] = px[i * 4 + 3] / 255;
  }
  return out;
}

function gridPositions(w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      out[i * 2] = x - w / 2 + 0.5;
      out[i * 2 + 1] = -(y - h / 2 + 0.5);
    }
  }
  return out;
}

const RES = 64;
const SRC_A = "/40.png";
const SRC_B = "/handsome-bobu.png"; // placeholder until Pixel Bobu

export default function PixelDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState<"assembled" | "scattered" | "reformed">(
    "assembled",
  );

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
        uProgress: { value: 0 },
        uPixelSize: { value: Math.min(w, h) / RES * 0.6 },
      },
      transparent: true,
      depthTest: false,
    });

    let mesh: InstancedMesh | null = null;
    let raf: number;

    async function init() {
      const [imgA, imgB] = await Promise.all([
        loadImage(SRC_A, RES),
        loadImage(SRC_B, RES),
      ]);

      // Use the larger grid to determine count
      const cols = Math.max(imgA.width, imgB.width);
      const rows = Math.max(imgA.height, imgB.height);
      const count = cols * rows;

      const gridA = gridPositions(imgA.width, imgA.height);
      const gridB = gridPositions(imgB.width, imgB.height);
      const colorsA = extractColors(imgA);
      const colorsB = extractColors(imgB);

      // Pad shorter arrays if images differ in pixel count
      const padFloat = (arr: Float32Array, targetLen: number) => {
        if (arr.length >= targetLen) return arr;
        const padded = new Float32Array(targetLen);
        padded.set(arr);
        return padded;
      };

      const gridAPadded = padFloat(gridA, count * 2);
      const gridBPadded = padFloat(gridB, count * 2);
      const colorsAPadded = padFloat(colorsA, count * 4);
      const colorsBPadded = padFloat(colorsB, count * 4);

      const scatterPos = new Float32Array(count * 3);
      const randoms = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 80;
        scatterPos[i * 3] = gridAPadded[i * 2] + Math.cos(angle) * dist;
        scatterPos[i * 3 + 1] = gridAPadded[i * 2 + 1] + Math.sin(angle) * dist;
        scatterPos[i * 3 + 2] = (Math.random() - 0.5) * 20;
        randoms[i] = Math.random();
      }

      const geo = new PlaneGeometry(1, 1);
      geo.setAttribute("aGridPosA", new InstancedBufferAttribute(gridAPadded, 2));
      geo.setAttribute("aGridPosB", new InstancedBufferAttribute(gridBPadded, 2));
      geo.setAttribute("aScatterPos", new InstancedBufferAttribute(scatterPos, 3));
      geo.setAttribute("aColorA", new InstancedBufferAttribute(colorsAPadded, 4));
      geo.setAttribute("aColorB", new InstancedBufferAttribute(colorsBPadded, 4));
      geo.setAttribute("aRandom", new InstancedBufferAttribute(randoms, 1));

      const dummy = new Object3D();
      mesh = new InstancedMesh(geo, material, count);
      mesh.frustumCulled = false;
      for (let i = 0; i < count; i++) {
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
    }

    init();

    function animate() {
      raf = requestAnimationFrame(animate);
      material.uniforms.uProgress.value = progressRef.current;
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
      material.uniforms.uPixelSize.value = Math.min(w, h) / RES * 0.6;
    }

    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mesh?.geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  function animateTo(target: number, duration = 1500) {
    const start = progressRef.current;
    const startTime = performance.now();

    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);
      // ease in-out
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      progressRef.current = start + (target - start) * eased;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function scatter() {
    animateTo(0.5);
    setPhase("scattered");
  }

  function reform() {
    animateTo(1);
    setPhase("reformed");
  }

  function reset() {
    animateTo(0);
    setPhase("assembled");
  }

  return (
    <main className="h-screen">
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0"
      />
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
      <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 font-mono text-xs text-white/40">
        Using handsome-bobu.png as placeholder — swap for Pixel Bobu when ready
      </div>
    </main>
  );
}
