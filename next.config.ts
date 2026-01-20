import { withContentCollections } from "@content-collections/next";
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

export default withContentCollections(nextConfig);
