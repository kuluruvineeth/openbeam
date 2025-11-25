/**
 * Sync Router
 * Full sync management with jobs, history, cursors, and documents
 */

import {
  cancelSyncJob,
  deleteAllSyncCursors,
  getActiveSyncJobs,
  getDocumentByExternalId,
  getIndexedDocumentStats,
  getRecentlySyncedDocuments,
  getRunningSync,
  getScheduledSyncJobs,
  getSyncCursor,
  getSyncCursors,
  getSyncHistory,
  getSyncJobById,
  getSyncStatus,
  triggerSync as triggerSyncDb,
  updateSyncSettings as updateSyncSettingsDb,
  upsertSyncCursor,
} from "@openplane/db";
import {
  addSyncJob,
  intervalMsToCron,
  type SyncJobData,
} from "@openplane/redis";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveTeam, withAdmin } from "./middleware";
import {
  getSyncHistorySchema,
  getSyncStatusSchema,
  triggerSyncSchema,
  updateSyncSettingsSchema,
} from "./schemas";
import {
  rollbackCreatedJobs,
  updateRepeatableJobsForSettings,
  validateSyncIntervals,
} from "./utils";

// ============================================================================
// Router
// ============================================================================

export const syncRouter = createTRPCRouter({
  // ==========================================================================
  // Sync Status & History
  // ==========================================================================

  /**
   * Get sync status for connector
   */
  getStatus: withActiveTeam
    .input(getSyncStatusSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const syncStatus = await getSyncStatus(ctx.prisma, input.connectorId);

      if (!syncStatus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sync status not found",
        });
      }

      return syncStatus;
    }),

  /**
   * Get sync history for connector
   */
  getHistory: withActiveTeam
    .input(getSyncHistorySchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const offset = input.cursor ?? input.offset;

      const result = await getSyncHistory(ctx.prisma, input.connectorId, {
        limit: input.limit,
        offset,
      });

      return {
        ...result,
        nextCursor: result.pagination.hasMore
          ? offset + input.limit
          : undefined,
      };
    }),

  // ==========================================================================
  // Sync Triggers
  // ==========================================================================

  /**
   * Trigger a sync
   */
  trigger: withActiveTeam
    .input(triggerSyncSchema)
    .mutation(async ({ ctx, input }) => {
      const connector = await verifyConnectorAccess(
        ctx.prisma,
        input.connectorId,
        ctx.teamId
      );

      if (connector.status === "INACTIVE" || connector.status === "ERROR") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connector is not active. Check connector status.",
        });
      }

      // Check for running sync
      const runningSync = await getRunningSync(ctx.prisma, input.connectorId);
      if (runningSync) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A sync is already running for this connector",
        });
      }

      const syncResult = await triggerSyncDb(ctx.prisma, {
        connectorId: input.connectorId,
        type: input.type,
      });

      const jobData: SyncJobData = {
        connectorId: input.connectorId,
        syncJobId: syncResult.syncHistoryId,
        type: input.type,
      };

      const job = await addSyncJob(jobData, 7);

      return {
        success: true,
        syncJobId: syncResult.syncHistoryId,
        queueJobId: job.id,
        type: input.type,
        message: "Sync job queued successfully",
      };
    }),

  /**
   * Cancel a running sync
   */
  cancel: withActiveTeam
    .input(z.object({ syncJobId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const syncJob = await getSyncJobById(ctx.prisma, input.syncJobId);

      if (!syncJob) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sync job not found",
        });
      }

      // Verify access via connector
      await verifyConnectorAccess(ctx.prisma, syncJob.connectorId, ctx.teamId);

      if (syncJob.status !== "RUNNING" && syncJob.status !== "QUEUED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only cancel running or queued sync jobs",
        });
      }

      return cancelSyncJob(ctx.prisma, input.syncJobId);
    }),

  // ==========================================================================
  // Sync Settings
  // ==========================================================================

  /**
   * Update sync settings (intervals)
   */
  updateSettings: withActiveTeam
    .input(updateSyncSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      validateSyncIntervals(input);

      const result = await updateSyncSettingsDb(
        ctx.prisma,
        {
          connectorId: input.connectorId,
          fullSyncIntervalMs: input.fullSyncIntervalMs,
          incrementalSyncIntervalMs: input.incrementalSyncIntervalMs,
        },
        intervalMsToCron
      );

      const createdJobKeys: string[] = [];

      try {
        await updateRepeatableJobsForSettings(
          input.connectorId,
          result,
          createdJobKeys
        );

        return {
          success: true,
          fullSyncJob: result.fullSyncJob,
          incrementalSyncJob: result.incrementalSyncJob,
        };
      } catch (error) {
        await rollbackCreatedJobs(input.connectorId, createdJobKeys);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update BullMQ jobs: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),

  // ==========================================================================
  // Sync Jobs
  // ==========================================================================

  /**
   * Get active sync jobs
   */
  getActiveJobs: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getActiveSyncJobs(ctx.prisma, input.connectorId);
    }),

  /**
   * Get scheduled sync jobs
   */
  getScheduledJobs: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getScheduledSyncJobs(ctx.prisma, input.connectorId);
    }),

  // ==========================================================================
  // Sync Cursors
  // ==========================================================================

  /**
   * Get all sync cursors for connector
   */
  getCursors: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getSyncCursors(ctx.prisma, input.connectorId);
    }),

  /**
   * Get sync cursor for specific resource
   */
  getCursor: withActiveTeam
    .input(z.object({ connectorId: z.string(), resource: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getSyncCursor(ctx.prisma, input.connectorId, input.resource);
    }),

  /**
   * Reset sync cursors (for full resync) - Admin only
   */
  resetCursors: withAdmin
    .input(z.object({ connectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      const deleted = await deleteAllSyncCursors(ctx.prisma, input.connectorId);
      return { success: true, deletedCount: deleted };
    }),

  /**
   * Update sync cursor (internal use)
   */
  updateCursor: withAdmin
    .input(
      z.object({
        connectorId: z.string(),
        resource: z.string(),
        cursor: z.string().nullable(),
        resourceType: z.string().optional(),
        cursorType: z.string().default("timestamp"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return upsertSyncCursor(ctx.prisma, input);
    }),

  // ==========================================================================
  // Indexed Documents
  // ==========================================================================

  /**
   * Get indexed document stats by type
   */
  getDocumentStats: withActiveTeam
    .input(z.object({ connectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getIndexedDocumentStats(ctx.prisma, input.connectorId);
    }),

  /**
   * Get recently synced documents
   */
  getRecentDocuments: withActiveTeam
    .input(
      z.object({
        connectorId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getRecentlySyncedDocuments(
        ctx.prisma,
        input.connectorId,
        input.limit
      );
    }),

  /**
   * Get document by external ID
   */
  getDocument: withActiveTeam
    .input(z.object({ connectorId: z.string(), externalId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      return getDocumentByExternalId(
        ctx.prisma,
        input.connectorId,
        input.externalId
      );
    }),
});
