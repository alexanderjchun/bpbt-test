"use client";

import { AnimatedBg } from "@/components/animated-bg";
import { motion, useScroll } from "motion/react";

export default function WhoIsBobuPage() {
  return (
    <AnimatedBg
      from="bg-background"
      to="bg-[#403e52]"
      className="relative min-h-screen transition-colors duration-3000"
    >
      <EnterBobu />
      <BobuIsBorn />
      <TheBobuExperiment />
      <WeAreBobu />
    </AnimatedBg>
  );
}

function EnterBobu() {
  const { scrollYProgress } = useScroll();

  return (
    <section className="h-screen">
      <h1>Enter Bobu</h1>
      <motion.div
        style={{
          scaleX: scrollYProgress,
          originX: 0,
          height: "10px",
          width: "100%",
          backgroundColor: "white",
          position: "fixed",
          bottom: 0,
          left: 0,
          zIndex: 100,
        }}
      />
    </section>
  );
}

function BobuIsBorn() {
  return (
    <section className="h-screen">
      <h1>Bobu is born</h1>
    </section>
  );
}

function TheBobuExperiment() {
  return (
    <section className="h-screen">
      <h1>The Bobu Experiment</h1>
    </section>
  );
}

function WeAreBobu() {
  return (
    <section className="h-screen">
      <h1>We are Bobu</h1>
    </section>
  );
}
