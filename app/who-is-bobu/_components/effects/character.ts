import {
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  TextureLoader,
  type Texture,
} from "three";
import type { TimelineEffect, EffectContext } from "./types";

interface CharacterState {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  rotation?: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

const loader = new TextureLoader();

export class CharacterEffect implements TimelineEffect {
  private mesh: Mesh;
  private material: MeshBasicMaterial;
  private texture: Texture | null = null;
  private aspect = 1;
  private from: CharacterState;
  private to: CharacterState;
  private baseSize = 300; // px in ortho units

  constructor(config: {
    src: string;
    from: CharacterState;
    to: CharacterState;
  }) {
    this.from = config.from;
    this.to = config.to;

    this.material = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
    });

    const geo = new PlaneGeometry(1, 1);
    this.mesh = new Mesh(geo, this.material);
    this.mesh.frustumCulled = false;

    loader.load(config.src, (tex) => {
      this.texture = tex;
      this.material.map = tex;
      this.material.needsUpdate = true;

      // adjust aspect ratio
      const img = tex.image as HTMLImageElement;
      this.aspect = img.width / img.height;
      this.mesh.scale.set(this.baseSize * this.aspect, this.baseSize, 1);
    });
  }

  setup(ctx: EffectContext) {
    ctx.scene.add(this.mesh);
  }

  update(progress: number) {
    // smooth easing
    const t = 1 - Math.pow(1 - progress, 3); // easeOutCubic

    const x = lerp(this.from.x, this.to.x, t);
    const y = lerp(this.from.y, this.to.y, t);
    const scale = lerp(this.from.scale, this.to.scale, t);
    const opacity = lerp(this.from.opacity, this.to.opacity, t);
    const rotation = lerp(
      this.from.rotation ?? 0,
      this.to.rotation ?? 0,
      t,
    );

    this.mesh.position.set(x, y, 0);

    // preserve aspect while applying scale
    this.mesh.scale.set(
      this.baseSize * this.aspect * scale,
      this.baseSize * scale,
      1,
    );

    this.mesh.rotation.z = rotation;
    this.material.opacity = opacity;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
    if (this.texture) this.texture.dispose();
    if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
  }
}
