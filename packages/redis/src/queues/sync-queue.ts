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
 * Sync queue for connector synchronization jobs
 * Handles fetching data from external sources (Slack, Notion, etc.)
 */
export const syncQueue = new Queue<SyncJobData>("sync", {
  connection: getRedisConnection(),
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
