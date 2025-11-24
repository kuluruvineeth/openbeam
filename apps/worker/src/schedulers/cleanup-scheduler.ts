import {
  createRepeatableCleanupJob,
  removeRepeatableCleanupJob,
} from "@openplane/redis";
import logger from "../utils/logger";

export class CleanupScheduler {
  private isRunning = false;
  private readonly schedule: string;

  constructor(schedule = "0 2 * * *") {
    this.schedule = schedule;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Cleanup scheduler already running");
      return;
    }

    this.isRunning = true;
    logger.info({ schedule: this.schedule }, "Starting cleanup scheduler");

    try {
      await removeRepeatableCleanupJob();

      await createRepeatableCleanupJob(this.schedule);

      logger.info("Cleanup scheduler started successfully");
    } catch (error) {
      logger.error({ error }, "Failed to start cleanup scheduler");
      this.isRunning = false;
      throw error;
    }
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info("Cleanup scheduler stopped");
  }
}
