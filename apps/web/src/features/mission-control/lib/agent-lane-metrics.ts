import type { MissionAgentLaneState } from "@openplane/types/mission-control";
import { formatCents } from "./budget-utils";
import { formatContextualTimestamp } from "./time-display";

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
