import { defineChain } from "viem";

export const animechain = defineChain({
  id: 69000,
  name: "AnimeChain",
  nativeCurrency: {
    decimals: 18,
    name: "Anime",
    symbol: "ANIME",
  },
  rpcUrls: {
    default: {
      http: ["https://anime-mainnet.g.alchemy.com/v2/xtKrm0bA0HNvgFzXpmAYj"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://explorer.anime.xyz/" },
  },
});

export const testnet = defineChain({
  id: 6900,
  name: "AnimeChain",
  nativeCurrency: {
    decimals: 18,
    name: "Anime",
    symbol: "ANIME",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.anime.xyz/"],
      webSocket: ["wss://testnet-rpc.anime.xyz/"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://testnet-explorer.anime.xyz/" },
  },
});
