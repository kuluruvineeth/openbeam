import type { Database } from "@openplane/db";
import {
  getExecutionWithSteps,
  getRecentCompletedExecutions,
  updateExecutionEval,
} from "@openplane/db";
import {
  EVAL_DIMENSION_WEIGHTS,
  type EvalDimensionScores,
  type EvalFlag,
} from "@openplane/types/services/eval";
import type { EvaluateCanvasExecutionOutput } from "@openplane/types/temporal";
import { EvaluateCanvasExecutionInputSchema } from "@openplane/types/temporal";
import { recordEvalScore } from "../../observability/prometheus";

const STATUS_COMPLETION_SCORES: Record<string, number> = {
  COMPLETED: 100,
  FAILED: 0,
  CANCELLED: 25,
  TIMED_OUT: 10,
};

const DEFAULT_HISTORICAL_SCORE = 75;
const HIGH_ERROR_RATE_THRESHOLD = 50;
const SLOW_EXECUTION_THRESHOLD = 30;

export interface EvalActivityDependencies {
  db: Database;
}

export function createEvaluateCanvasExecutionActivity(
  deps: EvalActivityDependencies
) {
  return async function evaluateCanvasExecution(
    rawInput: unknown
  ): Promise<EvaluateCanvasExecutionOutput> {
    const input = EvaluateCanvasExecutionInputSchema.parse(rawInput);
    const execution = await getExecutionWithSteps(
      deps.db,
      input.executionId,
      input.teamId
    );

    if (!execution) {
      throw new Error("Execution not found");
    }

    const historical = await getRecentCompletedExecutions(
      deps.db,
      input.canvasId
    );

    const dimensions = calculateDimensions(execution, historical);
    const score = calculateWeightedScore(dimensions);
    const flags = detectFlags(execution, dimensions);

    await updateExecutionEval(deps.db, input.executionId, input.teamId, {
      evalScore: score,
      evalDimensions: dimensions,
      evalFlags: flags,
    });

    recordEvalScore(input.canvasId, input.teamId, execution.status, score);

    return { score, dimensions, flags };
  };
}

function calculateDimensions(
  execution: NonNullable<Awaited<ReturnType<typeof getExecutionWithSteps>>>,
  historical: Awaited<ReturnType<typeof getRecentCompletedExecutions>>
): EvalDimensionScores {
  return {
    completion: calculateCompletionScore(execution.status),
    efficiency: calculateEfficiencyScore(execution.tokenUsage, historical),
    errorRate: calculateErrorRateScore(execution.steps),
    latency: calculateLatencyScore(execution.latencyMs, historical),
    approvalOverhead: calculateApprovalOverheadScore(execution),
  };
}

function calculateCompletionScore(status: string): number {
  return STATUS_COMPLETION_SCORES[status] ?? 0;
}

function calculateEfficiencyScore(
  tokenUsage: unknown,
  historical: Awaited<ReturnType<typeof getRecentCompletedExecutions>>
): number {
  const tokens = extractTotalTokens(tokenUsage);
  if (tokens === 0) {
    return DEFAULT_HISTORICAL_SCORE;
  }

  const historicalTokens = historical
    .map((e: { tokenUsage: unknown }) => extractTotalTokens(e.tokenUsage))
    .filter((t: number) => t > 0)
    .sort((a: number, b: number) => a - b);

  if (historicalTokens.length === 0) {
    return DEFAULT_HISTORICAL_SCORE;
  }

  const median = computeMedian(historicalTokens);
  if (median === 0) {
    return DEFAULT_HISTORICAL_SCORE;
  }

  if (tokens <= median) {
    return 100;
  }
  return Math.max(0, Math.round(100 - ((tokens - median) / median) * 100));
}

function calculateErrorRateScore(steps: { status: string }[]): number {
  if (steps.length === 0) {
    return 100;
  }
  const failed = steps.filter((s) => s.status === "FAILED").length;
  return Math.round((1 - failed / steps.length) * 100);
}

function calculateLatencyScore(
  latencyMs: number | null,
  historical: Awaited<ReturnType<typeof getRecentCompletedExecutions>>
): number {
  if (!latencyMs || latencyMs === 0) {
    return DEFAULT_HISTORICAL_SCORE;
  }

  const historicalLatencies = historical
    .map((e: { latencyMs: number | null }) => e.latencyMs)
    .filter((l: number | null): l is number => l !== null && l > 0)
    .sort((a: number, b: number) => a - b);

  if (historicalLatencies.length === 0) {
    return DEFAULT_HISTORICAL_SCORE;
  }

  const median = computeMedian(historicalLatencies);
  if (median === 0) {
    return DEFAULT_HISTORICAL_SCORE;
  }

  if (latencyMs <= median) {
    return 100;
  }
  return Math.max(0, Math.round(100 - ((latencyMs - median) / median) * 100));
}

function calculateApprovalOverheadScore(
  execution: NonNullable<Awaited<ReturnType<typeof getExecutionWithSteps>>>
): number {
  const totalMs = execution.latencyMs;
  if (!totalMs || totalMs === 0) {
    return 100;
  }

  const waitingSteps = execution.steps.filter(
    (s: { status: string }) =>
      s.status === "WAITING_APPROVAL" || s.status === "WAITING_INPUT"
  );

  if (waitingSteps.length === 0) {
    return 100;
  }

  let waitTimeMs = 0;
  for (const step of waitingSteps) {
    if (step.startedAt && step.completedAt) {
      waitTimeMs += step.completedAt.getTime() - step.startedAt.getTime();
    }
  }

  const ratio = waitTimeMs / totalMs;
  return Math.max(0, Math.round((1 - ratio) * 100));
}

function calculateWeightedScore(dimensions: EvalDimensionScores): number {
  let score = 0;
  for (const [key, weight] of Object.entries(EVAL_DIMENSION_WEIGHTS)) {
    score += dimensions[key as keyof EvalDimensionScores] * weight;
  }
  return Math.round(Math.max(0, Math.min(100, score)));
}

function detectFlags(
  execution: NonNullable<Awaited<ReturnType<typeof getExecutionWithSteps>>>,
  dimensions: EvalDimensionScores
): EvalFlag[] {
  const flags: EvalFlag[] = [];

  if (execution.steps.length === 0) {
    flags.push("no_steps");
  }

  if (dimensions.errorRate < HIGH_ERROR_RATE_THRESHOLD) {
    flags.push("high_error_rate");
  }

  if (dimensions.latency < SLOW_EXECUTION_THRESHOLD) {
    flags.push("slow_execution");
  }

  if (execution.status === "TIMED_OUT") {
    flags.push("budget_exceeded");
  }

  const hasExpiredApproval = execution.approvals?.some(
    (a: { status: string }) => a.status === "EXPIRED"
  );
  if (hasExpiredApproval) {
    flags.push("approval_timeout");
  }

  return flags;
}

function extractTotalTokens(tokenUsage: unknown): number {
  if (!tokenUsage || typeof tokenUsage !== "object") {
    return 0;
  }
  const usage = tokenUsage as Record<string, unknown>;
  const total = usage.totalTokens ?? usage.total ?? usage.total_tokens;
  return typeof total === "number" ? total : 0;
}

function computeMedian(sorted: number[]): number {
  if (sorted.length === 0) {
    return 0;
  }
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}
