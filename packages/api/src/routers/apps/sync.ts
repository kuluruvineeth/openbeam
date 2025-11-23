import {
  getSyncHistory,
  getSyncStatus,
  triggerSync as triggerSyncDb,
  updateSyncSettings as updateSyncSettingsDb,
} from "@openplane/db";
import {
  addSyncJob,
  intervalMsToCron,
  type SyncJobData,
} from "@openplane/redis";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveOrg } from "./middleware";
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

export const syncRouter = createTRPCRouter({
  getStatus: withActiveOrg
    .input(getSyncStatusSchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.orgId);
      const syncStatus = await getSyncStatus(ctx.prisma, input.connectorId);

      if (!syncStatus) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Sync status not found",
        });
      }

      return syncStatus;
    }),

  getHistory: withActiveOrg
    .input(getSyncHistorySchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.orgId);
      const limit = input.limit;
      const offset = input.cursor ?? input.offset; // Use cursor if available, fallback to offset

      const result = await getSyncHistory(ctx.prisma, input.connectorId, {
        limit,
        offset,
      });

      return {
        ...result,
        nextCursor: result.pagination.hasMore ? offset + limit : undefined,
      };
    }),

  trigger: withActiveOrg
    .input(triggerSyncSchema)
    .mutation(async ({ ctx, input }) => {
      const connector = await verifyConnectorAccess(
        ctx.prisma,
        input.connectorId,
        ctx.orgId
      );

      // Check if connector is active
      if (connector.status === "INACTIVE" || connector.status === "ERROR") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connector is not active. Check connector status.",
        });
      }

      // Create sync job and history
      const syncResult = await triggerSyncDb(ctx.prisma, {
        connectorId: input.connectorId,
        type: input.type,
      });

      // Enqueue sync job to Redis
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

  updateSettings: withActiveOrg
    .input(updateSyncSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.orgId);
      validateSyncIntervals(input);

      // Update sync settings in database
      const result = await updateSyncSettingsDb(
        ctx.prisma,
        {
          connectorId: input.connectorId,
          fullSyncIntervalMs: input.fullSyncIntervalMs,
          incrementalSyncIntervalMs: input.incrementalSyncIntervalMs,
        },
        intervalMsToCron
      );

      // Track created jobs for rollback on failure
      const createdJobKeys: string[] = [];

      try {
        // Update BullMQ repeatable jobs with transaction-like safety
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
        // Rollback: Remove any created BullMQ jobs and clean up Redis keys
        await rollbackCreatedJobs(input.connectorId, createdJobKeys);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to update BullMQ jobs: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        });
      }
    }),
});
