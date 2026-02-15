import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { formatCents } from "./budget-utils";
import { formatContextualTimestamp } from "./time-display";

const REFLECTION_SCORE_THRESHOLDS = {
  good: 0.7,
  warning: 0.3,
} as const;

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(n);
}

export function buildAgentMetricTokens(
  agent: MissionAgentLaneState,
  includeProgress: boolean
): string[] {
  const metrics: string[] = [];

  if (agent.stepsCompleted > 0 && !includeProgress) {
    metrics.push(`${agent.stepsCompleted} steps`);
  }

  if (agent.tokensUsed > 0) {
    metrics.push(`${formatTokens(agent.tokensUsed)} tok`);
  }

  if (agent.costCents > 0) {
    metrics.push(formatCents(agent.costCents));
  }

  return metrics;
}

export function formatAgentLastActivity(
  lastActivityAt: number | undefined,
  nowMs: number
): string | null {
  if (typeof lastActivityAt !== "number" || Number.isNaN(lastActivityAt)) {
    return null;
  }

  return formatContextualTimestamp(lastActivityAt, nowMs);
}

export function reflectionScoreColor(score: number): string {
  if (score >= REFLECTION_SCORE_THRESHOLDS.good) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }

  if (score >= REFLECTION_SCORE_THRESHOLDS.warning) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400";
  }

  return "border-destructive/25 bg-destructive/10 text-destructive";
}

export const TIMEOUT_TIER_LABELS: Record<string, string> = {
  quick: "Quick",
  standard: "Std",
  extended: "Ext",
  marathon: "Mar",
};

export const TIMEOUT_TIER_STYLES: Record<string, string> = {
  quick: "border-border/50 bg-muted/40 text-muted-foreground",
  standard: "border-border/50 bg-muted/40 text-muted-foreground",
  extended:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  marathon: "border-destructive/25 bg-destructive/10 text-destructive",
};
