import { animechain } from "@/components/bpbt/lib/animechain";
import { createPublicClient, http, isAddress, parseAbi } from "viem";
import { foundry, mainnet } from "viem/chains";
import { namehash, normalize } from "viem/ens";
import bobuPBTAbi from "./abi.json";

export const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

const CHAIN = process.env.NODE_ENV === "development" ? foundry : animechain;

export const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

export const contractConfig = {
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`,
  abi: bobuPBTAbi,
} as const;

export function formatAddress(address: string): string {
  if (!isAddress(address)) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function getEnsAddressOrOwner(
  value: string,
): Promise<string | null> {
  const normalizedEns = normalize(value);
  const address = await ensClient.getEnsAddress({
    name: normalizedEns,
  });
  if (address) return address;

  const ownerAddress = await ensClient.readContract({
    address: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    abi: parseAbi(["function owner(bytes32 node) view returns (address)"]),
    functionName: "owner",
    args: [namehash(normalizedEns)],
  });
  if (ownerAddress === "0x0000000000000000000000000000000000000000")
    return null;
  if (!ownerAddress) return null;
  return ownerAddress;
}
