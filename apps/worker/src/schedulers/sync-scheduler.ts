import prisma, {
  findScheduledSyncJobs,
  updateSyncJobNextRunAt,
  updateSyncJobSchedule,
} from "@openplane/db";
import {
  createRepeatableSyncJob,
  intervalMsToCron,
  jobSchedulerKeys,
  removeRepeatableSyncJob,
} from "@openplane/redis";
import logger from "../utils/logger";

export class SyncScheduler {
  private isRunning = false;
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Sync scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting sync scheduler");

    await this.initializeRepeatableJobs();

    logger.info("Sync scheduler started successfully");
  }

  private async initializeRepeatableJobs(): Promise<void> {
    try {
      const scheduledJobs = await findScheduledSyncJobs(prisma);

      logger.info(
        { count: scheduledJobs.length },
        "Initializing repeatable jobs"
      );

      await Promise.allSettled(
        scheduledJobs.map(async (job) => {
          try {
            await this.createRepeatableJobForSyncJob(job);
          } catch (error) {
            logger.error(
              {
                error,
                syncJobId: job.id,
                connectorId: job.connectorId,
              },
              "Failed to create repeatable job"
            );
          }
        })
      );

      logger.info("Repeatable jobs initialization complete");
    } catch (error) {
      logger.error({ error }, "Failed to initialize repeatable jobs");
    }
  }

  private async createRepeatableJobForSyncJob(job: {
    id: string;
    connectorId: string;
    type: string;
    schedule: string | null;
    priority: number;
    config: unknown;
  }): Promise<void> {
    if (!job.schedule) {
      const config = job.config as { intervalMs?: number } | null;
      if (config?.intervalMs) {
        job.schedule = intervalMsToCron(config.intervalMs);
        await updateSyncJobSchedule(prisma, job.id, job.schedule);
      }
    }

    if (!job.schedule) {
      return;
    }

    const existingKey = await jobSchedulerKeys.get(
      job.connectorId,
      job.type as "FULL" | "INCREMENTAL"
    );
    if (existingKey) {
      await removeRepeatableSyncJob(existingKey);
    }

    const jobKey = await createRepeatableSyncJob(
      job.connectorId,
      job.type as "FULL" | "INCREMENTAL",
      job.schedule,
      job.priority
    );

    await jobSchedulerKeys.set(
      job.connectorId,
      job.type as "FULL" | "INCREMENTAL",
      jobKey
    );

    const config = job.config as { intervalMs?: number } | null;
    if (config?.intervalMs) {
      const nextRunAt = new Date(Date.now() + config.intervalMs);
      await updateSyncJobNextRunAt(prisma, job.id, nextRunAt);

      logger.debug(
        {
          connectorId: job.connectorId,
          type: job.type,
          schedule: job.schedule,
          nextRunAt,
        },
        "Created repeatable job and updated nextRunAt"
      );
    } else {
      logger.debug(
        {
          connectorId: job.connectorId,
          type: job.type,
          schedule: job.schedule,
        },
        "Created repeatable job"
      );
    }
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn("Sync scheduler not running");
      return;
    }

    logger.info("Stopping sync scheduler");
    this.isRunning = false;
    logger.info("Sync scheduler stopped");
  }

  async registerRepeatableJob(
    connectorId: string,
    type: "FULL" | "INCREMENTAL",
    schedule: string,
    priority: number
  ): Promise<void> {
    try {
      const existingKey = await jobSchedulerKeys.get(connectorId, type);
      if (existingKey) {
        await removeRepeatableSyncJob(existingKey);
      }

      // Create new repeatable job
      const jobKey = await createRepeatableSyncJob(
        connectorId,
        type,
        schedule,
        priority
      );

      await jobSchedulerKeys.set(connectorId, type, jobKey);

      logger.info({ connectorId, type, schedule }, "Registered repeatable job");
    } catch (error) {
      logger.error(
        { error, connectorId, type },
        "Failed to register repeatable job"
      );
      throw error;
    }
  }

  async unregisterRepeatableJob(
    connectorId: string,
    type?: "FULL" | "INCREMENTAL"
  ): Promise<void> {
    try {
      if (type) {
        const key = await jobSchedulerKeys.get(connectorId, type);
        if (key) {
          await removeRepeatableSyncJob(key);
          await jobSchedulerKeys.delete(connectorId, type);
        }
      } else {
        const keys = await jobSchedulerKeys.getAll(connectorId);
        if (keys.full) {
          await removeRepeatableSyncJob(keys.full);
        }
        if (keys.incremental) {
          await removeRepeatableSyncJob(keys.incremental);
        }
        await jobSchedulerKeys.deleteAll(connectorId);
      }

      logger.info(
        { connectorId, type: type ?? "all" },
        "Unregistered repeatable job"
      );
    } catch (error) {
      logger.error(
        { error, connectorId },
        "Failed to unregister repeatable job"
      );
    }
  }

  getStatus(): {
    running: boolean;
    repeatableJobCount: number;
  } {
    return {
      running: this.isRunning,
      repeatableJobCount: -1,
    };
  }

  async getRepeatableJobsForConnector(
    connectorId: string
  ): Promise<{ full: string | null; incremental: string | null }> {
    return await jobSchedulerKeys.getAll(connectorId);
  }
}
