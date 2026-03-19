import type { NextConfig } from "next";

const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
const publicServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const internalServerUrl = process.env.SERVER_INTERNAL_URL || publicServerUrl;

const webHost = new URL(webUrl).hostname;
const serverHost = new URL(publicServerUrl).hostname;
const needsProxy = webHost !== serverHost;

const nextConfig: NextConfig = {
  transpilePackages: [
    "three",
    "@openbeam/spatial-core",
    "@openbeam/spatial-viewer",
    "@openbeam/spatial-editor",
  ],
  typescript: {
    ignoreBuildErrors: process.env.DOCKER_BUILD === "1",
  },
  typedRoutes: true,
  reactCompiler: true,
  output: "standalone",
  allowedDevOrigins: [webHost, serverHost].filter((h) => h !== "localhost"),
  images: {
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
    afterFiles: needsProxy
      ? [
          {
            source: "/integrations/:path*",
            destination: `${internalServerUrl}/integrations/:path*`,
          },
        ]
      : [],
    fallback: [],
  }),
};

export default nextConfig;
