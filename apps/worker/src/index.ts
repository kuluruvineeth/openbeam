import { IndexProcessor } from "./processors/index-processor";
import { SyncProcessor } from "./processors/sync-processor";
import { SyncScheduler } from "./schedulers/sync-scheduler";
import logger from "./utils/logger";

/**
 * OpenPlane Worker
 * Background service for processing sync and indexing jobs
 * 
 * Components:
 * - SyncScheduler: Manages job scheduling (polling for due jobs)
 * - SyncProcessor: Processes sync jobs (fetches data from connectors)
 * - IndexProcessor: Processes indexing jobs (pushes data to Vespa)
 */
class WorkerService {
  private readonly syncScheduler: SyncScheduler;
  private readonly syncProcessor: SyncProcessor;
  private readonly indexProcessor: IndexProcessor;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");

    // Initialize processors
    this.syncProcessor = new SyncProcessor();
    this.indexProcessor = new IndexProcessor();
    
    // Initialize and start scheduler
    this.syncScheduler = new SyncScheduler(3600000); // Check every 1 hour
    this.syncScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start sync scheduler");
    });

    logger.info("OpenPlane Worker started successfully");
    logger.info({
      components: {
        syncScheduler: "running",
        syncProcessor: "running",
        indexProcessor: "running",
      },
    }, "All worker components initialized");
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down OpenPlane Worker...");

    await Promise.all([
      this.syncScheduler.stop(),
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
