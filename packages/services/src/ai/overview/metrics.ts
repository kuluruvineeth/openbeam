import { logger } from "../../lib/logger";

interface RequestData {
  latencyMs: number;
  semanticCacheHit: boolean;
  embeddingCacheHits: number;
  searchCacheHits: number;
  modelUsed: string;
  teamId: string;
  complexity?: string;
}

interface OverviewMetrics {
  totalRequests: number;
  semanticCacheHits: number;
  semanticCacheHitRate: number;
  embeddingCacheHits: number;
  searchCacheHits: number;
  modelUsage: Record<string, number>;
  avgLatency: number;
  p50Latency: number;
  p99Latency: number;
}

export class OverviewMetricsCollector {
  private latencies: number[] = [];
  private totalRequests = 0;
  private semanticCacheHits = 0;
  private embeddingCacheHits = 0;
  private searchCacheHits = 0;
  private modelUsage: Record<string, number> = {};

  private readonly maxLatencyEntries: number;

  constructor(maxLatencyEntries = 10_000) {
    this.maxLatencyEntries = maxLatencyEntries;
  }

  record(data: RequestData): void {
    this.totalRequests += 1;

    if (data.semanticCacheHit) {
      this.semanticCacheHits += 1;
    }
    this.embeddingCacheHits += data.embeddingCacheHits;
    this.searchCacheHits += data.searchCacheHits;
    this.modelUsage[data.modelUsed] =
      (this.modelUsage[data.modelUsed] || 0) + 1;

    this.latencies.push(data.latencyMs);
    if (this.latencies.length > this.maxLatencyEntries) {
      this.latencies.shift();
    }

    logger.info({
      event: "overview_request",
      latencyMs: data.latencyMs,
      semanticCacheHit: data.semanticCacheHit,
      embeddingCacheHits: data.embeddingCacheHits,
      searchCacheHits: data.searchCacheHits,
      modelUsed: data.modelUsed,
      teamId: data.teamId,
      complexity: data.complexity,
      cacheHitRates: this.getCacheHitRates(),
    });
  }

  private getCacheHitRates(): Record<string, number> {
    if (this.totalRequests === 0) {
      return { semantic: 0, embedding: 0, search: 0 };
    }

    return {
      semantic: this.semanticCacheHits / this.totalRequests,
      embedding: this.embeddingCacheHits / this.totalRequests,
      search: this.searchCacheHits / this.totalRequests,
    };
  }

  getMetrics(): OverviewMetrics {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);

    return {
      totalRequests: this.totalRequests,
      semanticCacheHits: this.semanticCacheHits,
      semanticCacheHitRate:
        this.totalRequests > 0
          ? this.semanticCacheHits / this.totalRequests
          : 0,
      embeddingCacheHits: this.embeddingCacheHits,
      searchCacheHits: this.searchCacheHits,
      modelUsage: { ...this.modelUsage },
      avgLatency: sorted.length > 0 ? sum / sorted.length : 0,
      p50Latency: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
      p99Latency: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
    };
  }

  reset(): void {
    this.latencies = [];
    this.totalRequests = 0;
    this.semanticCacheHits = 0;
    this.embeddingCacheHits = 0;
    this.searchCacheHits = 0;
    this.modelUsage = {};
  }

  toPrometheusFormat(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    lines.push(
      "# HELP overview_requests_total Total number of AI overview requests"
    );
    lines.push("# TYPE overview_requests_total counter");
    lines.push(`overview_requests_total ${metrics.totalRequests}`);

    lines.push(
      "# HELP overview_semantic_cache_hits_total Total semantic cache hits"
    );
    lines.push("# TYPE overview_semantic_cache_hits_total counter");
    lines.push(
      `overview_semantic_cache_hits_total ${metrics.semanticCacheHits}`
    );

    lines.push(
      "# HELP overview_semantic_cache_hit_rate Semantic cache hit rate"
    );
    lines.push("# TYPE overview_semantic_cache_hit_rate gauge");
    lines.push(
      `overview_semantic_cache_hit_rate ${metrics.semanticCacheHitRate.toFixed(4)}`
    );

    lines.push(
      "# HELP overview_embedding_cache_hits_total Total embedding cache hits"
    );
    lines.push("# TYPE overview_embedding_cache_hits_total counter");
    lines.push(
      `overview_embedding_cache_hits_total ${metrics.embeddingCacheHits}`
    );

    lines.push(
      "# HELP overview_search_cache_hits_total Total search cache hits"
    );
    lines.push("# TYPE overview_search_cache_hits_total counter");
    lines.push(`overview_search_cache_hits_total ${metrics.searchCacheHits}`);

    lines.push(
      "# HELP overview_latency_avg_ms Average latency in milliseconds"
    );
    lines.push("# TYPE overview_latency_avg_ms gauge");
    lines.push(`overview_latency_avg_ms ${metrics.avgLatency.toFixed(2)}`);

    lines.push(
      "# HELP overview_latency_p50_ms 50th percentile latency in milliseconds"
    );
    lines.push("# TYPE overview_latency_p50_ms gauge");
    lines.push(`overview_latency_p50_ms ${metrics.p50Latency.toFixed(2)}`);

    lines.push(
      "# HELP overview_latency_p99_ms 99th percentile latency in milliseconds"
    );
    lines.push("# TYPE overview_latency_p99_ms gauge");
    lines.push(`overview_latency_p99_ms ${metrics.p99Latency.toFixed(2)}`);

    lines.push("# HELP overview_model_usage Model usage by model ID");
    lines.push("# TYPE overview_model_usage counter");
    for (const [modelId, count] of Object.entries(metrics.modelUsage)) {
      lines.push(`overview_model_usage{model="${modelId}"} ${count}`);
    }

    return lines.join("\n");
  }
}

let metricsCollectorInstance: OverviewMetricsCollector | null = null;

export function getOverviewMetricsCollector(): OverviewMetricsCollector {
  if (!metricsCollectorInstance) {
    metricsCollectorInstance = new OverviewMetricsCollector();
  }
  return metricsCollectorInstance;
}

export function resetOverviewMetricsCollector(): void {
  metricsCollectorInstance = null;
}
