export type PixelEffect = "assemble" | "scatter" | "morph" | "hold" | "none";

export interface SectionData {
  id: string;
  heading: string | null;
  body: string | null;
  image: string | null;
  morphTo?: string;
  effect: PixelEffect;
  resolution?: number;
  scrollHeight?: number;
}

export const sections: SectionData[] = [
  {
    id: "hero",
    heading: "This is Bobu.",
    body: null,
    image: "/handsome-bobu.png",
    effect: "assemble",
    resolution: 64,
    scrollHeight: 2,
  },
  {
    id: "gallery",
    heading: "These are also Bobu.",
    body: "Bobu comes in all shapes and sizes.",
    image: "/gymbro-bobu.png",
    morphTo: "/sexy-bobu.png",
    effect: "morph",
    resolution: 64,
    scrollHeight: 2,
  },
  {
    id: "origin",
    heading: "In fact, Bobu started out as an NFT.",
    body: "1 of 10,000 Azuki.",
    image: "/cheers-bobu.png",
    effect: "assemble",
    resolution: 48,
    scrollHeight: 1.5,
  },
  {
    id: "fractionalization",
    heading: "Then, Bobu became 50,000 smaller Bobus.",
    body: "Split into fractional NFTs as part of an experiment on decentralized governance.",
    image: "/cheers-bobu.png",
    effect: "scatter",
    resolution: 64,
    scrollHeight: 2,
  },
  {
    id: "governance",
    heading: "The idea was simple.",
    body: "Take Bobu. Split him up. Sell the small Bobus. Put those funds into a treasury. Then Bobus propose how to spend it to spread the Bobu love.",
    image: null,
    effect: "none",
    scrollHeight: 1.5,
  },
  {
    id: "achievements",
    heading: "And that worked out pretty well.",
    body: "Bobu went to space. Bobu made some stuff. And maybe one day, Bobu meets Sydney Sweeney.",
    image: "/waifu-bobu.png",
    effect: "assemble",
    resolution: 64,
    scrollHeight: 2,
  },
  {
    id: "cta",
    heading: "We are Bobu.",
    body: "Ready to Bobu? Join us.",
    image: null,
    effect: "none",
    scrollHeight: 1,
  },
];
