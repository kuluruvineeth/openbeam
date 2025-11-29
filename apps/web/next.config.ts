import type { NextConfig } from "next";
import { needsProxy, serverUrl } from "@/lib/urls";

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
