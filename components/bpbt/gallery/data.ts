import type { StaticImageData } from "next/image";

import theGreatSakeWave from "@/public/art/the-great-sake-wave.jpg";
import aToastToTheBirthOfDreams from "@/public/art/a-toast-to-the-birth-of-dreams.jpg";
import firefliesAndBottles from "@/public/art/fireflies-and-bottles.jpg";
import flowerBirdsWindMoon from "@/public/art/flower-birds-wind-moon.jpg";
import oneForAll from "@/public/art/one-for-all.jpg";
import photosyntheticBeats from "@/public/art/photosynthetic-beats.jpg";
import takeThePhantomOfIdeals from "@/public/art/take-the-phantom-of-ideals.jpg";
import sipWithMe from "@/public/art/sip-with-me-ill-take-you-to-another-world.jpg";
import sakeAndDream from "@/public/art/sake-and-dream.jpg";
import sixDirections from "@/public/art/six-directions.jpg";
import bobuTown from "@/public/art/bobu-town.jpg";

export type ArtworkMeta = {
  id: number;
  title: string;
  artist: string;
  url: string;
  pfp: string;
  image: StaticImageData;
};

export const ARTWORK: ArtworkMeta[] = [
  {
    id: 1,
    title: "The Great Sake Wave",
    artist: "Yuka",
    url: "https://x.com/kamogawayuka",
    pfp: "/artists/yuka.png",
    image: theGreatSakeWave,
  },
  {
    id: 2,
    title: "A Toast to the Birth of Dreams",
    artist: "SUKIzweetsm",
    url: "https://x.com/sukizweetsm_eth",
    pfp: "/artists/sukizweetsm.png",
    image: aToastToTheBirthOfDreams,
  },
  {
    id: 3,
    title: "Fireflies and Bottles",
    artist: "Willem",
    url: "https://x.com/WJHoeffnagel",
    pfp: "/artists/willem.png",
    image: firefliesAndBottles,
  },
  {
    id: 4,
    title: "花鳥風月",
    artist: "YQ",
    url: "https://x.com/YQCre8",
    pfp: "/artists/yq.png",
    image: flowerBirdsWindMoon,
  },
  {
    id: 5,
    title: "One for All",
    artist: "Kat Pichik",
    url: "https://x.com/katpichik",
    pfp: "/artists/kat-pichik.png",
    image: oneForAll,
  },
  {
    id: 6,
    title: "Photosynthetic Beats",
    artist: "Jonathon Downing",
    url: "https://x.com/propaintpusher",
    pfp: "/artists/jonathon-downing.png",
    image: photosyntheticBeats,
  },
  {
    id: 7,
    title: "TAKE the Phantom of Ideals",
    artist: "TAKE",
    url: "https://x.com/TAKE_N1i",
    pfp: "/artists/take.png",
    image: takeThePhantomOfIdeals,
  },
  {
    id: 8,
    title: "Sip with Me, I'll Take You to Another World",
    artist: "SUKIzweetsm",
    url: "https://x.com/sukizweetsm_eth",
    pfp: "/artists/sukizweetsm.png",
    image: sipWithMe,
  },
  {
    id: 9,
    title: "Sake and Dream",
    artist: "Ellie Kayu Ng",
    url: "https://www.elliekayu.com/",
    pfp: "/artists/ellie-kayu-ng.png",
    image: sakeAndDream,
  },
  {
    id: 10,
    title: "Six Directions",
    artist: "Timon YC I",
    url: "https://timonii.com/",
    pfp: "/artists/timon-yc-i.png",
    image: sixDirections,
  },
  {
    id: 11,
    title: "Bobu Town",
    artist: "Yapable",
    url: "https://x.com/Joshuayapable",
    pfp: "/artists/yapable.png",
    image: bobuTown,
  },
];
