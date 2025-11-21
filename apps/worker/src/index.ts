import { IndexProcessor } from "./processors/index-processor";
import { SyncProcessor } from "./processors/sync-processor";
import logger from "./utils/logger";

/**
 * OpenPlane Worker
 * Background service for processing sync and indexing jobs
 */
class WorkerService {
  private readonly syncProcessor: SyncProcessor;
  private readonly indexProcessor: IndexProcessor;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");

    this.syncProcessor = new SyncProcessor();
    this.indexProcessor = new IndexProcessor();

    logger.info("OpenPlane Worker started successfully");
    logger.info("Listening for sync and index jobs...");
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down OpenPlane Worker...");

    await Promise.all([
      this.syncProcessor.close(),
      this.indexProcessor.close(),
    ]);

    logger.info("OpenPlane Worker shut down successfully");
    process.exit(0);
  }
}

// Initialize worker service
const workerService = new WorkerService();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received");
  await workerService.shutdown();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received");
  await workerService.shutdown();
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled rejection");
  process.exit(1);
});
