import { vespaClient } from "./client";
import type { FeedResponse, GenericDocument } from "./schemas";

interface BatcherConfig {
  maxBatchSize: number;
  flushIntervalMs: number;
  maxConcurrent: number;
}

interface PendingDocument {
  document: GenericDocument;
  resolve: (response: FeedResponse) => void;
  reject: (error: Error) => void;
}

export class VespaBatcher {
  private readonly config: BatcherConfig;
  private readonly buffer: PendingDocument[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private activeFlushes = 0;

  constructor(config?: Partial<BatcherConfig>) {
    this.config = {
      maxBatchSize: config?.maxBatchSize ?? 50,
      flushIntervalMs: config?.flushIntervalMs ?? 100,
      maxConcurrent: config?.maxConcurrent ?? 4,
    };
  }

  add(document: GenericDocument): Promise<FeedResponse> {
    return new Promise<FeedResponse>((resolve, reject) => {
      this.buffer.push({ document, resolve, reject });

      if (this.buffer.length >= this.config.maxBatchSize) {
        this.triggerFlush();
      } else if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          this.flushTimer = null;
          this.triggerFlush();
        }, this.config.flushIntervalMs);
      }
    });
  }

  private triggerFlush(): void {
    this.flush().catch(() => {
      // Errors are handled per-document in flush()
    });
  }

  addMany(documents: GenericDocument[]): Promise<FeedResponse[]> {
    return Promise.all(documents.map((doc) => this.add(doc)));
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) {
      return;
    }

    if (this.activeFlushes >= this.config.maxConcurrent) {
      return;
    }

    this.flushing = true;
    const batch = this.buffer.splice(0, this.config.maxBatchSize);
    this.flushing = false;

    this.activeFlushes += 1;

    try {
      await Promise.all(
        batch.map(async ({ document, resolve, reject }) => {
          try {
            const response = await vespaClient.feedDocument(document);
            resolve(response);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        })
      );
    } finally {
      this.activeFlushes -= 1;
    }

    if (this.buffer.length > 0) {
      this.triggerFlush();
    }
  }

  async forceFlush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    while (this.buffer.length > 0 || this.activeFlushes > 0) {
      await this.flush();
      if (this.activeFlushes > 0) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
  }

  get pendingCount(): number {
    return this.buffer.length;
  }

  get isIdle(): boolean {
    return this.buffer.length === 0 && this.activeFlushes === 0;
  }
}

export const vespaBatcher = new VespaBatcher();
