import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { Button } from "./ui/button";

export default function Article({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto max-w-[1400px] px-4 py-12 font-sans leading-relaxed text-[#1a1a1a] md:px-8 md:py-16",
        className,
      )}
    >
      <header className="mb-8 flex justify-end gap-2 pb-8">
        <Button
          render={<Link href="/who-is-bobu" />}
          variant="link"
          nativeButton={false}
        >
          Who is Bobu?
        </Button>
        <Button render={<Link href="/gallery" />} nativeButton={false}>
          View Gallery
        </Button>
      </header>
      <section className="mb-24 grid grid-cols-1 gap-12 md:grid-cols-[2fr_1fr]">
        <div>
          <h1 className="mb-8 text-[clamp(3rem,8vw,6rem)] leading-[0.95] uppercase">
            <span className="tracking-tighter">Sake and</span>
            <br /> a Dream
          </h1>
          <p className="max-w-160 text-[clamp(1.25rem,2vw,1.75rem)] leading-normal font-light">
            An experiment featuring global artists who share a love for anime,
            sake, and Bobu.
          </p>
        </div>
        <div className="flex flex-col justify-end gap-4 text-sm font-light">
          <p className="text-[#737373]">Bobu Proposal #17</p>
          <Link
            href="https://x.com/dgtlemissions"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-70"
          >
            <span>By @dgtlemissions</span>
          </Link>
        </div>
      </section>

      <ViewTransition>
        <figure className="mb-24">
          <div className="mb-3 aspect-video overflow-hidden bg-black">
            <video
              className="block size-full object-cover"
              src="/opening-night.mp4"
              controls
            />
          </div>
          <figcaption className="text-xs tracking-wider">
            Opening Night — Zepster Gallery, Brooklyn, 2025
          </figcaption>
        </figure>
      </ViewTransition>

      <section className="mb-24 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_4fr_2fr] lg:gap-12">
        <div className="sticky top-8 self-start text-xs font-light tracking-[0.2em] uppercase">
          The Proposal
        </div>
        <div className="flex flex-col gap-6 text-lg leading-[1.8] font-light">
          <p className="text-2xl leading-relaxed text-[#262626]">
            On April 10th, 2025, a community member known as DGTL posted a
            thread that opened with a simple premise: Bobu, the collectively
            owned bean farmer born on the blockchain, deserved to exist on
            canvas.
          </p>
          <p>
            The idea was straightforward but ambitious. Curate ten artists from
            the Azuki community — painters, illustrators, people who grew up
            copying Dragon Ball characters in the margins of their school
            notebooks — and give each one a single brief: paint Bobu however you
            see him. Book a gallery in New York. Throw open the doors. Pour the
            sake.
          </p>
          <p>
            The proposal went to a community vote. It passed. By mid-July the
            paperwork was signed and the gallery was locked in: Zepster Gallery,
            Brooklyn. Opening night set for September 12th. What followed was
            six weeks of artist spotlights, studio visits, and a growing sense
            that something worth showing up for was actually going to happen.
          </p>
        </div>
        <aside className="bg-card/50 sticky top-8 self-start p-8 backdrop-blur-sm">
          <h3 className="mb-6 text-xs font-light tracking-[0.2em] uppercase">
            Exhibition Details
          </h3>
          <ul className="flex list-none flex-col gap-3 p-0">
            <li className="text-sm leading-relaxed font-light">
              Zepster Gallery, Brooklyn, NY
            </li>
            <li className="text-sm leading-relaxed font-light">
              September 12, 2025
            </li>
            <li className="text-sm leading-relaxed font-light">
              6 PM - 10 PM EST
            </li>
          </ul>
        </aside>
      </section>

      <section className="border-foreground/50 my-24 border-y py-24">
        <blockquote className="mx-auto max-w-240 text-[clamp(2rem,4vw,3rem)] leading-[1.3] font-light tracking-tight">
          &ldquo;Tonight is quiet. Tomorrow won&rsquo;t be. The Garden always
          shows out.&rdquo;
        </blockquote>
        <p className="mt-6 text-right text-sm font-light tracking-wider text-[#737373]">
          — DGTL, the night before opening
        </p>
      </section>

      <section className="mb-24 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_4fr] lg:gap-12">
        <div className="sticky top-8 self-start text-xs font-light tracking-[0.2em] uppercase">
          The Artists
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
          <div className="flex flex-col gap-6 text-base leading-[1.8] font-light">
            <p>
              The roster read like a cross-section of the community itself.
              Joshua, who started drawing Mask Rider heroes in the margins of
              his textbooks. Suki, who spent years secretly sketching between
              shifts. Jonathon Downing, who&rsquo;d sold out shows worldwide and
              worked alongside names like Virgil Abloh. Kat, who couldn&rsquo;t
              remember a time before crayons. Willem, a Dutch painter who walked
              away from art school just shy of graduating to paint full-time.
            </p>
            <p>
              Migrating Lines brought Dino, the alter ego he&rsquo;d been
              building since Saturday morning cartoons — the same artist whose
              work had appeared on PSG broadcasts and Champions League coverage.
              Take grew up on a diet of Dragon Ball, Godzilla, and Hideo Kojima.
              Ellie Ng and Timon YC I, a duo from Brooklyn, had shown everywhere
              from Artsy to New American Paintings. And YQ, one of the most
              beloved commission artists in the Garden, rounded out the ten.
            </p>
          </div>
          <div className="flex flex-col gap-6 text-base leading-[1.8] font-light">
            <p>
              Each artist received the same open brief. No style guide. No brand
              deck. Just Bobu, filtered through whatever lens felt honest. What
              came back were ten wildly different interpretations — proof that a
              character owned by everyone can mean something specific to each
              person who picks up a brush.
            </p>
            <p>
              On September 10th, two days before doors opened, Hypebeast and
              Hypeart ran the story. By the night of, the gallery was packed.
              DGTL had said no dress code, &ldquo;just don&rsquo;t show up
              naked.&rdquo; The stream went live on X for those who
              couldn&rsquo;t make it to Brooklyn. Five days later, every piece
              had sold. Proceeds went back to the Bobu treasury.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-24 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="aspect-3/4 overflow-hidden bg-linear-to-b from-[#e5e5e5] to-[#f5f5f5]">
          <Image
            className="block size-full object-cover brightness-[1.1] contrast-[0.85] grayscale"
            src="https://assets.codepen.io/406785/augustine-wong-oebTM5wHTfw-unsplash.jpg"
            alt="Exhibition installation view"
            width={400}
            height={533}
            unoptimized
          />
        </div>
        <div className="aspect-3/4 overflow-hidden bg-linear-to-b from-[#e5e5e5] to-[#fafafa]">
          <Image
            className="block size-full object-cover brightness-[1.1] contrast-[0.85] grayscale"
            src="https://assets.codepen.io/406785/h-co-3oOR7B2inwc-unsplash.jpg"
            alt="Gallery detail"
            width={400}
            height={533}
            unoptimized
          />
        </div>
        <div className="aspect-3/4 overflow-hidden bg-linear-to-b from-[#e5e5e5] to-[#f5f5f5]">
          <Image
            className="block size-full object-cover brightness-[1.1] contrast-[0.85] grayscale"
            src="https://assets.codepen.io/406785/bharath-kumar-rqIyJozwdTc-unsplash.jpg"
            alt="Opening night crowd"
            width={400}
            height={533}
            unoptimized
          />
        </div>
        <Link
          href="/docs/pbt"
          className="bg-card text-card-foreground hover:bg-accent/80 block border p-4 transition-colors"
        >
          PBT Documentation
        </Link>
        <Link
          href="/who-is-bobu"
          className="bg-card text-card-foreground hover:bg-accent/80 block border p-4 transition-colors"
        >
          Who is Bobu?
        </Link>
        <Link
          href="/gallery"
          className="bg-card text-card-foreground hover:bg-accent/80 block border p-4 transition-colors"
        >
          View Gallery
        </Link>
      </section>
    </div>
  );
}
