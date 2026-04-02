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
          "Start a data sync job for a specific connector, pulling the latest data from the connected source into the OpenBeam search index. Use this when the user wants to refresh their data, after setting up a new connector (connector_setup or connector_configure), or when search results appear stale.\n\nReturns: sync job ID (for tracking), Temporal workflow ID, connector ID, and sync type. The default sync type is 'incremental' which only fetches changes since the last successful sync — this is fast (seconds to minutes). Use type 'full' ONLY when the user explicitly requests a complete re-index, as full syncs re-process all documents from scratch and can take hours for large connectors with tens of thousands of documents.\n\nAfter triggering, use sync_status with the connector ID to monitor real-time progress (documents processed, errors, estimated completion). The connector must be in an active state — if the trigger fails, use connector_get to check the connector's status and error message. Use connector_list first if you need to find the connector ID.\n\nDo NOT trigger full syncs proactively — always default to incremental. Do NOT trigger syncs on connectors in 'error' or 'AUTH_EXPIRED' state without first addressing the underlying issue (check connector_health and sync_history for diagnostics).",
        inputSchema: {
          connectorId: z
            .string()
            .describe(
              "The ID of the connector to sync. Get this from connector_list results or connector_setup/connector_configure responses."
            ),
          type: z
            .enum(["full", "incremental"])
            .optional()
            .describe(
              "Sync type. 'incremental' (default) fetches only changes since the last sync — fast and safe. 'full' re-indexes every document from scratch — slow, use only when explicitly requested by the user."
            ),
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
          "Check the current sync state and latest sync job details for a specific connector. Use this after sync_trigger to monitor a running sync's progress, or proactively when the user asks whether their data is up-to-date or wants to know when the last sync completed.\n\nReturns a comprehensive status object containing: connector metadata (name, type, status), latest sync job details (status, start/finish timestamps, duration in milliseconds, documents added/updated/deleted counts, error message if failed), processing queue state (pending items, in-flight count), scheduled sync jobs, and webhook registration status. This gives you a complete picture of the connector's sync health at a glance.\n\nIf the latest sync shows errors or failures, use sync_history to check whether this is a recurring pattern or a one-time issue. Use connector_health for an overall health score. If data appears stale (last sync was long ago), use sync_trigger to start a fresh incremental sync.\n\nDo NOT confuse this with connector_get — sync_status focuses on sync operations and job details, while connector_get returns connector configuration and setup information.",
        inputSchema: {
          connectorId: z
            .string()
            .describe(
              "The ID of the connector to check sync status for. Get this from connector_list results or sync_trigger response."
            ),
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
          "List historical sync jobs for a connector, ordered from most recent to oldest, with full details for each job. Use this when diagnosing recurring sync failures, verifying that recent syncs completed successfully, or auditing how much data has been synced over time.\n\nReturns each sync job's: ID, connector ID, connector type, status ('COMPLETED', 'FAILED', 'RUNNING', 'CANCELLED'), sync type ('FULL', 'INCREMENTAL'), start and completion timestamps, documents processed count (added + updated), documents errored count, and error message if failed. Supports offset-based pagination with configurable limit (default 25, max 100). The response includes total count and whether more pages are available.\n\nLook for patterns in the results: repeated failures with the same error message suggest a systemic issue like expired OAuth tokens (AUTH_EXPIRED), API rate limiting, or configuration changes on the source platform. Use connector_health for a summarized health score, or sync_trigger to attempt a fresh sync after resolving the underlying issue.\n\nDo NOT use this for real-time monitoring of an in-progress sync — use sync_status instead, which shows the live state of the latest job.",
        inputSchema: {
          connectorId: z
            .string()
            .describe(
              "The ID of the connector to get sync history for. Get this from connector_list results."
            ),
          limit: z.coerce
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe(
              "Maximum number of sync jobs to return, between 1 and 100. Defaults to 25. Use higher values to see more history for pattern analysis."
            ),
          offset: z.coerce
            .number()
            .min(0)
            .optional()
            .describe(
              "Number of results to skip for pagination. Defaults to 0. Use with limit to page through history."
            ),
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
