import {
  type BatchFailure,
  type BatchResult,
  isRetryableError,
} from "./batch-types";
import { vespaClient } from "./client";
import type { FeedResponse, GenericDocument } from "./schemas";

export type { BatchFailure, BatchResult };

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

  async addManyWithResult(documents: GenericDocument[]): Promise<BatchResult> {
    const results = await Promise.allSettled(
      documents.map((doc) => this.add(doc))
    );

    const succeeded: string[] = [];
    const failed: BatchFailure[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const doc = documents[i];
      if (!(result && doc)) {
        continue;
      }

      if (result.status === "fulfilled") {
        succeeded.push(doc.id);
      } else {
        const error = result.reason;
        failed.push({
          documentId: doc.id,
          error: error instanceof Error ? error.message : String(error),
          retryable: isRetryableError(error),
        });
      }
    }

    const totalProcessed = documents.length;
    const successRate =
      totalProcessed > 0 ? succeeded.length / totalProcessed : 0;

    return { succeeded, failed, totalProcessed, successRate };
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    if (this.activeFlushes >= this.config.maxConcurrent) {
      return;
    }

    this.activeFlushes += 1;
    const batch = this.buffer.splice(0, this.config.maxBatchSize);

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
