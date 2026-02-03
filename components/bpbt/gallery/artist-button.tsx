"use client";

import { ARTWORK } from "@/components/bpbt/gallery/data";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useActiveArtworkId, useFlow } from "../context/art-context";

export function ArtistButton() {
  const id = useActiveArtworkId();
  const artwork = ARTWORK.find((a) => a.id === id);

  const { dispatch } = useFlow();
  const handleButtonClick = () => dispatch({ type: "drawer/open" });

  return (
    <Button
      onClick={handleButtonClick}
      className="fixed right-4 bottom-4 h-12 rounded-full bg-black pr-3 pl-2 font-black uppercase after:text-white/50 after:content-['//'] hover:bg-black/90"
    >
      <Avatar>
        <AvatarImage
          src={artwork?.pfp}
          alt={artwork?.artist}
          width={24}
          height={24}
        />
      </Avatar>
      {artwork?.artist}
    </Button>
  );
}
