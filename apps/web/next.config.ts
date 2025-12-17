import type { NextConfig } from "next";

const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

// Proxy API requests when web and server are on different domains
const webHost = new URL(webUrl).hostname;
const serverHost = new URL(serverUrl).hostname;
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
        { source: "/api/trpc/:path*", destination: `${serverUrl}/trpc/:path*` },
        {
          source: "/integrations/:path*",
          destination: `${serverUrl}/integrations/:path*`,
        },
      ]
    : undefined,
};

export default nextConfig;
