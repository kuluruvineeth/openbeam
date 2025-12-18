// URLs from environment
export const webUrl =
  process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
export const serverUrl =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

// Detect cross-site when web and server are on different domains
const webHost = new URL(webUrl).hostname;
const serverHost = new URL(serverUrl).hostname;
export const isCrossSite = webHost !== serverHost;

// Proxy API requests through Next.js when cross-site (handles cookies properly)
export const needsProxy = isCrossSite;

export const baseUrl = needsProxy ? "" : serverUrl;
export const trpcUrl = needsProxy ? "/api/trpc" : `${serverUrl}/trpc`;

// Legacy exports for backward compatibility
export const corsOrigin = webUrl;
