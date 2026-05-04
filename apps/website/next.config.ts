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
  skipTrailingSlashRedirect: true,
  rewrites() {
    return Promise.resolve([
      {
        source: "/install.sh",
        destination:
          "https://raw.githubusercontent.com/kuluruvineeth/openbeam/dev/apps/cli/scripts/install.sh",
      },
      {
        source: "/install.ps1",
        destination:
          "https://raw.githubusercontent.com/kuluruvineeth/openbeam/dev/apps/cli/scripts/install.ps1",
      },
    ]);
  },
};

export default config;
