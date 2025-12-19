import { Queue } from "bullmq";
import { getSharedBullMqConnection } from "../client";

export const CLEANUP_QUEUE_NAME = "cleanup";

export type CleanupJobType = "DAILY_CLEANUP" | "DELETION_SYNC";

export interface CleanupJobData {
  type: CleanupJobType;
  triggeredAt: number;
  connectorId?: string;
  staleThresholdMs?: number;
}

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
    console.warn(
      `Failed to remove cleanup job scheduler ${schedulerId}:`,
      error
    );
  }
};

export async function closeCleanupQueue(): Promise<void> {
  await cleanupQueue.close();
}

export async function addDeletionSyncJob(
  connectorId: string,
  staleThresholdMs = 7 * 24 * 60 * 60 * 1000
): Promise<void> {
  await cleanupQueue.add(
    "deletion-sync",
    {
      type: "DELETION_SYNC",
      triggeredAt: Date.now(),
      connectorId,
      staleThresholdMs,
    },
    {
      priority: 3,
      jobId: `deletion-sync-${connectorId}-${Date.now()}`,
    }
  );
}

export async function setupDeletionSyncSchedule(
  connectorId: string,
  cronExpression = "0 2 * * *"
): Promise<string> {
  const schedulerId = `deletion-sync-${connectorId}`;

  await cleanupQueue.upsertJobScheduler(
    schedulerId,
    {
      pattern: cronExpression,
    },
    {
      name: "deletion-sync",
      data: {
        type: "DELETION_SYNC",
        triggeredAt: 0,
        connectorId,
        staleThresholdMs: 7 * 24 * 60 * 60 * 1000,
      },
    }
  );

  return schedulerId;
}
