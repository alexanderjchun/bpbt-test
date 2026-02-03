"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircleMinus, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isAddress } from "viem";
import { formatAddress, getEnsAddressOrOwner } from "../lib/viem";

interface AddressFormProps {
  onResolved?: (
    addr: `0x${string}`,
    meta?: { trigger: string },
  ) => Promise<void> | void;
  onClear?: () => void;
}

/**
 * Resolves an address input (either direct 0x address or ENS name).
 * Returns the resolved address or an error message.
 */
async function resolveAddress(
  value: string,
): Promise<{ address: `0x${string}` } | { error: string }> {
  const v = value.trim();

  if (!v) {
    return { error: "" }; // Empty is not an error, just nothing to validate
  }

  // Direct Ethereum address
  if (isAddress(v)) {
    return { address: v as `0x${string}` };
  }

  // ENS name
  if (v.toLowerCase().endsWith(".eth")) {
    try {
      const resolved = await getEnsAddressOrOwner(v);

      if (!resolved) {
        return { error: "Couldn't resolve that ENS name. Check the spelling?" };
      }

      return { address: resolved as `0x${string}` };
    } catch {
      return { error: "ENS lookup failed. Is that name correct?" };
    }
  }

  // Neither valid address nor ENS - only show error if they've typed enough
  if (v.length > 10) {
    return { error: "Enter a valid 0x address or .eth name" };
  }

  return { error: "" }; // Still typing, no error yet
}

export function AddressForm({ onResolved, onClear }: AddressFormProps) {
  const [resolvedAddress, setResolvedAddress] = useState<`0x${string}` | null>(
    null,
  );
  const [isValidating, setIsValidating] = useState(false);
  const [value, setValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const validateTimeoutRef = useRef<number | null>(null);
  const latestValidationIdRef = useRef(0);

  const runValidation = async (nextValue: string, trigger: string) => {
    const validationId = ++latestValidationIdRef.current;
    setIsValidating(true);
    try {
      const result = await resolveAddress(nextValue);
      if (validationId !== latestValidationIdRef.current) return;

      if ("address" in result) {
        setError(null);
        setResolvedAddress(result.address);
        await onResolved?.(result.address, { trigger });
        return;
      }

      setError(result.error ? result.error : null);
    } finally {
      if (validationId === latestValidationIdRef.current) {
        setIsValidating(false);
      }
    }
  };

  // Clear any pending debounce on unmount
  useEffect(() => {
    return () => {
      if (validateTimeoutRef.current != null) {
        window.clearTimeout(validateTimeoutRef.current);
      }
    };
  }, []);

  // Show resolved state
  if (resolvedAddress) {
    return (
      <div className="flex h-12 items-center justify-between pl-2">
        <span className="text-lg font-bold text-white">
          {formatAddress(resolvedAddress)}
        </span>
        <Button
          variant="gallery-outline"
          size="icon-xl"
          className="text-destructive border-0"
          onClick={() => {
            setResolvedAddress(null);
            setValue("");
            setError(null);
            setIsTouched(false);
            onClear?.();
          }}
        >
          <CircleMinus />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={value}
        onBlur={() => {
          setIsTouched(true);
          void runValidation(value, "blur");
        }}
        onChange={(e) => {
          const nextValue = e.target.value;
          setValue(nextValue);

          // Only validate eagerly if it looks complete
          const v = nextValue.trim();
          const isEagerCase =
            isAddress(v) ||
            v.toLowerCase().endsWith(".eth");

          if (!isEagerCase) return;

          if (validateTimeoutRef.current != null) {
            window.clearTimeout(validateTimeoutRef.current);
          }
          validateTimeoutRef.current = window.setTimeout(() => {
            void runValidation(nextValue, "input");
          }, 200);
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text").trim();
          if (text) {
            e.preventDefault();
            setValue(text);

            if (validateTimeoutRef.current != null) {
              window.clearTimeout(validateTimeoutRef.current);
            }
            validateTimeoutRef.current = window.setTimeout(() => {
              void runValidation(text, "paste");
            }, 200);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setIsTouched(true);
            void runValidation(value, "enter");
          }
        }}
        placeholder="0x... or .eth"
        className="h-12 rounded-none text-base font-light"
        aria-busy={isValidating}
        aria-invalid={isTouched && !!error}
      />
      {isValidating && (
        <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
      )}
      {isTouched && error && (
        <p className="text-destructive mt-2 text-sm">{error}</p>
      )}
    </div>
  );
}
