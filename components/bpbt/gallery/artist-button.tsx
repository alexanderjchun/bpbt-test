"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useActiveArtwork, useFlow } from "../context/art-context";

export function ArtistButton() {
  const artwork = useActiveArtwork();
  const { dispatch } = useFlow();
  const handleButtonClick = () => dispatch({ type: "drawer/open" });

  return (
    <Button
      onClick={handleButtonClick}
      className="fixed right-4 bottom-4 h-12 rounded-full bg-black pr-3 pl-2 font-black uppercase after:text-white/50 after:content-['//'] hover:bg-black/90"
    >
      <Avatar>
        <AvatarImage
          src={artwork.pfp}
          alt={artwork.artist}
          width={24}
          height={24}
        />
      </Avatar>
      {artwork.artist}
    </Button>
  );
}
