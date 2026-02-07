import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactCompiler: true,
  typedRoutes: true,
  images: {
    qualities: [75, 100],
  },
  experimental: {
    browserDebugInfoInTerminal: true,
  },
};

const withMDX = createMDX({
  configPath: "source.config.ts",
});

export default withMDX(nextConfig);
