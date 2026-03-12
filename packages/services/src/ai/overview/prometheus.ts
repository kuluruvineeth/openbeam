import { Counter, Gauge, Histogram, Registry } from "prom-client";

let registry = new Registry();

function createMetrics(reg: Registry) {
  const requestsTotal = new Counter({
    name: "overview_requests_total",
    help: "Total number of AI overview requests",
    labelNames: ["status", "cache_hit", "model", "complexity"] as const,
    registers: [reg],
  });

  const latencyMs = new Histogram({
    name: "overview_latency_ms",
    help: "AI overview request latency in milliseconds",
    labelNames: ["model", "cache_hit", "complexity"] as const,
    buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000],
    registers: [reg],
  });

  const firstTokenLatencyMs = new Histogram({
    name: "overview_first_token_latency_ms",
    help: "Time to first token in milliseconds",
    labelNames: ["model", "complexity"] as const,
    buckets: [50, 100, 200, 300, 500, 1000, 2000],
    registers: [reg],
  });

  const semanticCacheHitRate = new Gauge({
    name: "overview_semantic_cache_hit_rate",
    help: "Semantic cache hit rate (0-1)",
    registers: [reg],
  });

  const searchCacheHitRate = new Gauge({
    name: "overview_search_cache_hit_rate",
    help: "Search cache hit rate (0-1)",
    registers: [reg],
  });

  const embeddingCacheHitRate = new Gauge({
    name: "overview_embedding_cache_hit_rate",
    help: "Embedding cache hit rate (0-1)",
    registers: [reg],
  });

  const tokensTotal = new Counter({
    name: "overview_tokens_total",
    help: "Total tokens used for overview generation",
    labelNames: ["model", "type"] as const,
    registers: [reg],
  });

  const groundingScore = new Histogram({
    name: "overview_grounding_score",
    help: "Distribution of grounding scores",
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
    registers: [reg],
  });

  const sourceCount = new Histogram({
    name: "overview_source_count",
    help: "Number of sources used per overview",
    buckets: [1, 2, 3, 4, 5, 6, 8, 10, 15, 20],
    registers: [reg],
  });

  return {
    requestsTotal,
    latencyMs,
    firstTokenLatencyMs,
    semanticCacheHitRate,
    searchCacheHitRate,
    embeddingCacheHitRate,
    tokensTotal,
    groundingScore,
    sourceCount,
  };
}

let metrics = createMetrics(registry);

export const overviewRequestsTotal = metrics.requestsTotal;
export const overviewLatencyMs = metrics.latencyMs;
export const overviewFirstTokenLatencyMs = metrics.firstTokenLatencyMs;
export const overviewSemanticCacheHitRate = metrics.semanticCacheHitRate;
export const overviewSearchCacheHitRate = metrics.searchCacheHitRate;
export const overviewEmbeddingCacheHitRate = metrics.embeddingCacheHitRate;
export const overviewTokensTotal = metrics.tokensTotal;
export const overviewGroundingScore = metrics.groundingScore;
export const overviewSourceCount = metrics.sourceCount;

interface RecordMetricsParams {
  status: "success" | "error" | "cached";
  cacheHit: boolean;
  model: string;
  complexity: string;
  latencyMs: number;
  firstTokenMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  groundingScore?: number;
  sourceCount?: number;
}

export function recordOverviewMetrics(params: RecordMetricsParams): void {
  const {
    status,
    cacheHit,
    model,
    complexity,
    latencyMs,
    firstTokenMs,
    promptTokens,
    completionTokens,
    groundingScore,
    sourceCount,
  } = params;

  const cacheHitLabel = cacheHit ? "true" : "false";

  metrics.requestsTotal.inc({
    status,
    cache_hit: cacheHitLabel,
    model,
    complexity,
  });

  metrics.latencyMs.observe(
    { model, cache_hit: cacheHitLabel, complexity },
    latencyMs
  );

  if (firstTokenMs !== undefined && !cacheHit) {
    metrics.firstTokenLatencyMs.observe({ model, complexity }, firstTokenMs);
  }

  if (promptTokens !== undefined && promptTokens > 0) {
    metrics.tokensTotal.inc({ model, type: "prompt" }, promptTokens);
  }

  if (completionTokens !== undefined && completionTokens > 0) {
    metrics.tokensTotal.inc({ model, type: "completion" }, completionTokens);
  }

  if (groundingScore !== undefined) {
    metrics.groundingScore.observe(groundingScore);
  }

  if (sourceCount !== undefined) {
    metrics.sourceCount.observe(sourceCount);
  }
}

export function updateCacheHitRates(rates: {
  semantic: number;
  search: number;
  embedding: number;
}): void {
  metrics.semanticCacheHitRate.set(rates.semantic);
  metrics.searchCacheHitRate.set(rates.search);
  metrics.embeddingCacheHitRate.set(rates.embedding);
}

export function getOverviewMetrics(): Promise<string> {
  return registry.metrics();
}

export function getOverviewRegistry(): Registry {
  return registry;
}

export function resetOverviewPrometheusMetrics(): void {
  registry = new Registry();
  metrics = createMetrics(registry);
}
