import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fontSans = localFont({
  src: [
    {
      path: "./fonts/mono.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/aileron-regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/aileron-bold.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/black.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sakeandadream.com"),
  alternates: {
    canonical: "https://www.sakeandadream.com",
  },
  title: "Sake and a Dream",
  description:
    "A gallery exhibition featuring Bobu, by •ᴅɢᴛʟ•(@dgtlemissions).",
  openGraph: {
    siteName: "Sake and a Dream",
    url: "https://www.sakeandadream.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} mx-auto max-w-480 font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
