"use client";

import { useEffect, useRef } from "react";
import { Scene, OrthographicCamera, WebGLRenderer } from "three";
import { Media } from "./media";

export function WebGLCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new Scene();

    const { innerWidth: w, innerHeight: h } = window;
    const camera = new OrthographicCamera(
      -w / 2,
      w / 2,
      h / 2,
      -h / 2,
      0.1,
      1000,
    );
    camera.position.z = 100;

    const renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const medias: Media[] = [];

    function createMedias() {
      // clear existing
      medias.forEach((m) => {
        scene.remove(m.mesh);
        m.destroy();
      });
      medias.length = 0;

      const elements = document.querySelectorAll<HTMLElement>(
        "[data-gallery-image]",
      );
      elements.forEach((el) => {
        const src = el.dataset.galleryImage;
        if (!src) return;
        const media = new Media(el, src);
        scene.add(media.mesh);
        medias.push(media);
      });
    }

    // wait for DOM to settle
    const initTimer = setTimeout(createMedias, 100);

    function onResize() {
      const { innerWidth: w, innerHeight: h } = window;
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    let raf: number;
    let lastTime = performance.now();

    function animate() {
      raf = requestAnimationFrame(animate);

      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      medias.forEach((m) => {
        m.updatePosition(window.scrollY);
        m.update(dt);
      });

      renderer.render(scene, camera);
    }

    animate();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(initTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      medias.forEach((m) => {
        scene.remove(m.mesh);
        m.destroy();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-10"
    />
  );
}
