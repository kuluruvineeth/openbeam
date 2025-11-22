import prisma from "@openplane/db";
import {
  getIndexRetryStrategy,
  getRedisConnection,
  type IndexJobData,
} from "@openplane/redis";
import { type GenericDocument, vespaClient } from "@openplane/vespa";
import { type Job, Worker } from "bullmq";
import { calculateDocumentChecksum, checksumsMatch } from "../utils/checksum";
import logger from "../utils/logger";

/**
 * Index Worker - Processes indexing jobs from the queue
 * Pushes documents to Vespa and tracks in database
 */
export class IndexProcessor {
  private worker: Worker | null = null;
  private readonly initialization: Promise<void>;

  constructor() {
    this.initialization = this.initialize();
  }

  private async initialize(): Promise<void> {
    const connection = await getRedisConnection();

    const worker = new Worker(
      "index",
      async (job: Job<IndexJobData>) => this.processJob(job),
      {
        connection,
        concurrency: 10,
        limiter: {
          max: 50,
          duration: 1000,
        },
        settings: {
          backoffStrategy: (attemptsMade: number) =>
            getIndexRetryStrategy(attemptsMade, new Error("Retry attempt")),
        },
      }
    );

    this.setupEventHandlers(worker);
    this.worker = worker;
  }

  /**
   * Process a single index job
   */
  private async processJob(
    job: Job<IndexJobData>
  ): Promise<{ indexed: number }> {
    const { connectorId, documents, batchId, syncHistoryId } = job.data;

    logger.info(
      { jobId: job.id, connectorId, batchId, documentCount: documents.length },
      "Processing index job"
    );

    try {
      const existingDocsMap = await this.fetchExistingDocuments(
        connectorId,
        documents
      );
      const { docsToIndex, docsToSkip } = this.deduplicateDocuments(
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

      const successfullyIndexed = await this.indexToVespa(
        docsToIndex,
        connectorId,
        batchId
      );

      const recordedCount = await this.recordInDatabase(
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

      await this.updateSyncHistory({
        syncHistoryId,
        successfullyIndexed,
        existingDocsMap,
        skippedCount: docsToSkip.length,
        totalInBatch: documents.length,
        connectorId,
        batchId,
      });

      return { indexed: successfullyIndexed.length };
    } catch (error) {
      this.logError(error, job.id, connectorId, batchId);
      throw error;
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

  /**
   * Setup event handlers for the worker
   */
  private setupEventHandlers(worker: Worker) {
    worker.on("completed", (job) => {
      logger.info({ jobId: job.id }, "Index job completed");
    });

    worker.on("failed", (job, error) => {
      logger.error(
        { jobId: job?.id, error: error.message },
        "Index job failed"
      );
    });

    worker.on("error", (error) => {
      const errorInfo =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : {
              error: String(error),
              type: typeof error,
            };
      logger.error(errorInfo, "Index worker error");
    });

    worker.on("stalled", (jobId) => {
      logger.warn({ jobId }, "Index job stalled");
    });
  }

  /**
   * Gracefully close the worker
   */
  async close(): Promise<void> {
    await this.initialization;
    if (this.worker) {
      await this.worker.close();
      logger.info("Index processor closed");
    }
  }

  /**
   * Get worker instance for testing
   */
  getWorker(): Worker {
    if (!this.worker) {
      throw new Error("Index worker not initialized");
    }
    return this.worker;
  }
}
