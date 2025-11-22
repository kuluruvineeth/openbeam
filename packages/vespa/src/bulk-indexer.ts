/**
 * Bulk Indexing for Vespa
 *
 * High-performance bulk document feeding for full syncs.
 * Uses Vespa's feed API with parallel requests.
 */

import { vespaClient } from "./client";
import type { GenericDocument } from "./types";

interface BulkIndexOptions {
  concurrency?: number; // Parallel requests (default: 5)
  batchSize?: number; // Documents per request (default: 100)
  onProgress?: (indexed: number, total: number) => void;
}

interface BulkIndexResult {
  total: number;
  indexed: number;
  failed: number;
  errors: Array<{ docId: string; error: string }>;
  durationMs: number;
}

/**
 * Bulk index documents to Vespa with parallel processing
 */
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

  // Split documents into batches
  const batches: GenericDocument[][] = [];
  for (let i = 0; i < documents.length; i += batchSize) {
    batches.push(documents.slice(i, i + batchSize));
  }

  // Process batches with limited concurrency
  const processBatch = async (batch: GenericDocument[]) => {
    for (const doc of batch) {
      try {
        await vespaClient.feedDocument(doc);
        result.indexed += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push({
          docId: doc.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    if (onProgress) {
      onProgress(result.indexed, result.total);
    }
  };

  // Process batches in parallel with concurrency limit
  for (let i = 0; i < batches.length; i += concurrency) {
    const batchGroup = batches.slice(i, i + concurrency);
    await Promise.all(batchGroup.map(processBatch));
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Bulk index with progress tracking
 */
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
