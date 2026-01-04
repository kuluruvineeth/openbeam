export const TOOL_CACHE_TTL = 300;

export const DEFAULT_TOOL_TTLS: Record<string, number> = {
  search: 60,
  rag: 120,
  documents: 300,
  connectors: 600,
  data: 180,
  media: 600,
  browser: 60,
  action: 0,
  analysis: 120,
  integration: 180,
};

export const ToolCacheKeys = {
  toolResult: (teamId: string, toolName: string, hash: string) =>
    `tool:result:${teamId}:${toolName}:${hash}`,

  toolStats: (teamId: string, toolName: string) =>
    `tool:stats:${teamId}:${toolName}`,

  toolRateLimit: (teamId: string, toolName: string) =>
    `tool:ratelimit:${teamId}:${toolName}`,

  circuitBreakerState: (toolName: string) => `tool:circuit:${toolName}`,
};
