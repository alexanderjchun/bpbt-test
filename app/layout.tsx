import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const fontSans = localFont({
  src: [
    {
      path: "./fonts/aileron/thin.woff",
      weight: "100",
      style: "normal",
    },
    {
      path: "./fonts/aileron/thin-italic.woff",
      weight: "100",
      style: "italic",
    },
    {
      path: "./fonts/aileron/ultra-light.woff",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/aileron/ultra-light-italic.woff",
      weight: "200",
      style: "italic",
    },
    {
      path: "./fonts/aileron/light.woff",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/aileron/light-italic.woff",
      weight: "300",
      style: "italic",
    },
    {
      path: "./fonts/aileron/regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/aileron/italic.woff",
      weight: "400",
      style: "italic",
    },
    {
      path: "./fonts/aileron/semi-bold.woff",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/aileron/semi-bold-italic.woff",
      weight: "500",
      style: "italic",
    },
    {
      path: "./fonts/aileron/bold.woff",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/aileron/bold-italic.woff",
      weight: "700",
      style: "italic",
    },
    {
      path: "./fonts/aileron/heavy.woff",
      weight: "800",
      style: "normal",
    },
    {
      path: "./fonts/aileron/heavy-italic.woff",
      weight: "800",
      style: "italic",
    },
    {
      path: "./fonts/aileron/black.woff",
      weight: "900",
      style: "normal",
    },
    {
      path: "./fonts/aileron/black-italic.woff",
      weight: "900",
      style: "italic",
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
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} flex min-h-screen flex-col font-sans antialiased`}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
