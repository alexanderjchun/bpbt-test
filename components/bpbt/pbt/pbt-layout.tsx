import { cn } from "@/lib/utils";

// ============================================================================
// Hoisted Static Values (js-hoist-regexp)
// ============================================================================

const HYPHENATE_REGEX = /.{1,10}/g;

function hyphenateText(text: string): string {
  return text
    .split(" ")
    .map((word) =>
      word.length > 11 ? word.match(HYPHENATE_REGEX)?.join("-") || word : word,
    )
    .join(" ");
}

// ============================================================================
// Layout Components
// ============================================================================

export function View({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex w-80 flex-col gap-5 py-5 text-white", className)}>
      {children}
    </div>
  );
}

export function ViewHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("space-y-3 px-8", className)}>{children}</div>;
}

export function ViewHeading({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const processedChildren =
    typeof children === "string" ? hyphenateText(children) : children;

  return (
    <h2 className={cn("text-3xl leading-none font-black uppercase", className)}>
      {processedChildren}
    </h2>
  );
}

export function ViewDescription({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <p className={cn("text-sm font-light", className)}>{children}</p>;
}

export function ViewFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-2 px-6", className)}
    >
      {children}
    </div>
  );
}
