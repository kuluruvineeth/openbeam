import type { GenericDocument } from "@openplane/vespa";
import logger from "../logger";

interface BatcherConfig {
  batchSize: number;
  flushIntervalMs: number;
  maxQueueSize: number;
}

type BatchCallback = (documents: GenericDocument[]) => Promise<void>;

export class DocumentBatcher {
  private readonly queue: GenericDocument[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly config: BatcherConfig;
  private readonly onBatch: BatchCallback;
  private flushing = false;

  constructor(config: BatcherConfig, onBatch: BatchCallback) {
    this.config = config;
    this.onBatch = onBatch;
  }

  start(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      this.flush().catch((err: unknown) => {
        logger.error({ err }, "Periodic flush failed");
      });
    }, this.config.flushIntervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  add(document: GenericDocument): boolean {
    if (this.queue.length >= this.config.maxQueueSize) {
      logger.warn(
        {
          queueSize: this.queue.length,
          maxQueueSize: this.config.maxQueueSize,
        },
        "Document queue full, dropping document"
      );
      return false;
    }

    this.queue.push(document);

    if (this.queue.length >= this.config.batchSize) {
      this.flush().catch((err: unknown) => {
        logger.error({ err }, "Batch flush failed");
      });
    }

    return true;
  }

  async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) {
      return;
    }

    this.flushing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.config.batchSize);
        await this.onBatch(batch);
        logger.debug({ batchSize: batch.length }, "Flushed document batch");
      }
    } catch (err) {
      logger.error({ err }, "Failed to flush document batch");
    } finally {
      this.flushing = false;
    }
  }

  async destroy(): Promise<void> {
    this.stop();
    await this.flush();
  }

  get queueDepth(): number {
    return this.queue.length;
  }
}
