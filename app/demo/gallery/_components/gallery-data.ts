export interface GalleryItem {
  slug: string;
  title: string;
  artist: string;
  src: string;
  description: string;
}

export const galleryItems: GalleryItem[] = [
  {
    slug: "ethereal-light",
    title: "Ethereal Light",
    artist: "Mia Chen",
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
    description:
      "A study of light diffusing through mountain fog at dawn, capturing the fleeting moments where the landscape dissolves into atmosphere.",
  },
  {
    slug: "urban-geometry",
    title: "Urban Geometry",
    artist: "Luca Moretti",
    src: "https://images.unsplash.com/photo-1494526585095-c41746248156?w=800&q=80",
    description:
      "Architectural forms intersect in this exploration of urban space, revealing the hidden patterns within the built environment.",
  },
  {
    slug: "still-waters",
    title: "Still Waters",
    artist: "Yuki Tanaka",
    src: "https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&q=80",
    description:
      "Reflections on a perfectly still lake create a mirror world, blurring the boundary between reality and its double.",
  },
  {
    slug: "golden-hour",
    title: "Golden Hour",
    artist: "Sofia Alvarez",
    src: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80",
    description:
      "The last rays of sunlight paint the valley in warm gold, a daily spectacle that never repeats exactly the same way twice.",
  },
  {
    slug: "concrete-dreams",
    title: "Concrete Dreams",
    artist: "Henrik Larsson",
    src: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80",
    description:
      "Brutalist architecture rendered in soft light, challenging our assumptions about the relationship between material and mood.",
  },
  {
    slug: "forest-canopy",
    title: "Forest Canopy",
    artist: "Anya Petrova",
    src: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80",
    description:
      "Looking upward through ancient trees, the canopy fragments the sky into a living stained glass window of green and blue.",
  },
  {
    slug: "desert-silence",
    title: "Desert Silence",
    artist: "Karim Hassan",
    src: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80",
    description:
      "The vast emptiness of the desert speaks volumes. Sand dunes stretch to the horizon in an endless conversation with the wind.",
  },
  {
    slug: "night-bloom",
    title: "Night Bloom",
    artist: "Iris Nakamura",
    src: "https://images.unsplash.com/photo-1462275646964-a0e3c11f18a6?w=800&q=80",
    description:
      "Flowers captured in the deep blue light of twilight, their colors muted but their forms intensified by the fading day.",
  },
];
