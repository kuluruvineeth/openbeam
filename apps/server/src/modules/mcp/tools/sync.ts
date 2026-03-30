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
    server.registerTool(
      "sync_trigger",
      {
        title: "Trigger Sync",
        description:
          "Start a sync job for a specific connector. Supports full sync (re-index everything) or incremental sync (changes since last sync). Returns a job ID to track progress via sync_status.",
        inputSchema: {
          connectorId: z.string().describe("Connector ID to sync"),
          type: z
            .enum(["full", "incremental"])
            .optional()
            .describe("Sync type (default: incremental)"),
        },
        annotations: WRITE_ANNOTATIONS,
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
              { type: "text" as const, text: JSON.stringify(response) },
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
    server.registerTool(
      "sync_status",
      {
        title: "Sync Job Status",
        description:
          "Check the sync status of a connector. Returns connector status, latest sync details, document counts, processing state, and scheduled sync jobs.",
        inputSchema: {
          connectorId: z
            .string()
            .describe("Connector ID to check sync status for"),
        },
        annotations: READ_ONLY_ANNOTATIONS,
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
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          structuredContent: result,
        };
      }, "Failed to get sync status")
    );

    server.registerTool(
      "sync_history",
      {
        title: "Sync History",
        description:
          "List past sync jobs for a connector. Shows status, duration, document counts, and errors for each job. Use to diagnose sync issues or verify sync health.",
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

        const { text, structuredContent } = truncateListResponse(response);

        return {
          content: [{ type: "text" as const, text }],
          structuredContent,
        };
      }, "Failed to list sync history")
    );
  }
};
