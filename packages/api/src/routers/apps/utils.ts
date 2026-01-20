import { type Database, SyncJobStatus } from "@openplane/db";
import {
  createRepeatableSyncJob,
  jobSchedulerKeys,
  removeRepeatableSyncJob,
  setupPermissionSyncSchedule,
} from "@openplane/redis";
import type { UpdateSyncSettingsResult } from "@openplane/types/db";
import { TRPCError } from "@trpc/server";

/**
 * Update a single repeatable job
 */
export async function updateSingleRepeatableJob(params: {
  connectorId: string;
  type: "FULL" | "INCREMENTAL";
  schedule: string;
  priority: number;
  createdJobKeys: string[];
}): Promise<void> {
  const { connectorId, type, schedule, priority, createdJobKeys } = params;

  // Remove old repeatable job if exists
  const existingKey = await jobSchedulerKeys.get(connectorId, type);
  if (existingKey) {
    await removeRepeatableSyncJob(existingKey);
  }

  // Create new repeatable job
  const newJobKey = await createRepeatableSyncJob(
    connectorId,
    type,
    schedule,
    priority
  );
  createdJobKeys.push(newJobKey);

  // Store in Redis for multi-worker support
  await jobSchedulerKeys.set(connectorId, type, newJobKey);
}

/**
 * Update repeatable jobs for sync settings
 */
export async function updateRepeatableJobsForSettings(
  connectorId: string,
  result: UpdateSyncSettingsResult,
  createdJobKeys: string[]
): Promise<void> {
  if (result.fullSyncJob) {
    await updateSingleRepeatableJob({
      connectorId,
      type: "FULL",
      schedule: result.fullSyncJob.schedule,
      priority: 3,
      createdJobKeys,
    });
  }

  if (result.incrementalSyncJob) {
    await updateSingleRepeatableJob({
      connectorId,
      type: "INCREMENTAL",
      schedule: result.incrementalSyncJob.schedule,
      priority: 5,
      createdJobKeys,
    });
  }
}

/**
 * Rollback created jobs on error
 */
export async function rollbackCreatedJobs(
  connectorId: string,
  createdJobKeys: string[]
): Promise<void> {
  for (const jobKey of createdJobKeys) {
    try {
      await removeRepeatableSyncJob(jobKey);
      // Clean up Redis - determine type by checking which key matches
      const keys = await jobSchedulerKeys.getAll(connectorId);
      if (keys.full === jobKey) {
        await jobSchedulerKeys.delete(connectorId, "FULL");
      } else if (keys.incremental === jobKey) {
        await jobSchedulerKeys.delete(connectorId, "INCREMENTAL");
      }
    } catch (rollbackError) {
      console.error(`Failed to rollback job ${jobKey}:`, rollbackError);
    }
  }
}

/**
 * Clean up repeatable jobs for a connector
 */
export async function cleanupRepeatableJobs(
  connectorId: string
): Promise<void> {
  try {
    const keys = await jobSchedulerKeys.getAll(connectorId);
    if (keys.full) {
      await removeRepeatableSyncJob(keys.full);
      await jobSchedulerKeys.delete(connectorId, "FULL");
    }
    if (keys.incremental) {
      await removeRepeatableSyncJob(keys.incremental);
      await jobSchedulerKeys.delete(connectorId, "INCREMENTAL");
    }
    if (keys.permissions) {
      await removeRepeatableSyncJob(keys.permissions);
      await jobSchedulerKeys.delete(connectorId, "PERMISSIONS");
    }
  } catch (error) {
    console.warn(
      `Failed to remove repeatable jobs for connector ${connectorId}:`,
      error
    );
  }
}

/**
 * Recreate repeatable jobs from database
 */
export async function recreateRepeatableJobs(
  prisma: Database,
  connectorId: string
): Promise<void> {
  try {
    const syncJobs = await prisma.syncJob.findMany({
      where: {
        connectorId,
        trigger: "SCHEDULED",
        deletedAt: null,
        status: SyncJobStatus.PENDING,
      },
      select: {
        id: true,
        type: true,
        schedule: true,
        priority: true,
        config: true,
      },
    });

    for (const job of syncJobs) {
      if (job.schedule) {
        const jobType = job.type as "FULL" | "INCREMENTAL";

        // Remove old job if exists
        const existingKey = await jobSchedulerKeys.get(connectorId, jobType);
        if (existingKey) {
          await removeRepeatableSyncJob(existingKey);
        }

        // Create new repeatable job
        const jobKey = await createRepeatableSyncJob(
          connectorId,
          jobType,
          job.schedule,
          job.priority
        );

        // Store in Redis for multi-worker support
        await jobSchedulerKeys.set(connectorId, jobType, jobKey);
      }
    }
  } catch (error) {
    console.warn(
      `Failed to recreate repeatable jobs for connector ${connectorId}:`,
      error
    );
  }
}

/**
 * Validate sync interval settings
 */
export function validateSyncIntervals(input: {
  fullSyncIntervalMs?: number;
  incrementalSyncIntervalMs?: number;
}): void {
  if (
    input.fullSyncIntervalMs &&
    input.incrementalSyncIntervalMs &&
    input.incrementalSyncIntervalMs >= input.fullSyncIntervalMs
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Incremental sync interval must be less than full sync interval",
    });
  }
}

/**
 * Set up permission sync schedule for a connector
 * Runs every 5 minutes to refresh channel permissions
 */
export async function setupConnectorPermissionSync(
  connectorId: string
): Promise<void> {
  try {
    const existingKey = await jobSchedulerKeys.get(connectorId, "PERMISSIONS");
    if (existingKey) {
      await removeRepeatableSyncJob(existingKey);
    }

    const jobKey = await setupPermissionSyncSchedule(connectorId, 5);
    await jobSchedulerKeys.set(connectorId, "PERMISSIONS", jobKey);
  } catch (error) {
    console.warn(
      `Failed to setup permission sync for connector ${connectorId}:`,
      error
    );
  }
}
