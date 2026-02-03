"use client";

import { cn } from "@/lib/utils";
import { motion, useScroll, useTransform } from "motion/react";
import { useRef, type ComponentProps, type ReactNode } from "react";

type ScrollCarouselProps = {
  children: ReactNode;
  /**
   * How much to translate the content (as a percentage of its width)
   * @default 50
   */
  translateAmount?: number;
  /**
   * Additional className for the outer container
   */
  className?: string;
  /**
   * Additional className for the carousel track
   */
  trackClassName?: string;
};

/**
 * ScrollCarousel - A row of images that translates left as the user scrolls past.
 *
 * @example
 * ```tsx
 * <ScrollCarousel>
 *   <ScrollCarouselItem>
 *     <Image src="/1.jpg" ... />
 *   </ScrollCarouselItem>
 * </ScrollCarousel>
 * ```
 */
export function ScrollCarousel({
  children,
  translateAmount = 50,
  className,
  trackClassName,
}: ScrollCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    // Start when bottom of element enters viewport, end when top leaves
    offset: ["start end", "end start"],
  });

  // Translate left as user scrolls past
  const x = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", `-${translateAmount}%`],
  );

  return (
    <div ref={containerRef} className={cn("overflow-hidden", className)}>
      <motion.div className={cn("flex", trackClassName)} style={{ x }}>
        {children}
      </motion.div>
    </div>
  );
}

type ScrollCarouselItemProps = ComponentProps<"div">;

/**
 * ScrollCarouselItem - A single item within the ScrollCarousel.
 */
export function ScrollCarouselItem({
  className,
  children,
  ...props
}: ScrollCarouselItemProps) {
  return (
    <div className={cn("shrink-0", className)} {...props}>
      {children}
    </div>
  );
}
