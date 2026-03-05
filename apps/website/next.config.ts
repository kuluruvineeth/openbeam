import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: ["@openplane/ui"],
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    inlineCss: true,
    optimizePackageImports: ["motion", "@openplane/ui"],
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default config;
