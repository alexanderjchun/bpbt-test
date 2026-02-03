import { submitPbtTx } from "./actions";
import { getPreloadedChipByTokenId } from "./chips";
import { signDigestWithChip } from "./pbt";
import { buildChipSignatureDigest } from "./signing";
import { contractConfig, publicClient } from "./viem";

export type ScanResult =
  | {
      success: true;
      hash: `0x${string}`;
      chipId: `0x${string}`;
      nonce: `0x${string}`;
    }
  | { success: false; error: string };

export interface ScanParams {
  artworkId: number;
  to: `0x${string}`;
  kind: "mint" | "transfer";
  signal: AbortSignal;
}

/**
 * Executes the complete PBT scan flow:
 * 1. Gets preloaded chip data for the artwork
 * 2. Reads current nonce from contract
 * 3. Verifies chip is mapped on-chain
 * 4. Builds signature digest
 * 5. Signs with NFC chip
 * 6. Submits transaction via server action
 */
export async function executeScan(params: ScanParams): Promise<ScanResult> {
  const { artworkId, to, kind, signal } = params;

  // Get preloaded chip data
  const preloaded = getPreloadedChipByTokenId(artworkId);
  if (!preloaded) {
    return { success: false, error: "Chip not configured for this artwork" };
  }

  const chipAddress = preloaded.chipAddress as `0x${string}`;
  const chipPublicKey = preloaded.publicKey;

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  // Fetch current nonce
  let nonce: `0x${string}`;
  try {
    nonce = (await publicClient.readContract({
      ...contractConfig,
      functionName: "chipNonce",
      args: [chipAddress],
    })) as `0x${string}`;
  } catch {
    return { success: false, error: "Failed to read chip nonce from contract" };
  }

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  // Precheck mapping on-chain to fail fast without consuming a signature
  try {
    await publicClient.readContract({
      ...contractConfig,
      functionName: "tokenIdFor",
      args: [chipAddress],
    });
  } catch {
    return { success: false, error: "No mapped token for this chip on-chain" };
  }

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  // Use chain time (minus 1s) to avoid future timestamp reverts on-chain
  const latestBlock = await publicClient.getBlock();
  const chainNowSec = Number(latestBlock.timestamp);
  const clientNowSec = Math.floor(Date.now() / 1000);
  const signatureTimestamp = Math.max(0, Math.min(chainNowSec, clientNowSec) - 1);

  if (signal.aborted) {
    return { success: false, error: "Cancelled" };
  }

  const chainId = await publicClient.getChainId();

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
  const result = await submitPbtTx(
    kind,
    to,
    chipAddress,
    signature,
    signatureTimestamp,
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error ?? "Transaction submission failed",
    };
  }

  return {
    success: true,
    hash: result.hash as `0x${string}`,
    chipId: chipAddress,
    nonce,
  };
}
