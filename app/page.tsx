"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import sakeAndADream from "@/public/art/sake-and-a-dream.png";
import { startTransition, useEffect, useState, ViewTransition } from "react";

const MIN_LOADING_MS = 1500;

export default function Home() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    document.fonts.ready.then(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_LOADING_MS - elapsed);

      timeoutId = setTimeout(() => {
        startTransition(() => setReady(true));
      }, remaining);
    });

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <main className="h-svh overflow-hidden">
      {!ready ? (
        <ViewTransition>
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
            <Logo className="mx-auto max-w-md" loading />
          </div>
        </ViewTransition>
      ) : (
        <ViewTransition>
          <div className="grid-stack h-svh place-items-start">
            <div className="z-1 space-y-3 self-end p-8">
              <h1 className="text-6xl leading-none uppercase lg:text-[min(8.5vw,128px)]/[1]">
                <span className="tracking-tighter">Sake and</span>
                <br /> a Dream
              </h1>
              <p className="text-lg text-black">
                An experiment featuring global artists who share a love for
                anime, sake, and Bobu.
              </p>
              <div className="flex gap-2">
                <Button render={<Link href="/gallery" />} nativeButton={false}>
                  View Gallery
                </Button>
                <Button
                  render={<Link href="/who-is-bobu" />}
                  variant="link"
                  nativeButton={false}
                >
                  Who is Bobu?
                </Button>
              </div>
            </div>
            <Image
              className="h-[90svh] w-full object-contain object-right opacity-80 blur-md landscape:h-svh landscape:scale-150 landscape:object-[65%_70%]"
              src={sakeAndADream}
              alt="Sake and a Dream"
              placeholder="blur"
            />
          </div>
        </ViewTransition>
      )}
    </main>
  );
}
