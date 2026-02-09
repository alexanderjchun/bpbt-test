import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import { Leva } from "leva";
import { ui } from "./tunnels";
import Canvas from "./canvas";
import Lights from "./lights";
import MorphShowcase from "./morph-particles/morph-showcase";
import CreditOverlay from "./credit-overlay";
import { customTheme } from "./leva-theme";
import { Suspense } from "react";
import Loader from "./loader";
import StatsMonitor from "./stats-monitor";

export default function ParticleDemo() {
  return (
    <>
      <Loader />

      <ui.Out />

      <CreditOverlay className="bottom-0 left-0">
        Shader by{" "}
        <a
          href="https://x.com/chrismaldona2"
          target="_blank"
          className="underline"
        >
          Chris
        </a>{" "}
        &#40;
        <a
          href="https://github.com/chrismaldona2/tsl-morphing-particles"
          target="_blank"
          className="underline"
        >
          Source Code
        </a>
        &#41;
      </CreditOverlay>

      <Leva theme={customTheme} hideCopyButton flat />
      <Canvas camera={{ position: [-2.73, 1.28, 4.62] }}>
        <OrbitControls makeDefault target={[0.48, -0.05, 0.17]} />
        <StatsMonitor />
        <Lights />

        <Suspense fallback={null}>
          <MorphShowcase position={[0, -1, -1]} />
        </Suspense>
      </Canvas>
    </>
  );
}

useGLTF.preload("/particles/models/models.glb", true);
useGLTF.preload("/particles/models/button.glb", true);
useTexture.preload("/particles/textures/noise.png");
