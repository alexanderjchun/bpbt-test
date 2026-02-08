"use client";

import Article from "@/components/article";
import { Logo } from "@/components/logo";
import sakeAndADream from "@/public/art/sake-and-a-dream.png";
import Image from "next/image";
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
    <main className="relative">
      {!ready ? (
        <ViewTransition>
          <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
            <Logo className="mx-auto max-w-md" loading />
          </div>
        </ViewTransition>
      ) : (
        <ViewTransition>
          <Image
            className="absolute inset-0 h-[90svh] w-full object-contain object-right opacity-20 blur-md landscape:h-svh landscape:scale-150 landscape:object-[65%_70%]"
            src={sakeAndADream}
            alt="Sake and a Dream"
            placeholder="blur"
          />
          <Article className="relative z-10" />
        </ViewTransition>
      )}
    </main>
  );
}
