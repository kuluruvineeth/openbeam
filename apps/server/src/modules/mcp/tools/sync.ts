import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import prisma, {
  getSyncHistory,
  getSyncStatus,
  verifyConnectorOwnership,
} from "@openbeam/db";
import {
  ConnectorServiceError,
  createManualConnectorSyncForTeam,
} from "@openbeam/services/connectors";
import { startConnectorSync } from "@openbeam/temporal";
import { z } from "zod";
import {
  formatSyncHistory,
  formatSyncStatus,
  formatSyncTrigger,
} from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpSyncJobSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  connectorType: z.string().nullable().optional(),
  status: z.string(),
  type: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  documentsProcessed: z.number().nullable().optional(),
  documentsErrored: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const registerSyncTools: RegisterTools = (server, ctx) => {
  const hasReadScope = hasScope(ctx, "sync.read");
  const hasWriteScope = hasScope(ctx, "sync.write");

  if (!(hasReadScope || hasWriteScope)) {
    return;
  }

  if (hasWriteScope) {
    registerAppTool(
      server,
      "sync_trigger",
      {
        title: "Trigger Sync",
        description:
          "Start a sync job for a specific connector. Returns a job ID and workflow ID to track progress.\n\nDefault is incremental sync (fast, only changes since last sync). Use type 'full' only when explicitly requested — full syncs re-index all documents and can take hours for large connectors. After triggering, use sync_status with the connector ID to monitor progress.\n\nRequires a connector ID from connector_list. The connector must be in an active state — check with connector_get if the trigger fails.",
        inputSchema: {
          connectorId: z.string().describe("Connector ID to sync"),
          type: z
            .enum(["full", "incremental"])
            .optional()
            .describe("Sync type (default: incremental)"),
        },
        annotations: WRITE_ANNOTATIONS,
        _meta: { ui: { resourceUri: "ui://openbeam/sync-status" } },
      },
      async (params) => {
        try {
          const syncType = params.type === "full" ? "FULL" : "INCREMENTAL";

          const syncRequest = await createManualConnectorSyncForTeam(prisma, {
            connectorId: params.connectorId,
            teamId: ctx.teamId,
            type: syncType,
          });

          const syncHandle = await startConnectorSync({
            connectorId: params.connectorId,
            connectorType: syncRequest.connectorType,
            syncType: syncRequest.syncType,
            trigger: "MANUAL",
            requestId: syncRequest.syncHistoryId,
            teamId: ctx.teamId,
          });

          const response = {
            syncJobId: syncRequest.syncHistoryId,
            workflowId: syncHandle.workflowId,
            connectorId: params.connectorId,
            type: syncRequest.syncType,
          };

          return {
            content: [
              { type: "text" as const, text: formatSyncTrigger(response) },
            ],
            structuredContent: response,
          };
        } catch (error) {
          let message = "Failed to trigger sync";
          if (
            error instanceof ConnectorServiceError ||
            error instanceof Error
          ) {
            message = error.message;
          }

          return {
            content: [{ type: "text" as const, text: message }],
            isError: true,
          };
        }
      }
    );
  }

  if (hasReadScope) {
    registerAppTool(
      server,
      "sync_status",
      {
        title: "Sync Job Status",
        description:
          "Check the current sync state of a connector. Returns: connector status, latest sync job details (status, duration, documents added/updated/deleted, errors), processing queue state, scheduled jobs, and webhook status.\n\nUse this after sync_trigger to monitor a running sync, or proactively to check if a connector's data is fresh. If the latest sync shows errors, use sync_history for failure patterns and connector_health for overall health assessment.",
        inputSchema: {
          connectorId: z
            .string()
            .describe("Connector ID to check sync status for"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
        _meta: { ui: { resourceUri: "ui://openbeam/sync-status" } },
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

        const status = await getSyncStatus(prisma, connectorId);

        if (!status) {
          return {
            content: [
              { type: "text" as const, text: "Sync status unavailable" },
            ],
            isError: true,
          };
        }

        const result = {
          connector: status.connector,
          latestSync: status.latestSync
            ? {
                id: status.latestSync.id,
                status: status.latestSync.status,
                startedAt: status.latestSync.startedAt?.toISOString() ?? null,
                finishedAt: status.latestSync.finishedAt?.toISOString() ?? null,
                durationMs: status.latestSync.durationMs,
                dataAdded: status.latestSync.dataAdded,
                dataUpdated: status.latestSync.dataUpdated,
                dataDeleted: status.latestSync.dataDeleted,
                errorMessage: status.latestSync.errorMessage,
              }
            : null,
          stats: status.stats,
          processing: status.processing,
          syncJobs: status.syncJobs,
          webhookStatus: status.webhookStatus,
        };

        return {
          content: [{ type: "text" as const, text: formatSyncStatus(result) }],
          structuredContent: result,
        };
      }, "Failed to get sync status")
    );

    server.registerTool(
      "sync_history",
      {
        title: "Sync History",
        description:
          "List past sync jobs for a connector with status, duration, document counts, and error messages. Supports pagination (default 25 results). Use this to diagnose recurring sync failures or verify that recent syncs completed successfully.\n\nLook for patterns: repeated errors suggest auth expiry or API changes. Use connector_health for the overall health score, or sync_trigger to attempt a fresh sync after resolving issues.",
        inputSchema: {
          connectorId: z
            .string()
            .describe("Connector ID to get sync history for"),
          limit: z.coerce
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe("Max results (1-100, default 25)"),
          offset: z.coerce
            .number()
            .min(0)
            .optional()
            .describe("Offset for pagination (default 0)"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
      },
      withErrorHandling(async (params) => {
        const connector = await verifyConnectorOwnership(
          prisma,
          params.connectorId,
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

        const result = await getSyncHistory(prisma, params.connectorId, {
          limit: params.limit ?? 25,
          offset: params.offset ?? 0,
        });

        const data = result.history.map((entry) => ({
          id: entry.id,
          connectorId: params.connectorId,
          status: entry.status,
          type: entry.syncJob?.type ?? null,
          startedAt: entry.startedAt?.toISOString() ?? null,
          completedAt: entry.finishedAt?.toISOString() ?? null,
          documentsProcessed: (entry.dataAdded ?? 0) + (entry.dataUpdated ?? 0),
          documentsErrored: null,
          errorMessage: entry.errorMessage,
        }));

        const sanitized = sanitizeArray(mcpSyncJobSchema, data);

        const response = {
          meta: {
            cursor: result.pagination.hasMore
              ? String((params.offset ?? 0) + (params.limit ?? 25))
              : null,
            hasNextPage: result.pagination.hasMore,
            total: result.pagination.total,
          },
          data: sanitized,
        };

        const { structuredContent } = truncateListResponse(response);

        return {
          content: [
            {
              type: "text" as const,
              text: formatSyncHistory(sanitized, result.pagination.total),
            },
          ],
          structuredContent,
        };
      }, "Failed to list sync history")
    );
  }
};
