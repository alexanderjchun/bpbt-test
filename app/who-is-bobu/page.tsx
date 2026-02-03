"use client";

import {
  ScrollCarousel,
  ScrollCarouselItem,
  ScrollReveal,
  ScrollRevealItem,
  StaggerContainer,
} from "@/components/scroll";
import { motion } from "motion/react";
import Image from "next/image";

export default function WhoIsBobuPage() {
  return (
    <main className="space-y-24 pb-24">
      {/* Hero Section - Bobu Introduction */}
      <section className="flex h-screen flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-6 px-4"
        >
          <h1 className="text-center text-4xl leading-none font-black sm:text-6xl md:text-7xl">
            This is Bobu.
          </h1>
          <Image
            src="/idle.gif"
            alt="Bobu"
            width={280}
            height={145}
            className="mx-auto"
            unoptimized
          />
        </motion.div>
      </section>

      {/* Gallery Section - Many Faces of Bobu */}
      <section className="flex flex-col items-center gap-8 px-4">
        <ScrollReveal variant="fade-up">
          <h2 className="text-center text-3xl leading-none font-black sm:text-4xl md:text-5xl">
            These are also Bobu.
          </h2>
        </ScrollReveal>

        <ScrollCarousel className="w-full" trackClassName="">
          <ScrollCarouselItem>
            <Image
              src="/gymbro-bobu.png"
              alt="Gymbro Bobu"
              width={467}
              height={470}
              className="h-64 w-auto rounded-lg sm:h-80 md:h-96"
            />
          </ScrollCarouselItem>
          <ScrollCarouselItem>
            <Image
              src="/sexy-bobu.png"
              alt="Sexy Bobu"
              width={467}
              height={468}
              className="h-64 w-auto rounded-lg sm:h-80 md:h-96"
            />
          </ScrollCarouselItem>
          <ScrollCarouselItem>
            <Image
              src="/handsome-bobu.png"
              alt="Handsome Bobu"
              width={218}
              height={218}
              className="h-64 w-auto rounded-lg sm:h-80 md:h-96"
            />
          </ScrollCarouselItem>
          <ScrollCarouselItem>
            <Image
              src="/cheers-bobu.png"
              alt="Cheers Bobu"
              width={512}
              height={497}
              className="h-64 w-auto rounded-lg sm:h-80 md:h-96"
            />
          </ScrollCarouselItem>
          <ScrollCarouselItem>
            <Image
              src="/waifu-bobu.png"
              alt="Waifu Bobu"
              width={3820}
              height={2160}
              className="h-64 w-auto rounded-lg sm:h-80 md:h-96"
            />
          </ScrollCarouselItem>
        </ScrollCarousel>

        <ScrollReveal variant="fade-up">
          <h2 className="text-center text-3xl leading-none font-black sm:text-4xl md:text-5xl">
            Bobu comes in all shapes and sizes.
          </h2>
        </ScrollReveal>
      </section>

      {/* Story Section 1 - NFT Origin */}
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              In fact, Bobu started out as an NFT.
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={0.15}>
            <p className="text-muted-foreground text-xl sm:text-2xl">
              1 of 10,000 Azuki.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story Section 2 - Fractional Experiment */}
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="scale">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              Then, Bobu became many smaller NFTs called fractional NFTs.
            </h2>
          </ScrollReveal>
        </div>
      </section>

      {/* Story Section 3 - Community Participation */}
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="fade-up">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              It was all part of an experiment on decentralized governance.
            </h2>
          </ScrollReveal>
          <ScrollReveal variant="fade-up" delay={0.15}>
            <p className="text-muted-foreground text-xl sm:text-2xl">
              The idea was simple:
            </p>
          </ScrollReveal>

          <StaggerContainer
            staggerDelay={0.15}
            className="w-full max-w-xl space-y-6 text-left"
          >
            <ScrollRevealItem variant="fade-up">
              <div className="flex items-start gap-4">
                <span className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  1
                </span>
                <p className="pt-1 text-lg sm:text-xl">We take our guy, Bobu</p>
              </div>
            </ScrollRevealItem>
            <ScrollRevealItem variant="fade-up">
              <div className="flex items-start gap-4">
                <span className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  2
                </span>
                <p className="pt-1 text-lg sm:text-xl">
                  Split him into 50,000 smaller Bobus
                </p>
              </div>
            </ScrollRevealItem>
            <ScrollRevealItem variant="fade-up">
              <div className="flex items-start gap-4">
                <span className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  3
                </span>
                <p className="pt-1 text-lg sm:text-xl">Sell the small Bobus</p>
              </div>
            </ScrollRevealItem>
            <ScrollRevealItem variant="fade-up">
              <div className="flex items-start gap-4">
                <span className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  4
                </span>
                <p className="pt-1 text-lg sm:text-xl">
                  Put those funds into a treasury
                </p>
              </div>
            </ScrollRevealItem>
            <ScrollRevealItem variant="fade-up">
              <div className="flex items-start gap-4">
                <span className="bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold">
                  5
                </span>
                <p className="pt-1 text-lg sm:text-xl">
                  Bobus then propose how to spend the treasury to spread the
                  Bobu love
                </p>
              </div>
            </ScrollRevealItem>
          </StaggerContainer>
        </div>
      </section>

      {/* Story Section 4 - Achievements */}
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-8">
          <ScrollReveal variant="blur">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              And that worked out pretty well so far.
            </h2>
          </ScrollReveal>

          <StaggerContainer staggerDelay={0.2} className="space-y-4">
            <ScrollRevealItem variant="fade-left">
              <p className="text-xl sm:text-2xl">
                🚀 <strong>Here&apos;s Bobu going to space.</strong>
              </p>
            </ScrollRevealItem>
            <ScrollRevealItem variant="fade-right">
              <p className="text-xl sm:text-2xl">
                🃏 <strong>Bobu made some stuff.</strong>
              </p>
            </ScrollRevealItem>
            <ScrollRevealItem variant="fade-left">
              <p className="text-muted-foreground text-xl sm:text-2xl">
                💫 Here&apos;s him meeting Sydney Sweeney{" "}
                <span className="text-sm">
                  (okay, not yet... but maybe the right Bobu could make it
                  happen!)
                </span>
              </p>
            </ScrollRevealItem>
          </StaggerContainer>
        </div>
      </section>

      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="scale">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              There&apos;s also all this other stuff.
            </h2>
          </ScrollReveal>
        </div>
      </section>
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="scale">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              And yeah... we are Bobu.
            </h2>
          </ScrollReveal>
        </div>
      </section>
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="scale">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              Do you know how we can meet Sydney Sweeney and are ready to Bobu?
            </h2>
          </ScrollReveal>
        </div>
      </section>
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="scale">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              Join us!
            </h2>
          </ScrollReveal>
        </div>
      </section>
      <section className="flex flex-col items-center px-4 text-center">
        <div className="flex max-w-3xl flex-col items-center gap-6">
          <ScrollReveal variant="scale">
            <h2 className="text-3xl leading-tight font-black sm:text-4xl md:text-5xl">
              If your just curious and want to know more, here&apos;s some
              links.
            </h2>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
