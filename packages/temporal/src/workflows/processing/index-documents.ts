import {
  IndexDocumentsInputSchema,
  type IndexDocumentsOutput,
} from "@openplane/types/temporal/workflows";
import type { GenericDocument } from "@openplane/vespa";
import { proxyActivities } from "@temporalio/workflow";
import type { DatabaseActivities } from "../../activities/database/types";
import type { EngineActivities } from "../../activities/engine/types";
import type { VespaActivities } from "../../activities/vespa/types";

const vespaActivities = proxyActivities<VespaActivities>({
  startToCloseTimeout: "2m",
  retry: { maximumAttempts: 5, backoffCoefficient: 2 },
});

const databaseActivities = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: "1m",
  retry: { maximumAttempts: 3, backoffCoefficient: 2 },
});

const engineActivities = proxyActivities<EngineActivities>({
  startToCloseTimeout: "2m",
  retry: { maximumAttempts: 3, backoffCoefficient: 2 },
});

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function embedDocuments(
  documents: GenericDocument[]
): Promise<GenericDocument[]> {
  if (documents.length === 0) {
    return documents;
  }

  const EMBEDDING_BATCH_SIZE = 10;
  const MAX_TEXT_LENGTH = 8000;
  const embeddedDocs: GenericDocument[] = [];

  for (let i = 0; i < documents.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = documents.slice(i, i + EMBEDDING_BATCH_SIZE);

    const texts = batch.map((doc) => {
      const parts = [doc.title, doc.content].filter(Boolean);
      const combined = parts.join("\n\n");
      return combined.length > MAX_TEXT_LENGTH
        ? combined.slice(0, MAX_TEXT_LENGTH)
        : combined;
    });

    const embedded = await engineActivities.generateEmbeddings({
      texts,
      returnSparse: true,
      maxLength: 8192,
    });

    const batchWithEmbeddings = batch.map((doc, idx) => ({
      ...doc,
      embedding: embedded.embeddings[idx],
      sparse_embedding: embedded.sparseEmbeddings?.[idx],
    }));

    embeddedDocs.push(...batchWithEmbeddings);
  }

  return embeddedDocs;
}

export async function indexDocumentsWorkflow(
  rawInput: unknown
): Promise<IndexDocumentsOutput> {
  const input = IndexDocumentsInputSchema.parse(rawInput);
  const batchSize = input.batchSize ?? 100;
  const documents = input.documents as GenericDocument[];

  const filterResult = await databaseActivities.filterUnchangedDocuments({
    documents,
    connectorId: input.connectorId,
  });

  const changedDocuments = filterResult.changedDocuments;
  const skippedUnchanged = filterResult.skipped;

  if (changedDocuments.length === 0) {
    return {
      indexed: 0,
      errors: 0,
      total: input.documents.length,
      skipped: skippedUnchanged,
      dataAdded: 0,
      dataUpdated: 0,
      success: true,
    };
  }

  const batches = chunk(changedDocuments, batchSize);
  let indexed = 0;
  let errors = 0;
  let dataAdded = 0;
  let dataUpdated = 0;

  for (const batch of batches) {
    const deduped = await vespaActivities.deduplicateByChecksum({
      documents: batch,
    });

    if (deduped.length > 0) {
      const withEmbeddings = await embedDocuments(deduped);

      const result = await vespaActivities.bulkIndex({
        documents: withEmbeddings,
        connectorId: input.connectorId,
      });
      indexed += result.indexed;
      errors += result.failed;

      if (result.indexed > 0) {
        const failedIds = new Set(result.errors.map((e) => e.docId));
        const successfulDocs = withEmbeddings.filter(
          (d) => !failedIds.has(d.id)
        );

        const trackResult = await databaseActivities.trackIndexedDocuments({
          documents: successfulDocs,
          connectorId: input.connectorId,
          syncHistoryId: input.syncHistoryId,
        });
        dataAdded += trackResult.dataAdded;
        dataUpdated += trackResult.dataUpdated;
      }
    }
  }

  return {
    indexed,
    errors,
    total: input.documents.length,
    skipped: skippedUnchanged,
    dataAdded,
    dataUpdated,
    success: errors === 0,
  };
}
