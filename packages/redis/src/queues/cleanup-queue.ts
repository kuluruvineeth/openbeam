import { Queue } from "bullmq";
import { getRedisConnection } from "../client";

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
  connection: getRedisConnection(),
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

export const createRepeatableCleanupJob = async (cron: string) => {
  await cleanupQueue.add(
    "daily-cleanup",
    { type: "DAILY_CLEANUP", triggeredAt: Date.now() },
    {
      repeat: {
        pattern: cron,
      },
      jobId: "daily-cleanup", // Singleton job ID
    }
  );
};

export const removeRepeatableCleanupJob = async () => {
  // BullMQ repeatable jobs are identified by key.
  // Simplest way is to get repeatable jobs and remove them.
  const repeatableJobs = await cleanupQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === "daily-cleanup") {
      // Check ID match if possible, or key
      // Actually, removeRepeatableByKey is better if we know the key,
      // but for now let's iterate.
      await cleanupQueue.removeRepeatableByKey(job.key);
    }
  }
};
