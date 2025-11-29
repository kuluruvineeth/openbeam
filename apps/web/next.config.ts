import type { NextConfig } from "next";

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3001";
const needsProxy =
  corsOrigin.startsWith("https://") && serverUrl.startsWith("http://");

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  output: "standalone",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  rewrites: needsProxy
    ? () => [
        { source: "/api/trpc/:path*", destination: `${serverUrl}/trpc/:path*` },
        {
          source: "/api/auth/:path*",
          destination: `${serverUrl}/api/auth/:path*`,
        },
        {
          source: "/integrations/:path*",
          destination: `${serverUrl}/integrations/:path*`,
        },
      ]
    : undefined,
};

export default nextConfig;
