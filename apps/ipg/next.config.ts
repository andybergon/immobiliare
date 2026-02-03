import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ipg/db"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
