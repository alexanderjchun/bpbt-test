export type ChipJsonEntry = {
  tokenId: number;
  chipAddress: `0x${string}`;
  pkey?: string;
};

// Import chip mappings from the foundry project (dev vs prod)
// Relative to nextjs/src/lib/ → ../../../foundry/data
// These are bundled at build time.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - JSON import typing is inferred at runtime
import devChips from "../../../foundry/data/chip_data.json";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import prodChips from "../../../foundry/data/chip_data_prod.json";

function selectSource(): { chips: ChipJsonEntry[] } {
  return process.env.NODE_ENV === "development"
    ? (devChips as any)
    : (prodChips as any);
}

export function getChipJsonEntryByTokenId(
  tokenId: number,
): ChipJsonEntry | undefined {
  const { chips } = selectSource();
  return chips.find((c: ChipJsonEntry) => c.tokenId === tokenId);
}
