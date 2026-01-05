import type { CircuitBreakerState, MetricLabels } from "./types";

export interface DuckDBMetricsSnapshot {
  queriesTotal: Map<string, number>;
  queryDurations: number[];
  activeConnections: number;
  queueDepth: number;
  cacheHits: number;
  cacheMisses: number;
  circuitBreakerState: CircuitBreakerState;
  memoryUsageBytes: number;
}

export class MetricsCollector {
  private readonly queriesTotal = new Map<string, number>();
  private queryDurations: number[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private activeConnections = 0;
  private queueDepth = 0;
  private circuitBreakerState: CircuitBreakerState = "CLOSED";
  private memoryUsageBytes = 0;

  recordQuery(labels: MetricLabels, durationMs: number): void {
    const key = `${labels.teamId}:${labels.operation}:${labels.status}`;
    const current = this.queriesTotal.get(key) ?? 0;
    this.queriesTotal.set(key, current + 1);
    this.queryDurations.push(durationMs);

    if (this.queryDurations.length > 1000) {
      this.queryDurations.shift();
    }
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  setActiveConnections(count: number): void {
    this.activeConnections = count;
  }

  setQueueDepth(depth: number): void {
    this.queueDepth = depth;
  }

  setCircuitBreakerState(state: CircuitBreakerState): void {
    this.circuitBreakerState = state;
  }

  setMemoryUsage(bytes: number): void {
    this.memoryUsageBytes = bytes;
  }

  getP50Latency(): number {
    if (this.queryDurations.length === 0) {
      return 0;
    }
    const sorted = [...this.queryDurations].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  }

  getP95Latency(): number {
    if (this.queryDurations.length === 0) {
      return 0;
    }
    const sorted = [...this.queryDurations].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)] ?? 0;
  }

  getP99Latency(): number {
    if (this.queryDurations.length === 0) {
      return 0;
    }
    const sorted = [...this.queryDurations].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.99)] ?? 0;
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    if (total === 0) {
      return 0;
    }
    return this.cacheHits / total;
  }

  getTotalQueries(): number {
    let total = 0;
    for (const count of this.queriesTotal.values()) {
      total += count;
    }
    return total;
  }

  getErrorRate(): number {
    let errors = 0;
    let total = 0;
    for (const [key, count] of this.queriesTotal) {
      total += count;
      if (key.endsWith(":error") || key.endsWith(":timeout")) {
        errors += count;
      }
    }
    if (total === 0) {
      return 0;
    }
    return errors / total;
  }

  getSnapshot(): DuckDBMetricsSnapshot {
    return {
      queriesTotal: new Map(this.queriesTotal),
      queryDurations: [...this.queryDurations],
      activeConnections: this.activeConnections,
      queueDepth: this.queueDepth,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      circuitBreakerState: this.circuitBreakerState,
      memoryUsageBytes: this.memoryUsageBytes,
    };
  }

  toPrometheusFormat(): string {
    const lines: string[] = [];

    lines.push("# HELP duckdb_queries_total Total number of DuckDB queries");
    lines.push("# TYPE duckdb_queries_total counter");
    for (const [key, value] of this.queriesTotal) {
      const parts = key.split(":");
      if (parts.length >= 3) {
        const [teamId, operation, status] = parts;
        lines.push(
          `duckdb_queries_total{team_id="${teamId}",operation="${operation}",status="${status}"} ${value}`
        );
      }
    }

    lines.push("");
    lines.push(
      "# HELP duckdb_query_duration_ms Query duration in milliseconds"
    );
    lines.push("# TYPE duckdb_query_duration_ms summary");
    lines.push(
      `duckdb_query_duration_ms{quantile="0.5"} ${this.getP50Latency()}`
    );
    lines.push(
      `duckdb_query_duration_ms{quantile="0.95"} ${this.getP95Latency()}`
    );
    lines.push(
      `duckdb_query_duration_ms{quantile="0.99"} ${this.getP99Latency()}`
    );

    lines.push("");
    lines.push("# HELP duckdb_cache_hit_rate Cache hit rate");
    lines.push("# TYPE duckdb_cache_hit_rate gauge");
    lines.push(`duckdb_cache_hit_rate ${this.getCacheHitRate().toFixed(4)}`);

    lines.push("");
    lines.push("# HELP duckdb_cache_hits_total Total cache hits");
    lines.push("# TYPE duckdb_cache_hits_total counter");
    lines.push(`duckdb_cache_hits_total ${this.cacheHits}`);

    lines.push("");
    lines.push("# HELP duckdb_cache_misses_total Total cache misses");
    lines.push("# TYPE duckdb_cache_misses_total counter");
    lines.push(`duckdb_cache_misses_total ${this.cacheMisses}`);

    lines.push("");
    lines.push("# HELP duckdb_active_connections Number of active connections");
    lines.push("# TYPE duckdb_active_connections gauge");
    lines.push(`duckdb_active_connections ${this.activeConnections}`);

    lines.push("");
    lines.push("# HELP duckdb_queue_depth Number of queries in queue");
    lines.push("# TYPE duckdb_queue_depth gauge");
    lines.push(`duckdb_queue_depth ${this.queueDepth}`);

    lines.push("");
    lines.push(
      "# HELP duckdb_circuit_breaker_state Circuit breaker state (0=closed, 1=half-open, 2=open)"
    );
    lines.push("# TYPE duckdb_circuit_breaker_state gauge");
    const stateValueMap: Record<CircuitBreakerState, number> = {
      CLOSED: 0,
      HALF_OPEN: 1,
      OPEN: 2,
    };
    const stateValue = stateValueMap[this.circuitBreakerState];
    lines.push(`duckdb_circuit_breaker_state ${stateValue}`);

    lines.push("");
    lines.push("# HELP duckdb_memory_usage_bytes Memory usage in bytes");
    lines.push("# TYPE duckdb_memory_usage_bytes gauge");
    lines.push(`duckdb_memory_usage_bytes ${this.memoryUsageBytes}`);

    return lines.join("\n");
  }

  reset(): void {
    this.queriesTotal.clear();
    this.queryDurations = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

let globalMetricsCollector: MetricsCollector | null = null;

export function getMetricsCollector(): MetricsCollector {
  if (!globalMetricsCollector) {
    globalMetricsCollector = new MetricsCollector();
  }
  return globalMetricsCollector;
}

export function resetMetricsCollector(): void {
  globalMetricsCollector = null;
}
