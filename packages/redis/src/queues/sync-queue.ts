import { Queue } from "bullmq";
import { getRedisConnection } from "../client";

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
 * Advanced retry strategy based on error type
 *
 * Error-specific backoff strategies:
 * - Rate Limit (429): Exponential backoff (2s, 4s, 8s, 16s)
 * - Auth Errors (401, 403): Fail fast (1 attempt)
 * - Network Errors (ECONNRESET, ETIMEDOUT): Linear backoff (5s, 10s, 15s)
 * - Server Errors (500-599): Exponential with jitter
 * - Unknown Errors: Exponential backoff
 */
function getRetryStrategy(attemptsMade: number, err: Error): number {
  const errorMessage = err.message.toLowerCase();

  // Rate limit errors - exponential backoff
  if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
    return Math.min(2000 * 2 ** (attemptsMade - 1), 16_000);
  }

  // Auth errors - fail fast (return -1 to stop retrying)
  if (
    errorMessage.includes("401") ||
    errorMessage.includes("403") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("forbidden")
  ) {
    return -1; // Stop retrying
  }

  // Network errors - linear backoff
  if (
    errorMessage.includes("econnreset") ||
    errorMessage.includes("etimedout") ||
    errorMessage.includes("network") ||
    errorMessage.includes("enotfound")
  ) {
    return Math.min(5000 + (attemptsMade - 1) * 5000, 15_000);
  }

  // Server errors - exponential with jitter
  if (
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503") ||
    errorMessage.includes("504")
  ) {
    const baseDelay = 2000 * 2 ** (attemptsMade - 1);
    const jitter = Math.random() * 1000;
    return Math.min(baseDelay + jitter, 30_000);
  }

  // Unknown errors - exponential backoff
  return Math.min(2000 * 2 ** (attemptsMade - 1), 30_000);
}

/**
 * Sync queue for connector synchronization jobs
 * Handles fetching data from external sources (Slack, Notion, etc.)
 */
export const syncQueue = new Queue<SyncJobData>("sync", {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "custom",
      delay: getRetryStrategy as unknown as number,
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
 * - 10: Webhook-triggered (highest priority)
 * - 7: Manual syncs
 * - 5: Scheduled incremental (default)
 * - 3: Scheduled full syncs
 * - 1: Background/cleanup jobs (lowest)
 *
 * @param data - Sync job data
 * @param priority - Job priority (1-10, higher = more urgent)
 * @returns Promise resolving to the created job
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
