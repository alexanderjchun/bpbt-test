export type ErrorCategory = "nfc" | "network" | "address" | "unknown";

export interface ParsedError {
  message: string;
  category: ErrorCategory;
  recoverable: boolean;
}

// Hoisted outside function (js-hoist-regexp)
const ERROR_PATTERNS: [RegExp, ParsedError][] = [
  // Address/ENS errors
  [
    /could not resolve|couldn't resolve|ens.*not found/i,
    {
      message: "That address doesn't exist. Double-check the spelling?",
      category: "address",
      recoverable: true,
    },
  ],
  [
    /invalid address|not a valid/i,
    {
      message: "That doesn't look like a valid address.",
      category: "address",
      recoverable: true,
    },
  ],

  // Network errors
  [
    /failed to (fetch|read)|network|connection/i,
    {
      message: "Network hiccup. Try again in a sec.",
      category: "network",
      recoverable: true,
    },
  ],
  [
    /timeout|timed out/i,
    {
      message: "Took too long. Give it another shot?",
      category: "network",
      recoverable: true,
    },
  ],

  // NFC/User action errors
  [
    /user rejected|cancelled|canceled|aborted/i,
    {
      message: "Scan cancelled.",
      category: "nfc",
      recoverable: true,
    },
  ],
  [
    /no mapped token/i,
    {
      message: "This chip isn't linked to a token on-chain yet.",
      category: "nfc",
      recoverable: false,
    },
  ],
  [
    /chip.*missing|not configured/i,
    {
      message: "This artwork isn't set up for PBT yet.",
      category: "nfc",
      recoverable: false,
    },
  ],

  // Transaction errors
  [
    /insufficient funds|gas/i,
    {
      message: "Not enough funds to cover gas. Top up and try again.",
      category: "network",
      recoverable: true,
    },
  ],
  [
    /reverted|execution reverted/i,
    {
      message: "Transaction failed on-chain. Something's off.",
      category: "network",
      recoverable: true,
    },
  ],
];

const DEFAULT_ERROR: ParsedError = {
  message: "Something went sideways. Try again or hit up the intern.",
  category: "unknown",
  recoverable: true,
};

/**
 * Parse a raw error into a user-friendly message with metadata.
 * Matches against known patterns and returns casual, actionable messages.
 */
export function parseError(raw: unknown): ParsedError {
  if (!raw) return DEFAULT_ERROR;

  const str = raw instanceof Error ? raw.message : String(raw);

  for (const [pattern, result] of ERROR_PATTERNS) {
    if (pattern.test(str)) {
      return result;
    }
  }

  return DEFAULT_ERROR;
}
