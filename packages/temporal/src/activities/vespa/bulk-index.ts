import type { GenericDocument, VespaClient } from "@openplane/vespa";
import type { BulkIndexInput, BulkIndexResult } from "./types";

export function createBulkIndexActivity(vespa: VespaClient) {
  return async function bulkIndex(
    input: BulkIndexInput
  ): Promise<BulkIndexResult> {
    const startTime = Date.now();
    const indexedAt = Date.now();
    const batchSize = input.batchSize ?? 50;
    const concurrency = input.concurrency ?? 5;

    let indexed = 0;
    let failed = 0;
    const errors: Array<{ docId: string; error: string }> = [];

    const documentsWithIndexedAt = input.documents.map((doc) => ({
      ...doc,
      indexed_at: indexedAt,
    }));

    for (
      let i = 0;
      i < documentsWithIndexedAt.length;
      i += batchSize * concurrency
    ) {
      const megaBatch = documentsWithIndexedAt.slice(
        i,
        i + batchSize * concurrency
      );
      const batches: GenericDocument[][] = [];

      for (let j = 0; j < megaBatch.length; j += batchSize) {
        batches.push(megaBatch.slice(j, j + batchSize));
      }

      const results = await Promise.all(
        batches.map((batch) => vespa.feedBatch(batch))
      );

      for (const result of results) {
        indexed += result.succeeded.length;
        failed += result.failed.length;

        for (const failure of result.failed) {
          errors.push({
            docId: failure.documentId,
            error: failure.error,
          });
        }
      }
    }

    return {
      total: input.documents.length,
      indexed,
      failed,
      errors: errors.slice(0, 100),
      durationMs: Date.now() - startTime,
    };
  };
}
