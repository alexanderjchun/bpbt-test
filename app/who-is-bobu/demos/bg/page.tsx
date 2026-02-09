"use client";

import { useEffect, useRef } from "react";

/**
 * Sets the page background color with a CSS transition.
 * Call it again with a different color and it just transitions.
 */
function setBg(el: HTMLElement, color: string, duration = "1.5s") {
  el.style.transition = `background-color ${duration} ease-in-out`;
  el.style.backgroundColor = color;
}

export default function BgDemo() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const main = ref.current;
    if (!main) return;

    // Scene 1: fade to purple
    setBg(main, "#403e52");

    // Scene 3 example: after 3s, transition to dark blue
    const t = setTimeout(() => setBg(main, "#1a1a2e"), 3000);

    return () => clearTimeout(t);
  }, []);

  return <main ref={ref} className="h-screen" />;
}
