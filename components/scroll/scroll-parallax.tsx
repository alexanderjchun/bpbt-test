"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type ReactNode } from "react";

type ScrollOffset = ["start end", "end start"] | ["start start", "end end"];

type ScrollParallaxProps = {
  children: ReactNode;
  /**
   * Speed multiplier for parallax effect.
   * - Positive values: element moves slower than scroll (background effect)
   * - Negative values: element moves faster than scroll (foreground effect)
   * - 0: no parallax (moves with scroll)
   * @default 0.5
   */
  speed?: number;
  /**
   * Direction of parallax movement
   * @default "vertical"
   */
  direction?: "vertical" | "horizontal";
  /**
   * Apply spring physics to smooth out the parallax
   * @default true
   */
  smooth?: boolean;
  /**
   * When to start/end the parallax effect relative to viewport
   * @default ["start end", "end start"]
   */
  offset?: ScrollOffset;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional styles
   */
  style?: React.CSSProperties;
};

/**
 * ScrollParallax - Create depth with elements that move at different scroll speeds.
 *
 * Positive speed values create a background effect (element lags behind scroll).
 * Negative speed values create a foreground effect (element moves faster than scroll).
 *
 * @example
 * ```tsx
 * // Background layer (moves slowly)
 * <ScrollParallax speed={0.3}>
 *   <img src="/background.jpg" alt="Background" />
 * </ScrollParallax>
 *
 * // Foreground layer (moves quickly)
 * <ScrollParallax speed={-0.2}>
 *   <h1>Foreground Text</h1>
 * </ScrollParallax>
 * ```
 */
export function ScrollParallax({
  children,
  speed = 0.5,
  direction = "vertical",
  smooth = true,
  offset = ["start end", "end start"] as const,
  className,
  style,
}: ScrollParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const progress = smooth ? smoothProgress : scrollYProgress;

  // Calculate the parallax offset based on speed
  // Speed of 0.5 means element moves 50% slower relative to scroll
  const yRange = useTransform(
    progress,
    [0, 1],
    direction === "vertical"
      ? [`${speed * 100}%`, `${-speed * 100}%`]
      : ["0%", "0%"],
  );

  const xRange = useTransform(
    progress,
    [0, 1],
    direction === "horizontal"
      ? [`${speed * 100}%`, `${-speed * 100}%`]
      : ["0%", "0%"],
  );

  return (
    <div ref={ref} className={className} style={style}>
      <motion.div
        style={{
          y: direction === "vertical" ? yRange : 0,
          x: direction === "horizontal" ? xRange : 0,
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}

type ParallaxLayerProps = {
  children: ReactNode;
  /**
   * Depth layer (0 = stationary, higher = more parallax)
   * @default 1
   */
  depth?: number;
  /**
   * Base speed multiplier applied to depth
   * @default 0.1
   */
  baseSpeed?: number;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Additional styles
   */
  style?: React.CSSProperties;
};

/**
 * ParallaxLayer - Simplified parallax for creating layered depth effects.
 *
 * Use depth values to create layers:
 * - depth=0: no movement (text layer)
 * - depth=1: subtle movement (midground)
 * - depth=2: medium movement (background)
 * - depth=3+: strong movement (far background)
 *
 * @example
 * ```tsx
 * <div className="relative">
 *   <ParallaxLayer depth={3} className="absolute inset-0">
 *     <img src="/mountains.jpg" alt="Far background" />
 *   </ParallaxLayer>
 *   <ParallaxLayer depth={1} className="absolute inset-0">
 *     <img src="/trees.jpg" alt="Midground" />
 *   </ParallaxLayer>
 *   <ParallaxLayer depth={0}>
 *     <h1>Foreground Text</h1>
 *   </ParallaxLayer>
 * </div>
 * ```
 */
export function ParallaxLayer({
  children,
  depth = 1,
  baseSpeed = 0.1,
  className,
  style,
}: ParallaxLayerProps) {
  return (
    <ScrollParallax
      speed={depth * baseSpeed}
      className={className}
      style={style}
    >
      {children}
    </ScrollParallax>
  );
}

type ParallaxImageProps = {
  src: string;
  alt: string;
  /**
   * Speed multiplier for parallax effect
   * @default 0.2
   */
  speed?: number;
  /**
   * Scale multiplier to prevent edges showing during parallax
   * @default 1.2
   */
  scale?: number;
  /**
   * Additional className for the container
   */
  className?: string;
  /**
   * Additional className for the image
   */
  imageClassName?: string;
};

/**
 * ParallaxImage - An image with built-in parallax scrolling.
 *
 * Automatically scales the image to prevent edges from showing during parallax movement.
 *
 * @example
 * ```tsx
 * <ParallaxImage
 *   src="/hero.jpg"
 *   alt="Hero image"
 *   speed={0.3}
 *   className="h-[50vh] w-full"
 * />
 * ```
 */
export function ParallaxImage({
  src,
  alt,
  speed = 0.2,
  scale = 1.2,
  className,
  imageClassName,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const y = useTransform(
    smoothProgress,
    [0, 1],
    [`${speed * 100}%`, `${-speed * 100}%`],
  );

  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.img
        src={src}
        alt={alt}
        className={imageClassName}
        style={{
          y,
          scale,
          willChange: "transform",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
