"use server";

import { animechain } from "@/components/bpbt/lib/animechain";
import { headers } from "next/headers";
import {
  createWalletClient,
  http,
  isAddress,
  isHex,
  verifyMessage,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { buildChipSignatureDigest } from "./signing";
import { contractConfig, publicClient } from "./viem";

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);

const chain = process.env.NODE_ENV === "development" ? foundry : animechain;

const walletClient = createWalletClient({
  account,
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

export async function submitPbtTx(
  kind: "mint" | "transfer",
  to: string,
  chipId: string,
  chipSignature: string,
  signatureTimestamp: number,
  options?: { extras?: `0x${string}`; useSafeTransfer?: boolean },
) {
  const extras = options?.extras ?? ("0x" as `0x${string}`);
  const useSafeTransfer = options?.useSafeTransfer ?? false;
  const hdrs = await headers();
  const origin = hdrs.get("origin") || "";
  const allowedOrigin = process.env.NEXT_PUBLIC_SITE_URL || "";
  if (allowedOrigin && origin && !origin.startsWith(allowedOrigin)) {
    return { success: false, error: "Forbidden origin" } as const;
  }
  // Input validation
  if (!isAddress(to))
    return { success: false, error: "Invalid 'to' address" } as const;
  if (!isAddress(chipId))
    return { success: false, error: "Invalid 'chipId' address" } as const;
  if (!isHex(chipSignature) || chipSignature.length !== 132)
    return { success: false, error: "Invalid signature format" } as const;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - Number(signatureTimestamp)) > 5 * 60) {
    return { success: false, error: "Signature timestamp too old" } as const;
  }
  try {
    // Recompute digest server-side and verify signature belongs to chipId
    const chainId = await publicClient.getChainId();
    const nonce = (await publicClient.readContract({
      ...contractConfig,
      functionName: "chipNonce",
      args: [chipId as `0x${string}`],
    })) as `0x${string}`;
    const { rawHash } = buildChipSignatureDigest({
      contract: contractConfig.address,
      chainId,
      nonce,
      to: to as `0x${string}`,
      timestamp: signatureTimestamp,
      extras,
    });
    const sigOk = await verifyMessage({
      address: chipId as `0x${string}`,
      message: { raw: rawHash },
      signature: chipSignature as `0x${string}`,
    });
    if (!sigOk)
      return { success: false, error: "Invalid chip signature" } as const;

    // Pre-simulate to avoid wasting gas on reverts
    const functionName = kind === "mint" ? "mint" : "transferToken";
    const args =
      kind === "mint"
        ? [
            to as `0x${string}`,
            chipId as `0x${string}`,
            chipSignature as `0x${string}`,
            BigInt(signatureTimestamp),
            extras,
          ]
        : [
            to as `0x${string}`,
            chipId as `0x${string}`,
            chipSignature as `0x${string}`,
            BigInt(signatureTimestamp),
            useSafeTransfer,
            extras,
          ];

    await publicClient.simulateContract({
      ...contractConfig,
      functionName,
      args: args as readonly unknown[],
      account: account.address as `0x${string}`,
    });

    const hash = await walletClient.writeContract({
      ...contractConfig,
      functionName,
      args: args as readonly unknown[],
    });

    return { success: true, hash };
  } catch (error) {
    console.error("PBT_TXN_ERROR:", error);
    return { success: false, error: String(error) };
  }
}
