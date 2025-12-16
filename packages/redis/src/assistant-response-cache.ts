import { cache } from "./cache";

export interface CachedAssistantResponse {
  query: string;
  answer: string;
  citations: Array<{
    title: string;
    url?: string;
    snippet?: string;
    connectorType?: string;
    sourceType?: "document" | "media";
  }>;
  confidence: number;
  sources: string[];
  isRetry?: boolean;
  teamId?: string;
  accessControlIds?: string[];
}

const ASSISTANT_RESPONSE_TTL = 1800; // 30 minutes

export function getAssistantResponseKey(
  teamId: string,
  channelId: string,
  userId: string
): string {
  return `assistant:response:${teamId}:${channelId}:${userId}:${Date.now()}`;
}

export async function cacheAssistantResponse(
  key: string,
  response: CachedAssistantResponse,
  ttl = ASSISTANT_RESPONSE_TTL
): Promise<void> {
  await cache.set(key, response, ttl);
}

export function getAssistantResponse(
  key: string
): Promise<CachedAssistantResponse | null> {
  return cache.get<CachedAssistantResponse>(key);
}
