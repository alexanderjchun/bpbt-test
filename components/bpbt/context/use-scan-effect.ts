import { useEffect } from "react";
import type { FlowAction, FlowState } from "./flow";
import { executeScan } from "../lib/scan-executor";

interface UseScanEffectProps {
  state: FlowState;
  dispatch: (action: FlowAction) => void;
}

/**
 * Effect hook that triggers NFC scanning and transaction submission
 * when the nfc state transitions to "scanning".
 */
export function useScanEffect({ state, dispatch }: UseScanEffectProps) {
  const scanning = state.nfc.status === "scanning";
  const scanTo = state.nfc.to;
  const scanKind = state.nfc.kind;
  const artworkId = state.gallery.activeArtworkId;

  useEffect(() => {
    if (!scanning || !scanTo || !scanKind) return;

    const controller = new AbortController();

    executeScan({
      artworkId,
      to: scanTo,
      kind: scanKind,
      signal: controller.signal,
    }).then((result) => {
      if (controller.signal.aborted) return;

      if (result.success) {
        dispatch({
          type: "nfc/success",
          chipId: result.chipId,
          nonce: result.nonce,
        });
        dispatch({ type: "tx/success", hash: result.hash });
      } else {
        dispatch({ type: "nfc/error", error: result.error });
        dispatch({ type: "tx/error", error: result.error });
      }
    });

    return () => controller.abort();
  }, [scanning, scanTo, scanKind, artworkId, dispatch]);
}
