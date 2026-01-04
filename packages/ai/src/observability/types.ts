export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  cachePer1M?: number;
  reasoningPer1M?: number;
}

export interface UsageEvent {
  traceId: string;
  parentSpanId?: string;
  teamId: string;
  userId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  reasoningTokens?: number;
  latencyMs: number;
  firstTokenMs?: number;
  workflow?: string;
  feature?: string;
  operation?: string;
  success?: boolean;
  errorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface CostBreakdown {
  inputCostUsd: number;
  outputCostUsd: number;
  cacheCostUsd: number;
  totalCostUsd: number;
}

export interface UsageSummaryResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCostUsd: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  costByUser: Record<string, number>;
  costByWorkflow: Record<string, number>;
  avgLatencyMs: number;
}

export interface CacheMetricsData {
  kvCacheHits: number;
  kvCacheMisses: number;
  toolCacheHits: number;
  toolCacheMisses: number;
  tokensSaved: number;
  costSavedUsd: number;
}

export interface ToolUsageData {
  toolName: string;
  category: string;
  callCount: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
}

export interface MetricsRecordParams {
  provider: string;
  model: string;
  status: "success" | "error";
  workflow?: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  firstTokenMs?: number;
  costUsd: number;
  teamId: string;
}

export interface ToolMetricsParams {
  tool: string;
  category: string;
  status: "success" | "error";
  latencyMs: number;
}
