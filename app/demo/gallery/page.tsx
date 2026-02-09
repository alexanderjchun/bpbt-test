"use client";

import Link from "next/link";
import { galleryItems } from "./_components/gallery-data";
import { WebGLCanvas } from "./_components/webgl-canvas";

export default function GalleryPage() {
  return (
    <div className="relative min-h-screen bg-[#EBE8E2]">
      <WebGLCanvas />

      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#EBE8E2]/80 px-6 py-5 backdrop-blur-sm">
        <h1 className="text-sm font-light uppercase tracking-[0.3em]">
          Gallery
        </h1>
      </header>

      <main className="relative z-0 mx-auto max-w-5xl px-6 py-20">
        <div className="grid gap-32">
          {galleryItems.map((item, i) => (
            <Link
              key={item.slug}
              href={`/demo/gallery/${item.slug}`}
              className="group block"
            >
              <article
                className={`flex flex-col gap-8 ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden md:w-3/5">
                  {/* invisible image for layout — WebGL renders the visible version */}
                  <div
                    data-gallery-image={item.src}
                    className="h-full w-full bg-black/[0.03]"
                  />
                </div>

                <div className="flex flex-col gap-3 md:w-2/5">
                  <span className="text-xs font-light uppercase tracking-[0.2em] text-black/40">
                    {item.artist}
                  </span>
                  <h2 className="text-2xl font-light tracking-wide text-black/80 transition-colors group-hover:text-black">
                    {item.title}
                  </h2>
                  <p className="text-sm leading-relaxed font-light text-black/50">
                    {item.description}
                  </p>
                  <span className="mt-2 text-xs font-light uppercase tracking-[0.2em] text-black/30 transition-colors group-hover:text-black/60">
                    View work &rarr;
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-black/5 px-6 py-8 text-center">
        <p className="text-xs font-light uppercase tracking-[0.2em] text-black/30">
          Scroll-revealed WebGL Gallery Demo
        </p>
      </footer>
    </div>
  );
}
