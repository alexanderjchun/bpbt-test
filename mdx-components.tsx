import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

function Color({ hex }: { hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="size-16 rounded-lg border border-border"
        style={{ backgroundColor: hex }}
      />
      <span className="font-mono text-xs text-muted-foreground">{hex}</span>
    </div>
  );
}

export function getMDXComponents(
  components?: MDXComponents,
): MDXComponents {
  return {
    ...defaultMdxComponents,
    Color,
    ...components,
  };
}
