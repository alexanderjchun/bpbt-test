"use client";

import { Button } from "@/components/ui/button";
import { useKeyPress } from "@/lib/use-key-press";
import { cn } from "@/lib/utils";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function Bobutton({
  slug,
  activeKey,
  className,
  children,
  ...props
}: ButtonPrimitive.Props & {
  slug: string;
  activeKey: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pressed, setPressed] = useState(false);
  useKeyPress(activeKey, (e) => {
    e.preventDefault();
    setPressed(true);
    setTimeout(() => {
      setPressed(false);
    }, 200);
    router.push(`/${slug}`);
  });
  return (
    <Button
      render={<Link href={`/${slug}`} />}
      nativeButton={false}
      variant="bobu"
      className={className}
      {...props}
    >
      <span
        className={cn(
          "bg-primary grid-stack hover:bg-accent size-full min-h-24 translate-y-[-6px] rounded-lg p-3 active:translate-y-0",
          pressed && "translate-y-0",
        )}
      >
        {children}
      </span>
    </Button>
  );
}
