import { env } from "@/env";

export const webUrl = env.NEXT_PUBLIC_WEB_URL;
export const publicServerUrl = env.NEXT_PUBLIC_SERVER_URL;
export const internalServerUrl = env.SERVER_INTERNAL_URL || publicServerUrl;

const webHost = new URL(webUrl).hostname;
const serverHost = new URL(publicServerUrl).hostname;
export const isCrossSite = webHost !== serverHost;

export const needsProxy = isCrossSite;

export const baseUrl = needsProxy ? "" : publicServerUrl;
export const trpcUrl = needsProxy ? "/api/trpc" : `${publicServerUrl}/trpc`;
export const ssrTrpcUrl = `${internalServerUrl}/trpc`;
export const trpcSubscriptionUrl = needsProxy
  ? "/api/trpc"
  : `${publicServerUrl}/trpc`;

export const serverUrl = publicServerUrl;

export const corsOrigin = webUrl;
