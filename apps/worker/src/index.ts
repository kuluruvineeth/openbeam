import prisma from "@openbeam/db";
import { closeRedisClient } from "@openbeam/redis";
import { initializeAI } from "@openbeam/services";
import {
  checkHealth,
  getTaskQueuesForWorkerType,
  registerSchedules,
  type StartWorkerOptions,
  startWorker,
  type WorkerType,
  waitForHealthy,
} from "@openbeam/temporal";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Worker } from "@temporalio/worker";
import { startHealthServer, stopHealthServer } from "./health";
import {
  initializeInstrumentation,
  shutdownInstrumentation,
} from "./instrumentation";
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
  "knowledge",
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
  knowledge: 5,
};

const startupTracer = trace.getTracer("openbeam-worker.startup");
const serviceLogger = logger.child({
  service: "openbeam-worker",
  environment: process.env.NODE_ENV || "development",
  version: process.env.APP_VERSION || "0.1.0",
});

async function runStartupPhase<T>(
  phase:
    | "waitForTemporal"
    | "startWorkers"
    | "registerSchedules"
    | "startServers",
  fn: () => Promise<T>
): Promise<T> {
  return await startupTracer.startActiveSpan(
    `worker.startup.${phase}`,
    async (span) => {
      try {
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof Error) {
          span.recordException(error);
        }

        throw error;
      } finally {
        span.end();
      }
    }
  );
}

class WorkerService {
  private readonly workers: Map<WorkerType, Worker> = new Map();
  private isShuttingDown = false;

  constructor() {
    serviceLogger.info("Initializing OpenBeam Worker...");
    initializeAI({ enableMetrics: true });
  }

  async start(): Promise<void> {
    await startupTracer.startActiveSpan("worker.startup", async (span) => {
      try {
        serviceLogger.info("Waiting for Temporal to be healthy...");
        await runStartupPhase("waitForTemporal", async () => {
          await waitForHealthy(undefined, {
            timeoutMs: 60_000,
            intervalMs: 2000,
          });

          const health = await checkHealth();
          serviceLogger.info({ health }, "Temporal health check passed");
        });

        await runStartupPhase("startWorkers", async () => {
          await this.startTemporalWorkers();
        });
        await runStartupPhase("registerSchedules", async () => {
          await this.registerTemporalSchedules();
        });
        await runStartupPhase("startServers", async () => {
          await this.startServers();
        });

        serviceLogger.info("OpenBeam Worker started successfully");
        serviceLogger.info(
          {
            components: {
              temporalWorkers: Array.from(this.workers.keys()),
              metricsServer: "running",
              healthServer: "running",
            },
          },
          "All worker components initialized"
        );
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof Error) {
          span.recordException(error);
        }

        throw error;
      } finally {
        span.end();
      }
    });
  }

  private async startTemporalWorkers(): Promise<void> {
    serviceLogger.info("Starting Temporal workers...");

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
          serviceLogger.info(
            { workerType, taskQueue },
            "Temporal worker created"
          );

          worker.run().catch((error) => {
            if (!this.isShuttingDown) {
              serviceLogger.error(
                { error, workerType, taskQueue },
                "Temporal worker crashed"
              );
            }
          });
        } catch (error) {
          serviceLogger.error(
            { error, workerType, taskQueue },
            "Failed to start Temporal worker"
          );
          throw error;
        }
      });
    });

    await Promise.all(workerPromises);
    serviceLogger.info(
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
      serviceLogger.info("Temporal schedules registered");
    } catch (error) {
      serviceLogger.error({ error }, "Failed to register Temporal schedules");
    }
  }

  private async startServers(): Promise<void> {
    await startMetricsServer().catch((error) => {
      serviceLogger.error({ error }, "Failed to start metrics server");
    });

    await startHealthServer().catch((error) => {
      serviceLogger.error({ error }, "Failed to start health server");
    });
  }

  async shutdown(): Promise<void> {
    serviceLogger.info("Shutting down OpenBeam Worker...");
    this.isShuttingDown = true;

    serviceLogger.info("Stopping health and metrics servers...");
    await Promise.all([stopMetricsServer(), stopHealthServer()]);

    serviceLogger.info("Shutting down Temporal workers...");
    for (const [workerType, worker] of this.workers.entries()) {
      try {
        worker.shutdown();
        serviceLogger.info(
          { workerType },
          "Temporal worker shutdown initiated"
        );
      } catch (error) {
        serviceLogger.error(
          { error, workerType },
          "Error shutting down worker"
        );
      }
    }

    serviceLogger.info("Closing database and cache connections...");
    await Promise.all([
      prisma.$disconnect().catch((error) => {
        serviceLogger.error({ error }, "Error disconnecting Prisma");
      }),
      closeRedisClient().catch((error) => {
        serviceLogger.error({ error }, "Error closing Redis connection");
      }),
      shutdownInstrumentation().catch((error) => {
        serviceLogger.error({ error }, "Error shutting down instrumentation");
      }),
    ]);

    serviceLogger.info("OpenBeam Worker shut down successfully");
    process.exit(0);
  }
}

async function main() {
  const tracingEnabled = initializeInstrumentation();
  serviceLogger.info({ tracingEnabled }, "Worker instrumentation initialized");

  const workerService = new WorkerService();

  process.on("SIGTERM", async () => {
    serviceLogger.info("SIGTERM received");
    await workerService.shutdown();
  });

  process.on("SIGINT", async () => {
    serviceLogger.info("SIGINT received");
    await workerService.shutdown();
  });

  process.on("uncaughtException", (error) => {
    serviceLogger.error({ error }, "Uncaught exception");
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    serviceLogger.error({ reason, promise }, "Unhandled rejection");
    process.exit(1);
  });

  await workerService.start();
}

main().catch((error) => {
  serviceLogger.error({ error }, "Failed to start worker service");
  shutdownInstrumentation()
    .catch((shutdownError) => {
      serviceLogger.error(
        { error: shutdownError },
        "Error shutting down instrumentation after startup failure"
      );
    })
    .finally(() => {
      process.exit(1);
    });
});
