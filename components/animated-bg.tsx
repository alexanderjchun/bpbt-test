"use client";

import { useEffect, useState } from "react";

export function AnimatedBg({
  children,
  from,
  to,
  className,
}: {
  children: React.ReactNode;
  from: string;
  to: string;
  className?: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setActive(true));
    return () => setActive(false);
  }, []);

  return (
    <div className={`${active ? to : from} ${className}`}>{children}</div>
  );
}
