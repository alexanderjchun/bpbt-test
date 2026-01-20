"use client";

import { submitPbtTx } from "@/app/actions";
import { getPreloadedChipByTokenId } from "@/lib/chips";
import { signDigestWithChip } from "@/lib/pbt";
import { buildChipSignatureDigest } from "@/lib/signing";
import { contractConfig, publicClient } from "@/lib/viem";
import { createContext, use, useEffect, useReducer } from "react";

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
        drawer: { ...state.drawer, view: "pending" },
      };
    case "nfc/success":
      return {
        ...state,
        nfc: { status: "success", chipId: action.chipId, nonce: action.nonce },
      };
    case "nfc/error":
      return {
        ...state,
        nfc: { status: "error", error: action.error },
        drawer: { ...state.drawer, view: "error" },
      };
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

// ============================================================================
// Scan Execution Logic (extracted for clarity)
// ============================================================================

type ScanResult =
  | { success: true; hash: `0x${string}`; chipId: `0x${string}`; nonce: `0x${string}` }
  | { success: false; error: string };

interface ScanParams {
  artworkId: number;
  to: `0x${string}`;
  kind: "mint" | "transfer";
  signal: AbortSignal;
}

async function executeScan(params: ScanParams): Promise<ScanResult> {
  const { artworkId, to, kind, signal } = params;

  // Get preloaded chip data
  const preloaded = getPreloadedChipByTokenId(artworkId);
  if (!preloaded) {
    return { success: false, error: "Chip not configured for this artwork" };
  }

  const chipAddress = preloaded.chipAddress as `0x${string}`;
  const chipPublicKey = preloaded.publicKey;

  // Parallel fetch: nonce + tokenId verification
  const [nonceResult, tokenIdResult] = await Promise.allSettled([
    publicClient.readContract({
      ...contractConfig,
      functionName: "chipNonce",
      args: [chipAddress],
    }),
    publicClient.readContract({
      ...contractConfig,
      functionName: "tokenIdFor",
      args: [chipAddress],
    }),
  ]);

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  // Check nonce result
  if (nonceResult.status === "rejected") {
    return { success: false, error: "Failed to read chip nonce from contract" };
  }
  const nonce = nonceResult.value as `0x${string}`;

  // Check tokenId result (verifies chip is mapped on-chain)
  if (tokenIdResult.status === "rejected") {
    return { success: false, error: "No mapped token for this chip on-chain" };
  }

  // Parallel fetch: block timestamp + chainId
  const [blockResult, chainIdResult] = await Promise.allSettled([
    publicClient.getBlock(),
    publicClient.getChainId(),
  ]);

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  if (blockResult.status === "rejected" || chainIdResult.status === "rejected") {
    return { success: false, error: "Failed to fetch chain data" };
  }

  const latestBlock = blockResult.value;
  const chainId = chainIdResult.value;

  // Calculate signature timestamp (use chain time minus 1s to avoid future timestamp reverts)
  const chainNowSec = Number(latestBlock.timestamp);
  const clientNowSec = Math.floor(Date.now() / 1000);
  const signatureTimestamp = Math.max(0, Math.min(chainNowSec, clientNowSec) - 1);

  // Build digest for signing
  const { digest } = buildChipSignatureDigest({
    contract: contractConfig.address,
    chainId,
    nonce,
    to,
    timestamp: signatureTimestamp,
    extras: "0x",
  });

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  // Sign with NFC chip
  let signature: `0x${string}`;
  try {
    signature = await signDigestWithChip(digest, {
      keyNo: 1,
      publicKey: chipPublicKey!,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  // Submit transaction
  const result = await submitPbtTx(kind, to, chipAddress, signature, signatureTimestamp);

  if (!result.success) {
    return { success: false, error: result.error ?? "Transaction submission failed" };
  }

  return {
    success: true,
    hash: result.hash as `0x${string}`,
    chipId: chipAddress,
    nonce,
  };
}

// ============================================================================
// Provider Component
// ============================================================================

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
        dispatch({ type: "nfc/success", chipId: result.chipId, nonce: result.nonce });
        dispatch({ type: "tx/success", hash: result.hash });
      } else {
        dispatch({ type: "nfc/error", error: result.error });
        dispatch({ type: "tx/error", error: result.error });
      }
    });

    return () => controller.abort();
  }, [scanning, scanTo, scanKind, artworkId]);

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
