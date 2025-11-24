import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";

export const CLEANUP_QUEUE_NAME = "cleanup";

export interface CleanupJobData {
  type: "DAILY_CLEANUP";
  triggeredAt: number;
}

/**
 * Cleanup queue for scheduled maintenance tasks
 * Handles daily cleanup operations like removing old jobs, expired data, etc.
 */
export const cleanupQueue = new Queue<CleanupJobData>(CLEANUP_QUEUE_NAME, {
  connection: getSharedBullMqConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export const createRepeatableCleanupJob = async (
  cron: string
): Promise<string> => {
  const schedulerId = "daily-cleanup";

  await cleanupQueue.upsertJobScheduler(
    schedulerId,
    {
      pattern: cron,
    },
    {
      name: "daily-cleanup",
      data: {
        type: "DAILY_CLEANUP",
        triggeredAt: Date.now(),
      },
    }
  );

  return schedulerId;
};

export const removeRepeatableCleanupJob = async (): Promise<void> => {
  const schedulerId = "daily-cleanup";
  try {
    await cleanupQueue.removeJobScheduler(schedulerId);
  } catch (error) {
    // Job scheduler might not exist, that's okay
    console.warn(
      `Failed to remove cleanup job scheduler ${schedulerId}:`,
      error
    );
  }
};

export async function closeCleanupQueue(): Promise<void> {
  await cleanupQueue.close();
}
