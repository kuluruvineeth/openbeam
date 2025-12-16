import { cache } from "./cache";

export interface SidebarThreadContext {
  channelId: string;
  threadTs: string;
  userId: string;
  contextChannelId?: string;
  contextTeamId?: string;
  connectorId: string;
  teamId: string;
}

const SIDEBAR_CONTEXT_TTL = 86_400; // 24 hours

export function getSidebarContextKey(
  channelId: string,
  threadTs: string
): string {
  return `sidebar:context:${channelId}:${threadTs}`;
}

export async function cacheSidebarContext(
  key: string,
  context: SidebarThreadContext,
  ttl = SIDEBAR_CONTEXT_TTL
): Promise<void> {
  await cache.set(key, context, ttl);
}

export function getSidebarContext(
  key: string
): Promise<SidebarThreadContext | null> {
  return cache.get<SidebarThreadContext>(key);
}

export async function deleteSidebarContext(key: string): Promise<void> {
  await cache.del(key);
}
