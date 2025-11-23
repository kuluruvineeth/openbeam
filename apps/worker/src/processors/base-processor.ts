import { getRedisConnection } from "@openplane/redis";
import { type Job, Worker, type WorkerOptions } from "bullmq";
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

  protected async initialize(): Promise<void> {
    const connection = await getRedisConnection();

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
  }

  protected abstract processJob(job: Job<T>): Promise<unknown>;

  protected setupEventHandlers(worker: Worker) {
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id }, `${this.queueName} job completed`);
    });

    worker.on("failed", (job, error) => {
      logger.error(
        { jobId: job?.id, error: error.message },
        `${this.queueName} job failed`
      );
    });

    worker.on("error", (error) => {
      logger.error({ error }, `${this.queueName} worker error`);
    });

    worker.on("stalled", (jobId) => {
      logger.warn({ jobId }, `${this.queueName} job stalled`);
    });
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
