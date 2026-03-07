import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  trailingSlash: true,
  transpilePackages: ["@openbeam/ui"],
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    inlineCss: true,
    optimizePackageImports: ["motion", "@openbeam/ui"],
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200],
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  rewrites: async () => ({
    beforeFiles: [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ingest/decide",
        destination: "https://us.i.posthog.com/decide",
      },
    ],
    afterFiles: [],
    fallback: [],
  }),
  skipTrailingSlashRedirect: true,
};

export default config;
