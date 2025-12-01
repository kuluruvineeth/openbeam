import type { Job, Worker, WorkerOptions } from "bullmq";

export type JobHandler<TData, TResult> = (job: Job<TData>) => Promise<TResult>;

export interface CreateWorkerOptions extends Partial<WorkerOptions> {
  queueName: string;
  concurrency?: number;
  limiter?: { max: number; duration: number };
}

export interface ProcessorResult {
  worker: Worker;
  close: () => Promise<void>;
}
