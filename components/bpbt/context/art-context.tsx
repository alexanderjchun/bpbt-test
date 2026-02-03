"use client";

import { createContext, use, useReducer } from "react";
import { flowReducer, initialState, type FlowContextValue } from "./flow";
import { useScanEffect } from "./use-scan-effect";

export const FlowContext = createContext<FlowContextValue>(
  null as unknown as FlowContextValue,
);

export function ArtProvider({ children }: { children?: React.ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, initialState);

  const isGalleryLocked =
    state.drawer.isOpen ||
    state.nfc.status === "scanning" ||
    state.tx.status === "pending";

  // React Compiler handles memoization, no manual useMemo needed
  const value = {
    state,
    dispatch,
    isGalleryLocked,
  };

  // Use the extracted scan effect hook
  useScanEffect({ state, dispatch });

  return <FlowContext.Provider value={value}>{children}</FlowContext.Provider>;
}

export function useFlow() {
  return use(FlowContext);
}

export function useActiveArtworkId() {
  return use(FlowContext).state.gallery.activeArtworkId;
}

export function useIsGalleryLocked() {
  return use(FlowContext).isGalleryLocked;
}
