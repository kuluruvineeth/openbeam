import { getSharedBullMqConnection } from "@openplane/redis";
import { type Job, Worker, type WorkerOptions } from "bullmq";
import { indexJobsTotal, syncJobsTotal, webhookEventsTotal } from "../metrics";
import logger from "../utils/logger";

export abstract class BaseProcessor<T> {
  protected worker: Worker | null = null;
  protected readonly initialization: Promise<void>;
  protected readonly queueName: string;
  protected readonly workerOptions: Partial<WorkerOptions>;

  constructor(queueName: string, workerOptions: Partial<WorkerOptions> = {}) {
    this.queueName = queueName;
    this.workerOptions = workerOptions;
    this.initialization = this.initialize();
  }

  protected initialize(): Promise<void> {
    const connection = getSharedBullMqConnection();

    const worker = new Worker(
      this.queueName,
      async (job: Job<T>) => this.processJob(job),
      {
        connection,
        ...this.workerOptions,
      }
    );

    this.setupEventHandlers(worker);
    this.worker = worker;

    return Promise.resolve();
  }

  protected abstract processJob(job: Job<T>): Promise<unknown>;

  protected getConnectorId(job: Job<T>): string | undefined {
    // biome-ignore lint/suspicious/noExplicitAny: job.data is typed as any
    const data = job.data as any;
    return data?.connectorId;
  }

  protected setupEventHandlers(worker: Worker) {
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id }, `${this.queueName} job completed`);

      const connectorId = this.getConnectorId(job);
      if (connectorId || this.queueName === "webhook") {
        this.incrementMetrics(connectorId || "", "completed", job);
      }
    });

    worker.on("failed", (job, error) => {
      logger.error(
        { jobId: job?.id, error: error.message },
        `${this.queueName} job failed`
      );

      if (job) {
        const connectorId = this.getConnectorId(job);
        if (connectorId || this.queueName === "webhook") {
          this.incrementMetrics(connectorId || "", "failed", job);
        }
      }
    });

    worker.on("error", (error) => {
      logger.error({ error }, `${this.queueName} worker error`);
    });

    worker.on("stalled", (jobId) => {
      logger.warn({ jobId }, `${this.queueName} job stalled`);
    });
  }

  protected incrementMetrics(
    connectorId: string,
    status: "completed" | "failed",
    job?: Job<T>
  ): void {
    try {
      switch (this.queueName) {
        case "sync":
          syncJobsTotal.inc({ connector_id: connectorId, status });
          break;
        case "index":
          indexJobsTotal.inc({ connector_id: connectorId, status });
          break;
        case "webhook":
          if (job) {
            // biome-ignore lint/suspicious/noExplicitAny: job.data structure varies by queue
            const data = job.data as any;
            const source = data?.source || "unknown";
            const eventType = data?.eventType || "unknown";
            webhookEventsTotal.inc({ source, event_type: eventType, status });
          }
          break;
        default:
          logger.debug(
            { queue: this.queueName },
            "No metrics for this queue type"
          );
      }
    } catch (error) {
      logger.error(
        { error, queue: this.queueName },
        "Failed to increment metrics"
      );
    }
  }

  async close(): Promise<void> {
    await this.initialization;
    if (this.worker) {
      await this.worker.close();
      logger.info(`${this.queueName} processor closed`);
    }
  }

  getWorker(): Worker {
    if (!this.worker) {
      throw new Error(`${this.queueName} worker not initialized`);
    }
    return this.worker;
  }
}
