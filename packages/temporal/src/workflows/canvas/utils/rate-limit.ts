import {
  type CheckRateLimitOutput,
  DEFAULT_CANVAS_EXECUTION_RATE_LIMIT,
} from "@openbeam/types/temporal";
import { ApplicationFailure, proxyActivities } from "@temporalio/workflow";

import type { RateLimitActivities } from "../../../activities/canvas/rate-limit";

const rateLimitActivities = proxyActivities<RateLimitActivities>({
  startToCloseTimeout: "10s",
  scheduleToCloseTimeout: "30s",
  retry: {
    maximumAttempts: 3,
    initialInterval: "500ms",
    backoffCoefficient: 2,
    maximumInterval: "5s",
  },
});

export interface WorkflowRateLimitParams {
  teamId: string;
  limitKey?: string;
  limit?: number;
  windowMs?: number;
}

export function checkWorkflowRateLimit(
  params: WorkflowRateLimitParams
): Promise<CheckRateLimitOutput> {
  const {
    teamId,
    limitKey = DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.limitKey,
    limit = DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.limit,
    windowMs = DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.windowMs,
  } = params;

  const key = `rate:workflow:${limitKey}:${teamId}`;

  return rateLimitActivities.checkRateLimit({
    key,
    limit,
    windowMs,
  });
}

export async function enforceWorkflowRateLimit(
  params: WorkflowRateLimitParams
): Promise<CheckRateLimitOutput> {
  const result = await checkWorkflowRateLimit(params);

  if (!result.allowed) {
    const resetDate = new Date(result.resetAt).toISOString();
    throw ApplicationFailure.nonRetryable(
      `Rate limit exceeded for team ${params.teamId}. Limit: ${params.limit ?? DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.limit} executions per hour. Resets at ${resetDate}`,
      "RATE_LIMITED",
      {
        teamId: params.teamId,
        limitKey:
          params.limitKey ?? DEFAULT_CANVAS_EXECUTION_RATE_LIMIT.limitKey,
        remaining: result.remaining,
        resetAt: result.resetAt,
        current: result.current,
      }
    );
  }

  return result;
}
