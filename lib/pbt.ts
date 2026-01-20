"use client";

import {
  haloConvertSignature,
  SECP256k1_ORDER,
} from "@arx-research/libhalo/api/common";
import { execHaloCmdWeb } from "@arx-research/libhalo/api/web";

export interface ChipInfo {
  chipId: `0x${string}`;
  publicKey: string;
  publicKeys: string[];
  etherAddresses: string[];
}

export async function getChipInfo(): Promise<ChipInfo> {
  const res = await execHaloCmdWeb({ name: "get_pkeys" });
  if (!res?.publicKeys?.[1] || !res?.etherAddresses?.[1]) {
    throw new Error("Unable to read chip keys/addresses (slot #1 missing)");
  }
  return {
    chipId: res.etherAddresses[1] as `0x${string}`,
    publicKey: res.publicKeys[1],
    publicKeys: res.publicKeys,
    etherAddresses: res.etherAddresses,
  };
}

export interface SignOptions {
  keyNo?: number;
  publicKey: string;
}

export async function signDigestWithChip(
  digest: `0x${string}`,
  options: SignOptions,
): Promise<`0x${string}`> {
  const keyNo = options.keyNo ?? 1;
  const res = await execHaloCmdWeb(
    {
      name: "sign",
      keyNo,
      digest: digest.slice(2),
      legacySignCommand: true,
    },
    {},
  );

  if (res?.signature?.ether) {
    return res.signature.ether as `0x${string}`;
  }

  if (res?.signature?.der) {
    const publicKey = options.publicKey;
    const converted = haloConvertSignature(
      res.input.digest,
      res.signature.der,
      publicKey,
      SECP256k1_ORDER,
    );
    return converted.ether as `0x${string}`;
  }

  throw new Error(
    `No usable signature found. Available: ${Object.keys(res?.signature || {}).join(", ")}`,
  );
}
