/**
 * Action Execution Queue
 *
 * Handles MCP action/tool execution for "Glean Actions" functionality.
 * Supports the Action and ActionExecution models from actions.prisma.
 */
import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";
import { extractTraceContext, type TraceContext } from "../utils/trace-context";

// === Action Types ===

export type ActionTriggerType = "manual" | "scheduled" | "event" | "ai";

export type ActionCategory =
  | "messaging"
  | "notification"
  | "task_management"
  | "document"
  | "calendar"
  | "code"
  | "ci_cd"
  | "monitoring"
  | "search"
  | "analytics"
  | "export"
  | "webhook"
  | "api"
  | "user_management"
  | "settings";

export interface ActionJobData {
  executionId: string;
  actionId: string;
  teamId: string;
  userId: string;

  // Trigger context
  triggerType: ActionTriggerType;
  triggeredFrom?: string; // "chat", "search", "workflow", "schedule", "api"
  conversationId?: string;
  agentExecutionId?: string;

  // Input
  input: Record<string, unknown>;

  // Confirmation (if required)
  confirmationRequired: boolean;
  confirmed?: boolean;
  confirmedBy?: string;

  // Action metadata (cached from Action model)
  actionMeta: {
    name: string;
    category: ActionCategory;
    isDestructive: boolean;
    isDryRunnable: boolean;
    executionType: "api" | "webhook" | "function" | "mcp";
    executionConfig: Record<string, unknown>;
    requiredPermissions: string[];
    rateLimit?: {
      maxPerMinute?: number;
      maxPerHour?: number;
      maxPerDay?: number;
    };
  };

  // Dry run mode
  dryRun?: boolean;

  // Retry info
  retryCount?: number;
  maxRetries?: number;

  // Tracing
  traceContext?: TraceContext;
}

export interface ActionJobResult {
  executionId: string;
  status: "completed" | "failed" | "cancelled" | "timeout" | "rolled_back";
  output?: Record<string, unknown>;
  outputSummary?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  durationMs: number;

  // Rollback info (if applicable)
  isRollbackable?: boolean;
  rollbackData?: Record<string, unknown>;
}

// === Queue Configuration ===

export const ACTION_QUEUE_NAME = "action";

export const actionQueue = new Queue<ActionJobData, ActionJobResult>(
  ACTION_QUEUE_NAME,
  {
    connection: getSharedBullMqConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: {
        count: 500,
        age: 7 * 24 * 3600, // Keep for 7 days
      },
      removeOnFail: {
        count: 1000,
        age: 30 * 24 * 3600, // Keep failures for 30 days
      },
    },
  }
);

// === Queue Operations ===

/**
 * Add an action execution job to the queue
 */
export async function addActionJob(
  data: Omit<ActionJobData, "traceContext">,
  options?: {
    priority?: number;
    delay?: number;
  }
) {
  const jobData: ActionJobData = {
    ...data,
    traceContext: extractTraceContext(),
  };

  // Higher priority for AI-triggered actions
  const priority =
    options?.priority ??
    (data.triggerType === "ai" ? 8 : data.triggerType === "manual" ? 7 : 5);

  return await actionQueue.add("action-execute", jobData, {
    priority,
    delay: options?.delay,
    jobId: `action-${data.executionId}`,
  });
}

/**
 * Add a confirmed action (after user confirmation)
 */
export async function addConfirmedActionJob(
  executionId: string,
  confirmedBy: string
) {
  const existingJob = await actionQueue.getJob(`action-${executionId}`);

  if (!existingJob) {
    throw new Error(`Action execution ${executionId} not found`);
  }

  // Create a new job with confirmation
  const jobData: ActionJobData = {
    ...existingJob.data,
    confirmed: true,
    confirmedBy,
    traceContext: extractTraceContext(),
  };

  return await actionQueue.add("action-execute-confirmed", jobData, {
    priority: 9, // High priority for confirmed actions
    jobId: `action-confirmed-${executionId}`,
  });
}

/**
 * Add a dry-run action job
 */
export async function addDryRunActionJob(
  data: Omit<ActionJobData, "traceContext" | "dryRun">
) {
  return await addActionJob({ ...data, dryRun: true }, { priority: 3 });
}

/**
 * Get action job by execution ID
 */
export async function getActionJob(executionId: string) {
  return await actionQueue.getJob(`action-${executionId}`);
}

/**
 * Cancel an action execution
 */
export async function cancelActionJob(executionId: string): Promise<boolean> {
  const job = await actionQueue.getJob(`action-${executionId}`);
  if (job) {
    const state = await job.getState();
    if (state === "waiting" || state === "delayed") {
      await job.remove();
      return true;
    }
  }
  return false;
}

/**
 * Get action queue metrics
 */
export async function getActionQueueMetrics() {
  const counts = await actionQueue.getJobCounts();
  return {
    waiting: counts.waiting || 0,
    active: counts.active || 0,
    completed: counts.completed || 0,
    failed: counts.failed || 0,
    delayed: counts.delayed || 0,
    total:
      (counts.waiting || 0) +
      (counts.active || 0) +
      (counts.completed || 0) +
      (counts.failed || 0) +
      (counts.delayed || 0),
  };
}

/**
 * Get pending actions for a user (awaiting confirmation)
 */
export async function getPendingActionsForUser(
  userId: string
): Promise<ActionJobData[]> {
  const waitingJobs = await actionQueue.getWaiting();
  return waitingJobs
    .filter(
      (job) =>
        job.data.userId === userId &&
        job.data.confirmationRequired &&
        !job.data.confirmed
    )
    .map((job) => job.data);
}

/**
 * Create a repeatable action job (scheduled)
 */
export async function createScheduledAction(
  actionId: string,
  teamId: string,
  input: Record<string, unknown>,
  cronExpression: string,
  actionMeta: ActionJobData["actionMeta"]
): Promise<string> {
  const schedulerId = `scheduled-action-${actionId}`;

  await actionQueue.upsertJobScheduler(
    schedulerId,
    {
      pattern: cronExpression,
    },
    {
      name: "action-scheduled",
      data: {
        executionId: "", // Will be generated when job runs
        actionId,
        teamId,
        userId: "system", // System-triggered
        triggerType: "scheduled",
        triggeredFrom: "schedule",
        input,
        confirmationRequired: false, // Scheduled actions are pre-approved
        actionMeta,
      },
      opts: {
        priority: 5,
      },
    }
  );

  return schedulerId;
}

/**
 * Remove a scheduled action
 */
export async function removeScheduledAction(actionId: string): Promise<void> {
  try {
    await actionQueue.removeJobScheduler(`scheduled-action-${actionId}`);
  } catch (error) {
    console.warn(`Failed to remove scheduled action ${actionId}:`, error);
  }
}

/**
 * Close the action queue
 */
export async function closeActionQueue(): Promise<void> {
  await actionQueue.close();
}
