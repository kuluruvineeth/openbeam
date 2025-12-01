import prisma from "@openplane/db";
import type { CleanupJobData } from "@openplane/redis";
import { vespaClient } from "@openplane/vespa";
import { SpanStatusCode, trace } from "@opentelemetry/api";
import type { Job } from "bullmq";
import logger from "../../utils/logger";
import { logJobStart } from "../event-handlers";

const tracer = trace.getTracer("openplane-worker");

export interface CleanupJobResult {
  staleDocuments: number;
  orphanedDocuments: number;
  prunedConnectors: number;
  durationMs: number;
}

export async function processCleanupJob(
  job: Job<CleanupJobData>
): Promise<CleanupJobResult> {
  const span = tracer.startSpan("cleanup-processor.process", {
    attributes: {
      "job.id": job.id || "",
      "cleanup.triggered_at": job.data.triggeredAt
        ? new Date(job.data.triggeredAt).toISOString()
        : "",
    },
  });

  try {
    logJobStart("cleanup", job.id, { triggeredAt: job.data.triggeredAt });

    const result = await runCleanup();

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
      "error.type": error instanceof Error ? error.constructor.name : "Unknown",
    });
    throw error;
  } finally {
    span.end();
  }
}

async function runCleanup(): Promise<CleanupJobResult> {
  const startTime = Date.now();
  logger.info("Starting cleanup run");

  const result: CleanupJobResult = {
    staleDocuments: 0,
    orphanedDocuments: 0,
    prunedConnectors: 0,
    durationMs: 0,
  };

  try {
    result.staleDocuments = await cleanupStaleDocuments();
    result.orphanedDocuments = await cleanupOrphanedDocuments();
    result.prunedConnectors = await pruneDisabledConnectors();

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

async function cleanupStaleDocuments(): Promise<number> {
  logger.debug("Cleaning up stale documents");

  const staleCutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const staleDocuments = await prisma.indexedDocument.findMany({
    where: { lastSyncedAt: { lt: staleCutoff } },
    select: { id: true, vespaId: true, connectorId: true },
    take: 1000,
  });

  if (staleDocuments.length === 0) {
    logger.debug("No stale documents found");
    return 0;
  }

  logger.info(
    { count: staleDocuments.length },
    "Found stale documents, removing from Vespa and DB"
  );

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

  const deleted = await prisma.indexedDocument.deleteMany({
    where: { id: { in: staleDocuments.map((d) => d.id) } },
  });

  logger.info({ deleted: deleted.count }, "Stale documents cleaned up");
  return deleted.count;
}

async function cleanupOrphanedDocuments(): Promise<number> {
  logger.debug("Cleaning up orphaned documents");

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

  const deleted = await prisma.indexedDocument.deleteMany({
    where: { id: { in: orphanedDocuments.map((d) => d.id) } },
  });

  logger.info({ deleted: deleted.count }, "Orphaned documents cleaned up");
  return deleted.count;
}

async function pruneDisabledConnectors(): Promise<number> {
  logger.debug("Pruning documents from disabled connectors");

  const disabledConnectors = await prisma.connector.findMany({
    where: { status: { in: ["INACTIVE", "ERROR"] } },
    select: { id: true, status: true },
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

    const deleted = await prisma.indexedDocument.deleteMany({
      where: { id: { in: documents.map((d) => d.id) } },
    });

    totalPruned += deleted.count;
    logger.info(
      { connectorId: connector.id, pruned: deleted.count },
      "Pruned documents from disabled connector"
    );
  }

  return totalPruned;
}

export async function triggerCleanup(): Promise<CleanupJobResult> {
  return await runCleanup();
}
