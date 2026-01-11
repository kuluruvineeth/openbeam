import { Counter, Gauge, Histogram, Registry } from "prom-client";
import type { MetricsRecordParams, ToolMetricsParams } from "./types";

export const TOOL_METRICS = {
  callsPerTask: "openplane_ai_tool_calls_per_task",
  successRate: "openplane_ai_tool_success_rate",
  retryRate: "openplane_ai_tool_retry_rate",
  avgLatencyMs: "openplane_ai_tool_avg_latency_ms",
} as const;

export const AGENT_METRICS = {
  taskCompletionRate: "openplane_ai_agent_task_completion_rate",
  verificationPassRate: "openplane_ai_agent_verification_pass_rate",
  iterationsToCompletion: "openplane_ai_agent_iterations_to_completion",
  avgStepsPerTask: "openplane_ai_agent_avg_steps_per_task",
} as const;

export const RAG_METRICS = {
  groundingScore: "openplane_ai_rag_grounding_score",
  citationCoverage: "openplane_ai_rag_citation_coverage",
  refusalRate: "openplane_ai_rag_refusal_rate",
  avgRelevanceScore: "openplane_ai_rag_avg_relevance_score",
} as const;

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

const groundingScore = new Histogram({
  name: "openplane_ai_grounding_score",
  help: "RAG answer grounding scores",
  labelNames: ["confidence", "team_id"] as const,
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [aiMetricsRegistry],
});

const ungroundedClaimsTotal = new Counter({
  name: "openplane_ai_ungrounded_claims_total",
  help: "Total ungrounded claims detected",
  labelNames: ["team_id", "severity"] as const,
  registers: [aiMetricsRegistry],
});

const groundingChecksTotal = new Counter({
  name: "openplane_ai_grounding_checks_total",
  help: "Total grounding verification checks",
  labelNames: ["team_id", "result"] as const,
  registers: [aiMetricsRegistry],
});

const toolCallsPerTask = new Histogram({
  name: TOOL_METRICS.callsPerTask,
  help: "Number of tool calls per task",
  labelNames: ["team_id", "task_type"] as const,
  buckets: [1, 2, 3, 5, 10, 15, 20, 30, 50],
  registers: [aiMetricsRegistry],
});

const toolSuccessRate = new Gauge({
  name: TOOL_METRICS.successRate,
  help: "Tool success rate (0-1)",
  labelNames: ["tool", "team_id"] as const,
  registers: [aiMetricsRegistry],
});

const toolRetryRate = new Gauge({
  name: TOOL_METRICS.retryRate,
  help: "Tool retry rate (retries per call)",
  labelNames: ["tool", "team_id"] as const,
  registers: [aiMetricsRegistry],
});

const agentTaskCompletionRate = new Gauge({
  name: AGENT_METRICS.taskCompletionRate,
  help: "Agent task completion rate (0-1)",
  labelNames: ["team_id", "agent_type"] as const,
  registers: [aiMetricsRegistry],
});

const agentVerificationPassRate = new Gauge({
  name: AGENT_METRICS.verificationPassRate,
  help: "Agent verification pass rate (0-1)",
  labelNames: ["team_id", "agent_type"] as const,
  registers: [aiMetricsRegistry],
});

const agentIterationsToCompletion = new Histogram({
  name: AGENT_METRICS.iterationsToCompletion,
  help: "Number of iterations to complete a task",
  labelNames: ["team_id", "agent_type", "status"] as const,
  buckets: [1, 2, 3, 4, 5, 7, 10, 15, 20],
  registers: [aiMetricsRegistry],
});

const ragCitationCoverage = new Histogram({
  name: RAG_METRICS.citationCoverage,
  help: "RAG citation coverage (0-1)",
  labelNames: ["team_id"] as const,
  buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
  registers: [aiMetricsRegistry],
});

const ragRefusalRate = new Gauge({
  name: RAG_METRICS.refusalRate,
  help: "RAG refusal rate (0-1)",
  labelNames: ["team_id", "reason"] as const,
  registers: [aiMetricsRegistry],
});

const ragAvgRelevanceScore = new Gauge({
  name: RAG_METRICS.avgRelevanceScore,
  help: "Average relevance score for RAG results",
  labelNames: ["team_id"] as const,
  registers: [aiMetricsRegistry],
});

const compositionsLogged = new Counter({
  name: "openplane_ai_compositions_logged_total",
  help: "Total composition events logged",
  labelNames: ["success", "tool_count"] as const,
  registers: [aiMetricsRegistry],
});

const emergencePatternsDetected = new Counter({
  name: "openplane_ai_emergence_patterns_detected_total",
  help: "Total emergence patterns detected",
  labelNames: ["status"] as const,
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
  groundingScore,
  ungroundedClaimsTotal,
  groundingChecksTotal,
  toolCallsPerTask,
  toolSuccessRate,
  toolRetryRate,
  agentTaskCompletionRate,
  agentVerificationPassRate,
  agentIterationsToCompletion,
  ragCitationCoverage,
  ragRefusalRate,
  ragAvgRelevanceScore,
  compositionsLogged,
  emergencePatternsDetected,
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

export interface GroundingMetricsParams {
  teamId: string;
  score: number;
  confidence: "high" | "medium" | "low" | "uncertain";
  ungroundedClaimCount: number;
  totalClaimCount: number;
}

export function recordGrounding(params: GroundingMetricsParams): void {
  groundingScore.observe(
    { confidence: params.confidence, team_id: params.teamId },
    params.score
  );

  const result = params.score >= 0.7 ? "pass" : "fail";
  groundingChecksTotal.inc({ team_id: params.teamId, result });

  if (params.ungroundedClaimCount > 0) {
    const severity =
      params.ungroundedClaimCount / Math.max(params.totalClaimCount, 1) > 0.5
        ? "high"
        : "low";

    ungroundedClaimsTotal.inc(
      { team_id: params.teamId, severity },
      params.ungroundedClaimCount
    );
  }
}

export interface ToolEfficiencyParams {
  teamId: string;
  tool: string;
  taskType: string;
  callCount: number;
  successCount: number;
  retryCount: number;
}

export function recordToolEfficiency(params: ToolEfficiencyParams): void {
  toolCallsPerTask.observe(
    { team_id: params.teamId, task_type: params.taskType },
    params.callCount
  );

  const successRate =
    params.callCount > 0 ? params.successCount / params.callCount : 0;
  toolSuccessRate.set(
    { tool: params.tool, team_id: params.teamId },
    successRate
  );

  const retryRate =
    params.callCount > 0 ? params.retryCount / params.callCount : 0;
  toolRetryRate.set({ tool: params.tool, team_id: params.teamId }, retryRate);
}

export interface AgentPerformanceParams {
  teamId: string;
  agentType: string;
  completed: boolean;
  verificationPassed: boolean;
  iterations: number;
}

export function recordAgentPerformance(params: AgentPerformanceParams): void {
  const completionRate = params.completed ? 1 : 0;
  agentTaskCompletionRate.set(
    { team_id: params.teamId, agent_type: params.agentType },
    completionRate
  );

  const verificationRate = params.verificationPassed ? 1 : 0;
  agentVerificationPassRate.set(
    { team_id: params.teamId, agent_type: params.agentType },
    verificationRate
  );

  agentIterationsToCompletion.observe(
    {
      team_id: params.teamId,
      agent_type: params.agentType,
      status: params.completed ? "success" : "failure",
    },
    params.iterations
  );
}

export interface RAGQualityParams {
  teamId: string;
  citationCoverage: number;
  wasRefused: boolean;
  refusalReason?: "no_sources" | "low_confidence" | "mixed_grounding" | "other";
  avgRelevanceScore: number;
}

export function recordRAGQuality(params: RAGQualityParams): void {
  ragCitationCoverage.observe(
    { team_id: params.teamId },
    params.citationCoverage
  );
  ragAvgRelevanceScore.set(
    { team_id: params.teamId },
    params.avgRelevanceScore
  );

  if (params.wasRefused) {
    ragRefusalRate.set(
      { team_id: params.teamId, reason: params.refusalReason ?? "other" },
      1
    );
  }
}
