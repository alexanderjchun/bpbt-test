"use client";

import dynamic from "next/dynamic";

const ParticleDemo = dynamic(
  () => import("./_components/particle-demo"),
  { ssr: false },
);

export default function MorphingParticlesPage() {
  return (
    <div className="h-dvh w-screen bg-[#242424]">
      <ParticleDemo />
    </div>
  );
}
