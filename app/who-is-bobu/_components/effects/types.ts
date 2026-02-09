import type { Scene, OrthographicCamera, WebGLRenderer } from "three";

export interface EffectContext {
  scene: Scene;
  camera: OrthographicCamera;
  renderer: WebGLRenderer;
}

export interface TimelineEffect {
  setup(ctx: EffectContext): void;
  update(progress: number): void;
  dispose(): void;
}
