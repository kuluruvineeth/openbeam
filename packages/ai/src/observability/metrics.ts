import { Counter, Gauge, Histogram, Registry } from "prom-client";
import type { MetricsRecordParams, ToolMetricsParams } from "./types";

export const aiMetricsRegistry = new Registry();

aiMetricsRegistry.setDefaultLabels({
  app: "openplane",
});

const requestsTotal = new Counter({
  name: "openplane_ai_requests_total",
  help: "Total AI requests",
  labelNames: ["provider", "model", "status", "workflow"] as const,
  registers: [aiMetricsRegistry],
});

const tokensTotal = new Counter({
  name: "openplane_ai_tokens_total",
  help: "Total tokens processed",
  labelNames: ["provider", "model", "type"] as const,
  registers: [aiMetricsRegistry],
});

const costUsd = new Counter({
  name: "openplane_ai_cost_usd_total",
  help: "Total AI cost in USD",
  labelNames: ["provider", "model", "team_id"] as const,
  registers: [aiMetricsRegistry],
});

const latencyMs = new Histogram({
  name: "openplane_ai_latency_ms",
  help: "AI request latency in milliseconds",
  labelNames: ["provider", "model", "workflow"] as const,
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 10_000, 30_000],
  registers: [aiMetricsRegistry],
});

const firstTokenLatencyMs = new Histogram({
  name: "openplane_ai_first_token_latency_ms",
  help: "Time to first token in milliseconds",
  labelNames: ["provider", "model"] as const,
  buckets: [50, 100, 250, 500, 1000, 2500, 5000],
  registers: [aiMetricsRegistry],
});

const cacheHitRate = new Gauge({
  name: "openplane_ai_cache_hit_rate",
  help: "KV cache hit rate",
  labelNames: ["team_id"] as const,
  registers: [aiMetricsRegistry],
});

const toolCallsTotal = new Counter({
  name: "openplane_ai_tool_calls_total",
  help: "Total tool calls",
  labelNames: ["tool", "category", "status"] as const,
  registers: [aiMetricsRegistry],
});

const toolLatencyMs = new Histogram({
  name: "openplane_ai_tool_latency_ms",
  help: "Tool execution latency in milliseconds",
  labelNames: ["tool", "category"] as const,
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500],
  registers: [aiMetricsRegistry],
});

const circuitBreakerState = new Gauge({
  name: "openplane_ai_circuit_breaker_state",
  help: "Circuit breaker state (0=closed, 0.5=half-open, 1=open)",
  labelNames: ["provider"] as const,
  registers: [aiMetricsRegistry],
});

const activeBackgroundAgents = new Gauge({
  name: "openplane_ai_background_agents_active",
  help: "Number of active background agents",
  labelNames: ["team_id", "preset"] as const,
  registers: [aiMetricsRegistry],
});

const backgroundAgentDurationMs = new Histogram({
  name: "openplane_ai_background_agent_duration_ms",
  help: "Background agent total duration in milliseconds",
  labelNames: ["preset", "status"] as const,
  buckets: [60_000, 300_000, 600_000, 1_800_000, 3_600_000],
  registers: [aiMetricsRegistry],
});

const skillLoadTime = new Histogram({
  name: "openplane_ai_skill_load_time_ms",
  help: "Skill loading time in milliseconds",
  labelNames: ["skill_name", "category"] as const,
  buckets: [10, 25, 50, 100, 250, 500],
  registers: [aiMetricsRegistry],
});

const loadedSkillsCount = new Gauge({
  name: "openplane_ai_loaded_skills_count",
  help: "Number of currently loaded skills",
  labelNames: ["team_id"] as const,
  registers: [aiMetricsRegistry],
});

export const aiMetrics = {
  requestsTotal,
  tokensTotal,
  costUsd,
  latencyMs,
  firstTokenLatencyMs,
  cacheHitRate,
  toolCallsTotal,
  toolLatencyMs,
  circuitBreakerState,
  activeBackgroundAgents,
  backgroundAgentDurationMs,
  skillLoadTime,
  loadedSkillsCount,
};

export function recordAIRequest(params: MetricsRecordParams): void {
  const workflowLabel = params.workflow ?? "unknown";

  requestsTotal.inc({
    provider: params.provider,
    model: params.model,
    status: params.status,
    workflow: workflowLabel,
  });

  tokensTotal.inc(
    { provider: params.provider, model: params.model, type: "input" },
    params.inputTokens
  );

  tokensTotal.inc(
    { provider: params.provider, model: params.model, type: "output" },
    params.outputTokens
  );

  costUsd.inc(
    {
      provider: params.provider,
      model: params.model,
      team_id: params.teamId,
    },
    params.costUsd
  );

  latencyMs.observe(
    {
      provider: params.provider,
      model: params.model,
      workflow: workflowLabel,
    },
    params.latencyMs
  );

  if (params.firstTokenMs !== undefined) {
    firstTokenLatencyMs.observe(
      { provider: params.provider, model: params.model },
      params.firstTokenMs
    );
  }
}

export function recordToolCall(params: ToolMetricsParams): void {
  toolCallsTotal.inc({
    tool: params.tool,
    category: params.category,
    status: params.status,
  });

  toolLatencyMs.observe(
    { tool: params.tool, category: params.category },
    params.latencyMs
  );
}

export function updateCacheHitRate(teamId: string, rate: number): void {
  cacheHitRate.set({ team_id: teamId }, rate);
}

function circuitStateToValue(state: "closed" | "half-open" | "open"): number {
  if (state === "closed") {
    return 0;
  }
  if (state === "half-open") {
    return 0.5;
  }
  return 1;
}

export function updateCircuitBreakerState(
  provider: string,
  state: "closed" | "half-open" | "open"
): void {
  circuitBreakerState.set({ provider }, circuitStateToValue(state));
}

export function updateActiveBackgroundAgents(
  teamId: string,
  preset: string,
  count: number
): void {
  activeBackgroundAgents.set({ team_id: teamId, preset }, count);
}

export function recordBackgroundAgentDuration(
  preset: string,
  status: string,
  durationMs: number
): void {
  backgroundAgentDurationMs.observe({ preset, status }, durationMs);
}

export function recordSkillLoad(
  skillName: string,
  category: string,
  loadTimeMs: number
): void {
  skillLoadTime.observe({ skill_name: skillName, category }, loadTimeMs);
}

export function updateLoadedSkillsCount(teamId: string, count: number): void {
  loadedSkillsCount.set({ team_id: teamId }, count);
}

export function getMetrics(): Promise<string> {
  return aiMetricsRegistry.metrics();
}

export function resetMetrics(): void {
  aiMetricsRegistry.resetMetrics();
}
