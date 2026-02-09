"use client";

import dynamic from "next/dynamic";

const ShatterScene = dynamic(
  () => import("./_components/shatter-scene"),
  { ssr: false },
);

export default function ShatterDemoPage() {
  return (
    <div className="h-dvh w-screen bg-black">
      <ShatterScene />
    </div>
  );
}
