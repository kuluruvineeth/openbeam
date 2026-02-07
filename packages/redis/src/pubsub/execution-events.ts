import type { ExecutionEvent } from "@openplane/types/canvas/execution-events";
import { ExecutionEventSchema } from "@openplane/types/canvas/execution-events";
import { LRUCache } from "lru-cache";
import type { RedisClientType } from "redis";
import { getRedisClient } from "../client";

const EXECUTION_EVENTS_CHANNEL_PREFIX = "execution-events";
const PROGRESS_THROTTLE_MS = 250;
const THROTTLE_CACHE_MAX_ENTRIES = 10_000;
const THROTTLE_CACHE_TTL_MS = 5 * 60 * 1000;

const lastPublishTime = new LRUCache<string, number>({
  max: THROTTLE_CACHE_MAX_ENTRIES,
  ttl: THROTTLE_CACHE_TTL_MS,
});

const executionIdIndex = new Map<string, Set<string>>();

function shouldThrottle(executionId: string, eventType: string): boolean {
  const terminalEvents = [
    "execution.completed",
    "execution.failed",
    "execution.cancelled",
    "step.completed",
    "step.failed",
  ];

  if (terminalEvents.includes(eventType)) {
    return false;
  }

  const now = Date.now();
  const key = `${executionId}:${eventType}`;
  const lastTime = lastPublishTime.get(key) ?? 0;

  if (now - lastTime < PROGRESS_THROTTLE_MS) {
    return true;
  }

  lastPublishTime.set(key, now);

  if (!executionIdIndex.has(executionId)) {
    executionIdIndex.set(executionId, new Set());
  }
  executionIdIndex.get(executionId)?.add(key);

  return false;
}

export async function publishExecutionEvent(
  executionId: string,
  event: ExecutionEvent
): Promise<void> {
  if (shouldThrottle(executionId, event.type)) {
    return;
  }

  try {
    const client = await getRedisClient();
    const channel = `${EXECUTION_EVENTS_CHANNEL_PREFIX}:${executionId}`;
    await client.publish(channel, JSON.stringify(event));
    // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort pub/sub
  } catch {}
}

export async function createExecutionEventSubscriber(
  executionId: string,
  onEvent: (event: ExecutionEvent) => void,
  onError?: (error: Error) => void
): Promise<() => Promise<void>> {
  const client = await getRedisClient();
  const subscriber = client.duplicate() as RedisClientType;

  subscriber.on("error", (err: Error) => {
    onError?.(err);
  });

  await subscriber.connect();

  const channel = `${EXECUTION_EVENTS_CHANNEL_PREFIX}:${executionId}`;

  await subscriber.subscribe(channel, (message) => {
    try {
      const parsed = JSON.parse(message);
      const event = ExecutionEventSchema.parse(parsed);
      onEvent(event);
      // biome-ignore lint/suspicious/noEmptyBlockStatements: skip malformed events
    } catch {}
  });

  return async () => {
    try {
      await subscriber.unsubscribe(channel);
      await subscriber.quit();
      // biome-ignore lint/suspicious/noEmptyBlockStatements: best-effort cleanup
    } catch {}
  };
}

export type ExecutionEventEmitterParams = {
  executionId: string;
  agentCanvasId: string;
};

export function createExecutionEventEmitter(
  params: ExecutionEventEmitterParams
) {
  const { executionId, agentCanvasId } = params;
  let stepsCompleted = 0;
  let stepsTotal = 0;

  return {
    executionStarted: () =>
      publishExecutionEvent(executionId, {
        type: "execution.started",
        executionId,
        agentCanvasId,
        timestamp: Date.now(),
      }),

    executionProgress: (currentNodeId: string | undefined, total: number) => {
      stepsTotal = total;
      return publishExecutionEvent(executionId, {
        type: "execution.progress",
        executionId,
        currentNodeId,
        stepsCompleted,
        stepsTotal,
        timestamp: Date.now(),
      });
    },

    executionCompleted: (output: unknown, durationMs: number) =>
      publishExecutionEvent(executionId, {
        type: "execution.completed",
        executionId,
        status: "COMPLETED",
        output,
        durationMs,
        timestamp: Date.now(),
      }),

    executionFailed: (error: string, failedNodeId?: string) =>
      publishExecutionEvent(executionId, {
        type: "execution.failed",
        executionId,
        error,
        failedNodeId,
        timestamp: Date.now(),
      }),

    executionCancelled: (cancelledById?: string, reason?: string) =>
      publishExecutionEvent(executionId, {
        type: "execution.cancelled",
        executionId,
        cancelledById,
        reason,
        timestamp: Date.now(),
      }),

    stepStarted: (opts: {
      stepId: string;
      nodeId: string;
      nodeType: string;
      nodeName: string;
      attempt?: number;
    }) =>
      publishExecutionEvent(executionId, {
        type: "step.started",
        executionId,
        stepId: opts.stepId,
        nodeId: opts.nodeId,
        nodeType: opts.nodeType,
        nodeName: opts.nodeName,
        attempt: opts.attempt ?? 1,
        timestamp: Date.now(),
      }),

    stepProgress: (
      stepId: string,
      nodeId: string,
      progress: number,
      message?: string
    ) =>
      publishExecutionEvent(executionId, {
        type: "step.progress",
        executionId,
        stepId,
        nodeId,
        progress,
        message,
        timestamp: Date.now(),
      }),

    stepCompleted: (opts: {
      stepId: string;
      nodeId: string;
      durationMs: number;
      output?: unknown;
      tokenUsage?: { input: number; output: number };
    }) => {
      stepsCompleted += 1;
      return publishExecutionEvent(executionId, {
        type: "step.completed",
        executionId,
        stepId: opts.stepId,
        nodeId: opts.nodeId,
        output: opts.output,
        durationMs: opts.durationMs,
        tokenUsage: opts.tokenUsage,
        timestamp: Date.now(),
      });
    },

    stepFailed: (opts: {
      stepId: string;
      nodeId: string;
      error: string;
      isRetryable: boolean;
      stackTrace?: string;
    }) =>
      publishExecutionEvent(executionId, {
        type: "step.failed",
        executionId,
        stepId: opts.stepId,
        nodeId: opts.nodeId,
        error: opts.error,
        stackTrace: opts.stackTrace,
        isRetryable: opts.isRetryable,
        timestamp: Date.now(),
      }),

    stepSkipped: (stepId: string, nodeId: string, reason?: string) =>
      publishExecutionEvent(executionId, {
        type: "step.skipped",
        executionId,
        stepId,
        nodeId,
        reason,
        timestamp: Date.now(),
      }),

    stepRetrying: (opts: {
      stepId: string;
      nodeId: string;
      attempt: number;
      maxAttempts: number;
      retryDelayMs: number;
      reason?: string;
    }) =>
      publishExecutionEvent(executionId, {
        type: "step.retrying",
        executionId,
        stepId: opts.stepId,
        nodeId: opts.nodeId,
        attempt: opts.attempt,
        maxAttempts: opts.maxAttempts,
        retryDelayMs: opts.retryDelayMs,
        reason: opts.reason,
        timestamp: Date.now(),
      }),

    approvalRequested: (opts: {
      approvalId: string;
      nodeId: string;
      message?: string;
      expiresAt?: string;
    }) =>
      publishExecutionEvent(executionId, {
        type: "approval.requested",
        executionId,
        approvalId: opts.approvalId,
        nodeId: opts.nodeId,
        message: opts.message,
        expiresAt: opts.expiresAt,
        timestamp: Date.now(),
      }),

    approvalReceived: (opts: {
      approvalId: string;
      nodeId: string;
      approved: boolean;
      respondedById: string;
      respondedByName?: string;
      message?: string;
    }) =>
      publishExecutionEvent(executionId, {
        type: "approval.received",
        executionId,
        approvalId: opts.approvalId,
        nodeId: opts.nodeId,
        approved: opts.approved,
        respondedById: opts.respondedById,
        respondedByName: opts.respondedByName,
        message: opts.message,
        timestamp: Date.now(),
      }),

    inputRequested: (opts: {
      inputId: string;
      nodeId: string;
      prompt?: string;
      schema?: unknown;
    }) =>
      publishExecutionEvent(executionId, {
        type: "input.requested",
        executionId,
        inputId: opts.inputId,
        nodeId: opts.nodeId,
        prompt: opts.prompt,
        schema: opts.schema,
        timestamp: Date.now(),
      }),

    inputReceived: (
      inputId: string,
      nodeId: string,
      providedById: string,
      providedByName?: string
    ) =>
      publishExecutionEvent(executionId, {
        type: "input.received",
        executionId,
        inputId,
        nodeId,
        providedById,
        providedByName,
        timestamp: Date.now(),
      }),

    heartbeat: () =>
      publishExecutionEvent(executionId, {
        type: "heartbeat",
        timestamp: Date.now(),
      }),
  };
}

export function cleanupExecutionThrottleCache(executionId: string): void {
  const keys = executionIdIndex.get(executionId);
  if (!keys) {
    return;
  }

  for (const key of keys) {
    lastPublishTime.delete(key);
  }

  executionIdIndex.delete(executionId);
}
