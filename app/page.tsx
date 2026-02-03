"use client";

import { ArtProvider } from "@/components/bpbt/context/art-context";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const MIN_LOADING_MS = 1500;

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [logoReveal, setLogoReveal] = useState<"in" | "out">("in");
  const [showNextContent, setShowNextContent] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Wait for fonts + minimum time
  useEffect(() => {
    const start = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    document.fonts.ready.then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

      timeoutId = setTimeout(() => {
        setLoading(false);
        setLogoReveal("out");
      }, remaining);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  // Wait for unreveal to complete, then show next content
  useEffect(() => {
    if (logoReveal !== "out" || !containerRef.current) return;

    Promise.allSettled(
      containerRef.current
        .getAnimations({ subtree: true })
        .map((a) => a.finished),
    ).then(() => {
      setShowNextContent(true);
    });
  }, [logoReveal]);

  return (
    <main className="h-svh overflow-hidden">
      {/* Loading logo overlay */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div ref={containerRef} data-reveal={logoReveal}>
          <Logo className="mx-auto max-w-md" loading={loading} />
        </div>
      </div>

      {/* TBD: Other components with their own reveals */}
      {showNextContent && (
        <ArtProvider>
          {/* <ArtGallery /> */}
          <Image
            data-reveal="in"
            className="absolute inset-0 size-full object-contain blur-md xl:object-[75%_50%]"
            src="/art/sake-and-a-dream.png"
            alt="Sake and a Dream"
            width={215}
            height={288}
          />
          {/* <ArtistButton /> */}
          <div
            data-reveal="in"
            className="grid size-full content-end px-6 pb-12"
          >
            <div className="space-y-3 p-4">
              <h1 className="text-6xl leading-none uppercase lg:text-[min(8.5vw,128px)]/[1]">
                <span className="tracking-tighter">Sake and</span>
                <br /> a Dream
              </h1>
              <p className="text-lg">
                A creative experiment featuring global artists who share a love
                for anime, sake, and Bobu.
              </p>
            </div>
            <div className="flex gap-2 px-3">
              <Button>View Gallery</Button>
              <Button
                render={<Link href="/who-is-bobu" />}
                variant="link"
                nativeButton={false}
              >
                Who is Bobu?
              </Button>
            </div>
          </div>
        </ArtProvider>
      )}
    </main>
  );
}
