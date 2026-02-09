import { Scene, OrthographicCamera, WebGLRenderer } from "three";
import type { TimelineEffect } from "./effects/types";
import type { Track } from "./timeline-data";
import { tracks } from "./timeline-data";
import { BackgroundEffect } from "./effects/background";
import { FirefliesEffect } from "./effects/fireflies";
import { CharacterEffect } from "./effects/character";
import { PixelGridEffect } from "./effects/pixel-grid-effect";
import { TextOverlayEffect } from "./effects/text-overlay";

interface ActiveTrack {
  track: Track;
  effect: TimelineEffect;
}

function createEffect(track: Track): TimelineEffect | null {
  const c = track.config ?? {};

  switch (track.effect) {
    case "background":
      return new BackgroundEffect(c as { from: string; to: string });
    case "fireflies":
      return new FirefliesEffect();
    case "character":
      return new CharacterEffect(
        c as {
          src: string;
          from: { x: number; y: number; scale: number; opacity: number; rotation?: number };
          to: { x: number; y: number; scale: number; opacity: number; rotation?: number };
        },
      );
    case "pixel-grid":
      return new PixelGridEffect(
        c as {
          src: string;
          effect: "assemble" | "scatter" | "morph" | "hold" | "none";
          resolution?: number;
          morphSrc?: string;
        },
      );
    case "text":
      return new TextOverlayEffect(c as { elementId: string });
    default:
      return null;
  }
}

export class SceneEngine {
  private scene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private activeTracks: ActiveTrack[] = [];
  private raf = 0;
  private scrollContainer: HTMLElement;

  constructor(canvas: HTMLCanvasElement, scrollContainer: HTMLElement) {
    const { innerWidth: w, innerHeight: h } = window;

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
    this.camera.position.z = 100;

    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scrollContainer = scrollContainer;

    const ctx = { scene: this.scene, camera: this.camera, renderer: this.renderer };

    // instantiate all effects
    for (const track of tracks) {
      const effect = createEffect(track);
      if (!effect) continue;
      effect.setup(ctx);
      this.activeTracks.push({ track, effect });
    }

    window.addEventListener("resize", this.onResize);
    this.animate();
  }

  private getMasterProgress(): number {
    const el = this.scrollContainer;
    const maxScroll = el.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(1, Math.max(0, window.scrollY / maxScroll));
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);

    const master = this.getMasterProgress();

    for (const { track, effect } of this.activeTracks) {
      const { start, end } = track;
      const range = end - start;
      if (range <= 0) continue;

      // remap to local 0–1
      const local = Math.min(1, Math.max(0, (master - start) / range));
      effect.update(local);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onResize = () => {
    const { innerWidth: w, innerHeight: h } = window;
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);

    for (const { effect } of this.activeTracks) {
      effect.dispose();
    }

    this.renderer.dispose();
  }
}
