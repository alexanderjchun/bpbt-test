import {
  encodeAbiParameters,
  hashMessage,
  keccak256,
  parseAbiParameters,
} from "viem";

export type HexString = `0x${string}`;

export interface BuildChipSignatureDigestParams {
  contract: HexString;
  chainId: number;
  nonce: HexString; // bytes32
  to: HexString; // address
  timestamp: bigint | number;
  extras?: HexString; // default '0x'
}

export interface BuiltDigestResult {
  rawHash: HexString; // keccak256(abi.encodePacked(...))
  digest: HexString; // EIP-191 formatted digest (eth_sign)
}

export function buildChipSignatureDigest(
  params: BuildChipSignatureDigestParams,
): BuiltDigestResult {
  const { contract, chainId, nonce, to, timestamp, extras } = params;

  const extrasHash = keccak256(extras ?? ("0x" as HexString));

  const rawHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "address, uint256, bytes32, address, uint256, bytes32",
      ),
      [contract, BigInt(chainId), nonce, to, BigInt(timestamp), extrasHash],
    ),
  ) as HexString;

  const digest = hashMessage({ raw: rawHash }) as HexString;

  return { rawHash, digest };
}
