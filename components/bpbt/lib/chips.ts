export type PreloadedChip = {
  tokenId: number;
  chipAddress: `0x${string}`;
  publicKey: string; // uncompressed SEC1 public key, 65 bytes, starts with 0x04 or raw hex
};

// Populate this array with known chips to enable one-scan flow per artwork/tokenId.
// Example entry shape:
// { tokenId: 1, chipAddress: "0x...", publicKey: "04..." }
export const CHIP_MAP: PreloadedChip[] = [
  {
    tokenId: 1,
    chipAddress: "0x20430eE3F71B6ae60Befdb4cd6108e5F37F14CB2",
    publicKey:
      "04fe67e0639e5894214c1cfa363ad70ce00589e8136bd587ea02b781139299c5765827aa4b18b291682c84daefab9501118301d01896f74dc2b6c03c3497b6696e",
  },
  {
    tokenId: 2,
    chipAddress: "0x38A8f6EB0c27346a2Af1C84A815EC5A5617f926F",
    publicKey:
      "04eb94d5963fb325a7de30e53582e289501121df42d146c1a2b72759ab566da6e7bd706b970f50c46b40d420377c45a4246ba4d17e61ef029ac7b13e4aa84bcbe9",
  },
];

export function getPreloadedChipByTokenId(
  tokenId: number,
): PreloadedChip | undefined {
  return CHIP_MAP.find((c) => c.tokenId === tokenId);
}

export type ChipJsonEntry = {
  tokenId: number;
  chipAddress: `0x${string}`;
  pkey?: string;
};

import devChips from "../../../foundry/data/chip_data.json";
import prodChips from "../../../foundry/data/chip_data_prod.json";

function selectSource(): { chips: ChipJsonEntry[] } {
  return process.env.NODE_ENV === "development"
    ? (devChips as { chips: ChipJsonEntry[] })
    : (prodChips as { chips: ChipJsonEntry[] });
}

export function getChipJsonEntryByTokenId(
  tokenId: number,
): ChipJsonEntry | undefined {
  const { chips } = selectSource();
  return chips.find((c: ChipJsonEntry) => c.tokenId === tokenId);
}
