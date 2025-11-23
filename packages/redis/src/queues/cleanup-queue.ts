import { Queue } from "bullmq";
import { getRedisConnection } from "../client";

export const CLEANUP_QUEUE_NAME = "cleanup";

export interface CleanupJobData {
  type: "DAILY_CLEANUP";
  triggeredAt: number;
}

let cleanupQueue: Queue<CleanupJobData> | undefined;

export const getCleanupQueue = async () => {
  if (!cleanupQueue) {
    const connection = await getRedisConnection();
    cleanupQueue = new Queue<CleanupJobData>(CLEANUP_QUEUE_NAME, {
      connection,
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
  }
  return cleanupQueue;
};

export const createRepeatableCleanupJob = async (cron: string) => {
  const queue = await getCleanupQueue();
  await queue.add(
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
  const queue = await getCleanupQueue();
  // BullMQ repeatable jobs are identified by key.
  // Simplest way is to get repeatable jobs and remove them.
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.id === "daily-cleanup") {
      // Check ID match if possible, or key
      // Actually, removeRepeatableByKey is better if we know the key,
      // but for now let's iterate.
      await queue.removeRepeatableByKey(job.key);
    }
  }
};
