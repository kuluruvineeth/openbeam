import {
  createRepeatableCleanupJob,
  removeRepeatableCleanupJob,
} from "@openplane/redis";
import logger from "../utils/logger";

/**
 * Cleanup Scheduler
 *
 * Manages the repeatable cleanup job in BullMQ.
 * Ensures the cleanup task runs once daily.
 */
export class CleanupScheduler {
  private isRunning = false;
  private readonly schedule: string;

  /**
   * @param schedule Cron expression (default: "0 2 * * *" - 2 AM daily)
   */
  constructor(schedule = "0 2 * * *") {
    this.schedule = schedule;
  }

  /**
   * Start the scheduler (registers the repeatable job)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Cleanup scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info({ schedule: this.schedule }, "Starting cleanup scheduler");

    try {
      // Remove existing job to ensure schedule update if changed
      // In a real prod system, you might want to be smarter about this
      // to avoid removing jobs if schedule hasn't changed.
      // For now, re-registering ensures correctness.
      await removeRepeatableCleanupJob();

      await createRepeatableCleanupJob(this.schedule);

      logger.info("Cleanup scheduler started successfully");
    } catch (error) {
      logger.error({ error }, "Failed to start cleanup scheduler");
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the scheduler (does NOT remove the job from Redis)
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info("Cleanup scheduler stopped");
  }
}
