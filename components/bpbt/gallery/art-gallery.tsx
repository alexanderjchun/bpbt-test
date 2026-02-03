"use client";

import {
  useActiveArtworkId,
  useFlow,
  useIsGalleryLocked,
} from "@/components/bpbt/context/art-context";
import { ARTWORK } from "@/components/bpbt/gallery/data";
import { clamp } from "@/lib/utils";
import { motion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef } from "react";

const LENGTH = ARTWORK.length - 1;
const SNAP_DISTANCE = 50;
const FRAME_OFFSET = -30;
const FRAMES_VISIBLE_LENGTH = 1;

export function ArtGallery() {
  const { dispatch } = useFlow();
  const activeArtworkId = useActiveArtworkId();
  const isLocked = useIsGalleryLocked();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);
  const touchStartYRef = useRef<number | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverscroll = (
      html.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior;
    const prevBodyOverscroll = (
      body.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    (
      html.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior = "contain";
    (
      body.style as unknown as { overscrollBehavior?: string }
    ).overscrollBehavior = "contain";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      (
        html.style as unknown as { overscrollBehavior?: string }
      ).overscrollBehavior = prevHtmlOverscroll;
      (
        body.style as unknown as { overscrollBehavior?: string }
      ).overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  const activeIndex = clamp(activeArtworkId - 1, [0, LENGTH]);

  const setActiveIndex = (nextIndex: number) => {
    const nextId = clamp(nextIndex, [0, LENGTH]) + 1;
    dispatch({ type: "gallery/setActiveArtworkId", id: nextId });
  };

  const stepBy = (steps: number) => {
    setActiveIndex(activeIndex + steps);
  };

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const threshold = SNAP_DISTANCE;
    wheelAccumRef.current += e.deltaY;
    while (wheelAccumRef.current >= threshold) {
      wheelAccumRef.current -= threshold;
      stepBy(1);
    }
    while (wheelAccumRef.current <= -threshold) {
      wheelAccumRef.current += threshold;
      stepBy(-1);
    }
  };

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;
    if (e.touches.length > 0) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;
    if (touchStartYRef.current == null) return;
    const currentY = e.touches[0].clientY;
    const delta = touchStartYRef.current - currentY;
    const threshold = SNAP_DISTANCE;
    if (Math.abs(delta) >= threshold) {
      e.preventDefault();
      const steps =
        Math.trunc(Math.abs(delta) / threshold) * (delta > 0 ? 1 : -1);
      stepBy(steps);
      touchStartYRef.current = currentY;
    }
  };

  const onTouchEnd = () => {
    touchStartYRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="translate-center grid-stack touch-callout-none tap-highlight-transparent fixed mx-auto h-[svh] w-full max-w-480 overflow-hidden select-none"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        touchAction: "none",
        overscrollBehavior: "contain",
        userSelect: "none",
        WebkitUserSelect: "none",
        pointerEvents: isLocked ? "none" : undefined,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {ARTWORK.map((artwork, index) => {
        const offsetIndex = index - activeIndex;
        const opacity = index === activeIndex ? 1 : 0;
        const scale = clamp(1 - offsetIndex * 0.08, [0.08, 2]);
        const y = clamp(offsetIndex * FRAME_OFFSET, [
          FRAME_OFFSET * FRAMES_VISIBLE_LENGTH,
          Infinity,
        ]);
        return (
          <motion.div
            key={artwork.id}
            className="relative h-svh w-full"
            initial={false}
            animate={{
              y,
              scale,
              transition: {
                type: "spring",
                stiffness: 250,
                damping: 20,
                mass: 0.5,
              },
            }}
            style={{
              willChange: "opacity, transform",
              opacity,
              transitionProperty: "opacity",
              transitionDuration: "200ms",
              transitionTimingFunction: "ease-in-out",
              zIndex: ARTWORK.length - index,
            }}
          >
            <Image
              alt={artwork.title}
              src={artwork.image}
              className="user-drag-none touch-callout-none pointer-events-none size-full object-contain px-1 py-8 ease-in-out"
              sizes="100vw"
              width={artwork.width}
              height={artwork.height}
              unoptimized
              priority
            />
          </motion.div>
        );
      })}
    </div>
  );
}
