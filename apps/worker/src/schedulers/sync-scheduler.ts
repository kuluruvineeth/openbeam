import prisma from "@openplane/db";
import {
  createRepeatableSyncJob,
  intervalMsToCron,
  jobSchedulerKeys,
  removeRepeatableSyncJob,
} from "@openplane/redis";
import logger from "../utils/logger";

/**
 * Sync Scheduler
 *
 * Manages BullMQ repeatable jobs for connector synchronization.
 * Uses BullMQ's native job scheduling with cron expressions for reliable,
 * distributed scheduling without polling.
 */
export class SyncScheduler {
  private isRunning = false;
  // Job scheduler keys are stored in Redis for multi-worker support
  // Access via jobSchedulerKeys helper from @openplane/redis

  /**
   * Start the scheduler
   * Initializes BullMQ repeatable jobs from database
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Sync scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting sync scheduler");

    // Initialize repeatable jobs from database
    await this.initializeRepeatableJobs();

    logger.info("Sync scheduler started successfully");
  }

  /**
   * Initialize BullMQ repeatable jobs from database
   * Creates repeatable jobs for all active scheduled sync jobs
   */
  private async initializeRepeatableJobs(): Promise<void> {
    try {
      // Find all active scheduled sync jobs with ACTIVE connectors
      const scheduledJobs = await prisma.syncJob.findMany({
        where: {
          status: "ACTIVE",
          trigger: "SCHEDULED",
          deletedAt: null,
          schedule: { not: null },
          connector: {
            status: "ACTIVE", // Only create jobs for active connectors
          },
        },
        select: {
          id: true,
          connectorId: true,
          type: true,
          schedule: true,
          priority: true,
          config: true,
        },
      });

      logger.info(
        { count: scheduledJobs.length },
        "Initializing repeatable jobs"
      );

      // Create repeatable jobs in BullMQ (using helper to reduce complexity)
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

  /**
   * Create a repeatable job for a sync job
   */
  private async createRepeatableJobForSyncJob(job: {
    id: string;
    connectorId: string;
    type: string;
    schedule: string | null;
    priority: number;
    config: unknown;
  }): Promise<void> {
    // Generate schedule if missing
    if (!job.schedule) {
      const config = job.config as { intervalMs?: number } | null;
      if (config?.intervalMs) {
        job.schedule = intervalMsToCron(config.intervalMs);
        // Update database with generated schedule
        await prisma.syncJob.update({
          where: { id: job.id },
          data: { schedule: job.schedule },
        });
      }
    }

    if (!job.schedule) {
      return; // Can't create job without schedule
    }

    // Remove old job if exists (idempotency)
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

    // Store in Redis for multi-worker support
    await jobSchedulerKeys.set(
      job.connectorId,
      job.type as "FULL" | "INCREMENTAL",
      jobKey
    );

    // Update nextRunAt to reflect when this job will actually run
    const config = job.config as { intervalMs?: number } | null;
    if (config?.intervalMs) {
      const now = Date.now();
      const nextRunAt = new Date(now + config.intervalMs);

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { nextRunAt },
      });

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

  /**
   * Stop the scheduler
   * Note: BullMQ repeatable jobs continue running independently
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("Sync scheduler not running");
      return;
    }

    logger.info("Stopping sync scheduler");
    this.isRunning = false;
    logger.info("Sync scheduler stopped");
  }

  /**
   * Register a new repeatable job for a connector
   * Called when sync settings are updated
   */
  async registerRepeatableJob(
    connectorId: string,
    type: "FULL" | "INCREMENTAL",
    schedule: string,
    priority: number
  ): Promise<void> {
    try {
      // Remove existing job if present (from Redis)
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

      // Store in Redis for multi-worker support
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

  /**
   * Unregister a repeatable job for a connector
   * Called when connector is deleted or paused
   */
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
        // Unregister both full and incremental
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

  /**
   * Get scheduler status
   * Note: repeatableJobCount is not available from Redis without scanning
   */
  getStatus(): {
    running: boolean;
    repeatableJobCount: number;
  } {
    return {
      running: this.isRunning,
      repeatableJobCount: -1, // Not available without Redis scan (expensive)
    };
  }

  /**
   * Get all registered repeatable jobs for a connector
   */
  async getRepeatableJobsForConnector(
    connectorId: string
  ): Promise<{ full: string | null; incremental: string | null }> {
    return await jobSchedulerKeys.getAll(connectorId);
  }
}
