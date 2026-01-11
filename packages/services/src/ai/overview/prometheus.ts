import { Counter, Gauge, Histogram, Registry } from "prom-client";

const registry = new Registry();

export const overviewRequestsTotal = new Counter({
  name: "overview_requests_total",
  help: "Total number of AI overview requests",
  labelNames: ["status", "cache_hit", "model", "complexity"] as const,
  registers: [registry],
});

export const overviewLatencyMs = new Histogram({
  name: "overview_latency_ms",
  help: "AI overview request latency in milliseconds",
  labelNames: ["model", "cache_hit", "complexity"] as const,
  buckets: [50, 100, 200, 300, 500, 1000, 2000, 5000],
  registers: [registry],
});

export const overviewFirstTokenLatencyMs = new Histogram({
  name: "overview_first_token_latency_ms",
  help: "Time to first token in milliseconds",
  labelNames: ["model", "complexity"] as const,
  buckets: [50, 100, 200, 300, 500, 1000, 2000],
  registers: [registry],
});

export const overviewSemanticCacheHitRate = new Gauge({
  name: "overview_semantic_cache_hit_rate",
  help: "Semantic cache hit rate (0-1)",
  registers: [registry],
});

export const overviewSearchCacheHitRate = new Gauge({
  name: "overview_search_cache_hit_rate",
  help: "Search cache hit rate (0-1)",
  registers: [registry],
});

export const overviewEmbeddingCacheHitRate = new Gauge({
  name: "overview_embedding_cache_hit_rate",
  help: "Embedding cache hit rate (0-1)",
  registers: [registry],
});

export const overviewTokensTotal = new Counter({
  name: "overview_tokens_total",
  help: "Total tokens used for overview generation",
  labelNames: ["model", "type"] as const,
  registers: [registry],
});

export const overviewGroundingScore = new Histogram({
  name: "overview_grounding_score",
  help: "Distribution of grounding scores",
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [registry],
});

export const overviewSourceCount = new Histogram({
  name: "overview_source_count",
  help: "Number of sources used per overview",
  buckets: [1, 2, 3, 4, 5, 6, 8, 10, 15, 20],
  registers: [registry],
});

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

  overviewRequestsTotal.inc({
    status,
    cache_hit: cacheHitLabel,
    model,
    complexity,
  });

  overviewLatencyMs.observe(
    { model, cache_hit: cacheHitLabel, complexity },
    latencyMs
  );

  if (firstTokenMs !== undefined && !cacheHit) {
    overviewFirstTokenLatencyMs.observe({ model, complexity }, firstTokenMs);
  }

  if (promptTokens !== undefined && promptTokens > 0) {
    overviewTokensTotal.inc({ model, type: "prompt" }, promptTokens);
  }

  if (completionTokens !== undefined && completionTokens > 0) {
    overviewTokensTotal.inc({ model, type: "completion" }, completionTokens);
  }

  if (groundingScore !== undefined) {
    overviewGroundingScore.observe(groundingScore);
  }

  if (sourceCount !== undefined) {
    overviewSourceCount.observe(sourceCount);
  }
}

export function updateCacheHitRates(rates: {
  semantic: number;
  search: number;
  embedding: number;
}): void {
  overviewSemanticCacheHitRate.set(rates.semantic);
  overviewSearchCacheHitRate.set(rates.search);
  overviewEmbeddingCacheHitRate.set(rates.embedding);
}

export function getOverviewMetrics(): Promise<string> {
  return registry.metrics();
}

export function getOverviewRegistry(): Registry {
  return registry;
}

export function resetOverviewPrometheusMetrics(): void {
  registry.resetMetrics();
}
