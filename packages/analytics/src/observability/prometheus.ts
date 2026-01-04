type LabelValues = Record<string, string>;

interface CounterConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

interface HistogramConfig {
  name: string;
  help: string;
  labelNames?: string[];
  buckets?: number[];
}

interface GaugeConfig {
  name: string;
  help: string;
  labelNames?: string[];
}

interface Counter {
  inc(labels?: LabelValues, value?: number): void;
  inc(value?: number): void;
}

interface Histogram {
  observe(labels: LabelValues, value: number): void;
  observe(value: number): void;
  startTimer(labels?: LabelValues): () => number;
}

interface Gauge {
  set(labels: LabelValues, value: number): void;
  set(value: number): void;
  inc(labels?: LabelValues, value?: number): void;
  dec(labels?: LabelValues, value?: number): void;
}

interface MetricsAdapter {
  createCounter(config: CounterConfig): Counter;
  createHistogram(config: HistogramConfig): Histogram;
  createGauge(config: GaugeConfig): Gauge;
  getMetrics(): Promise<string>;
}

function createNoopMetrics(): MetricsAdapter {
  const noopCounter: Counter = {
    inc: (): void => {
      return;
    },
  };

  const noopHistogram: Histogram = {
    observe: (): void => {
      return;
    },
    startTimer: () => (): number => 0,
  };

  const noopGauge: Gauge = {
    set: (): void => {
      return;
    },
    inc: (): void => {
      return;
    },
    dec: (): void => {
      return;
    },
  };

  return {
    createCounter: () => noopCounter,
    createHistogram: () => noopHistogram,
    createGauge: () => noopGauge,
    getMetrics: async () => "",
  };
}

let metricsAdapter: MetricsAdapter = createNoopMetrics();

export function setMetricsAdapter(adapter: MetricsAdapter): void {
  metricsAdapter = adapter;
}

const DEFAULT_LATENCY_BUCKETS = [
  5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10_000,
];

export const aiMetrics = {
  requestsTotal: metricsAdapter.createCounter({
    name: "ai_requests_total",
    help: "Total AI API requests",
    labelNames: ["provider", "model", "status", "workflow"],
  }),

  requestDurationMs: metricsAdapter.createHistogram({
    name: "ai_request_duration_ms",
    help: "AI request latency in milliseconds",
    labelNames: ["provider", "model", "workflow"],
    buckets: DEFAULT_LATENCY_BUCKETS,
  }),

  inputTokensTotal: metricsAdapter.createCounter({
    name: "ai_input_tokens_total",
    help: "Total input tokens consumed",
    labelNames: ["provider", "model"],
  }),

  outputTokensTotal: metricsAdapter.createCounter({
    name: "ai_output_tokens_total",
    help: "Total output tokens generated",
    labelNames: ["provider", "model"],
  }),

  cachedTokensTotal: metricsAdapter.createCounter({
    name: "ai_cached_tokens_total",
    help: "Total cached tokens used",
    labelNames: ["provider", "model"],
  }),

  estimatedCostUsd: metricsAdapter.createCounter({
    name: "ai_estimated_cost_usd",
    help: "Estimated cost in USD",
    labelNames: ["provider", "model", "team_id"],
  }),

  errorsTotal: metricsAdapter.createCounter({
    name: "ai_errors_total",
    help: "Total AI API errors",
    labelNames: ["provider", "model", "error_code"],
  }),

  timeToFirstTokenMs: metricsAdapter.createHistogram({
    name: "ai_time_to_first_token_ms",
    help: "Time to first token in milliseconds",
    labelNames: ["provider", "model"],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000],
  }),

  tokensPerSecond: metricsAdapter.createHistogram({
    name: "ai_tokens_per_second",
    help: "Token generation rate",
    labelNames: ["provider", "model"],
    buckets: [10, 25, 50, 100, 150, 200, 300, 500],
  }),
};

export const toolMetrics = {
  callsTotal: metricsAdapter.createCounter({
    name: "ai_tool_calls_total",
    help: "Total tool calls",
    labelNames: ["tool", "status"],
  }),

  durationMs: metricsAdapter.createHistogram({
    name: "ai_tool_duration_ms",
    help: "Tool execution latency",
    labelNames: ["tool"],
    buckets: DEFAULT_LATENCY_BUCKETS,
  }),
};

export const ragMetrics = {
  queriesTotal: metricsAdapter.createCounter({
    name: "rag_queries_total",
    help: "Total RAG queries",
    labelNames: ["status", "query_intent"],
  }),

  retrievalDurationMs: metricsAdapter.createHistogram({
    name: "rag_retrieval_duration_ms",
    help: "Retrieval latency",
    labelNames: [],
    buckets: [10, 25, 50, 100, 200, 500],
  }),

  chunkingDurationMs: metricsAdapter.createHistogram({
    name: "rag_chunking_duration_ms",
    help: "Chunking latency",
    labelNames: [],
    buckets: [5, 10, 25, 50, 100],
  }),

  generationDurationMs: metricsAdapter.createHistogram({
    name: "rag_generation_duration_ms",
    help: "Generation latency",
    labelNames: [],
    buckets: [100, 250, 500, 1000, 2000, 5000],
  }),

  documentsRetrieved: metricsAdapter.createHistogram({
    name: "rag_documents_retrieved",
    help: "Documents retrieved per query",
    labelNames: [],
    buckets: [1, 5, 10, 20, 50, 100],
  }),

  groundingScore: metricsAdapter.createHistogram({
    name: "rag_grounding_score",
    help: "Grounding score distribution",
    labelNames: [],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  }),

  feedbackScore: metricsAdapter.createHistogram({
    name: "rag_feedback_score",
    help: "User feedback score distribution",
    labelNames: ["feedback_type"],
    buckets: [-1, 0, 1],
  }),
};

export const searchMetrics = {
  queriesTotal: metricsAdapter.createCounter({
    name: "search_queries_total",
    help: "Total search queries",
    labelNames: ["search_type", "entry_point", "has_results"],
  }),

  latencyMs: metricsAdapter.createHistogram({
    name: "search_latency_ms",
    help: "Search latency",
    labelNames: ["search_type"],
    buckets: [10, 25, 50, 100, 200, 500, 1000],
  }),

  resultCount: metricsAdapter.createHistogram({
    name: "search_result_count",
    help: "Results per query",
    labelNames: [],
    buckets: [0, 1, 5, 10, 20, 50, 100],
  }),

  clickPosition: metricsAdapter.createHistogram({
    name: "search_click_position",
    help: "Position of clicked results",
    labelNames: [],
    buckets: [1, 2, 3, 5, 10, 20, 50],
  }),

  satisfactionScore: metricsAdapter.createHistogram({
    name: "search_satisfaction_score",
    help: "User satisfaction score",
    labelNames: [],
    buckets: [1, 2, 3, 4, 5],
  }),

  zeroResultsTotal: metricsAdapter.createCounter({
    name: "search_zero_results_total",
    help: "Queries with no results",
    labelNames: [],
  }),

  mrr: metricsAdapter.createHistogram({
    name: "search_mrr",
    help: "Mean Reciprocal Rank",
    labelNames: [],
    buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  }),
};

export const circuitBreakerMetrics = {
  state: metricsAdapter.createGauge({
    name: "ai_circuit_breaker_state",
    help: "Circuit breaker state (0=closed, 1=half-open, 2=open)",
    labelNames: ["provider"],
  }),

  tripsTotal: metricsAdapter.createCounter({
    name: "ai_circuit_breaker_trips_total",
    help: "Circuit breaker trip count",
    labelNames: ["provider"],
  }),
};

export interface AIRequestMetrics {
  provider: string;
  model: string;
  workflow: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  durationMs: number;
  timeToFirstTokenMs?: number;
  success: boolean;
  errorCode?: string;
  teamId?: string;
  estimatedCostUsd?: number;
}

export function recordAIRequest(metrics: AIRequestMetrics): void {
  const labels = {
    provider: metrics.provider,
    model: metrics.model,
    workflow: metrics.workflow,
  };

  aiMetrics.requestsTotal.inc({
    ...labels,
    status: metrics.success ? "success" : "error",
  });

  aiMetrics.requestDurationMs.observe(labels, metrics.durationMs);
  aiMetrics.inputTokensTotal.inc(
    { provider: metrics.provider, model: metrics.model },
    metrics.inputTokens
  );
  aiMetrics.outputTokensTotal.inc(
    { provider: metrics.provider, model: metrics.model },
    metrics.outputTokens
  );

  if (metrics.cachedTokens) {
    aiMetrics.cachedTokensTotal.inc(
      { provider: metrics.provider, model: metrics.model },
      metrics.cachedTokens
    );
  }

  if (metrics.estimatedCostUsd) {
    aiMetrics.estimatedCostUsd.inc(
      {
        provider: metrics.provider,
        model: metrics.model,
        team_id: metrics.teamId ?? "unknown",
      },
      metrics.estimatedCostUsd
    );
  }

  if (metrics.timeToFirstTokenMs) {
    aiMetrics.timeToFirstTokenMs.observe(
      { provider: metrics.provider, model: metrics.model },
      metrics.timeToFirstTokenMs
    );
  }

  if (metrics.outputTokens > 0 && metrics.durationMs > 0) {
    const tokensPerSec = (metrics.outputTokens / metrics.durationMs) * 1000;
    aiMetrics.tokensPerSecond.observe(
      { provider: metrics.provider, model: metrics.model },
      tokensPerSec
    );
  }

  if (!metrics.success && metrics.errorCode) {
    aiMetrics.errorsTotal.inc({
      provider: metrics.provider,
      model: metrics.model,
      error_code: metrics.errorCode,
    });
  }
}

export interface ToolCallMetrics {
  tool: string;
  durationMs: number;
  success: boolean;
}

export function recordToolCall(metrics: ToolCallMetrics): void {
  toolMetrics.callsTotal.inc({
    tool: metrics.tool,
    status: metrics.success ? "success" : "error",
  });
  toolMetrics.durationMs.observe({ tool: metrics.tool }, metrics.durationMs);
}

export interface RAGQueryMetrics {
  queryIntent?: string;
  retrievalMs: number;
  chunkingMs: number;
  generationMs: number;
  documentsRetrieved: number;
  groundingScore?: number;
  success: boolean;
}

export function recordRAGQuery(metrics: RAGQueryMetrics): void {
  ragMetrics.queriesTotal.inc({
    status: metrics.success ? "success" : "error",
    query_intent: metrics.queryIntent ?? "unknown",
  });
  ragMetrics.retrievalDurationMs.observe(metrics.retrievalMs);
  ragMetrics.chunkingDurationMs.observe(metrics.chunkingMs);
  ragMetrics.generationDurationMs.observe(metrics.generationMs);
  ragMetrics.documentsRetrieved.observe(metrics.documentsRetrieved);

  if (metrics.groundingScore !== undefined) {
    ragMetrics.groundingScore.observe(metrics.groundingScore);
  }
}

export interface SearchQueryMetrics {
  searchType: "semantic" | "keyword" | "hybrid";
  entryPoint: string;
  latencyMs: number;
  resultCount: number;
}

export function recordSearchQuery(metrics: SearchQueryMetrics): void {
  searchMetrics.queriesTotal.inc({
    search_type: metrics.searchType,
    entry_point: metrics.entryPoint,
    has_results: metrics.resultCount > 0 ? "true" : "false",
  });
  searchMetrics.latencyMs.observe(
    { search_type: metrics.searchType },
    metrics.latencyMs
  );
  searchMetrics.resultCount.observe(metrics.resultCount);

  if (metrics.resultCount === 0) {
    searchMetrics.zeroResultsTotal.inc();
  }
}

export function recordSearchClick(position: number): void {
  searchMetrics.clickPosition.observe(position);
  searchMetrics.mrr.observe(1 / position);
}

export function recordSearchSatisfaction(score: number): void {
  searchMetrics.satisfactionScore.observe(score);
}

export function getMetricsOutput(): Promise<string> {
  return metricsAdapter.getMetrics();
}
