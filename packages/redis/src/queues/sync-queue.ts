import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";

/**
 * Sync job data interface
 * Used to trigger connector sync operations
 */
export interface SyncJobData {
  connectorId: string;
  syncJobId: string;
  type: "FULL" | "INCREMENTAL";
  priority?: number;
}

/**
 * Sync queue for connector synchronization jobs
 * Handles fetching data from external sources (Slack, Notion, etc.)
 */
export const syncQueue = new Queue<SyncJobData>("sync", {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 1000, // Keep last 1000 failed jobs for debugging
    },
  },
});

/**
 * Add a sync job to the queue with priority support
 *
 * Priority levels:
 * - 10: Webhook-triggered (highest)
 * - 7: Manual syncs
 * - 5: Scheduled incremental (default)
 * - 3: Scheduled full syncs
 * - 1: Background/cleanup jobs (lowest)
 */
export async function addSyncJob(data: SyncJobData, priority?: number) {
  const jobPriority = priority ?? data.priority ?? 5;

  return await syncQueue.add("sync", data, {
    priority: jobPriority,
    jobId: `sync-${data.connectorId}-${Date.now()}`,
  });
}

/**
 * Get sync job by ID
 */
export async function getSyncJob(jobId: string) {
  return await syncQueue.getJob(jobId);
}

/**
 * Get sync queue metrics
 */
export async function getSyncQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    syncQueue.getWaitingCount(),
    syncQueue.getActiveCount(),
    syncQueue.getCompletedCount(),
    syncQueue.getFailedCount(),
    syncQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

export async function closeSyncQueue(): Promise<void> {
  await syncQueue.close();
}

/**
 * Convert interval in milliseconds to cron expression
 */
export function intervalMsToCron(intervalMs: number): string {
  if (intervalMs < 60_000) {
    console.warn(
      `Interval ${intervalMs}ms is less than 1 minute. Using 1 minute interval.`
    );
    return "* * * * *";
  }

  const maxIntervalMs = 365 * 24 * 60 * 60 * 1000;
  if (intervalMs > maxIntervalMs) {
    throw new Error(
      `Interval ${intervalMs}ms exceeds maximum of 365 days. Please use a shorter interval.`
    );
  }

  const minutes = Math.floor(intervalMs / 60_000);
  const hours = Math.floor(intervalMs / 3_600_000);
  const days = Math.floor(intervalMs / 86_400_000);

  if (minutes < 60) {
    return `*/${minutes} * * * *`;
  }

  if (hours < 24) {
    return `0 */${hours} * * *`;
  }

  if (days < 7) {
    if (days === 1) {
      return "0 0 * * *";
    }
    return `0 0 */${days} * *`;
  }

  if (days === 7) {
    return "0 0 * * 0";
  }

  if (days === 14) {
    return "0 0 */14 * *";
  }

  if (days >= 28 && days <= 31) {
    return "0 0 1 * *";
  }

  if (days <= 365) {
    return "0 0 1 * *";
  }

  return "0 0 * * *";
}

/**
 * Create a repeatable sync job in BullMQ
 *
 * @param connectorId - Connector ID
 * @param type - Sync type (FULL or INCREMENTAL)
 * @param cronExpression - Cron expression for scheduling
 * @param priority - Job priority
 * @returns Job scheduler ID for later removal
 */
export async function createRepeatableSyncJob(
  connectorId: string,
  type: "FULL" | "INCREMENTAL",
  cronExpression: string,
  priority = 5
): Promise<string> {
  const jobName = `sync-${type.toLowerCase()}-${connectorId}`;

  await syncQueue.upsertJobScheduler(
    jobName,
    {
      pattern: cronExpression,
    },
    {
      name: "sync-repeatable",
      data: {
        connectorId,
        syncJobId: "", // Will be filled by processor when job runs
        type,
        priority,
      },
      opts: {
        priority,
      },
    }
  );

  return jobName;
}

/**
 * Remove a repeatable sync job from BullMQ
 *
 * @param schedulerId - Job scheduler ID returned from createRepeatableSyncJob
 */
export async function removeRepeatableSyncJob(
  schedulerId: string
): Promise<void> {
  try {
    await syncQueue.removeJobScheduler(schedulerId);
  } catch (error) {
    // Job scheduler might not exist, that's okay
    console.warn(`Failed to remove job scheduler ${schedulerId}:`, error);
  }
}

/**
 * Get all job schedulers for a connector
 *
 * @param connectorId - Connector ID
 * @returns Array of job scheduler info
 */
export async function getRepeatableJobsForConnector(
  connectorId: string
): Promise<Array<{ id: string; pattern: string; next: number }>> {
  const jobSchedulers = await syncQueue.getJobSchedulers();

  return jobSchedulers
    .filter(
      (scheduler): scheduler is typeof scheduler & { id: string } =>
        typeof scheduler.id === "string" && scheduler.id.includes(connectorId)
    )
    .map((scheduler) => ({
      id: scheduler.id,
      pattern: scheduler.pattern || "",
      next: scheduler.next || 0,
    }));
}
