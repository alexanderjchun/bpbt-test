"use client";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/lib/hooks/use-copy-to-clipboard";

export function Color({ hex }: { hex: string }) {
  const [isCopied, copyToClipboard] = useCopyToClipboard();
  return (
    <Button
      onClick={() => copyToClipboard(hex)}
      className="aspect-video w-18 rounded-lg hover:cursor-copy"
      style={{ backgroundColor: hex }}
    >
      {isCopied && (
        <CheckIcon className="size-4 text-white opacity-0 mix-blend-difference transition-opacity duration-1000 starting:opacity-100" />
      )}
    </Button>
  );
}

function CheckIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 5 4" fill="currentColor">
      <rect x="1" y="3" width="1" height="1" />
      <polygon points="2 3 1 3 1 4 2 4 2 3 2 3" />
      <rect x="2" y="2" width="1" height="1" />
      <polygon points="3 2 2 2 2 3 3 3 3 2 3 2" />
      <rect x="3" y="1" width="1" height="1" />
      <polygon points="4 1 3 1 3 2 4 2 4 1 4 1" />
      <rect y="2" width="1" height="1" />
      <polygon points="1 2 0 2 0 3 1 3 1 2 1 2" />
      <rect x="4" width="1" height="1" />
      <polygon points="5 0 4 0 4 1 5 1 5 0 5 0" />
    </svg>
  );
}
