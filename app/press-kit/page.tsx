"use client";

import { allPages } from "@/.content-collections/generated";
import { Bobutton } from "@/components/bobu/bobutton";
import Snapshot from "@/components/bobu/snapshot";

const orderedPages = [...allPages].sort((a, b) => a.order - b.order);

export default function Page() {
  return (
    <main className="mx-auto grid max-w-7xl grid-cols-12 space-y-3 p-3">
      <header className="col-span-12 flex items-end lg:col-span-10 lg:col-start-2">
        <div className="flex-1 py-12">
          <h1 className="text-3xl leading-none font-black tracking-tight uppercase sm:text-4xl">
            Bobu’s <span className="whitespace-nowrap">Visual Guide</span>
          </h1>
          <p className="mt-0.5 text-sm">
            A shared compass for keeping Bobu consistent across styles, media,
            and stories.
          </p>
        </div>
      </header>
      <div className="col-span-12 grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:col-span-10 lg:col-start-2">
        {orderedPages.map((page) => (
          <Bobutton
            key={page.slug}
            slug={page.slug}
            activeKey={page.order.toString()}
          >
            <h2 className="text-xl sm:text-2xl">{page.title}</h2>
            <p className="self-end truncate leading-none">{page.description}</p>
            <span className="display place-self-end text-xs">{page.order}</span>
          </Bobutton>
        ))}
      </div>
      <div className="col-span-12 lg:col-span-10 lg:col-start-2">
        <Snapshot />
      </div>
    </main>
  );
}

//           <div className="px-4 py-6 sm:px-6">
//             <div className="space-y-10">
//               <section className="space-y-3">
//                 <h2 className="text-lg font-semibold tracking-tight">
//                   Why This Guide?
//                 </h2>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu isn’t a typical character, but he shifts, evolves, breaks
//                   rules, and refuses to stay in one artistic box. This guide
//                   exists to help creators understand the spirit behind Bobu, so
//                   every depiction feels true to who he is—even when the style
//                   changes.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu’s world is playful, cosmic, and self-aware. To keep that
//                   energy consistent across illustrations, animations, merch, and
//                   storytelling, this guide highlights the essence that should
//                   always remain intact: his warmth, his humor, and his cosmic
//                   knack for not taking anything too seriously.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   This is not a rigid manual. It’s a compass shared with a
//                   understanding of the heart of Bobu.
//                 </p>
//               </section>

//               <div className="bg-border h-px w-full" />

//               <section className="space-y-3">
//                 <h2 className="text-lg font-semibold tracking-tight">
//                   The Spirit of Bobu
//                 </h2>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu is a whimsical god who never quite behaves like one. He’s
//                   as comfortable chatting with mortals over noodles as he is
//                   rearranging galaxies for fun. Wise but effortlessly
//                   down-to-earth, Bobu carries an ageless calm—the kind that
//                   makes you feel like everything is going to be okay, even when
//                   it’s obviously not.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   He’s carefree, grounded, and oddly relatable for a divine
//                   being. Everyone owns a little piece of him—a shared spark, a
//                   fragment of cosmic humor that connects all living things. Bobu
//                   doesn’t rule from above; he lives among, drifting through
//                   realities like a friendly neighbor who just happens to control
//                   space-time.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu breaks the fourth wall often, speaking directly to the
//                   audience as if you’ve known each other forever. He cracks
//                   jokes about his own lore, points out plot holes, and sometimes
//                   admits he doesn’t fully understand himself either. His honesty
//                   makes the absurd feel warm, human, and familiar.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu is the divine spark that keeps the universe from taking
//                   itself too seriously.
//                 </p>
//               </section>

//               <div className="bg-border h-px w-full" />

//               <section className="space-y-3">
//                 <h2 className="text-lg font-semibold tracking-tight">
//                   Bobu’s Character
//                 </h2>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu’s form is ever-changing. One day he’s a hand-drawn
//                   doodle, another day a chunky pixel sprite, or a painted mural
//                   glowing on a city wall. Bobu’s visual identity bends to the
//                   world around him—a multi-faceted embodiment of art itself.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   He’s carefree but thoughtful. Powerful but gentle. Chaotic yet
//                   comforting. His visuals may shift, but his presence never
//                   does: he’s approachable, joyful, and unbothered by cosmic
//                   responsibilities.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   When you create Bobu, you’re not just drawing a
//                   character—you’re channeling a feeling. A wink from the
//                   universe. A quiet nudge reminding us not to overcomplicate
//                   life.
//                 </p>
//                 <p className="text-muted-foreground leading-relaxed">
//                   Bobu’s character is a balance of humor, humility, and cosmic
//                   charm. No matter the medium or style, that’s the thread that
//                   should stay unbroken.
//                 </p>
//               </section>
//             </div>
//           </div>
