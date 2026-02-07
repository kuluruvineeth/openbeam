import {
  getSyncCursor,
  getSyncHistory,
  getSyncStatus,
  updateSyncSettings as updateSyncSettingsDb,
} from "@openplane/db";
import { startConnectorSync } from "@openplane/temporal";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../../index";
import { verifyConnectorAccess, withActiveTeam } from "./middleware";
import {
  getSyncHistorySchema,
  getSyncStatusSchema,
  triggerSyncSchema,
  updateSyncSettingsSchema,
} from "./schemas";
import { validateSyncIntervals } from "./utils";

export const syncRouter = createTRPCRouter({
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

  getHistory: withActiveTeam
    .input(getSyncHistorySchema)
    .query(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
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

      const connectorType = connector.app.toLowerCase().replace(/_/g, "-");

      let cursor: Record<string, unknown> | undefined;
      if (input.type === "INCREMENTAL") {
        const storedCursor = await getSyncCursor(
          ctx.prisma,
          input.connectorId,
          "default"
        );

        if (storedCursor?.cursor) {
          cursor =
            typeof storedCursor.cursor === "string"
              ? JSON.parse(storedCursor.cursor)
              : (storedCursor.cursor as Record<string, unknown>);
        }
      }

      const syncHandle = await startConnectorSync({
        connectorId: input.connectorId,
        connectorType,
        syncType: input.type,
        trigger: "MANUAL",
        teamId: ctx.teamId,
        userId: ctx.session.user.id,
        cursor,
      });

      return {
        success: true,
        workflowId: syncHandle.workflowId,
        runId: syncHandle.runId,
        type: input.type,
        message: "Sync workflow started",
      };
    }),

  updateSettings: withActiveTeam
    .input(updateSyncSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      await verifyConnectorAccess(ctx.prisma, input.connectorId, ctx.teamId);
      validateSyncIntervals(input);

      const intervalMsToCron = (_intervalMs: number) => "";

      await updateSyncSettingsDb(
        ctx.prisma,
        {
          connectorId: input.connectorId,
          fullSyncIntervalMs: input.fullSyncIntervalMs,
          incrementalSyncIntervalMs: input.incrementalSyncIntervalMs,
        },
        intervalMsToCron
      );

      return {
        success: true,
        message: "Sync settings updated",
      };
    }),
});
