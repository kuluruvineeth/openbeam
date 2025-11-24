// IMPORTANT: instrumentation must be imported FIRST to properly instrument modules
import "./instrumentation";
import {
  closeCleanupQueue,
  closeIndexQueue,
  closeSharedBullMqConnection,
  closeSyncQueue,
  closeWebhookQueue,
} from "@openplane/redis";
import { startHealthServer, stopHealthServer } from "./health";
import { startMetricsServer, stopMetricsServer } from "./metrics";
import { CleanupProcessor } from "./processors/cleanup-processor";
import { IndexProcessor } from "./processors/index-processor";
import { SyncProcessor } from "./processors/sync-processor";
import { WebhookProcessor } from "./processors/webhook-processor";
import { CleanupScheduler } from "./schedulers/cleanup-scheduler";
import { SyncScheduler } from "./schedulers/sync-scheduler";
import logger from "./utils/logger";
import { metricsPoller } from "./utils/metrics-poller";

/**
 * OpenPlane Worker
 * Background service for processing sync and indexing jobs
 *
 * Components:
 * - SyncScheduler: Manages job scheduling (polling for due jobs)
 * - SyncProcessor: Processes sync jobs (fetches data from connectors)
 * - IndexProcessor: Processes indexing jobs (pushes data to Vespa)
 * - WebhookProcessor: Processes real-time webhook events
 * - CleanupProcessor: Maintains index health (daily cleanup)
 * - MetricsServer: Prometheus metrics (port 9091)
 * - HealthServer: Kubernetes health checks (port 9092)
 */
class WorkerService {
  private readonly syncScheduler: SyncScheduler;
  private readonly cleanupScheduler: CleanupScheduler;
  private readonly syncProcessor: SyncProcessor;
  private readonly indexProcessor: IndexProcessor;
  private readonly webhookProcessor: WebhookProcessor;
  private readonly cleanupProcessor: CleanupProcessor;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");

    // Initialize processors
    this.syncProcessor = new SyncProcessor();
    this.indexProcessor = new IndexProcessor();
    this.webhookProcessor = new WebhookProcessor();
    this.cleanupProcessor = new CleanupProcessor();

    // Initialize and start schedulers
    this.syncScheduler = new SyncScheduler();
    this.cleanupScheduler = new CleanupScheduler("0 2 * * *"); // Daily at 2 AM

    this.syncScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start sync scheduler");
    });

    this.cleanupScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start cleanup scheduler");
    });

    // Start metrics and health servers
    startMetricsServer().catch((error) => {
      logger.error({ error }, "Failed to start metrics server");
    });

    startHealthServer().catch((error) => {
      logger.error({ error }, "Failed to start health server");
    });

    // Start metrics poller
    metricsPoller.start();

    logger.info("OpenPlane Worker started successfully");
    logger.info(
      {
        components: {
          syncScheduler: "running",
          syncProcessor: "running",
          indexProcessor: "running",
          webhookProcessor: "running",
          cleanupProcessor: "running",
          metricsServer: "running",
          healthServer: "running",
          metricsPoller: "running",
        },
      },
      "All worker components initialized"
    );
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info("Shutting down OpenPlane Worker...");

    // Stop metrics poller
    metricsPoller.stop();

    await Promise.all([
      this.syncScheduler.stop(),
      this.cleanupScheduler.stop(),
      this.syncProcessor.close(),
      this.indexProcessor.close(),
      this.webhookProcessor.close(),
      this.cleanupProcessor.close(),
      stopMetricsServer(),
      stopHealthServer(),
    ]);

    await Promise.allSettled([
      closeSyncQueue(),
      closeIndexQueue(),
      closeWebhookQueue(),
      closeCleanupQueue(),
      closeSharedBullMqConnection(),
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
