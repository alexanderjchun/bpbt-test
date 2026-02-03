"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Route } from "next";
import Link from "next/link";
import type { DrawerView } from "../context/flow";
import { useActiveArtworkId, useFlow } from "../context/art-context";
import { parseError } from "../lib/errors";
import { useTokenMintStatus } from "../lib/use-token-mint-status";
import { AddressForm } from "../forms/address-form";
import { PBTIcon } from "./pbt-icon";
import {
  View,
  ViewDescription,
  ViewFooter,
  ViewHeader,
  ViewHeading,
} from "./pbt-layout";

export function PBTDefaultView({
  setView,
  title,
  artist,
  url,
}: {
  setView: (view: DrawerView) => void;
  title: string;
  artist: string;
  url: string;
}) {
  const artworkId = useActiveArtworkId();
  const { status: mintStatus } = useTokenMintStatus(artworkId);

  const isMinted = mintStatus === "minted";
  const isLoading = mintStatus === "loading";

  return (
    <View>
      <ViewHeader>
        <ViewHeading>{title}</ViewHeading>
        <p>
          By{" "}
          <Link
            href={url as Route}
            className="underline underline-offset-2"
            target="_blank"
          >
            {artist}
          </Link>
        </p>
        <Separator className="my-3" />
        <ViewDescription>
          Artwork owners can transfer or mint their PBTs by pressing the buttons
          below.
          <br />
        </ViewDescription>
      </ViewHeader>
      <ViewFooter>
        {isLoading ? (
          <div className="flex h-12 items-center justify-center font-light text-white/50">
            <Loader2 className="mr-2 inline size-4 -translate-y-px animate-spin" />
            Checking mint status...{" "}
          </div>
        ) : (
          <>
            <Button
              variant="gallery-outline"
              size="xl"
              className="flex-1"
              onClick={() => setView("transfer")}
              disabled={isLoading || !isMinted}
            >
              Transfer
            </Button>
            <Button
              variant="gallery"
              size="xl"
              className="flex-1"
              onClick={() => setView("mint")}
              disabled={isLoading || isMinted}
            >
              {isMinted ? "Minted" : "Mint"}
            </Button>
          </>
        )}
      </ViewFooter>
    </View>
  );
}

/**
 * Consolidated view for both transfer and mint address entry.
 */
export function PBTAddressView({
  setView,
  kind,
}: {
  setView: (view: DrawerView) => void;
  kind: "mint" | "transfer";
}) {
  const { state, dispatch } = useFlow();
  const artworkId = useActiveArtworkId();
  const { status: mintStatus } = useTokenMintStatus(artworkId);

  const isMint = kind === "mint";
  const isMinted = mintStatus === "minted";
  const isUnminted = mintStatus === "unminted";

  // Can't mint if already minted, can't transfer if not minted yet
  const isActionDisabled = isMint ? isMinted : isUnminted;
  const buttonLabel = isMint && isMinted ? "Already Minted" : "Scan PBT";

  return (
    <View>
      <ViewHeader>
        <ViewHeading>Destination Address?</ViewHeading>
        <Separator className="my-3" />
        <ViewDescription>
          Which wallet are we {isMint ? "minting" : "sending"} the PBT?
          <br />
          <span className="underline underline-offset-2">
            Any Ethereum address is valid.
          </span>
        </ViewDescription>
        <AddressForm
          onResolved={async (address) => {
            dispatch({ type: "address/resolved", value: address });
          }}
          onClear={() => dispatch({ type: "address/reset" })}
        />
      </ViewHeader>
      <ViewFooter>
        <Button
          size="icon-xl"
          variant="gallery-outline"
          onClick={() => {
            dispatch({ type: "address/reset" });
            dispatch({ type: "nfc/reset" });
            setView("default");
          }}
        >
          <ChevronLeft />
        </Button>
        <Button
          className="flex-1"
          size="xl"
          variant="gallery"
          onClick={() =>
            dispatch({
              type: "nfc/startScan",
              kind,
              to: state.address.resolved!,
            })
          }
          disabled={!state.address.resolved || isActionDisabled}
        >
          <PBTIcon className="mr-1" />
          {buttonLabel}
        </Button>
      </ViewFooter>
    </View>
  );
}

export function PBTPendingView({
  setView,
}: {
  setView: (view: DrawerView) => void;
}) {
  const { state, dispatch } = useFlow();
  const isScanning = state.nfc.status === "scanning";

  const heading = isScanning ? "Scanning PBT" : "Processing";
  const description = isScanning
    ? "Please tap your PBT chip to continue."
    : "Processing your request.";

  return (
    <View>
      <ViewHeader>
        <div className="flex items-center gap-2">
          <ViewHeading className="text-2xl">{heading}</ViewHeading>
          <Loader2 className="size-full animate-spin p-1.5" />
        </div>
        <Separator className="my-3" />
        <ViewDescription>{description}</ViewDescription>
      </ViewHeader>
      <ViewFooter>
        <Button
          onClick={() => {
            dispatch({ type: "nfc/reset" });
            dispatch({ type: "tx/reset" });
            setView("default");
          }}
          variant="gallery-outline"
          size="icon-xl"
          className="invisible"
        >
          <ChevronLeft />
        </Button>
      </ViewFooter>
    </View>
  );
}

export function PBTErrorView({
  setView,
}: {
  setView: (view: DrawerView) => void;
}) {
  const { state, dispatch } = useFlow();
  const rawError = state.tx.error || state.nfc.error;
  const { message, recoverable } = parseError(rawError);

  const handleReset = () => {
    dispatch({ type: "nfc/reset" });
    dispatch({ type: "tx/reset" });
    dispatch({ type: "address/reset" });
    setView("default");
  };

  return (
    <View>
      <ViewHeader>
        <div className="flex items-center justify-between gap-2">
          <ViewHeading>Oh Fuck!</ViewHeading>
          <p className="bg-white px-2 py-1 text-center text-3xl font-black text-black">
            500
          </p>
        </div>
        <Separator className="my-3" />
        <ViewDescription>{message}</ViewDescription>
      </ViewHeader>
      <ViewFooter>
        <Button
          render={<Link target="_blank" href="https://x.com/chun0069" />}
          nativeButton={false}
          variant="gallery"
          size="xl"
          className="flex-1"
        >
          Intern
        </Button>
        {recoverable && (
          <Button
            variant="gallery-outline"
            size="xl"
            className="flex-1"
            onClick={handleReset}
          >
            Try Again
          </Button>
        )}
      </ViewFooter>
    </View>
  );
}

export function PBTSuccessView() {
  const { state } = useFlow();
  const hash = state.tx.hash;
  return (
    <View>
      <ViewHeader>
        <ViewHeading>Transaction Successful</ViewHeading>
        <Separator className="my-3" />
        <ViewDescription>Your transfer has been confirmed.</ViewDescription>
      </ViewHeader>
      <ViewFooter>
        <Button
          variant="gallery"
          size="xl"
          className="gold-button flex-1"
          render={
            <Link target="_blank" href={`https://explorer.anime.xyz/tx/${hash}`} />
          }
          nativeButton={false}
        >
          View on AnimeChain
        </Button>
      </ViewFooter>
    </View>
  );
}
