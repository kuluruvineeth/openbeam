/**
 * Cleanup Processor
 *
 * Maintains index health by:
 * - Detecting and removing stale documents
 * - Cleaning up orphaned documents
 * - Pruning documents from disabled connectors
 */

import prisma from "@openplane/db";
import { vespaClient } from "@openplane/vespa";
import logger from "../utils/logger";

interface CleanupResult {
  staleDocuments: number;
  orphanedDocuments: number;
  prunedConnectors: number;
  durationMs: number;
}

export class CleanupProcessor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start cleanup processor (runs daily at 2 AM by default)
   */
  async start(intervalMs = 86_400_000): Promise<void> {
    if (this.isRunning) {
      logger.warn("Cleanup processor already running");
      return;
    }

    this.isRunning = true;
    logger.info("Starting cleanup processor");

    // Run immediately on start
    await this.runCleanup();

    // Schedule recurring cleanup
    this.intervalId = setInterval(async () => {
      await this.runCleanup();
    }, intervalMs);

    logger.info(
      { intervalHours: intervalMs / 3_600_000 },
      "Cleanup processor started"
    );
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn("Cleanup processor not running");
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    logger.info("Cleanup processor stopped");
  }

  /**
   * Run cleanup tasks
   */
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
      // 1. Clean up stale documents (not synced in 30 days)
      result.staleDocuments = await this.cleanupStaleDocuments();

      // 2. Clean up orphaned documents (connector deleted)
      result.orphanedDocuments = await this.cleanupOrphanedDocuments();

      // 3. Prune documents from disabled connectors
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

  /**
   * Remove documents not synced in 30 days
   */
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

  /**
   * Remove documents whose connectors were deleted
   */
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

  /**
   * Remove documents from connectors that are no longer active
   */
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

  /**
   * Manual cleanup trigger (for testing/admin)
   */
  async triggerCleanup(): Promise<CleanupResult> {
    return await this.runCleanup();
  }
}
