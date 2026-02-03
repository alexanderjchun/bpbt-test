"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

type ScrollSectionProps = {
  children: ReactNode;
  /**
   * Height of the scroll container as a viewport height multiplier.
   * Higher values = slower animation as user scrolls through.
   * @default 1 (100vh)
   */
  heightMultiplier?: number;
  /**
   * Apply spring physics to smooth out scroll jank
   * @default true
   */
  smooth?: boolean;
  /**
   * Spring stiffness (higher = snappier)
   * @default 100
   */
  stiffness?: number;
  /**
   * Spring damping (higher = less bouncy)
   * @default 30
   */
  damping?: number;
  /**
   * Animation preset for the sticky content
   * @default "fade-scale"
   */
  animation?: "fade-scale" | "fade-slide" | "fade" | "none";
  /**
   * Additional className for the outer container
   */
  className?: string;
  /**
   * Additional className for the sticky inner container
   */
  innerClassName?: string;
};

/**
 * ScrollSection - A wrapper that pins content and animates it based on scroll progress.
 *
 * The section creates a tall container that the user scrolls through,
 * while the content stays pinned (sticky) and animates based on scroll position.
 *
 * @example
 * ```tsx
 * <ScrollSection animation="fade-scale">
 *   <h1>This content animates as you scroll</h1>
 * </ScrollSection>
 * ```
 */
export function ScrollSection({
  children,
  heightMultiplier = 0.5,
  smooth = true,
  stiffness = 100,
  damping = 30,
  animation = "fade-scale",
  className,
  innerClassName,
}: ScrollSectionProps) {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    // Start when top of section hits top of viewport,
    // End when bottom of section hits bottom of viewport
    offset: ["start start", "end end"],
  });

  // Optionally smooth the scroll progress with spring physics
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness,
    damping,
    restDelta: 0.001,
  });

  const progress = smooth ? smoothProgress : scrollYProgress;

  // Animation transforms based on preset (fade in only, stay visible after)
  const opacity = useTransform(
    progress,
    animation === "none" ? [0, 1] : [0, 0.15],
    animation === "none" ? [1, 1] : [0, 1],
  );

  const scale = useTransform(
    progress,
    [0, 0.15],
    animation === "fade-scale" ? [0.9, 1] : [1, 1],
  );

  const y = useTransform(
    progress,
    [0, 0.15],
    animation === "fade-slide" ? ["30px", "0px"] : ["0px", "0px"],
  );

  return (
    <section
      ref={ref}
      className={className}
      style={{ height: `${heightMultiplier * 100}vh` }}
    >
      <motion.div
        className={innerClassName}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          willChange: "transform",
          opacity: animation !== "none" ? opacity : 1,
          scale: animation === "fade-scale" ? scale : 1,
          y: animation === "fade-slide" ? y : 0,
        }}
      >
        {children}
      </motion.div>
    </section>
  );
}

/**
 * useScrollProgress - Hook to access scroll progress for custom animations.
 *
 * Use this when you need more control than ScrollSection provides.
 *
 * @example
 * ```tsx
 * function CustomSection() {
 *   const { ref, progress } = useScrollProgress();
 *   const rotation = useTransform(progress, [0, 1], [0, 360]);
 *
 *   return (
 *     <section ref={ref} style={{ height: "200vh" }}>
 *       <motion.div style={{ rotate: rotation }}>Spinning!</motion.div>
 *     </section>
 *   );
 * }
 * ```
 */
type ScrollOffset = ["start end", "end start"] | ["start start", "end end"];

export function useScrollProgress(options?: {
  offset?: ScrollOffset;
  smooth?: boolean;
  stiffness?: number;
  damping?: number;
}) {
  const {
    offset = ["start start", "end end"] as const,
    smooth = true,
    stiffness = 100,
    damping = 30,
  } = options ?? {};

  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness,
    damping,
    restDelta: 0.001,
  });

  return {
    ref,
    progress: smooth ? smoothProgress : scrollYProgress,
    rawProgress: scrollYProgress,
  };
}
