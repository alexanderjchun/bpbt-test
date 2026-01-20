import FirefliesCanvas from "@/components/fireflies-canvas";
import type { Metadata } from "next";
import localFont from "next/font/local";

const fontSans = localFont({
  src: [
    {
      path: "../fonts/pixter-display.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/pixter-display-bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../fonts/levelup.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Bobu's Visual Guide",
  description:
    "A shared compass for keeping Bobu consistent across styles, media, and stories.",
};

export default function PressKitLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className={`${fontSans.variable} font-sans antialiased`}>
      <FirefliesCanvas className="pixelated pointer-events-none fixed inset-0 isolate -z-10" />
      {children}
    </main>
  );
}
