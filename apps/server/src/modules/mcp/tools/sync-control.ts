import prisma, {
  getConnectorsWithStats,
  verifyConnectorOwnership,
} from "@openbeam/db";
import {
  ConnectorServiceError,
  createManualConnectorSyncForTeam,
} from "@openbeam/services/connectors";
import {
  cancelAllSyncsForConnector,
  getActiveSyncsForConnector,
  pauseSync,
  resumeSync,
  startConnectorSync,
} from "@openbeam/temporal";
import { z } from "zod";
import { formatSyncControl, formatSyncTriggerAll } from "../formatters";
import {
  DESTRUCTIVE_ANNOTATIONS,
  hasScope,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

export const registerSyncControlTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "sync.write")) {
    return;
  }

  server.registerTool(
    "sync_trigger_all",
    {
      title: "Trigger Sync for All Connectors",
      description:
        "Start a sync job for every active connector in the team, pulling the latest data from all connected sources into the OpenBeam search index. Use this when the user wants to refresh all their data at once, after an outage recovery, or when multiple connectors appear stale.\n\nReturns a summary with counts of triggered, already-running, and failed connectors, plus per-connector details including sync job IDs. The default sync type is 'incremental' which only fetches changes since the last successful sync — this is fast for most connectors. Use type 'full' ONLY when the user explicitly requests a complete re-index of everything, as this can take hours across many connectors.\n\nYou can optionally filter by connector type (e.g., only sync all Slack connectors, or all Google connectors) using the connectorTypes parameter. Connectors that are already running a sync will be reported as 'already_running' rather than triggering a duplicate.\n\nAfter triggering, use sync_status with individual connector IDs to monitor progress. Do NOT use this for a single connector — use sync_trigger instead.",
      inputSchema: {
        type: z
          .enum(["full", "incremental"])
          .optional()
          .describe(
            "Sync type for all connectors. 'incremental' (default) fetches only changes — fast and safe. 'full' re-indexes everything from scratch — very slow across many connectors, use only when explicitly requested."
          ),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Optional filter: only sync connectors of these types (e.g., ['SLACK', 'GMAIL', 'LINEAR']). Omit to sync all active connectors."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const syncType = params.type === "full" ? "FULL" : "INCREMENTAL";
      const connectors = await getConnectorsWithStats(prisma, ctx.teamId, [
        "ACTIVE",
        "SYNCING",
      ]);

      const types = params.connectorTypes;
      const filtered = types
        ? connectors.filter((c) => types.includes(c.app))
        : connectors;

      type EntryResult = {
        connectorId: string;
        connectorName: string;
        connectorType: string;
        status: "triggered" | "already_running" | "failed";
        syncJobId?: string;
        workflowId?: string;
        error?: string;
      };

      const results: EntryResult[] = [];

      for (const connector of filtered) {
        try {
          const syncRequest = await createManualConnectorSyncForTeam(prisma, {
            connectorId: connector.id,
            teamId: ctx.teamId,
            type: syncType,
          });

          const syncHandle = await startConnectorSync({
            connectorId: connector.id,
            connectorType: syncRequest.connectorType,
            syncType: syncRequest.syncType,
            trigger: "MANUAL",
            requestId: syncRequest.syncHistoryId,
            teamId: ctx.teamId,
          });

          const alreadyRunning = syncHandle.runId === "";

          results.push({
            connectorId: connector.id,
            connectorName: connector.name,
            connectorType: connector.app,
            status: alreadyRunning ? "already_running" : "triggered",
            syncJobId: syncRequest.syncHistoryId,
            workflowId: syncHandle.workflowId,
          });
        } catch (error) {
          const message =
            error instanceof ConnectorServiceError || error instanceof Error
              ? error.message
              : "Unknown error";
          results.push({
            connectorId: connector.id,
            connectorName: connector.name,
            connectorType: connector.app,
            status: "failed",
            error: message,
          });
        }
      }

      const triggered = results.filter((r) => r.status === "triggered").length;
      const alreadyRunning = results.filter(
        (r) => r.status === "already_running"
      ).length;
      const failed = results.filter((r) => r.status === "failed").length;

      const response = {
        type: syncType,
        triggered,
        alreadyRunning,
        failed,
        total: filtered.length,
        connectors: results,
      };

      return {
        content: [
          { type: "text" as const, text: formatSyncTriggerAll(response) },
        ],
        structuredContent: response,
      };
    }, "Failed to trigger bulk sync")
  );

  server.registerTool(
    "sync_cancel",
    {
      title: "Cancel Running Syncs",
      description:
        "Cancel all running sync workflows for a specific connector, stopping any in-progress data sync immediately. Use this when a sync is stuck, taking too long, consuming excessive resources, or when the user wants to abort a full sync that was triggered by mistake.\n\nSends a cancel signal to every active Temporal workflow for the given connector. Returns the number of workflows that were successfully cancelled. Cancelled syncs will stop at their current batch — documents already indexed remain in the search index, but no further batches will be processed.\n\nAfter cancelling, use sync_trigger to start a fresh incremental sync if needed. Use sync_status to verify the cancellation took effect. Do NOT use this to pause a sync temporarily — use sync_pause instead, which allows resuming later without losing progress.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connector whose running syncs should be cancelled. Get this from connector_list or sync_status."
          ),
      },
      annotations: DESTRUCTIVE_ANNOTATIONS,
    },
    withErrorHandling(async ({ connectorId }) => {
      const connector = await verifyConnectorOwnership(
        prisma,
        connectorId,
        ctx.teamId
      );

      if (!connector) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or access denied",
            },
          ],
          isError: true,
        };
      }

      const cancelled = await cancelAllSyncsForConnector(connectorId);

      const response = {
        connectorId,
        action: "cancelled" as const,
        affected: cancelled,
      };

      return {
        content: [{ type: "text" as const, text: formatSyncControl(response) }],
        structuredContent: response,
      };
    }, "Failed to cancel syncs")
  );

  server.registerTool(
    "sync_pause",
    {
      title: "Pause Running Syncs",
      description:
        "Pause all running sync workflows for a specific connector, temporarily suspending data sync without losing progress. Use this when the external data source is experiencing issues, when you need to reduce load on the source API, or when the user wants to temporarily halt syncing.\n\nSends a pause signal to every active Temporal workflow for the given connector. The sync will stop fetching new batches but retains its cursor position, so it can resume exactly where it left off. Returns the number of workflows that were successfully paused.\n\nUse sync_resume with the same connector ID to continue the sync from where it was paused. Use sync_cancel instead if you want to fully stop and discard the running sync. Use sync_status to check whether the connector has active workflows before pausing.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connector whose running syncs should be paused. Get this from connector_list or sync_status."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async ({ connectorId }) => {
      const connector = await verifyConnectorOwnership(
        prisma,
        connectorId,
        ctx.teamId
      );

      if (!connector) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or access denied",
            },
          ],
          isError: true,
        };
      }

      const activeSyncs = await getActiveSyncsForConnector(connectorId);
      let paused = 0;
      for (const sync of activeSyncs) {
        const success = await pauseSync(sync.workflowId);
        if (success) {
          paused += 1;
        }
      }

      const response = {
        connectorId,
        action: "paused" as const,
        affected: paused,
      };

      return {
        content: [{ type: "text" as const, text: formatSyncControl(response) }],
        structuredContent: response,
      };
    }, "Failed to pause syncs")
  );

  server.registerTool(
    "sync_resume",
    {
      title: "Resume Paused Syncs",
      description:
        "Resume all paused sync workflows for a specific connector, continuing data sync from exactly where it was paused. Use this after a previous sync_pause when the issue that prompted the pause has been resolved, or when the user wants to continue a temporarily halted sync.\n\nSends a resume signal to every active Temporal workflow for the given connector. The sync will pick up from its saved cursor position and continue fetching and indexing new batches. Returns the number of workflows that were successfully resumed.\n\nThis only affects paused workflows — if no workflows are paused, the affected count will be 0. Use sync_status to check the current state of the connector's sync workflows before resuming. Use sync_trigger to start a new sync if the previous one was cancelled rather than paused.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connector whose paused syncs should be resumed. Get this from connector_list or sync_status."
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async ({ connectorId }) => {
      const connector = await verifyConnectorOwnership(
        prisma,
        connectorId,
        ctx.teamId
      );

      if (!connector) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or access denied",
            },
          ],
          isError: true,
        };
      }

      const activeSyncs = await getActiveSyncsForConnector(connectorId);
      let resumed = 0;
      for (const sync of activeSyncs) {
        const success = await resumeSync(sync.workflowId);
        if (success) {
          resumed += 1;
        }
      }

      const response = {
        connectorId,
        action: "resumed" as const,
        affected: resumed,
      };

      return {
        content: [{ type: "text" as const, text: formatSyncControl(response) }],
        structuredContent: response,
      };
    }, "Failed to resume syncs")
  );
};
