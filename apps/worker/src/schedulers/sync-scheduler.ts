import prisma from "@openplane/db";
import { addSyncJob, type SyncJobData } from "@openplane/redis";
import logger from "../utils/logger";

/**
 * Sync Scheduler
 *
 * Manages multi-strategy job scheduling:
 * - Time-based scheduling (nextRunAt polling)
 * - Priority-based enqueueing
 *
 * Future enhancements:
 * - Cron-based scheduling (BullMQ repeatable jobs)
 * - Adaptive scheduling (ML-based frequency adjustment)
 */
export class SyncScheduler {
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly checkIntervalMs: number;
  private isRunning = false;

  constructor(checkIntervalMs = 3_600_000) {
    // Default: check every hour
    this.checkIntervalMs = checkIntervalMs;
  }

  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Sync scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info(
      { checkIntervalMs: this.checkIntervalMs },
      "Starting sync scheduler"
    );

    // Run initial check immediately
    await this.checkDueJobs();

    // Set up polling interval
    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkDueJobs();
      } catch (error) {
        logger.error({ error }, "Error in scheduler polling loop");
      }
    }, this.checkIntervalMs);

    logger.info("Sync scheduler started successfully");
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("Sync scheduler not running");
      return;
    }

    logger.info("Stopping sync scheduler");

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.isRunning = false;
    logger.info("Sync scheduler stopped");
  }

  /**
   * Check for due jobs and enqueue them
   */
  private async checkDueJobs(): Promise<void> {
    const now = new Date();

    try {
      // Find sync jobs that are due to run
      const dueJobs = await prisma.syncJob.findMany({
        where: {
          nextRunAt: {
            lte: now,
          },
          status: {
            in: ["ACTIVE"], // Only active sync jobs (not SYNCING, ERROR, or INACTIVE)
          },
          deletedAt: null,
        },
        include: {
          connector: true,
        },
        take: 100, // Process max 100 jobs per check
      });

      if (dueJobs.length === 0) {
        logger.debug("No due sync jobs found");
        return;
      }

      logger.info({ count: dueJobs.length }, "Found due sync jobs");

      // Enqueue jobs
      for (const syncJob of dueJobs) {
        try {
          await this.enqueueSyncJob(syncJob);
        } catch (error) {
          logger.error(
            {
              error,
              syncJobId: syncJob.id,
              connectorId: syncJob.connectorId,
            },
            "Failed to enqueue sync job"
          );
        }
      }
    } catch (error) {
      logger.error({ error }, "Failed to check due jobs");
    }
  }

  /**
   * Enqueue a sync job to the queue
   */
  private async enqueueSyncJob(syncJob: {
    id: string;
    connectorId: string;
    type: "FULL" | "INCREMENTAL";
    priority: number;
    config: unknown;
    connector: { status: string };
  }): Promise<void> {
    // Create sync history entry
    const syncHistory = await prisma.syncHistory.create({
      data: {
        syncJobId: syncJob.id,
        connectorId: syncJob.connectorId,
        status: "SYNCING",
      },
    });

    // Prepare job data
    const jobData: SyncJobData = {
      connectorId: syncJob.connectorId,
      syncJobId: syncHistory.id,
      type: syncJob.type,
      priority: syncJob.priority,
    };

    // Add to queue with priority
    await addSyncJob(jobData, syncJob.priority);

    // Update sync job's nextRunAt and lastRanAt
    const nextRunAt = this.calculateNextRunAt(syncJob);

    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        lastRanAt: new Date(),
        nextRunAt,
        status: "SYNCING",
      },
    });

    logger.info(
      {
        syncJobId: syncJob.id,
        connectorId: syncJob.connectorId,
        type: syncJob.type,
        priority: syncJob.priority,
        nextRunAt,
      },
      "Enqueued sync job"
    );
  }

  /**
   * Calculate next run time for a sync job
   *
   * Current implementation: Simple fixed intervals
   * - FULL sync: Every 7 days
   * - INCREMENTAL sync: Every 6 hours
   *
   * Future: Parse cron expressions from syncJob.schedule
   */
  private calculateNextRunAt(syncJob: {
    type: "FULL" | "INCREMENTAL";
    config: unknown;
  }): Date {
    const now = new Date();

    // Check if config has custom interval
    const config = syncJob.config as { intervalMs?: number } | null;
    if (config?.intervalMs) {
      return new Date(now.getTime() + config.intervalMs);
    }

    // Default intervals
    if (syncJob.type === "FULL") {
      // Full sync every 7 days
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    // Incremental sync every 6 hours
    return new Date(now.getTime() + 6 * 60 * 60 * 1000);
  }

  /**
   * Schedule a specific connector for immediate sync
   *
   * @param connectorId - Connector ID
   * @param priority - Job priority (default: 7 for manual syncs)
   */
  async scheduleImmediateSync(
    connectorId: string,
    priority = 7
  ): Promise<void> {
    logger.info({ connectorId, priority }, "Scheduling immediate sync");

    // Find or create sync job
    let syncJob = await prisma.syncJob.findFirst({
      where: { connectorId, deletedAt: null },
    });

    if (!syncJob) {
      // Create new sync job
      syncJob = await prisma.syncJob.create({
        data: {
          connectorId,
          type: "FULL",
          trigger: "MANUAL",
          status: "SYNCING",
          priority,
          nextRunAt: new Date(),
        },
      });
    }

    // Update to run immediately
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        nextRunAt: new Date(),
        priority,
        trigger: "MANUAL",
      },
    });

    // Trigger immediate check
    await this.checkDueJobs();
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    running: boolean;
    checkIntervalMs: number;
  } {
    return {
      running: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
    };
  }
}
