import type { IndexDocumentsOutput } from "@openbeam/types/temporal/workflows";
import type { GenericDocument } from "@openbeam/vespa";
import { proxyActivities } from "@temporalio/workflow";
import { z } from "zod";
import type { DatabaseActivities } from "../../activities/database/types";
import type { EngineActivities } from "../../activities/engine/types";
import type { VespaActivities } from "../../activities/vespa/types";

const IndexDocumentsInputSchema = z.object({
  documents: z.array(z.unknown()),
  connectorId: z.string(),
  batchSize: z.number().optional(),
  syncHistoryId: z.string().optional(),
});

const vespaActivities = proxyActivities<VespaActivities>({
  startToCloseTimeout: "2m",
  scheduleToCloseTimeout: "10m",
  retry: { maximumAttempts: 5, backoffCoefficient: 2 },
});

const databaseActivities = proxyActivities<DatabaseActivities>({
  startToCloseTimeout: "1m",
  scheduleToCloseTimeout: "3m",
  retry: { maximumAttempts: 3, backoffCoefficient: 2 },
});

const engineActivities = proxyActivities<EngineActivities>({
  startToCloseTimeout: "2m",
  scheduleToCloseTimeout: "6m",
  retry: { maximumAttempts: 3, backoffCoefficient: 2 },
});

function chunk<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function isDeletionMarker(document: GenericDocument): boolean {
  if (!document.metadata || typeof document.metadata !== "object") {
    return false;
  }

  const metadata = document.metadata as Record<string, unknown>;
  return metadata.deleted === true;
}

function partitionDocuments(documents: GenericDocument[]): {
  deleteDocuments: GenericDocument[];
  upsertDocuments: GenericDocument[];
} {
  const deleteDocuments: GenericDocument[] = [];
  const upsertDocuments: GenericDocument[] = [];

  for (const document of documents) {
    if (isDeletionMarker(document)) {
      deleteDocuments.push(document);
    } else {
      upsertDocuments.push(document);
    }
  }

  return { deleteDocuments, upsertDocuments };
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
  const { deleteDocuments, upsertDocuments } = partitionDocuments(documents);

  let errors = 0;
  let dataDeleted = 0;

  if (deleteDocuments.length > 0) {
    const documentIds = Array.from(
      new Set(deleteDocuments.map((doc) => doc.id).filter(Boolean))
    );
    const externalIds = Array.from(
      new Set(deleteDocuments.map((doc) => doc.external_id).filter(Boolean))
    );

    if (documentIds.length > 0) {
      const deleteResult = await vespaActivities.deleteDocuments({
        connectorId: input.connectorId,
        documentIds,
      });
      errors += deleteResult.failed;
    }

    if (externalIds.length > 0) {
      const deleteResult = await databaseActivities.deleteIndexedDocuments({
        connectorId: input.connectorId,
        externalIds,
      });
      dataDeleted += deleteResult.deleted;
    }

    if (documentIds.length > 0) {
      await databaseActivities.recordSyncDocumentChanges({
        connectorId: input.connectorId,
        documentIds,
        changeType: "DELETED",
        syncHistoryId: input.syncHistoryId,
      });
    }
  }

  if (upsertDocuments.length === 0) {
    return {
      indexed: 0,
      errors,
      total: input.documents.length,
      skipped: 0,
      dataAdded: 0,
      dataUpdated: 0,
      dataDeleted,
      success: errors === 0,
    };
  }

  const filterResult = await databaseActivities.filterUnchangedDocuments({
    documents: upsertDocuments,
    connectorId: input.connectorId,
  });

  const changedDocuments = filterResult.changedDocuments;
  const skippedUnchanged = filterResult.skipped;

  if (changedDocuments.length === 0) {
    return {
      indexed: 0,
      errors,
      total: input.documents.length,
      skipped: skippedUnchanged,
      dataAdded: 0,
      dataUpdated: 0,
      dataDeleted,
      success: errors === 0,
    };
  }

  const batches = chunk(changedDocuments, batchSize);
  let indexed = 0;
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
    dataDeleted,
    success: errors === 0,
  };
}
