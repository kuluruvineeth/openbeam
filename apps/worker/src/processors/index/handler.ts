import prisma, {
  findIndexedDocumentsByExternalIds,
  updateSyncHistoryCounts,
  upsertIndexedDocument,
} from "@openplane/db";
import { createLinkedSpan, type IndexJobData } from "@openplane/redis";
import { type GenericDocument, vespaClient } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import {
  calculateDocumentChecksum,
  checksumsMatch,
} from "../../utils/checksum";
import {
  type DocumentWithEmbeddings,
  generateEmbeddingsForDocuments,
  isEmbeddingEnabled,
} from "../../utils/embeddings";
import logger from "../../utils/logger";
import { logJobError, logJobStart } from "../event-handlers";

const tracer = trace.getTracer("openplane-worker");

export interface IndexJobResult {
  indexed: number;
}

export async function processIndexJob(
  job: Job<IndexJobData>
): Promise<IndexJobResult> {
  const { connectorId, documents, batchId, syncHistoryId, traceContext } =
    job.data;

  const span = createLinkedSpan(
    "openplane-worker",
    "index-processor.process",
    traceContext,
    {
      "job.id": job.id || "",
      "connector.id": connectorId,
      "batch.id": batchId,
      "sync.history_id": syncHistoryId || "",
      "index.document_count": documents.length,
    }
  );

  try {
    logJobStart("index", job.id, {
      connectorId,
      batchId,
      documentCount: documents.length,
    });

    const existingDocsMap = await fetchExistingDocuments(
      connectorId,
      documents
    );

    const { docsToIndex, docsToSkip } = deduplicateDocuments(
      documents,
      existingDocsMap,
      connectorId
    );

    logger.info(
      {
        connectorId,
        batchId,
        toIndex: docsToIndex.length,
        skipped: docsToSkip.length,
      },
      "Checksum deduplication complete"
    );

    const successfullyIndexed = await indexToVespa(
      docsToIndex,
      connectorId,
      batchId
    );

    const recordedCount = await recordInDatabase(
      successfullyIndexed,
      existingDocsMap,
      connectorId,
      batchId
    );

    logger.info(
      {
        connectorId,
        batchId,
        recorded: recordedCount,
        indexed: successfullyIndexed.length,
        skipped: docsToSkip.length,
        totalInBatch: documents.length,
      },
      "Indexed documents recorded in database"
    );

    await updateSyncHistory({
      syncHistoryId,
      successfullyIndexed,
      existingDocsMap,
      skippedCount: docsToSkip.length,
      totalInBatch: documents.length,
      connectorId,
      batchId,
    });

    span.setAttributes({
      "index.indexed": successfullyIndexed.length,
      "index.skipped": docsToSkip.length,
      "index.recorded": recordedCount,
    });
    span.setStatus({ code: SpanStatusCode.OK });

    return { indexed: successfullyIndexed.length };
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    span.setAttributes({
      "error.type": error instanceof Error ? error.constructor.name : "Unknown",
    });
    logJobError("index", job.id, error, { connectorId, batchId });
    throw error;
  } finally {
    span.end();
  }
}

async function fetchExistingDocuments(
  connectorId: string,
  documents: IndexJobData["documents"]
): Promise<Map<string, { checksum: string; lastChecksum: string | null }>> {
  const span = tracer.startSpan("index-processor.fetch-existing");
  try {
    const map = await findIndexedDocumentsByExternalIds(
      prisma,
      connectorId,
      documents.map((d) => d.external_id)
    );

    span.setAttributes({ "index.existing_count": map.size });
    span.setStatus({ code: SpanStatusCode.OK });
    return map;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

function deduplicateDocuments(
  documents: IndexJobData["documents"],
  existingDocsMap: Map<
    string,
    { checksum: string; lastChecksum: string | null }
  >,
  connectorId: string
): {
  docsToIndex: Array<GenericDocument & { checksum: string }>;
  docsToSkip: string[];
} {
  const span = tracer.startSpan("index-processor.deduplicate");
  try {
    const docsToIndex: Array<GenericDocument & { checksum: string }> = [];
    const docsToSkip: string[] = [];

    for (const doc of documents) {
      const normalizedDoc = normalizeDocument(doc);
      const newChecksum = calculateDocumentChecksum({
        title: normalizedDoc.title,
        content: normalizedDoc.content,
      });

      const existing = existingDocsMap.get(doc.external_id);

      if (
        existing?.checksum &&
        checksumsMatch(existing.checksum, newChecksum)
      ) {
        docsToSkip.push(doc.external_id);
        logger.debug(
          { docId: doc.external_id, connectorId },
          "Document unchanged, skipping"
        );
      } else {
        docsToIndex.push({ ...normalizedDoc, checksum: newChecksum });
      }
    }

    span.setAttributes({
      "index.to_index": docsToIndex.length,
      "index.skipped": docsToSkip.length,
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return { docsToIndex, docsToSkip };
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

async function indexToVespa(
  docsToIndex: Array<GenericDocument & { checksum: string }>,
  connectorId: string,
  batchId: string
): Promise<Array<GenericDocument & { checksum: string }>> {
  const span = tracer.startSpan("index-processor.index-to-vespa", {
    attributes: {
      "connector.id": connectorId,
      "index.document_count": docsToIndex.length,
    },
  });

  try {
    let docsWithEmbeddings: Array<
      DocumentWithEmbeddings & { checksum: string }
    >;
    const embeddingsEnabled = isEmbeddingEnabled();

    if (embeddingsEnabled) {
      logger.info(
        { connectorId, batchId, count: docsToIndex.length },
        "Generating embeddings for documents"
      );
      const embeddedDocs = await generateEmbeddingsForDocuments(
        docsToIndex,
        connectorId
      );
      // Preserve checksum
      docsWithEmbeddings = embeddedDocs.map((doc, i) => ({
        ...doc,
        checksum: docsToIndex[i]?.checksum ?? "",
      }));
    } else {
      logger.debug(
        { connectorId, batchId },
        "Embeddings disabled, indexing without vectors"
      );
      docsWithEmbeddings = docsToIndex;
    }

    const successfullyIndexed: Array<GenericDocument & { checksum: string }> =
      [];

    for (const doc of docsWithEmbeddings) {
      try {
        const { checksum: _checksum, ...docForVespa } = doc;
        await vespaClient.feedDocument(docForVespa);
        const originalDoc = docsToIndex.find((d) => d.id === doc.id);
        if (originalDoc) {
          successfullyIndexed.push(originalDoc);
        }
      } catch (docError) {
        logDocumentError(docError, doc.external_id, connectorId, doc.id);
      }
    }

    if (successfullyIndexed.length === 0 && docsToIndex.length > 0) {
      throw new Error("Failed to index any documents in batch");
    }

    logger.info(
      {
        connectorId,
        batchId,
        count: successfullyIndexed.length,
        withEmbeddings: embeddingsEnabled,
      },
      "Documents indexed to Vespa"
    );

    span.setAttributes({
      "index.indexed_count": successfullyIndexed.length,
      "index.embeddings_enabled": embeddingsEnabled,
    });
    span.setStatus({ code: SpanStatusCode.OK });
    return successfullyIndexed;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

async function recordInDatabase(
  successfullyIndexed: Array<GenericDocument & { checksum: string }>,
  existingDocsMap: Map<
    string,
    { checksum: string; lastChecksum: string | null }
  >,
  connectorId: string,
  batchId: string
): Promise<number> {
  const span = tracer.startSpan("index-processor.record-database");
  try {
    const indexedDocuments = successfullyIndexed.map((doc) => ({
      connectorId,
      externalId: doc.external_id,
      vespaId: doc.id,
      documentType: doc.document_type,
      sourceId: doc.source_id,
      title: doc.title,
      checksum: doc.checksum,
      lastChecksum: existingDocsMap.get(doc.external_id)?.checksum,
    }));

    let recordedCount = 0;
    if (indexedDocuments.length > 0) {
      try {
        for (const doc of indexedDocuments) {
          await upsertIndexedDocument(prisma, doc);
          recordedCount += 1;
        }
      } catch (dbError) {
        logger.error(
          { error: dbError, connectorId, batchId },
          "Failed to record indexed documents in database"
        );
      }
    }

    span.setAttributes({ "index.recorded_count": recordedCount });
    span.setStatus({ code: SpanStatusCode.OK });
    return recordedCount;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

async function updateSyncHistory(params: {
  syncHistoryId: string | undefined;
  successfullyIndexed: Array<GenericDocument & { checksum: string }>;
  existingDocsMap: Map<
    string,
    { checksum: string; lastChecksum: string | null }
  >;
  skippedCount: number;
  totalInBatch: number;
  connectorId: string;
  batchId: string;
}): Promise<void> {
  const {
    syncHistoryId,
    successfullyIndexed,
    existingDocsMap,
    skippedCount,
    totalInBatch,
    connectorId,
    batchId,
  } = params;

  if (!syncHistoryId) {
    return;
  }

  const span = tracer.startSpan("index-processor.update-sync-history");
  try {
    let newCount = 0;
    let updatedCount = 0;

    for (const doc of successfullyIndexed) {
      const existing = existingDocsMap.get(doc.external_id);
      if (existing) {
        updatedCount += 1;
      } else {
        newCount += 1;
      }
    }

    await updateSyncHistoryCounts(
      prisma,
      syncHistoryId,
      newCount,
      updatedCount
    );

    logger.debug(
      {
        syncHistoryId,
        newCount,
        updatedCount,
        skipped: skippedCount,
        totalInBatch,
      },
      "Updated sync history with indexed counts"
    );

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (updateError) {
    logger.warn(
      { error: updateError, syncHistoryId, connectorId, batchId },
      "Failed to update sync history with indexed counts"
    );
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message:
        updateError instanceof Error
          ? updateError.message
          : String(updateError),
    });
  } finally {
    span.end();
  }
}

function normalizeDocument(
  doc: IndexJobData["documents"][number]
): GenericDocument {
  let metadata: GenericDocument["metadata"];

  if (typeof doc.metadata === "string") {
    try {
      metadata = JSON.parse(doc.metadata);
    } catch {
      metadata = { raw: doc.metadata };
    }
  } else {
    metadata = doc.metadata as GenericDocument["metadata"];
  }

  return { ...doc, metadata };
}

function logDocumentError(
  docError: unknown,
  externalId: string,
  connectorId: string,
  vespaId: string
): void {
  const errorInfo =
    docError instanceof Error
      ? {
          name: docError.name,
          message: docError.message,
          stack: docError.stack,
        }
      : { error: String(docError), type: typeof docError };

  logger.error(
    { ...errorInfo, docId: externalId, connectorId, vespaId },
    "Failed to feed individual document to Vespa"
  );
}
