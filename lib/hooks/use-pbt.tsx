"use client";

import {
  haloConvertSignature,
  SECP256k1_ORDER,
} from "@arx-research/libhalo/api/common";
import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChipInfo {
  chipId: `0x${string}`;
  publicKey: string;
  publicKeys: Record<number, string>;
  etherAddresses: Record<number, string>;
}

type PbtStatus = "idle" | "scanning" | "signing";

type PbtSupport = {
  isSupported: boolean | null;
  reason: string | null;
  method: "webnfc" | "credential" | null;
};

export type UsePbtReturn = {
  support: PbtSupport;
  status: PbtStatus;
  isScanning: boolean;
  isSigning: boolean;
  lastChipInfo: ChipInfo | null;
  lastSignature: `0x${string}` | null;
  error: string | null;
  clearError: () => void;
  clearLastChipInfo: () => void;
  clearLastSignature: () => void;
  getChipInfo: () => Promise<ChipInfo | null>;
  signDigest: (
    digest: `0x${string}`,
    publicKey: string,
    keyNo?: number,
  ) => Promise<`0x${string}` | null>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Support detection
// ─────────────────────────────────────────────────────────────────────────────

function detectMethod(): "webnfc" | "credential" | null {
  if (typeof window === "undefined") return null;

  try {
    // Check if WebNFC is available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).NDEFReader();
    return "webnfc";
  } catch {
    // WebNFC not supported, fall back to credential (WebAuthn)
  }

  // Check for WebAuthn support (credential method)
  if (
    navigator.credentials &&
    typeof navigator.credentials.get === "function"
  ) {
    return "credential";
  }

  return null;
}

function getPbtSupport(): {
  supported: boolean;
  reason?: string;
  method: "webnfc" | "credential" | null;
} {
  if (typeof window === "undefined") {
    return {
      supported: false,
      reason: "PBT can only run in a browser.",
      method: null,
    };
  }

  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "PBT requires HTTPS (or localhost).",
      method: null,
    };
  }

  const method = detectMethod();
  if (!method) {
    return {
      supported: false,
      reason:
        "Neither Web NFC nor WebAuthn is available on this device/browser.",
      method: null,
    };
  }

  return { supported: true, method };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatPbtError(err: unknown): string {
  if (err && typeof err === "object") {
    const errObj = err as { name?: unknown; message?: unknown };

    if (typeof errObj.name === "string") {
      const name = errObj.name;
      if (name === "NotAllowedError") return "NFC permission was denied.";
      if (name === "NotSupportedError")
        return "PBT is not supported on this device/browser.";
      if (name === "SecurityError") return "PBT requires HTTPS (or localhost).";
      if (name === "NFCAbortedError") return "Operation was cancelled.";
    }

    if (typeof errObj.message === "string") {
      return errObj.message;
    }
  }

  return "Unknown PBT error.";
}

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = (err as { name?: unknown }).name;
  return name === "AbortError" || name === "NFCAbortedError";
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const initialSupport: PbtSupport = {
  isSupported: null,
  reason: null,
  method: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePBT(): UsePbtReturn {
  const [support, setSupport] = useState<PbtSupport>(initialSupport);
  const [status, setStatus] = useState<PbtStatus>("idle");
  const [lastChipInfo, setLastChipInfo] = useState<ChipInfo | null>(null);
  const [lastSignature, setLastSignature] = useState<`0x${string}` | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const operationIdRef = useRef(0);

  const isScanning = status === "scanning";
  const isSigning = status === "signing";

  // Check support after hydration
  useEffect(() => {
    const { supported, reason, method } = getPbtSupport();
    setSupport({ isSupported: supported, reason: reason ?? null, method });
  }, []);

  const getChipInfo = useCallback(async (): Promise<ChipInfo | null> => {
    const { supported, reason, method } = getPbtSupport();
    setSupport({ isSupported: supported, reason: reason ?? null, method });

    if (!supported) {
      setError(reason ?? "PBT is not supported.");
      return null;
    }

    const opId = ++operationIdRef.current;
    setError(null);
    setStatus("scanning");

    try {
      const res = await execHaloCmdWeb({ name: "get_pkeys" });

      // Check if operation was superseded
      if (operationIdRef.current !== opId) return null;

      if (!res?.publicKeys?.[1] || !res?.etherAddresses?.[1]) {
        throw new Error("Unable to read chip keys/addresses (slot #1 missing)");
      }

      const chipInfo: ChipInfo = {
        chipId: res.etherAddresses[1] as `0x${string}`,
        publicKey: res.publicKeys[1],
        publicKeys: res.publicKeys,
        etherAddresses: res.etherAddresses,
      };

      setLastChipInfo(chipInfo);
      setStatus("idle");
      return chipInfo;
    } catch (err) {
      if (operationIdRef.current !== opId) return null;
      if (isAbortError(err)) {
        setStatus("idle");
        return null;
      }

      setStatus("idle");
      setError(`Scan failed: ${formatPbtError(err)}`);
      return null;
    }
  }, []);

  const signDigest = useCallback(
    async (
      digest: `0x${string}`,
      publicKey: string,
      keyNo: number = 1,
    ): Promise<`0x${string}` | null> => {
      const { supported, reason, method } = getPbtSupport();
      setSupport({ isSupported: supported, reason: reason ?? null, method });

      if (!supported) {
        setError(reason ?? "PBT is not supported.");
        return null;
      }

      const opId = ++operationIdRef.current;
      setError(null);
      setStatus("signing");

      try {
        const res = await execHaloCmdWeb(
          {
            name: "sign",
            keyNo,
            digest: digest.slice(2), // Remove 0x prefix
            legacySignCommand: true,
          },
          {},
        );

        // Check if operation was superseded
        if (operationIdRef.current !== opId) return null;

        let signature: `0x${string}`;

        if (res?.signature?.ether) {
          signature = res.signature.ether as `0x${string}`;
        } else if (res?.signature?.der) {
          const converted = haloConvertSignature(
            res.input.digest,
            res.signature.der,
            publicKey,
            SECP256k1_ORDER,
          );
          signature = converted.ether as `0x${string}`;
        } else {
          throw new Error(
            `No usable signature found. Available: ${Object.keys(res?.signature || {}).join(", ")}`,
          );
        }

        setLastSignature(signature);
        setStatus("idle");
        return signature;
      } catch (err) {
        if (operationIdRef.current !== opId) return null;
        if (isAbortError(err)) {
          setStatus("idle");
          return null;
        }

        setStatus("idle");
        setError(`Sign failed: ${formatPbtError(err)}`);
        return null;
      }
    },
    [],
  );

  const clearError = useCallback(() => setError(null), []);
  const clearLastChipInfo = useCallback(() => setLastChipInfo(null), []);
  const clearLastSignature = useCallback(() => setLastSignature(null), []);

  return useMemo(
    () => ({
      support,
      status,
      isScanning,
      isSigning,
      lastChipInfo,
      lastSignature,
      error,
      clearError,
      clearLastChipInfo,
      clearLastSignature,
      getChipInfo,
      signDigest,
    }),
    [
      support,
      status,
      isScanning,
      isSigning,
      lastChipInfo,
      lastSignature,
      error,
      clearError,
      clearLastChipInfo,
      clearLastSignature,
      getChipInfo,
      signDigest,
    ],
  );
}
