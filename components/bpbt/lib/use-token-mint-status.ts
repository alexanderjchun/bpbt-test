/**
 * Hook to check if a token is minted on-chain.
 * Uses ERC721's ownerOf which reverts if token doesn't exist.
 */

// TODO: Consider using TanStack Query to handle error states and reconsider user flow in general because this is kind of retarded. Data fetching should definitely be separate from the UI. Consider what specifically should be isolated in the PBT component.

"use client";

import { useEffect, useState } from "react";
import { contractConfig, publicClient } from "./viem";

export type MintStatus = "loading" | "minted" | "unminted" | "error";

interface TokenMintStatusResult {
  status: MintStatus;
}

export function useTokenMintStatus(tokenId: number): TokenMintStatusResult {
  const [status, setStatus] = useState<MintStatus>("loading");

  const fetchStatus = () => {
    publicClient
      .readContract({
        ...contractConfig,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      })
      .then(() => {
        setStatus("minted");
      })
      .catch(() => {
        // ownerOf reverts for non-existent tokens (ERC721 standard)
        setStatus("unminted");
      });
  };

  useEffect(() => {
    fetchStatus();
  });

  return { status };
}
