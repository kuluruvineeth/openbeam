import "./instrumentation";
import {
  closeCleanupQueue,
  closeIndexQueue,
  closeMediaProcessingQueue,
  closeSharedBullMqConnection,
  closeSyncQueue,
  closeWebhookQueue,
} from "@openplane/redis";
import { startHealthServer, stopHealthServer } from "./health";
import { startMetricsServer, stopMetricsServer } from "./metrics";
import {
  createCleanupProcessor,
  createFileProcessor,
  createIndexProcessor,
  createMediaProcessor,
  createSyncProcessor,
  createWebhookProcessor,
  type ProcessorResult,
} from "./processors";
import { CleanupScheduler } from "./schedulers/cleanup-scheduler";
import { SyncScheduler } from "./schedulers/sync-scheduler";
import logger from "./utils/logger";
import { metricsPoller } from "./utils/metrics-poller";

class WorkerService {
  private readonly syncScheduler: SyncScheduler;
  private readonly cleanupScheduler: CleanupScheduler;
  private readonly syncProcessor: ProcessorResult;
  private readonly indexProcessor: ProcessorResult;
  private readonly fileProcessor: ProcessorResult;
  private readonly mediaProcessor: ProcessorResult;
  private readonly webhookProcessor: ProcessorResult;
  private readonly cleanupProcessor: ProcessorResult;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");

    this.syncProcessor = createSyncProcessor();
    this.indexProcessor = createIndexProcessor();
    this.fileProcessor = createFileProcessor();
    this.mediaProcessor = createMediaProcessor();
    this.webhookProcessor = createWebhookProcessor();
    this.cleanupProcessor = createCleanupProcessor();

    this.syncScheduler = new SyncScheduler();
    this.cleanupScheduler = new CleanupScheduler("0 2 * * *");

    this.syncScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start sync scheduler");
    });

    this.cleanupScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start cleanup scheduler");
    });

    startMetricsServer().catch((error) => {
      logger.error({ error }, "Failed to start metrics server");
    });

    startHealthServer().catch((error) => {
      logger.error({ error }, "Failed to start health server");
    });

    metricsPoller.start();

    logger.info("OpenPlane Worker started successfully");
    logger.info(
      {
        components: {
          syncScheduler: "running",
          syncProcessor: "running",
          indexProcessor: "running",
          fileProcessor: "running",
          mediaProcessor: "running",
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

  async shutdown(): Promise<void> {
    logger.info("Shutting down OpenPlane Worker...");

    metricsPoller.stop();

    await Promise.all([
      this.syncScheduler.stop(),
      this.cleanupScheduler.stop(),
      this.syncProcessor.close(),
      this.indexProcessor.close(),
      this.fileProcessor.close(),
      this.mediaProcessor.close(),
      this.webhookProcessor.close(),
      this.cleanupProcessor.close(),
      stopMetricsServer(),
      stopHealthServer(),
    ]);

    await Promise.allSettled([
      closeSyncQueue(),
      closeIndexQueue(),
      closeMediaProcessingQueue(),
      closeWebhookQueue(),
      closeCleanupQueue(),
      closeSharedBullMqConnection(),
    ]);

    logger.info("OpenPlane Worker shut down successfully");
    process.exit(0);
  }
}

const workerService = new WorkerService();

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received");
  await workerService.shutdown();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received");
  await workerService.shutdown();
});

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled rejection");
  process.exit(1);
});
