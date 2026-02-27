export const webUrl =
  process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3001";
export const publicServerUrl =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
export const internalServerUrl =
  process.env.SERVER_INTERNAL_URL || publicServerUrl;

const webHost = new URL(webUrl).hostname;
const serverHost = new URL(publicServerUrl).hostname;
export const isCrossSite = webHost !== serverHost;

export const needsProxy = isCrossSite;

export const baseUrl = needsProxy ? "" : publicServerUrl;
export const trpcUrl = needsProxy ? "/api/trpc" : `${publicServerUrl}/trpc`;

export const serverUrl = publicServerUrl;

export const corsOrigin = webUrl;
