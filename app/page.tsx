import { ArtProvider } from "../components/art-provider";
import { ArtistDrawer } from "../components/artist-drawer";
import Gallery from "../components/gallery";

export default function Page() {
  return (
    <ArtProvider>
      <main className="min-h-screen bg-white px-0.5 py-1">
        <h1 className="fade-in text-[16vw] leading-[0.85] text-black uppercase select-none xl:text-[6vw]">
          Sake and <br /> a Dream
        </h1>
        <Gallery />
        <ArtistDrawer />
      </main>
    </ArtProvider>
  );
}
