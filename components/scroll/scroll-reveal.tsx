"use client";

import { motion, type Variants } from "motion/react";
import { type ReactNode } from "react";

type ScrollRevealProps = {
  children: ReactNode;
  /**
   * Animation variant preset
   * @default "fade-up"
   */
  variant?:
    | "fade-up"
    | "fade-down"
    | "fade-left"
    | "fade-right"
    | "fade"
    | "scale"
    | "blur";
  /**
   * Animation duration in seconds
   * @default 0.6
   */
  duration?: number;
  /**
   * Delay before animation starts (in seconds)
   * @default 0
   */
  delay?: number;
  /**
   * Only animate once when element enters viewport
   * @default true
   */
  once?: boolean;
  /**
   * How much of the element should be visible before animating (0-1)
   * @default 0.2
   */
  threshold?: number;
  /**
   * Additional className
   */
  className?: string;
  /**
   * Element type to render
   * @default "div"
   */
  as?: "div" | "span" | "section" | "article" | "li" | "p" | "h1" | "h2" | "h3";
};

const variants: Record<NonNullable<ScrollRevealProps["variant"]>, Variants> = {
  "fade-up": {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-down": {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-left": {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  "fade-right": {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  blur: {
    hidden: { opacity: 0, filter: "blur(10px)" },
    visible: { opacity: 1, filter: "blur(0px)" },
  },
};

/**
 * ScrollReveal - Animate elements when they enter the viewport.
 *
 * Uses Motion's whileInView for viewport detection and CSS transform animations.
 *
 * @example
 * ```tsx
 * <ScrollReveal variant="fade-up" delay={0.2}>
 *   <h1>This fades in from below</h1>
 * </ScrollReveal>
 * ```
 */
export function ScrollReveal({
  children,
  variant = "fade-up",
  duration = 0.6,
  delay = 0,
  once = true,
  threshold = 0.2,
  className,
  as = "div",
}: ScrollRevealProps) {
  const Component = motion[as];

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // cubic-bezier for smooth easing
      }}
    >
      {children}
    </Component>
  );
}

type StaggerContainerProps = {
  children: ReactNode;
  /**
   * Delay between each child animation (in seconds)
   * @default 0.1
   */
  staggerDelay?: number;
  /**
   * Delay before the first child animates (in seconds)
   * @default 0
   */
  initialDelay?: number;
  /**
   * Only animate once when element enters viewport
   * @default true
   */
  once?: boolean;
  /**
   * How much of the container should be visible before animating (0-1)
   * @default 0.1
   */
  threshold?: number;
  /**
   * Additional className
   */
  className?: string;
};

const containerVariants: Variants = {
  hidden: {},
  visible: (custom: { staggerDelay: number; initialDelay: number }) => ({
    transition: {
      staggerChildren: custom.staggerDelay,
      delayChildren: custom.initialDelay,
    },
  }),
};

/**
 * StaggerContainer - Container for staggered child animations.
 *
 * Wrap multiple ScrollRevealItem components to animate them in sequence.
 *
 * @example
 * ```tsx
 * <StaggerContainer staggerDelay={0.15}>
 *   <ScrollRevealItem>First</ScrollRevealItem>
 *   <ScrollRevealItem>Second</ScrollRevealItem>
 *   <ScrollRevealItem>Third</ScrollRevealItem>
 * </StaggerContainer>
 * ```
 */
export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  initialDelay = 0,
  once = true,
  threshold = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: threshold }}
      variants={containerVariants}
      custom={{ staggerDelay, initialDelay }}
    >
      {children}
    </motion.div>
  );
}

type ScrollRevealItemProps = {
  children: ReactNode;
  /**
   * Animation variant preset
   * @default "fade-up"
   */
  variant?:
    | "fade-up"
    | "fade-down"
    | "fade-left"
    | "fade-right"
    | "fade"
    | "scale"
    | "blur";
  /**
   * Animation duration in seconds
   * @default 0.5
   */
  duration?: number;
  /**
   * Additional className
   */
  className?: string;
};

/**
 * ScrollRevealItem - Child item for use inside StaggerContainer.
 *
 * @example
 * ```tsx
 * <StaggerContainer>
 *   <ScrollRevealItem variant="fade-up">Item 1</ScrollRevealItem>
 *   <ScrollRevealItem variant="fade-up">Item 2</ScrollRevealItem>
 * </StaggerContainer>
 * ```
 */
export function ScrollRevealItem({
  children,
  variant = "fade-up",
  duration = 0.5,
  className,
}: ScrollRevealItemProps) {
  return (
    <motion.div
      className={className}
      variants={variants[variant]}
      transition={{
        duration,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
