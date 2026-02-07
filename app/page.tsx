"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
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
    <main className="">
      {!ready ? (
        <ViewTransition>
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
            <Logo className="mx-auto max-w-md" loading />
          </div>
        </ViewTransition>
      ) : (
        <ViewTransition>
          <div className="grid size-full grid-cols-1 grid-rows-5 lg:grid-cols-2">
            <Image
              className="animate-float col-span-1 row-span-4 aspect-square size-full place-self-stretch object-contain object-[100%_50%] blur-md lg:col-start-2 lg:row-span-full lg:object-cover lg:object-[50%_60%]"
              src="/art/sake-and-a-dream.png"
              alt="Sake and a Dream"
              width={215}
              height={288}
            />
            <div className="col-span-1 row-span-1 space-y-3 p-4 lg:row-span-full lg:self-end">
              <h1 className="text-6xl leading-none uppercase lg:text-[min(8.5vw,128px)]/[1]">
                <span className="tracking-tighter">Sake and</span>
                <br /> a Dream
              </h1>
              <p className="text-lg">
                A creative experiment featuring global artists who share a love
                for anime, sake, and Bobu.
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
          </div>
        </ViewTransition>
      )}
    </main>
  );
}
