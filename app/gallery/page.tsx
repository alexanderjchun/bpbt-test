import { ArtProvider } from "@/components/bpbt/context/art-context";
import { ArtGallery } from "@/components/bpbt/gallery/art-gallery";
import { ArtistButton } from "@/components/bpbt/gallery/artist-button";
import { PBTDrawer } from "@/components/bpbt/pbt/pbt-drawer";

export default function GalleryPage() {
  return (
    <ArtProvider>
      <main className="h-svh overflow-hidden">
        <ArtGallery />
        <ArtistButton />
        <PBTDrawer />
      </main>
    </ArtProvider>
  );
}
