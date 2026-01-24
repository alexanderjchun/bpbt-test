"use client";

import {
  useActiveArtworkId,
  useFlow,
  type DrawerView,
} from "@/components/bpbt/art-provider";
import {
  AddressEntryView,
  DefaultView,
  ErrorView,
  PendingView,
  SuccessView,
} from "@/components/bpbt/views";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ARTWORK_META } from "@/lib/artwork.meta";

import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useState } from "react";
import useMeasure from "react-use-measure";

// Hoisted static data outside component (rendering-hoist-jsx)
const PFPS: Record<number, string> = {
  1: "/yuka.png",
  2: "/sukizweetsm.png",
  3: "/willem.png",
  4: "/yq.png",
  5: "/kat-pichik.png",
  6: "/jonathon-downing.png",
  7: "/take.png",
  8: "/sukizweetsm.png",
  9: "/ellie-kayu-ng.png",
  10: "/timon-yc-i.png",
  11: "/yapable.png",
};

// Hoisted constants outside component
const CONTENT_TRANSITION_DURATION = 0.2;
const CONTENT_EASE_CURVE = [0.26, 0.08, 0.25, 1] as const;

type OpenSnapshot = { view: DrawerView; height: number };

export function ArtistDrawer() {
  const { state, dispatch } = useFlow();
  const id = useActiveArtworkId();
  const isOpen = state.drawer.isOpen;
  const view = state.drawer.view;
  const [, bounds] = useMeasure();

  // Track last open state for smooth close animations
  const [lastOpenSnapshot, setLastOpenSnapshot] = useState<OpenSnapshot>({
    view: "default",
    height: 0,
  });

  // React Compiler handles memoization automatically
  const meta = ARTWORK_META.find((m) => m.id === id) ?? ARTWORK_META[0];

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

  const handleButtonClick = () => dispatch({ type: "drawer/open" });

  // Use current view when open, last captured view when closing
  const renderView = isOpen ? view : lastOpenSnapshot.view;

  // Render content based on current view
  const content = (() => {
    switch (renderView) {
      case "default":
        return (
          <DefaultView
            setView={setView}
            title={meta.title}
            artist={meta.artist}
            url={meta.url}
          />
        );
      case "transfer":
        return <AddressEntryView setView={setView} kind="transfer" />;
      case "mint":
        return <AddressEntryView setView={setView} kind="mint" />;
      case "pending":
        return <PendingView setView={setView} />;
      case "success":
        return <SuccessView />;
      case "error":
        return <ErrorView setView={setView} />;
    }
  })();

  return (
    <>
      <Button
        onClick={handleButtonClick}
        className="fixed bottom-4 left-4 h-12 rounded-full bg-black pr-3 pl-2 font-black uppercase after:text-white/50 after:content-['//'] hover:bg-black/90"
      >
        <Avatar>
          <AvatarImage
            src={PFPS[id]}
            alt={meta.artist}
            width={24}
            height={24}
          />
        </Avatar>
        {meta.artist}
      </Button>

      <Drawer
        repositionInputs={false}
        open={isOpen}
        onOpenChange={handleOpenChange}
      >
        <DrawerContent className="fixed bottom-4 left-4 z-10 max-w-80 overflow-hidden rounded-4xl bg-black outline-hidden">
          <DrawerTitle className="sr-only">{meta.title}</DrawerTitle>
          <DrawerDescription className="sr-only">
            By {meta.artist}
          </DrawerDescription>
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
    </>
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
