import "./instrumentation";
import {
  closeBackgroundAgentQueue,
  closeCleanupQueue,
  closeConnectorCleanupQueue,
  closeDigestQueue,
  closeEntityExtractionQueue,
  closeIndexQueue,
  closeLTRTrainingQueue,
  closeMediaProcessingQueue,
  closeReembedQueue,
  closeSharedBullMqConnection,
  closeSyncQueue,
  closeWebhookQueue,
} from "@openplane/redis";
import { initializeAI } from "@openplane/services";
import { startHealthServer, stopHealthServer } from "./health";
import { startMetricsServer, stopMetricsServer } from "./metrics";
import {
  createBackgroundAgentProcessor,
  createCleanupProcessor,
  createConnectorCleanupProcessor,
  createDigestProcessor,
  createEntityExtractionProcessor,
  createFileProcessor,
  createIndexProcessor,
  createLTRTrainingProcessor,
  createMediaProcessor,
  createSyncProcessor,
  createWebhookProcessor,
  type ProcessorResult,
} from "./processors";
import { startReembedWorker, stopReembedWorker } from "./processors/reembed";
import { CleanupScheduler } from "./schedulers/cleanup-scheduler";
import { DigestScheduler } from "./schedulers/digest-scheduler";
import { SyncScheduler } from "./schedulers/sync-scheduler";
import logger from "./utils/logger";
import { metricsPoller } from "./utils/metrics-poller";

class WorkerService {
  private readonly syncScheduler: SyncScheduler;
  private readonly cleanupScheduler: CleanupScheduler;
  private readonly digestScheduler: DigestScheduler;
  private readonly syncProcessor: ProcessorResult;
  private readonly indexProcessor: ProcessorResult;
  private readonly fileProcessor: ProcessorResult;
  private readonly mediaProcessor: ProcessorResult;
  private readonly webhookProcessor: ProcessorResult;
  private readonly cleanupProcessor: ProcessorResult;
  private readonly connectorCleanupProcessor: ProcessorResult;
  private readonly digestProcessor: ProcessorResult;
  private readonly ltrTrainingProcessor: ProcessorResult;
  private readonly entityExtractionProcessor: ProcessorResult;
  private readonly backgroundAgentProcessor: ProcessorResult;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");

    initializeAI({ enableMetrics: true });

    this.syncProcessor = createSyncProcessor();
    this.indexProcessor = createIndexProcessor();
    this.fileProcessor = createFileProcessor();
    this.mediaProcessor = createMediaProcessor();
    this.webhookProcessor = createWebhookProcessor();
    this.cleanupProcessor = createCleanupProcessor();
    this.connectorCleanupProcessor = createConnectorCleanupProcessor();
    this.digestProcessor = createDigestProcessor();
    this.ltrTrainingProcessor = createLTRTrainingProcessor();
    this.entityExtractionProcessor = createEntityExtractionProcessor();
    this.backgroundAgentProcessor = createBackgroundAgentProcessor();

    this.syncScheduler = new SyncScheduler();
    this.cleanupScheduler = new CleanupScheduler("0 2 * * *");
    this.digestScheduler = new DigestScheduler();

    this.syncScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start sync scheduler");
    });

    this.cleanupScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start cleanup scheduler");
    });

    this.digestScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start digest scheduler");
    });

    startReembedWorker();

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
          connectorCleanupProcessor: "running",
          digestProcessor: "running",
          digestScheduler: "running",
          ltrTrainingProcessor: "running",
          entityExtractionProcessor: "running",
          backgroundAgentProcessor: "running",
          reembedProcessor: "running",
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
      this.digestScheduler.stop(),
      this.syncProcessor.close(),
      this.indexProcessor.close(),
      this.fileProcessor.close(),
      this.mediaProcessor.close(),
      this.webhookProcessor.close(),
      this.cleanupProcessor.close(),
      this.connectorCleanupProcessor.close(),
      this.digestProcessor.close(),
      this.ltrTrainingProcessor.close(),
      this.entityExtractionProcessor.close(),
      this.backgroundAgentProcessor.close(),
      stopReembedWorker(),
      stopMetricsServer(),
      stopHealthServer(),
    ]);

    await Promise.allSettled([
      closeSyncQueue(),
      closeIndexQueue(),
      closeLTRTrainingQueue(),
      closeEntityExtractionQueue(),
      closeMediaProcessingQueue(),
      closeWebhookQueue(),
      closeCleanupQueue(),
      closeConnectorCleanupQueue(),
      closeDigestQueue(),
      closeReembedQueue(),
      closeBackgroundAgentQueue(),
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
