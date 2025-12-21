import { vespaClient } from "./client";
import type { GenericDocument } from "./schemas";

interface BulkIndexOptions {
  concurrency?: number;
  batchSize?: number;
  onProgress?: (indexed: number, total: number) => void;
}

interface BulkIndexResult {
  total: number;
  indexed: number;
  failed: number;
  errors: Array<{ docId: string; error: string }>;
  durationMs: number;
}

export async function bulkIndexDocuments(
  documents: GenericDocument[],
  options: BulkIndexOptions = {}
): Promise<BulkIndexResult> {
  const { concurrency = 5, batchSize = 100, onProgress } = options;

  const startTime = Date.now();
  const result: BulkIndexResult = {
    total: documents.length,
    indexed: 0,
    failed: 0,
    errors: [],
    durationMs: 0,
  };

  const batches: GenericDocument[][] = [];
  for (let i = 0; i < documents.length; i += batchSize) {
    batches.push(documents.slice(i, i + batchSize));
  }

  const processBatch = async (batch: GenericDocument[]) => {
    const feedResults = await Promise.allSettled(
      batch.map((doc) => vespaClient.feedDocument(doc).then(() => doc.id))
    );

    for (let i = 0; i < feedResults.length; i++) {
      const feedResult = feedResults[i];
      const doc = batch[i];
      if (feedResult?.status === "fulfilled") {
        result.indexed += 1;
      } else if (feedResult?.status === "rejected" && doc) {
        result.failed += 1;
        result.errors.push({
          docId: doc.id,
          error:
            feedResult.reason instanceof Error
              ? feedResult.reason.message
              : "Unknown error",
        });
      }
    }

    if (onProgress) {
      onProgress(result.indexed, result.total);
    }
  };

  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);
    await Promise.all(batchGroup.map(processBatch));
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

export class BulkIndexer {
  private indexed = 0;
  private failed = 0;
  private total = 0;

  indexDocuments(
    documents: GenericDocument[],
    options?: BulkIndexOptions
  ): Promise<BulkIndexResult> {
    this.total = documents.length;
    this.indexed = 0;
    this.failed = 0;

    return bulkIndexDocuments(documents, {
      ...options,
      onProgress: (indexed, total) => {
        this.indexed = indexed;
        this.total = total;
        options?.onProgress?.(indexed, total);
      },
    });
  }

  getProgress(): {
    indexed: number;
    failed: number;
    total: number;
    percentage: number;
  } {
    return {
      indexed: this.indexed,
      failed: this.failed,
      total: this.total,
      percentage: this.total > 0 ? (this.indexed / this.total) * 100 : 0,
    };
  }
}

export const bulkIndexer = new BulkIndexer();
