import {
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  TextureLoader,
  Texture,
  Vector3,
} from "three";
import { vertexShader, fragmentShader } from "./shaders";

const loader = new TextureLoader();

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

export class Media {
  element: HTMLElement;
  mesh: Mesh;
  material: ShaderMaterial;
  geometry: PlaneGeometry;
  texture: Texture | null = null;

  private targetProgress = 0;
  private currentProgress = 0;
  private isVisible = false;
  private observer: IntersectionObserver;

  constructor(element: HTMLElement, src: string) {
    this.element = element;

    this.geometry = new PlaneGeometry(1, 1, 1, 1);
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uProgress: { value: 0 },
        uGridSize: { value: 12.0 },
        uColor: { value: new Vector3(0.92, 0.9, 0.86) },
      },
      transparent: true,
    });

    this.mesh = new Mesh(this.geometry, this.material);

    loader.load(src, (texture) => {
      this.texture = texture;
      this.material.uniforms.uTexture.value = texture;
    });

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.isVisible = true;
            this.targetProgress = 1;
          }
        });
      },
      { threshold: 0.15 },
    );
    this.observer.observe(element);
  }

  updatePosition(scrollY: number) {
    const rect = this.element.getBoundingClientRect();

    // convert DOM coords to Three.js coords
    // Three.js origin is center of screen, Y is up
    const x = rect.left + rect.width / 2 - window.innerWidth / 2;
    const y = -(rect.top + rect.height / 2 - window.innerHeight / 2);

    this.mesh.position.set(x, y, 0);
    this.mesh.scale.set(rect.width, rect.height, 1);
  }

  update(dt: number) {
    // lerp progress towards target
    const speed = this.isVisible ? 0.03 : 0;
    this.currentProgress = lerp(this.currentProgress, this.targetProgress, speed);
    this.material.uniforms.uProgress.value = this.currentProgress;
  }

  destroy() {
    this.observer.disconnect();
    this.geometry.dispose();
    this.material.dispose();
    if (this.texture) this.texture.dispose();
  }
}
