import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { galleryItems } from "../_components/gallery-data";

export function generateStaticParams() {
  return galleryItems.map((item) => ({ slug: item.slug }));
}

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = galleryItems.find((g) => g.slug === slug);

  if (!item) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#EBE8E2]">
      <header className="sticky top-0 z-20 border-b border-black/5 bg-[#EBE8E2]/80 px-6 py-5 backdrop-blur-sm">
        <Link
          href="/demo/gallery"
          className="text-sm font-light uppercase tracking-[0.3em] text-black/40 transition-colors hover:text-black"
        >
          &larr; Back to Gallery
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex flex-col gap-10">
          <div className="relative aspect-[3/2] w-full overflow-hidden">
            <Image
              src={item.src}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 896px) 100vw, 896px"
              unoptimized
            />
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-light uppercase tracking-[0.2em] text-black/40">
              {item.artist}
            </span>
            <h1 className="text-4xl font-light tracking-wide text-black/80">
              {item.title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed font-light text-black/50">
              {item.description}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
