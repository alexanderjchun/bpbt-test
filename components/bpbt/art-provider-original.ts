"use client";

import { submitPbtTx } from "@/actions";
import { getPreloadedChipByTokenId } from "@/lib/chips";
import { signDigestWithChip } from "@/lib/pbt";
import { buildChipSignatureDigest } from "@/lib/signing";
import { contractConfig, publicClient } from "@/lib/viem";
import { createContext, use, useEffect, useReducer, useRef } from "react";

export type DrawerView =
  | "default"
  | "mint"
  | "transfer"
  | "pending"
  | "error"
  | "success";

type GalleryState = {
  activeArtworkId: number;
};

type DrawerState = {
  isOpen: boolean;
  view: DrawerView;
};

type AddressState = {
  resolved?: `0x${string}`;
  error?: string;
};

type NfcState = {
  status: "idle" | "scanning" | "success" | "error";
  chipId?: `0x${string}`;
  nonce?: `0x${string}`;
  error?: string;
  kind?: "mint" | "transfer";
  to?: `0x${string}`;
};

type TxState = {
  status: "idle" | "pending" | "success" | "error";
  kind?: "mint" | "transfer";
  hash?: `0x${string}`;
  error?: string;
};

export type FlowState = {
  gallery: GalleryState;
  drawer: DrawerState;
  address: AddressState;
  nfc: NfcState;
  tx: TxState;
};

type FlowAction =
  | { type: "gallery/setActiveArtworkId"; id: number }
  | { type: "drawer/open" }
  | { type: "drawer/close" }
  | { type: "drawer/setView"; view: DrawerView }
  | { type: "address/resolved"; value: `0x${string}` }
  | { type: "address/reset" }
  | { type: "address/error"; error: string }
  | { type: "nfc/startScan"; kind: "mint" | "transfer"; to: `0x${string}` }
  | { type: "nfc/success"; chipId: `0x${string}`; nonce: `0x${string}` }
  | { type: "nfc/error"; error: string }
  | { type: "nfc/reset" }
  | { type: "tx/start"; kind: "mint" | "transfer" }
  | { type: "tx/success"; hash: `0x${string}` }
  | { type: "tx/error"; error: string }
  | { type: "tx/reset" }
  | { type: "flow/reset" };

type FlowContextValue = {
  state: FlowState;
  dispatch: (action: FlowAction) => void;
  isGalleryLocked: boolean;
};

export const FlowContext = createContext<FlowContextValue>(
  null as unknown as FlowContextValue,
);

const initialState: FlowState = {
  gallery: { activeArtworkId: 1 },
  drawer: { isOpen: false, view: "default" },
  address: {},
  nfc: { status: "idle" },
  tx: { status: "idle" },
};

function flowReducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "gallery/setActiveArtworkId":
      return { ...state, gallery: { activeArtworkId: action.id } };
    case "drawer/open":
      return { ...state, drawer: { ...state.drawer, isOpen: true } };
    case "drawer/close":
      return {
        ...state,
        drawer: { isOpen: false, view: "default" },
        address: {},
        nfc: { status: "idle" },
        tx: { status: "idle" },
      };
    case "drawer/setView":
      return { ...state, drawer: { ...state.drawer, view: action.view } };
    case "address/resolved":
      return { ...state, address: { resolved: action.value } };
    case "address/reset":
      return { ...state, address: {} };
    case "address/error":
      return { ...state, address: { error: action.error } };
    case "nfc/startScan":
      return {
        ...state,
        nfc: { status: "scanning", kind: action.kind, to: action.to },
      };
    case "nfc/success":
      return {
        ...state,
        nfc: { status: "success", chipId: action.chipId, nonce: action.nonce },
      };
    case "nfc/error":
      return { ...state, nfc: { status: "error", error: action.error } };
    case "nfc/reset":
      return { ...state, nfc: { status: "idle" } };
    case "tx/start":
      return {
        ...state,
        tx: { status: "pending", kind: action.kind },
        drawer: { ...state.drawer, view: "pending" },
      };
    case "tx/success":
      return {
        ...state,
        tx: { status: "success", hash: action.hash, kind: state.tx.kind },
        drawer: { ...state.drawer, view: "success" },
      };
    case "tx/error":
      return {
        ...state,
        tx: { status: "error", error: action.error, kind: state.tx.kind },
        drawer: { ...state.drawer, view: "error" },
      };
    case "tx/reset":
      return { ...state, tx: { status: "idle" } };
    case "flow/reset":
      return initialState;
    default:
      return state;
  }
}

export function ArtProvider({ children }: { children?: React.ReactNode }) {
  const [state, dispatch] = useReducer(flowReducer, initialState);

  const isGalleryLocked =
    state.drawer.isOpen ||
    state.nfc.status === "scanning" ||
    state.tx.status === "pending";

  const value = {
    state,
    dispatch,
    isGalleryLocked,
  };
  const scanning = state.nfc.status === "scanning";
  const scanTo = state.nfc.to;
  const scanKind = state.nfc.kind;
  const scanInFlightRef = useRef(false);

  useEffect(() => {
    if (!scanning) return;

    scanInFlightRef.current = true;
    if (!scanTo) {
      dispatch({ type: "nfc/error", error: "No destination address set" });
      return;
    }
    if (!scanKind) {
      dispatch({ type: "nfc/error", error: "No operation kind set" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Hardcode one-scan for tokenId 1 only; no fallback to identify
        const preloaded = getPreloadedChipByTokenId(
          state.gallery.activeArtworkId,
        );
        if (!preloaded)
          throw new Error("Preloaded chip missing for this artwork");
        const chipAddress = preloaded.chipAddress as `0x${string}`;
        const chipPublicKey = preloaded.publicKey;

        // Using preloaded mapping only (dev-focused)

        // Fetch current nonce
        if (cancelled) return;
        const nonce = (await publicClient.readContract({
          ...contractConfig,
          functionName: "chipNonce",
          args: [chipAddress],
        })) as `0x${string}`;
        if (!nonce) {
          dispatch({ type: "nfc/error", error: "Failed to read nonce" });
          return;
        }

        // Optional: precheck mapping on-chain to fail fast without consuming a signature
        try {
          await publicClient.readContract({
            ...contractConfig,
            functionName: "tokenIdFor",
            args: [chipAddress],
          });
        } catch (e) {
          // Surface a clearer error
          throw new Error("No mapped token for this chip on-chain");
        }

        // Use chain time (minus 1s) to avoid future timestamp reverts on-chain
        const latestBlock = await publicClient.getBlock();
        const chainNowSec = Number(latestBlock.timestamp);
        const clientNowSec = Math.floor(Date.now() / 1000);
        const signatureTimestamp = Math.max(
          0,
          Math.min(chainNowSec, clientNowSec) - 1,
        );
        const chainId = await publicClient.getChainId();
        const { digest } = buildChipSignatureDigest({
          contract: contractConfig.address,
          chainId,
          nonce: nonce as `0x${string}`,
          to: scanTo as `0x${string}`,
          timestamp: signatureTimestamp,
          extras: "0x",
        });
        if (cancelled) return;

        // Sign once. If preloaded, this is the only tap. If not, this is the second tap.
        const signature = await signDigestWithChip(digest, {
          keyNo: 1,
          publicKey: chipPublicKey!,
        });

        const kind = scanKind;
        dispatch({ type: "tx/start", kind });

        const result = await submitPbtTx(
          kind,
          scanTo,
          chipAddress,
          signature,
          signatureTimestamp,
        );

        if (cancelled) return;

        if (result.success) {
          dispatch({
            type: "nfc/success",
            chipId: chipAddress,
            nonce: nonce as `0x${string}`,
          });
          dispatch({ type: "tx/success", hash: result.hash as `0x${string}` });
        } else {
          const err = result.error ?? "Unknown transaction error";
          dispatch({ type: "nfc/error", error: err });
          dispatch({ type: "tx/error", error: err });
        }
      } catch (e) {
        const err = String(e);
        dispatch({ type: "nfc/error", error: err });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scanning, scanTo, scanKind]);

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