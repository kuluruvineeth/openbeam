import type { NextConfig } from "next";

const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
const publicServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const internalServerUrl = process.env.SERVER_INTERNAL_URL || publicServerUrl;

const webHost = new URL(webUrl).hostname;
const serverHost = new URL(publicServerUrl).hostname;
const needsProxy = webHost !== serverHost;

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  output: "standalone",
  allowedDevOrigins: [webHost, serverHost].filter((h) => h !== "localhost"),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  rewrites: needsProxy
    ? () => [
        {
          source: "/api/trpc/:path*",
          destination: `${internalServerUrl}/trpc/:path*`,
        },
        {
          source: "/integrations/:path*",
          destination: `${internalServerUrl}/integrations/:path*`,
        },
      ]
    : undefined,
};

export default nextConfig;
