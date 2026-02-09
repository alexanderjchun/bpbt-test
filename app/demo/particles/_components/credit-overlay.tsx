import type { HTMLAttributes } from "react";

type CreditOverlayProps = HTMLAttributes<HTMLDivElement>;

export default function CreditOverlay({
  children,
  className = "",
  ...props
}: CreditOverlayProps) {
  return (
    <div
      className={`pointer-events-none fixed z-100 px-4 py-3 font-sans text-xs text-white sm:text-base ${className}`}
      {...props}
    >
      <div className="pointer-events-auto">{children}</div>
    </div>
  );
}
