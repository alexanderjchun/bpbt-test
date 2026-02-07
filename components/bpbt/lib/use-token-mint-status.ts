"use client";

/**
 * Hook to check if a token is minted on-chain.
 * Uses ERC721's ownerOf which reverts if token doesn't exist.
 */

import { useEffect, useState } from "react";
import { contractConfig, publicClient } from "./viem";

export type MintStatus = "loading" | "minted" | "unminted" | "error";

interface TokenMintStatusResult {
  status: MintStatus;
}

export function useTokenMintStatus(tokenId: number): TokenMintStatusResult {
  const [status, setStatus] = useState<MintStatus>("loading");

  useEffect(() => {
    setStatus("loading");

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
  }, [tokenId]);

  return { status };
}
