import "./instrumentation";
import prisma from "@openplane/db";
import { closeRedisClient } from "@openplane/redis";
import { initializeAI } from "@openplane/services";
import {
  checkHealth,
  getTaskQueuesForWorkerType,
  registerSchedules,
  type StartWorkerOptions,
  startWorker,
  type WorkerType,
  waitForHealthy,
} from "@openplane/temporal";
import type { Worker } from "@temporalio/worker";
import { startHealthServer, stopHealthServer } from "./health";
import { startMetricsServer, stopMetricsServer } from "./metrics";
import logger from "./utils/logger";

const WORKER_TYPES: WorkerType[] = [
  "sync",
  "file",
  "media",
  "webhook",
  "agent",
  "canvas",
  "maintenance",
  "scheduled",
];

const WORKER_CONCURRENCY: Record<WorkerType, number> = {
  sync: 5,
  file: 10,
  media: 3,
  webhook: 20,
  agent: 5,
  canvas: 5,
  maintenance: 2,
  scheduled: 3,
};

class WorkerService {
  private readonly workers: Map<WorkerType, Worker> = new Map();
  private isShuttingDown = false;

  constructor() {
    logger.info("Initializing OpenPlane Worker...");
    initializeAI({ enableMetrics: true });
  }

  async start(): Promise<void> {
    logger.info("Waiting for Temporal to be healthy...");
    await waitForHealthy(undefined, { timeoutMs: 60_000, intervalMs: 2000 });

    const health = await checkHealth();
    logger.info({ health }, "Temporal health check passed");

    await this.startTemporalWorkers();
    await this.registerTemporalSchedules();
    await this.startServers();

    logger.info("OpenPlane Worker started successfully");
    logger.info(
      {
        components: {
          temporalWorkers: Array.from(this.workers.keys()),
          metricsServer: "running",
          healthServer: "running",
        },
      },
      "All worker components initialized"
    );
  }

  private async startTemporalWorkers(): Promise<void> {
    logger.info("Starting Temporal workers...");

    const workerPromises = WORKER_TYPES.flatMap((workerType) => {
      const taskQueues = getTaskQueuesForWorkerType(workerType);

      return taskQueues.map(async (taskQueue) => {
        const options: StartWorkerOptions = {
          workerType,
          taskQueue,
          maxConcurrentActivities: this.getConcurrencyForWorkerType(workerType),
        };

        try {
          const worker = await startWorker(options);
          const workerKey = `${workerType}:${taskQueue}` as WorkerType;
          this.workers.set(workerKey, worker);
          logger.info({ workerType, taskQueue }, "Temporal worker created");

          worker.run().catch((error) => {
            if (!this.isShuttingDown) {
              logger.error(
                { error, workerType, taskQueue },
                "Temporal worker crashed"
              );
            }
          });
        } catch (error) {
          logger.error(
            { error, workerType, taskQueue },
            "Failed to start Temporal worker"
          );
          throw error;
        }
      });
    });

    await Promise.all(workerPromises);
    logger.info(
      { workerCount: this.workers.size },
      "All Temporal workers started"
    );
  }

  private getConcurrencyForWorkerType(workerType: WorkerType): number {
    return WORKER_CONCURRENCY[workerType];
  }

  private async registerTemporalSchedules(): Promise<void> {
    try {
      await registerSchedules();
      logger.info("Temporal schedules registered");
    } catch (error) {
      logger.error({ error }, "Failed to register Temporal schedules");
    }
  }

  private async startServers(): Promise<void> {
    await startMetricsServer().catch((error) => {
      logger.error({ error }, "Failed to start metrics server");
    });

    await startHealthServer().catch((error) => {
      logger.error({ error }, "Failed to start health server");
    });
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down OpenPlane Worker...");
    this.isShuttingDown = true;

    logger.info("Stopping health and metrics servers...");
    await Promise.all([stopMetricsServer(), stopHealthServer()]);

    logger.info("Shutting down Temporal workers...");
    for (const [workerType, worker] of this.workers.entries()) {
      try {
        worker.shutdown();
        logger.info({ workerType }, "Temporal worker shutdown initiated");
      } catch (error) {
        logger.error({ error, workerType }, "Error shutting down worker");
      }
    }

    logger.info("Closing database and cache connections...");
    await Promise.all([
      prisma.$disconnect().catch((error) => {
        logger.error({ error }, "Error disconnecting Prisma");
      }),
      closeRedisClient().catch((error) => {
        logger.error({ error }, "Error closing Redis connection");
      }),
    ]);

    logger.info("OpenPlane Worker shut down successfully");
    process.exit(0);
  }
}

async function main() {
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

  await workerService.start();
}

main().catch((error) => {
  logger.error({ error }, "Failed to start worker service");
  process.exit(1);
});
