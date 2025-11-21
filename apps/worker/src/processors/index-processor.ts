import prisma from "@openplane/db";
import { getRedisConnection, type IndexJobData } from "@openplane/redis";
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
        concurrency: 10, // Process 10 index jobs concurrently
        limiter: {
          max: 50,
          duration: 1000, // Max 50 jobs per second
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
    const { connectorId, documents, batchId } = job.data;

    logger.info(
      { jobId: job.id, connectorId, batchId, documentCount: documents.length },
      "Processing index job"
    );

    try {
      // 1. Check for existing documents and calculate checksums
      const existingDocs = await prisma.indexedDocument.findMany({
        where: {
          connectorId,
          externalId: { in: documents.map((d) => d.external_id) },
        },
        select: {
          externalId: true,
          checksum: true,
          lastChecksum: true,
        },
      });

      const existingDocsMap = new Map(
        existingDocs.map((d) => [d.externalId, d])
      );

      // 2. Filter documents needing indexing (new or changed)
      const docsToIndex: GenericDocument[] = [];
      const docsToSkip: string[] = [];

      for (const doc of documents) {
        const normalizedDoc = this.normalizeDocument(doc);
        const newChecksum = calculateDocumentChecksum({
          title: normalizedDoc.title,
          content: normalizedDoc.content,
        });

        const existing = existingDocsMap.get(doc.external_id);

        if (existing && checksumsMatch(existing.checksum, newChecksum)) {
          // Document unchanged - skip indexing
          docsToSkip.push(doc.external_id);
          logger.debug(
            { docId: doc.external_id, connectorId },
            "Document unchanged, skipping"
          );
        } else {
          // New or changed document - index it
          docsToIndex.push({ ...normalizedDoc, checksum: newChecksum } as GenericDocument & { checksum: string });
        }
      }

      logger.info(
        { connectorId, batchId, toIndex: docsToIndex.length, skipped: docsToSkip.length },
        "Checksum deduplication complete"
      );

      // 3. Index documents to Vespa
      const successfullyIndexed: (GenericDocument & { checksum: string })[] = [];
      for (const doc of docsToIndex) {
        try {
          await vespaClient.feedDocument(doc);
          successfullyIndexed.push(doc);
        } catch (docError) {
          logger.error(
            { error: docError, docId: doc.id, connectorId },
            "Failed to feed individual document to Vespa"
          );
        }
      }

      if (successfullyIndexed.length === 0 && documents.length > 0) {
        throw new Error("Failed to index any documents in batch");
      }

      logger.info(
        { connectorId, batchId, count: successfullyIndexed.length },
        "Documents indexed to Vespa"
      );

      // 4. Upsert indexed documents in database with checksums
      const indexedDocuments = successfullyIndexed.map((doc) => ({
        connectorId,
        externalId: doc.external_id,
        vespaId: doc.id,
        documentType: doc.document_type,
        sourceId: doc.source_id,
        checksum: doc.checksum,
        lastChecksum: existingDocsMap.get(doc.external_id)?.checksum || null,
      }));

      if (indexedDocuments.length > 0) {
        try {
          // Upsert documents (update if exists, create if new)
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
          }
        } catch (dbError) {
          logger.error(
            { error: dbError, connectorId, batchId },
            "Failed to record indexed documents in database"
          );
        }
      }

      logger.info(
        { connectorId, batchId, count: documents.length },
        "Indexed documents recorded in database"
      );

      return { indexed: successfullyIndexed.length };
    } catch (error) {
      logger.error(
        { error, jobId: job.id, connectorId, batchId },
        "Index job failed"
      );
      throw error;
    }
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
      logger.error({ error }, "Index worker error");
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
