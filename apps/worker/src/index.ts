// IMPORTANT: instrumentation must be imported FIRST to properly instrument modules
import "./instrumentation";
import { closeAllQueues, closeSharedBullMqConnection } from "@openplane/redis";
import { workerConfig } from "./config";
import { startHealthServer, stopHealthServer } from "./health";
import { startMetricsServer, stopMetricsServer } from "./metrics";
import { ActionProcessor } from "./processors/action-processor";
// === Enterprise Processors ===
import { AgentProcessor } from "./processors/agent-processor";
import { AnalyticsProcessor } from "./processors/analytics-processor";
// === Core Processors ===
import { CleanupProcessor } from "./processors/cleanup-processor";
import { ExportProcessor } from "./processors/export-processor";
import { IndexProcessor } from "./processors/index-processor";
import { NotificationProcessor } from "./processors/notification-processor";
import { SyncProcessor } from "./processors/sync-processor";
import { WebhookProcessor } from "./processors/webhook-processor";

// === Schedulers ===
import { CleanupScheduler } from "./schedulers/cleanup-scheduler";
import { SyncScheduler } from "./schedulers/sync-scheduler";

// === Utilities ===
import logger from "./utils/logger";
import { metricsPoller } from "./utils/metrics-poller";

/**
 * OpenPlane Worker
 *
 * Enterprise-grade background service for processing sync, indexing,
 * AI agents, actions, analytics, and export jobs.
 *
 * Core Components:
 * - SyncScheduler: Manages connector job scheduling
 * - SyncProcessor: Processes sync jobs (fetches data from connectors)
 * - IndexProcessor: Processes indexing jobs (pushes data to Vespa)
 * - WebhookProcessor: Processes real-time webhook events
 * - CleanupProcessor: Maintains index health (daily cleanup)
 *
 * Enterprise Components:
 * - AgentProcessor: Processes agentic AI tasks (deep research)
 * - ActionProcessor: Processes MCP actions (Glean Actions)
 * - AnalyticsProcessor: Processes user interaction tracking
 * - NotificationProcessor: Processes multi-channel notifications
 * - ExportProcessor: Processes data export jobs (GDPR, analytics)
 *
 * Infrastructure:
 * - MetricsServer: Prometheus metrics (port 9091)
 * - HealthServer: Kubernetes health checks (port 9092)
 */
class WorkerService {
  // === Core Processors ===
  private readonly syncScheduler: SyncScheduler;
  private readonly cleanupScheduler: CleanupScheduler;
  private readonly syncProcessor: SyncProcessor;
  private readonly indexProcessor: IndexProcessor;
  private readonly webhookProcessor: WebhookProcessor;
  private readonly cleanupProcessor: CleanupProcessor;

  // === Enterprise Processors (conditionally enabled) ===
  private agentProcessor?: AgentProcessor;
  private actionProcessor?: ActionProcessor;
  private analyticsProcessor?: AnalyticsProcessor;
  private notificationProcessor?: NotificationProcessor;
  private exportProcessor?: ExportProcessor;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");

    // === Initialize Core Processors ===
    this.syncProcessor = new SyncProcessor();
    this.indexProcessor = new IndexProcessor();
    this.webhookProcessor = new WebhookProcessor();
    this.cleanupProcessor = new CleanupProcessor();

    // === Initialize Enterprise Processors (based on feature flags) ===
    if (workerConfig.features.enableAgents) {
      this.agentProcessor = new AgentProcessor();
      logger.info("Agent processor enabled");
    }

    if (workerConfig.features.enableActions) {
      this.actionProcessor = new ActionProcessor();
      logger.info("Action processor enabled");
    }

    if (workerConfig.features.enableAnalytics) {
      this.analyticsProcessor = new AnalyticsProcessor();
      logger.info("Analytics processor enabled");
    }

    if (workerConfig.features.enableNotifications) {
      this.notificationProcessor = new NotificationProcessor();
      logger.info("Notification processor enabled");
    }

    if (workerConfig.features.enableExports) {
      this.exportProcessor = new ExportProcessor();
      logger.info("Export processor enabled");
    }

    // === Initialize Schedulers ===
    this.syncScheduler = new SyncScheduler();
    this.cleanupScheduler = new CleanupScheduler(workerConfig.cleanup.schedule);

    // === Start Schedulers ===
    this.syncScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start sync scheduler");
    });

    this.cleanupScheduler.start().catch((error) => {
      logger.error({ error }, "Failed to start cleanup scheduler");
    });

    // === Start Infrastructure Services ===
    if (workerConfig.metrics.enabled) {
      startMetricsServer().catch((error) => {
        logger.error({ error }, "Failed to start metrics server");
      });
    }

    if (workerConfig.health.enabled) {
      startHealthServer().catch((error) => {
        logger.error({ error }, "Failed to start health server");
      });
    }

    // Start metrics poller
    metricsPoller.start();

    // === Log Startup Status ===
    logger.info("OpenPlane Worker started successfully");
    logger.info(
      {
        components: {
          // Core
          syncScheduler: "running",
          syncProcessor: "running",
          indexProcessor: "running",
          webhookProcessor: "running",
          cleanupProcessor: "running",
          // Enterprise
          agentProcessor: workerConfig.features.enableAgents
            ? "running"
            : "disabled",
          actionProcessor: workerConfig.features.enableActions
            ? "running"
            : "disabled",
          analyticsProcessor: workerConfig.features.enableAnalytics
            ? "running"
            : "disabled",
          notificationProcessor: workerConfig.features.enableNotifications
            ? "running"
            : "disabled",
          exportProcessor: workerConfig.features.enableExports
            ? "running"
            : "disabled",
          // Infrastructure
          metricsServer: workerConfig.metrics.enabled ? "running" : "disabled",
          healthServer: workerConfig.health.enabled ? "running" : "disabled",
          metricsPoller: "running",
        },
        features: workerConfig.features,
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

    // Stop all processors and schedulers
    const closeOperations: Promise<void>[] = [
      // Schedulers
      this.syncScheduler.stop(),
      this.cleanupScheduler.stop(),
      // Core Processors
      this.syncProcessor.close(),
      this.indexProcessor.close(),
      this.webhookProcessor.close(),
      this.cleanupProcessor.close(),
      // Infrastructure
      stopMetricsServer(),
      stopHealthServer(),
    ];

    // Enterprise Processors (if enabled)
    if (this.agentProcessor) {
      closeOperations.push(this.agentProcessor.close());
    }
    if (this.actionProcessor) {
      closeOperations.push(this.actionProcessor.close());
    }
    if (this.analyticsProcessor) {
      closeOperations.push(this.analyticsProcessor.close());
    }
    if (this.notificationProcessor) {
      closeOperations.push(this.notificationProcessor.close());
    }
    if (this.exportProcessor) {
      closeOperations.push(this.exportProcessor.close());
    }

    await Promise.all(closeOperations);

    // Close all queues and Redis connections
    await Promise.allSettled([closeAllQueues(), closeSharedBullMqConnection()]);

    logger.info("OpenPlane Worker shut down successfully");
    process.exit(0);
  }
}

// === Initialize Worker Service ===
const workerService = new WorkerService();

// === Handle Graceful Shutdown ===
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received");
  await workerService.shutdown();
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received");
  await workerService.shutdown();
});

// === Handle Uncaught Errors ===
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled rejection");
  process.exit(1);
});
