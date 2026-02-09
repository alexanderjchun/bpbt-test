import {
  InstancedMesh,
  PlaneGeometry,
  ShaderMaterial,
  InstancedBufferAttribute,
  Object3D,
} from "three";
import { vertexShader, fragmentShader } from "./shaders";
import type { PixelEffect } from "./sections-data";

const EFFECT_MAP: Record<PixelEffect, number> = {
  assemble: 0,
  scatter: 1,
  morph: 2,
  hold: 3,
  none: -1,
};

export class PixelGrid {
  mesh: InstancedMesh;
  material: ShaderMaterial;
  element: HTMLElement | null = null;

  private resolution: number;
  private cols = 0;
  private rows = 0;
  private count = 0;
  private colorAttr: InstancedBufferAttribute | null = null;
  private baseColors: Float32Array | null = null;
  private morphColors: Float32Array | null = null;
  private effect: PixelEffect;

  constructor(
    imageSrc: string,
    effect: PixelEffect,
    resolution: number = 64,
    morphSrc?: string,
  ) {
    this.resolution = resolution;
    this.effect = effect;

    // placeholder material — will populate after image loads
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uProgress: { value: 0 },
        uEffect: { value: EFFECT_MAP[effect] },
        uPixelSize: { value: 1 },
      },
      transparent: true,
      depthTest: false,
    });

    // 1-instance placeholder until image loads
    const geo = new PlaneGeometry(1, 1);
    this.mesh = new InstancedMesh(geo, this.material, 1);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    this.loadImage(imageSrc).then((data) => {
      this.buildGrid(data);
      if (morphSrc) {
        // force morph image to same dimensions as base
        this.loadImage(morphSrc, this.cols, this.rows).then((morphData) => {
          this.morphColors = this.extractColors(morphData);
        });
      }
    });
  }

  private loadImage(src: string, forceW?: number, forceH?: number): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        let w: number, h: number;
        if (forceW && forceH) {
          w = forceW;
          h = forceH;
        } else {
          const aspect = img.width / img.height;
          if (aspect >= 1) {
            w = this.resolution;
            h = Math.round(this.resolution / aspect);
          } else {
            h = this.resolution;
            w = Math.round(this.resolution * aspect);
          }
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

  private extractColors(imageData: ImageData): Float32Array {
    const { width, height, data } = imageData;
    const colors = new Float32Array(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      colors[i * 4] = data[i * 4] / 255;
      colors[i * 4 + 1] = data[i * 4 + 1] / 255;
      colors[i * 4 + 2] = data[i * 4 + 2] / 255;
      colors[i * 4 + 3] = data[i * 4 + 3] / 255;
    }
    return colors;
  }

  private buildGrid(imageData: ImageData) {
    const { width, height } = imageData;
    this.cols = width;
    this.rows = height;
    this.count = width * height;

    const gridPos = new Float32Array(this.count * 2);
    const scatterPos = new Float32Array(this.count * 3);
    const colors = this.extractColors(imageData);
    const randoms = new Float32Array(this.count);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;

        // grid position: centered around origin
        gridPos[i * 2] = (x - width / 2 + 0.5);
        gridPos[i * 2 + 1] = -(y - height / 2 + 0.5);

        // scatter position: random offset from grid
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 80;
        scatterPos[i * 3] = gridPos[i * 2] + Math.cos(angle) * dist;
        scatterPos[i * 3 + 1] = gridPos[i * 2 + 1] + Math.sin(angle) * dist;
        scatterPos[i * 3 + 2] = (Math.random() - 0.5) * 20;

        randoms[i] = Math.random();
      }
    }

    this.baseColors = colors;

    // create a new InstancedMesh with the right count
    const geo = new PlaneGeometry(1, 1);
    geo.setAttribute("aGridPos", new InstancedBufferAttribute(gridPos, 2));
    geo.setAttribute("aScatterPos", new InstancedBufferAttribute(scatterPos, 3));
    this.colorAttr = new InstancedBufferAttribute(colors, 4);
    geo.setAttribute("aColor", this.colorAttr);
    geo.setAttribute("aRandom", new InstancedBufferAttribute(randoms, 1));

    // set identity transforms for all instances
    const dummy = new Object3D();
    const oldMesh = this.mesh;
    this.mesh = new InstancedMesh(geo, this.material, this.count);
    this.mesh.frustumCulled = false;

    for (let i = 0; i < this.count; i++) {
      dummy.position.set(0, 0, 0);
      dummy.updateMatrix();
      this.mesh.setMatrixAt(i, dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    // copy position from old mesh
    this.mesh.position.copy(oldMesh.position);

    // replace in scene
    if (oldMesh.parent) {
      oldMesh.parent.add(this.mesh);
      oldMesh.parent.remove(oldMesh);
    }
    oldMesh.geometry.dispose();
  }

  setProgress(progress: number) {
    this.material.uniforms.uProgress.value = progress;

    // morph: interpolate colors on CPU
    if (this.effect === "morph" && this.baseColors && this.morphColors && this.colorAttr) {
      const len = this.baseColors.length;
      const arr = this.colorAttr.array as Float32Array;
      for (let i = 0; i < len; i++) {
        arr[i] = this.baseColors[i] + (this.morphColors[i] - this.baseColors[i]) * progress;
      }
      this.colorAttr.needsUpdate = true;
    }
  }

  updatePosition() {
    if (!this.element || this.cols === 0 || this.rows === 0) return;

    const rect = this.element.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - window.innerWidth / 2;
    const y = -(rect.top + rect.height / 2 - window.innerHeight / 2);

    this.mesh.position.set(x, y, 0);

    // scale pixel size to fit the DOM element
    const pixelSize = Math.min(rect.width / this.cols, rect.height / this.rows);
    this.material.uniforms.uPixelSize.value = pixelSize;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
