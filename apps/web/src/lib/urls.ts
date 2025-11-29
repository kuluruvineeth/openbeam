export const corsOrigin =
  process.env.NEXT_PUBLIC_CORS_ORIGIN || "http://localhost:3001";
export const serverUrl =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
export const needsProxy =
  corsOrigin.startsWith("https://") && serverUrl.startsWith("http://");
export const baseUrl = needsProxy ? "" : serverUrl;
export const trpcUrl = needsProxy ? "/api/trpc" : `${serverUrl}/trpc`;
