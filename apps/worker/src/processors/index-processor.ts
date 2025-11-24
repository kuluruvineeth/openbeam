// TODO: Check back tracing after Bun supports OpenTelemetry
import prisma from "@openplane/db";
import {
  createLinkedSpan,
  getIndexRetryStrategy,
  type IndexJobData,
} from "@openplane/redis";
import { type GenericDocument, vespaClient } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import { calculateDocumentChecksum, checksumsMatch } from "../utils/checksum";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

const tracer = trace.getTracer("openplane-worker");

export class IndexProcessor extends BaseProcessor<IndexJobData> {
  constructor() {
    super("index", {
      concurrency: 10,
      limiter: {
        max: 50,
        duration: 1000,
      },
      settings: {
        backoffStrategy: (attemptsMade: number) =>
          getIndexRetryStrategy(attemptsMade, new Error("Retry attempt")),
      },
    });
  }

  protected async processJob(
    job: Job<IndexJobData>
  ): Promise<{ indexed: number }> {
    const { connectorId, documents, batchId, syncHistoryId, traceContext } =
      job.data;

    // Create span linked to parent trace context from job data
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
      logger.info(
        {
          jobId: job.id,
          connectorId,
          batchId,
          documentCount: documents.length,
        },
        "Processing index job"
      );

      const existingDocsMap = await this.fetchExistingDocumentsWithSpan(
        connectorId,
        documents
      );

      const { docsToIndex, docsToSkip } = this.deduplicateDocumentsWithSpan(
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

      const successfullyIndexed = await this.indexToVespaWithSpan(
        docsToIndex,
        connectorId,
        batchId
      );

      const recordedCount = await this.recordInDatabaseWithSpan(
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

      await this.updateSyncHistoryWithSpan({
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
        "error.type":
          error instanceof Error ? error.constructor.name : "Unknown",
      });
      this.logError(error, job.id, connectorId, job.data.batchId);
      throw error;
    } finally {
      span.end();
    }
  }

  private async fetchExistingDocumentsWithSpan(
    connectorId: string,
    documents: IndexJobData["documents"]
  ): Promise<Map<string, { checksum: string; lastChecksum: string | null }>> {
    const span = tracer.startSpan("index-processor.fetch-existing");
    try {
      const existingDocsMap = await this.fetchExistingDocuments(
        connectorId,
        documents
      );
      span.setAttributes({
        "index.existing_count": existingDocsMap.size,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return existingDocsMap;
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

  private deduplicateDocumentsWithSpan(
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
      const result = this.deduplicateDocuments(
        documents,
        existingDocsMap,
        connectorId
      );
      span.setAttributes({
        "index.to_index": result.docsToIndex.length,
        "index.skipped": result.docsToSkip.length,
      });
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
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

  private async indexToVespaWithSpan(
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
      const successfullyIndexed = await this.indexToVespa(
        docsToIndex,
        connectorId,
        batchId
      );
      span.setAttributes({
        "index.indexed_count": successfullyIndexed.length,
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

  private async recordInDatabaseWithSpan(
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
      const recordedCount = await this.recordInDatabase(
        successfullyIndexed,
        existingDocsMap,
        connectorId,
        batchId
      );
      span.setAttributes({
        "index.recorded_count": recordedCount,
      });
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

  private async updateSyncHistoryWithSpan(params: {
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
    const span = tracer.startSpan("index-processor.update-sync-history");
    try {
      await this.updateSyncHistory(params);
      span.setStatus({ code: SpanStatusCode.OK });
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

  private async fetchExistingDocuments(
    connectorId: string,
    documents: IndexJobData["documents"]
  ) {
    const existingDocs = await prisma.indexedDocument.findMany({
      where: {
        connectorId,
        externalId: { in: documents.map((d) => d.external_id) },
      },
      select: { externalId: true, checksum: true, lastChecksum: true },
    });

    return new Map(
      existingDocs.map((d) => [
        d.externalId,
        { checksum: d.checksum || "", lastChecksum: d.lastChecksum },
      ])
    );
  }

  private deduplicateDocuments(
    documents: IndexJobData["documents"],
    existingDocsMap: Map<
      string,
      { checksum: string; lastChecksum: string | null }
    >,
    connectorId: string
  ) {
    const docsToIndex: Array<GenericDocument & { checksum: string }> = [];
    const docsToSkip: string[] = [];

    for (const doc of documents) {
      const normalizedDoc = this.normalizeDocument(doc);
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

    return { docsToIndex, docsToSkip };
  }

  private async indexToVespa(
    docsToIndex: Array<GenericDocument & { checksum: string }>,
    connectorId: string,
    batchId: string
  ) {
    const successfullyIndexed: Array<GenericDocument & { checksum: string }> =
      [];

    for (const doc of docsToIndex) {
      try {
        const { checksum: _checksum, ...docForVespa } = doc;
        await vespaClient.feedDocument(docForVespa);
        successfullyIndexed.push(doc);
      } catch (docError) {
        this.logDocumentError(docError, doc.external_id, connectorId, doc.id);
      }
    }

    if (successfullyIndexed.length === 0 && docsToIndex.length > 0) {
      throw new Error("Failed to index any documents in batch");
    }

    logger.info(
      { connectorId, batchId, count: successfullyIndexed.length },
      "Documents indexed to Vespa"
    );

    return successfullyIndexed;
  }

  private async recordInDatabase(
    successfullyIndexed: Array<GenericDocument & { checksum: string }>,
    existingDocsMap: Map<
      string,
      { checksum: string; lastChecksum: string | null }
    >,
    connectorId: string,
    batchId: string
  ) {
    const indexedDocuments = successfullyIndexed.map((doc) => ({
      connectorId,
      externalId: doc.external_id,
      vespaId: doc.id,
      documentType: doc.document_type,
      sourceId: doc.source_id,
      checksum: doc.checksum,
      lastChecksum: existingDocsMap.get(doc.external_id)?.checksum || null,
    }));

    let recordedCount = 0;
    if (indexedDocuments.length > 0) {
      try {
        for (const doc of indexedDocuments) {
          await prisma.indexedDocument.upsert({
            where: {
              connectorId_externalId: {
                connectorId: doc.connectorId,
                externalId: doc.externalId,
              },
            },
            update: {
              checksum: doc.checksum,
              lastChecksum: doc.lastChecksum,
              lastSyncedAt: new Date(),
            },
            create: doc,
          });
          recordedCount += 1;
        }
      } catch (dbError) {
        logger.error(
          { error: dbError, connectorId, batchId },
          "Failed to record indexed documents in database"
        );
      }
    }

    return recordedCount;
  }

  private async updateSyncHistory(params: {
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
  }) {
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

      await prisma.$executeRawUnsafe(
        `UPDATE sync_history 
         SET "dataAdded" = "dataAdded" + $1, 
             "dataUpdated" = "dataUpdated" + $2
         WHERE _id = $3`,
        newCount,
        updatedCount,
        syncHistoryId
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
    } catch (updateError) {
      logger.warn(
        { error: updateError, syncHistoryId, connectorId, batchId },
        "Failed to update sync history with indexed counts"
      );
    }
  }

  private logDocumentError(
    docError: unknown,
    externalId: string,
    connectorId: string,
    vespaId: string
  ) {
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

  private logError(
    error: unknown,
    jobId: string | undefined,
    connectorId: string,
    batchId: string
  ) {
    const errorInfo =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { error: String(error), type: typeof error };

    logger.error(
      { ...errorInfo, jobId, connectorId, batchId },
      "Index job failed"
    );
  }

  private normalizeDocument(
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
      metadata = doc.metadata;
    }

    return {
      ...doc,
      metadata,
    };
  }
}
