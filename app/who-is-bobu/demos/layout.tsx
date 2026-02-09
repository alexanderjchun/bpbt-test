import { Route } from "next";
import Link from "next/link";

const demos = [
  { href: "/who-is-bobu/demos/bg", label: "BG" },
  { href: "/who-is-bobu/demos/scroll", label: "Scroll" },
  { href: "/who-is-bobu/demos/fireflies", label: "Fireflies" },
  { href: "/who-is-bobu/demos/svg-frames", label: "SVG Frames" },
  { href: "/who-is-bobu/demos/pixel", label: "Img→Img" },
  { href: "/who-is-bobu/demos/grid", label: "Grid" },
  { href: "/who-is-bobu/demos/lines", label: "Lines" },
  { href: "/who-is-bobu/demos/glitch", label: "Glitch" },
];

export default function DemosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="fixed top-0 right-0 z-50 flex gap-1 p-2">
        {demos.map((d) => (
          <Link
            key={d.href}
            href={d.href as Route}
            className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
          >
            {d.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
