"use client";

import { useEffect, useState } from "react";
import { contractConfig, publicClient } from "./viem";

export type MintStatus = "loading" | "minted" | "unminted" | "error";

interface TokenMintStatusResult {
  status: MintStatus;
  owner: `0x${string}` | null;
  refetch: () => void;
}

/**
 * Hook to check if a token is minted on-chain.
 * Uses ERC721's ownerOf which reverts if token doesn't exist.
 */
export function useTokenMintStatus(tokenId: number): TokenMintStatusResult {
  const [status, setStatus] = useState<MintStatus>("loading");
  const [owner, setOwner] = useState<`0x${string}` | null>(null);

  const fetchStatus = () => {
    setStatus("loading");
    setOwner(null);

    publicClient
      .readContract({
        ...contractConfig,
        functionName: "ownerOf",
        args: [BigInt(tokenId)],
      })
      .then((result) => {
        setOwner(result as `0x${string}`);
        setStatus("minted");
      })
      .catch(() => {
        // ownerOf reverts for non-existent tokens (ERC721 standard)
        setStatus("unminted");
      });
  };

  useEffect(() => {
    fetchStatus();
  }, [tokenId]);

  return { status, owner, refetch: fetchStatus };
}
