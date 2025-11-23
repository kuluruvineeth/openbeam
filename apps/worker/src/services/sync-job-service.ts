import prisma, { type Prisma } from "@openplane/db";
import logger from "../utils/logger";

export class SyncJobService {
  /**
   * Create SyncHistory for a repeatable job (BullMQ scheduled jobs)
   */
  async createSyncHistoryForRepeatableJob(
    connectorId: string,
    type: "FULL" | "INCREMENTAL"
  ): Promise<string> {
    const syncJob = await prisma.syncJob.findFirst({
      where: {
        connectorId,
        type,
        trigger: "SCHEDULED",
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!syncJob) {
      throw new Error(
        `No scheduled ${type} sync job found for connector ${connectorId}`
      );
    }

    const syncHistory = await prisma.syncHistory.create({
      data: {
        syncJobId: syncJob.id,
        connectorId,
        status: "SYNCING",
        startedAt: new Date(),
      },
    });

    return syncHistory.id;
  }

  /**
   * Update sync job next run time
   */
  async updateSyncJobNextRun(
    tx: Prisma.TransactionClient,
    syncJobId: string,
    connectorId: string
  ) {
    const syncHistory = await tx.syncHistory.findUnique({
      where: { id: syncJobId },
      select: { syncJobId: true },
    });

    if (!syncHistory) {
      return;
    }

    const syncJob = await tx.syncJob.findUnique({
      where: { id: syncHistory.syncJobId },
      select: { config: true },
    });

    if (!syncJob) {
      return;
    }

    const config = syncJob.config as { intervalMs?: number };
    const intervalMs = config?.intervalMs;

    const nextRunAt = intervalMs ? new Date(Date.now() + intervalMs) : null;

    try {
      await tx.syncJob.update({
        where: { id: syncHistory.syncJobId },
        data: {
          lastRanAt: new Date(),
          nextRunAt,
        },
      });
    } catch (updateError) {
      logger.error(
        {
          connectorId,
          syncJobId: syncHistory.syncJobId,
          error:
            updateError instanceof Error
              ? updateError.message
              : String(updateError),
        },
        "Failed to update nextRunAt, will retry on next sync"
      );
    }
  }

  /**
   * Handle sync error status updates
   */
  async handleSyncError(
    connectorId: string,
    syncJobId: string,
    error: unknown
  ) {
    try {
      await prisma.$transaction(async (tx) => {
        const syncHistory = await tx.syncHistory.findUnique({
          where: { id: syncJobId },
        });

        if (syncHistory) {
          await tx.syncHistory.update({
            where: { id: syncJobId },
            data: {
              status: "ERROR",
              errorMessage:
                error instanceof Error ? error.message : "Unknown error",
              finishedAt: new Date(),
            },
          });
        }

        await tx.connector.update({
          where: { id: connectorId },
          data: {
            lastSyncStatus: "FAILED",
            lastError: error instanceof Error ? error.message : "Unknown error",
            lastErrorAt: new Date(),
            retryCount: { increment: 1 },
          },
        });
      });
    } catch (updateError) {
      logger.error(
        {
          connectorId,
          syncJobId,
          updateError:
            updateError instanceof Error
              ? updateError.message
              : String(updateError),
        },
        "Failed to update sync error status"
      );
    }
  }
}

export const syncJobService = new SyncJobService();
