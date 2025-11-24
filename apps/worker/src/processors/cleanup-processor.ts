// TODO: Check back tracing after Bun supports OpenTelemetry
import prisma from "@openplane/db";
import type { CleanupJobData } from "@openplane/redis";
import { vespaClient } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../utils/logger";
import { BaseProcessor } from "./base-processor";

const tracer = trace.getTracer("openplane-worker");

interface CleanupResult {
  staleDocuments: number;
  orphanedDocuments: number;
  prunedConnectors: number;
  durationMs: number;
}

export class CleanupProcessor extends BaseProcessor<CleanupJobData> {
  constructor() {
    super("cleanup", {
      concurrency: 1, // Run sequentially
      limiter: {
        max: 1,
        duration: 1000,
      },
    });
  }

  protected async processJob(job: Job<CleanupJobData>): Promise<CleanupResult> {
    const span = tracer.startSpan("cleanup-processor.process", {
      attributes: {
        "job.id": job.id || "",
        "cleanup.triggered_at": job.data.triggeredAt
          ? new Date(job.data.triggeredAt).toISOString()
          : "",
      },
    });

    try {
      logger.info(
        { jobId: job.id, triggeredAt: job.data.triggeredAt },
        "Processing cleanup job"
      );

      const result = await this.runCleanup();

      span.setAttributes({
        "cleanup.stale_documents": result.staleDocuments,
        "cleanup.orphaned_documents": result.orphanedDocuments,
        "cleanup.pruned_connectors": result.prunedConnectors,
        "cleanup.duration_ms": result.durationMs,
      });
      span.setStatus({ code: SpanStatusCode.OK });

      return result;
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
      throw error;
    } finally {
      span.end();
    }
  }

  private async runCleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    logger.info("Starting cleanup run");

    const result: CleanupResult = {
      staleDocuments: 0,
      orphanedDocuments: 0,
      prunedConnectors: 0,
      durationMs: 0,
    };

    try {
      result.staleDocuments = await this.cleanupStaleDocuments();
      result.orphanedDocuments = await this.cleanupOrphanedDocuments();
      result.prunedConnectors = await this.pruneDisabledConnectors();

      result.durationMs = Date.now() - startTime;

      logger.info(
        {
          ...result,
          durationSeconds: (result.durationMs / 1000).toFixed(2),
        },
        "Cleanup run completed"
      );

      return result;
    } catch (error) {
      logger.error(
        { error, durationMs: Date.now() - startTime },
        "Cleanup run failed"
      );
      throw error;
    }
  }

  private async cleanupStaleDocuments(): Promise<number> {
    logger.debug("Cleaning up stale documents");

    const staleCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000); // 30 days ago

    const staleDocuments = await prisma.indexedDocument.findMany({
      where: {
        lastSyncedAt: {
          lt: staleCutoff,
        },
      },
      select: {
        id: true,
        vespaId: true,
        connectorId: true,
      },
      take: 1000, // Process in batches
    });

    if (staleDocuments.length === 0) {
      logger.debug("No stale documents found");
      return 0;
    }

    logger.info(
      { count: staleDocuments.length },
      "Found stale documents, removing from Vespa and DB"
    );

    // Remove from Vespa
    for (const doc of staleDocuments) {
      try {
        await vespaClient.deleteDocument(doc.vespaId);
      } catch (error) {
        logger.warn(
          { error, vespaId: doc.vespaId },
          "Failed to delete stale document from Vespa"
        );
      }
    }

    // Remove from database
    const deleted = await prisma.indexedDocument.deleteMany({
      where: {
        id: {
          in: staleDocuments.map((d) => d.id),
        },
      },
    });

    logger.info({ deleted: deleted.count }, "Stale documents cleaned up");
    return deleted.count;
  }

  private async cleanupOrphanedDocuments(): Promise<number> {
    logger.debug("Cleaning up orphaned documents");

    // Find documents with non-existent connectors
    const orphanedDocuments = await prisma.$queryRaw<
      Array<{ id: string; vespaId: string; connectorId: string }>
    >`
      SELECT id._id as id, id."vespaId", id."connectorId"
      FROM "indexed_document" id
      LEFT JOIN "connector" c ON id."connectorId" = c._id
      WHERE c._id IS NULL
      LIMIT 1000
    `;

    if (orphanedDocuments.length === 0) {
      logger.debug("No orphaned documents found");
      return 0;
    }

    logger.info(
      { count: orphanedDocuments.length },
      "Found orphaned documents, removing"
    );

    // Remove from Vespa
    for (const doc of orphanedDocuments) {
      try {
        await vespaClient.deleteDocument(doc.vespaId);
      } catch (error) {
        logger.warn(
          { error, vespaId: doc.vespaId },
          "Failed to delete orphaned document from Vespa"
        );
      }
    }

    // Remove from database
    const deleted = await prisma.indexedDocument.deleteMany({
      where: {
        id: {
          in: orphanedDocuments.map((d) => d.id),
        },
      },
    });

    logger.info({ deleted: deleted.count }, "Orphaned documents cleaned up");
    return deleted.count;
  }

  private async pruneDisabledConnectors(): Promise<number> {
    logger.debug("Pruning documents from disabled connectors");

    const disabledConnectors = await prisma.connector.findMany({
      where: {
        status: {
          in: ["INACTIVE", "ERROR"],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (disabledConnectors.length === 0) {
      logger.debug("No disabled connectors found");
      return 0;
    }

    logger.info(
      { count: disabledConnectors.length },
      "Found disabled connectors, pruning documents"
    );

    let totalPruned = 0;

    for (const connector of disabledConnectors) {
      const documents = await prisma.indexedDocument.findMany({
        where: { connectorId: connector.id },
        select: { id: true, vespaId: true },
        take: 1000,
      });

      if (documents.length === 0) {
        continue;
      }

      // Remove from Vespa
      for (const doc of documents) {
        try {
          await vespaClient.deleteDocument(doc.vespaId);
        } catch (error) {
          logger.warn(
            { error, vespaId: doc.vespaId, connectorId: connector.id },
            "Failed to delete document from Vespa"
          );
        }
      }

      // Remove from database
      const deleted = await prisma.indexedDocument.deleteMany({
        where: {
          id: {
            in: documents.map((d) => d.id),
          },
        },
      });

      totalPruned += deleted.count;
      logger.info(
        { connectorId: connector.id, pruned: deleted.count },
        "Pruned documents from disabled connector"
      );
    }

    return totalPruned;
  }

  async triggerCleanup(): Promise<CleanupResult> {
    return await this.runCleanup();
  }
}
