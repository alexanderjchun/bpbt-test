"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePBT } from "@/lib/hooks/use-pbt";
import { useState } from "react";

export default function PBTDemoPage() {
  const pbt = usePBT();
  const [digestInput, setDigestInput] = useState(
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  );

  const handleSign = async () => {
    if (!pbt.lastChipInfo) {
      // Need to scan first to get the public key
      const chipInfo = await pbt.getChipInfo();
      if (!chipInfo) return;

      // Now sign with the retrieved public key
      await pbt.signDigest(digestInput as `0x${string}`, chipInfo.publicKey, 1);
    } else {
      // Already have chip info, sign directly
      await pbt.signDigest(
        digestInput as `0x${string}`,
        pbt.lastChipInfo.publicKey,
        1,
      );
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">PBT Demo</h1>
        <p className="text-muted-foreground mt-2">
          Test the usePBT hook with a HaLo chip (works on iOS Safari + Android)
        </p>
      </div>

      {/* Support Status */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Support Status</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Supported:</span>
            {pbt.support.isSupported === null ? (
              <Badge variant="secondary">Checking...</Badge>
            ) : pbt.support.isSupported ? (
              <Badge variant="default" className="bg-green-600">
                Yes
              </Badge>
            ) : (
              <Badge variant="destructive">No</Badge>
            )}
          </div>
          {pbt.support.method && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Method:</span>
              <Badge variant="outline">{pbt.support.method}</Badge>
              <span className="text-muted-foreground text-xs">
                {pbt.support.method === "webnfc"
                  ? "(Android Chrome/Edge)"
                  : "(iOS Safari / Desktop)"}
              </span>
            </div>
          )}
          {pbt.support.reason && (
            <div className="text-muted-foreground text-sm">
              Reason: {pbt.support.reason}
            </div>
          )}
        </div>
      </Card>

      {/* Status */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Current Status</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <Badge
              variant={
                pbt.status === "idle"
                  ? "secondary"
                  : pbt.status === "scanning"
                    ? "default"
                    : "outline"
              }
            >
              {pbt.status}
            </Badge>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">Is Scanning:</span>
            <span>{pbt.isScanning ? "Yes" : "No"}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium">Is Signing:</span>
            <span>{pbt.isSigning ? "Yes" : "No"}</span>
          </div>
        </div>
      </Card>

      {/* Error Display */}
      {pbt.error && (
        <Card className="border-red-500 bg-red-50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="mb-2 text-xl font-semibold text-red-900">Error</h2>
              <p className="text-red-800">{pbt.error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={pbt.clearError}
              className="text-red-900"
            >
              Clear
            </Button>
          </div>
        </Card>
      )}

      {/* Scan Controls */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Read Chip Info</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Tap a HaLo chip to read its public keys and Ethereum addresses.
        </p>
        <Button
          onClick={pbt.getChipInfo}
          disabled={pbt.isScanning || pbt.isSigning}
        >
          {pbt.isScanning ? "Scanning..." : "Scan Chip"}
        </Button>
      </Card>

      {/* Last Chip Info */}
      {pbt.lastChipInfo && (
        <Card className="border-green-500 bg-green-50 p-6">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-xl font-semibold text-green-900">Chip Info</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={pbt.clearLastChipInfo}
              className="text-green-900"
            >
              Clear
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <span className="font-medium text-green-900">Chip ID:</span>
              <code className="mt-1 block overflow-x-auto rounded bg-white p-2 text-xs break-all">
                {pbt.lastChipInfo.chipId}
              </code>
            </div>
            <div>
              <span className="font-medium text-green-900">Public Key:</span>
              <code className="mt-1 block overflow-x-auto rounded bg-white p-2 text-xs break-all">
                {pbt.lastChipInfo.publicKey}
              </code>
            </div>
            <div>
              <span className="font-medium text-green-900">
                All Ether Addresses:
              </span>
              <div className="mt-1 space-y-1">
                {Object.entries(pbt.lastChipInfo.etherAddresses).map(
                  ([slot, addr]) => (
                    <code
                      key={slot}
                      className="block overflow-x-auto rounded bg-white p-2 text-xs break-all"
                    >
                      [{slot}] {addr}
                    </code>
                  ),
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sign Controls */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Sign Digest</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Sign a 32-byte digest with the HaLo chip. If no chip info is cached,
          this will first scan the chip.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Digest (0x-prefixed 32 bytes):
            </label>
            <Input
              value={digestInput}
              onChange={(e) => setDigestInput(e.target.value)}
              placeholder="0x..."
              className="font-mono text-xs"
            />
          </div>
          <Button
            onClick={handleSign}
            disabled={pbt.isScanning || pbt.isSigning}
          >
            {pbt.isSigning ? "Signing..." : "Sign Digest"}
          </Button>
        </div>
      </Card>

      {/* Last Signature */}
      {pbt.lastSignature && (
        <Card className="border-blue-500 bg-blue-50 p-6">
          <div className="mb-4 flex items-start justify-between">
            <h2 className="text-xl font-semibold text-blue-900">Signature</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={pbt.clearLastSignature}
              className="text-blue-900"
            >
              Clear
            </Button>
          </div>
          <code className="block overflow-x-auto rounded bg-white p-3 text-xs break-all">
            {pbt.lastSignature}
          </code>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-muted p-6">
        <h2 className="mb-2 text-xl font-semibold">Instructions</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>Click "Scan Chip" to read the chip's public keys</li>
          <li>Hold a HaLo chip near your device when prompted</li>
          <li>The chip info will appear once read</li>
          <li>Enter a digest and click "Sign Digest" to sign with the chip</li>
          <li>
            <strong>iOS:</strong> Uses WebAuthn (credential method)
          </li>
          <li>
            <strong>Android:</strong> Uses Web NFC (webnfc method)
          </li>
        </ol>
      </Card>
    </div>
  );
}
