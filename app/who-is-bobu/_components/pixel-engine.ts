import { Scene, OrthographicCamera, WebGLRenderer } from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PixelGrid } from "./pixel-grid";
import { sections } from "./sections-data";

gsap.registerPlugin(ScrollTrigger);

export class PixelEngine {
  private scene: Scene;
  private camera: OrthographicCamera;
  private renderer: WebGLRenderer;
  private grids: PixelGrid[] = [];
  private triggers: ScrollTrigger[] = [];
  private raf = 0;

  constructor(canvas: HTMLCanvasElement) {
    const { innerWidth: w, innerHeight: h } = window;

    this.scene = new Scene();
    this.camera = new OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 1000);
    this.camera.position.z = 100;

    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.createGrids();
    this.createTriggers();
    this.animate();

    window.addEventListener("resize", this.onResize);
  }

  private createGrids() {
    for (const section of sections) {
      if (section.effect === "none" || !section.image) continue;

      const grid = new PixelGrid(
        section.image,
        section.effect,
        section.resolution ?? 64,
        section.morphTo,
      );

      // link to DOM target element
      const el = document.querySelector<HTMLElement>(`[data-pixel-target="${section.id}"]`);
      if (el) grid.element = el;

      this.scene.add(grid.mesh);
      this.grids.push(grid);

      // store section id for trigger matching
      (grid as any)._sectionId = section.id;
    }
  }

  private createTriggers() {
    for (const section of sections) {
      if (section.effect === "none" || !section.image) continue;

      const grid = this.grids.find((g) => (g as any)._sectionId === section.id);
      if (!grid) continue;

      const trigger = ScrollTrigger.create({
        trigger: `[data-section="${section.id}"]`,
        start: "top 80%",
        end: "center center",
        scrub: 0.5,
        onUpdate: (self) => {
          grid.setProgress(self.progress);
        },
      });

      this.triggers.push(trigger);
    }
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);

    for (const grid of this.grids) {
      grid.updatePosition();
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

    for (const trigger of this.triggers) {
      trigger.kill();
    }

    for (const grid of this.grids) {
      this.scene.remove(grid.mesh);
      grid.dispose();
    }

    this.renderer.dispose();
  }
}
