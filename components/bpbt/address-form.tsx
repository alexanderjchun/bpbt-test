"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAddress, getEnsAddressOrOwner } from "@/lib/viem";
import { useForm } from "@tanstack/react-form";
import { CircleMinus, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { isAddress } from "viem";
import { normalize } from "viem/ens";

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
      const name = normalize(v);
      const resolved = await getEnsAddressOrOwner(name);

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
  const shouldValidateRef = useRef(false);

  const form = useForm({
    defaultValues: { address: "" },
  });

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
            form.reset();
            onClear?.();
          }}
        >
          <CircleMinus />
        </Button>
      </div>
    );
  }

  return (
    <form.Field
      name="address"
      validators={{
        // Blur validation - always validate on blur
        onBlurAsync: async ({ value }) => {
          const result = await resolveAddress(value);
          if ("address" in result) {
            setResolvedAddress(result.address);
            await onResolved?.(result.address, { trigger: "blur" });
            return undefined;
          }
          return result.error || undefined;
        },

        // Change validation - only for eager cases (paste, .eth, valid address)
        onChangeAsyncDebounceMs: 200,
        onChangeAsync: async ({ value }) => {
          // Only validate eagerly if flagged (paste) or looks complete
          const v = value.trim();
          const isEagerCase =
            shouldValidateRef.current ||
            isAddress(v) ||
            v.toLowerCase().endsWith(".eth");

          // Reset the flag
          shouldValidateRef.current = false;

          if (!isEagerCase) {
            return undefined; // Not eager, skip validation
          }

          setIsValidating(true);
          try {
            const result = await resolveAddress(value);
            if ("address" in result) {
              setResolvedAddress(result.address);
              await onResolved?.(result.address, { trigger: "input" });
              return undefined;
            }
            return result.error || undefined;
          } finally {
            setIsValidating(false);
          }
        },
      }}
    >
      {(field) => (
        <div className="relative">
          <Input
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").trim();
              if (text) {
                e.preventDefault();
                // Flag for eager validation on paste
                shouldValidateRef.current = true;
                field.handleChange(text);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                // Trigger blur validation on Enter
                field.handleBlur();
              }
            }}
            placeholder="0x... or .eth"
            className="h-12 rounded-none text-base font-light"
            aria-busy={isValidating || field.state.meta.isValidating}
            aria-invalid={
              field.state.meta.isTouched && field.state.meta.errors.length > 0
            }
          />
          {(isValidating || field.state.meta.isValidating) && (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
          )}
          {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
            <p className="text-destructive mt-2 text-sm">
              {field.state.meta.errors[0]}
            </p>
          )}
        </div>
      )}
    </form.Field>
  );
}
