"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useState } from "react";
import useMeasure from "react-use-measure";
import { useFlow } from "../context/art-context";
import type { DrawerView } from "../context/flow";
import {
  PBTAddressView,
  PBTDefaultView,
  PBTErrorView,
  PBTPendingView,
  PBTSuccessView,
} from "./views";

// Hoisted constants outside component
const CONTENT_TRANSITION_DURATION = 0.2;
const CONTENT_EASE_CURVE = [0.26, 0.08, 0.25, 1] as const;

type OpenSnapshot = { view: DrawerView; height: number };

export interface PBTDrawerProps {
  title: string;
  artist: string;
  url: string;
}

export function PBTDrawer({ title, artist, url }: PBTDrawerProps) {
  const { state, dispatch } = useFlow();
  const isOpen = state.drawer.isOpen;
  const view = state.drawer.view;
  const [, bounds] = useMeasure();

  // Track last open state for smooth close animations
  const [lastOpenSnapshot, setLastOpenSnapshot] = useState<OpenSnapshot>({
    view: "default",
    height: 0,
  });

  const setView = (next: DrawerView) =>
    dispatch({ type: "drawer/setView", view: next });

  const handleOpenChange = (open: boolean) => {
    if (open) {
      dispatch({ type: "drawer/open" });
    } else {
      setLastOpenSnapshot({ view, height: bounds.height });
      dispatch({ type: "drawer/close" });
    }
  };

  // Use current view when open, last captured view when closing
  const renderView = isOpen ? view : lastOpenSnapshot.view;

  // Render content based on current view
  const content = (() => {
    switch (renderView) {
      case "default":
        return (
          <PBTDefaultView
            setView={setView}
            title={title}
            artist={artist}
            url={url}
          />
        );
      case "transfer":
        return <PBTAddressView setView={setView} kind="transfer" />;
      case "mint":
        return <PBTAddressView setView={setView} kind="mint" />;
      case "pending":
        return <PBTPendingView setView={setView} />;
      case "success":
        return <PBTSuccessView />;
      case "error":
        return <PBTErrorView setView={setView} />;
    }
  })();

  return (
    <Drawer
      repositionInputs={false}
      open={isOpen}
      onOpenChange={handleOpenChange}
    >
      <DrawerContent className="fixed bottom-4 left-4 z-10 max-w-80 overflow-hidden rounded-4xl bg-black outline-hidden">
        <DrawerTitle className="sr-only">{title}</DrawerTitle>
        <DrawerDescription className="sr-only">By {artist}</DrawerDescription>
        <AnimateHeight>
          <AnimatePresence
            initial={false}
            mode="popLayout"
            custom={renderView}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              key={renderView}
              transition={{
                duration: CONTENT_TRANSITION_DURATION,
                ease: CONTENT_EASE_CURVE,
              }}
            >
              {content}
            </motion.div>
          </AnimatePresence>
        </AnimateHeight>
      </DrawerContent>
    </Drawer>
  );
}

function AnimateHeight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [ref, bounds] = useMeasure();
  return (
    <motion.div animate={{ height: bounds.height }}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </motion.div>
  );
}
