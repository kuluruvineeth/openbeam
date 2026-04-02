import prisma, {
  getConnectorsWithStats,
  verifyConnectorOwnership,
} from "@openbeam/db";
import {
  getActiveSyncsForConnector,
  getSyncProgress,
} from "@openbeam/temporal";
import { z } from "zod";
import {
  formatSyncErrors,
  formatSyncHealth,
  formatSyncProgress,
} from "../formatters";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { withErrorHandling } from "../mcp.utils";

export const registerSyncMonitorTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "sync.read")) {
    return;
  }

  server.registerTool(
    "sync_progress",
    {
      title: "Real-Time Sync Progress",
      description:
        "Get real-time progress of an active sync. Shows documents processed, current stage, and errors during the sync. Use after sync_trigger to monitor progress, or when the user asks how a running sync is going.\n\nQueries Temporal workflows directly for live state including: current stage (INITIALIZING, FETCHING, TRANSFORMING, INDEXING), documents processed/indexed/errored, data changes (added, updated, deleted), batch number, and whether the sync is paused.\n\nReturns empty if no sync is running — use sync_status instead for the last completed sync. If multiple workflows are active for the same connector (rare), all are returned.\n\nDo NOT use this for completed syncs — use sync_status or sync_history instead.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connector to check progress for. Get this from connector_list or sync_trigger response."
          ),
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

      const activeSyncs = await getActiveSyncsForConnector(connectorId);

      const progressEntries: Array<{
        workflowId: string;
        stage: string;
        processed: number;
        indexed: number;
        errors: number;
        dataAdded: number;
        dataUpdated: number;
        dataDeleted: number;
        batchNumber?: number;
        progressMessage?: string;
        isPaused?: boolean;
      }> = [];
      for (const sync of activeSyncs) {
        const progress = await getSyncProgress(sync.workflowId);
        if (progress) {
          progressEntries.push({
            workflowId: progress.workflowId,
            stage: progress.stage,
            processed: progress.processed,
            indexed: progress.indexed,
            errors: progress.errors,
            dataAdded: progress.dataAdded,
            dataUpdated: progress.dataUpdated,
            dataDeleted: progress.dataDeleted,
            batchNumber: progress.batchNumber,
            progressMessage: progress.progressMessage,
            isPaused: progress.isPaused,
          });
        }
      }

      const response = {
        connectorId,
        activeSyncs: progressEntries,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: formatSyncProgress(response),
          },
        ],
        structuredContent: response,
      };
    }, "Failed to get sync progress")
  );

  server.registerTool(
    "sync_errors",
    {
      title: "Sync Error Details",
      description:
        "Get detailed error information from recent syncs. Use when the user reports sync failures, when connector_health shows issues, or when you need to diagnose why data is not being indexed.\n\nReturns sync history entries that have a non-empty error message, across one or all connectors. Each entry includes: connector ID, connector type, sync status, sync type, start time, error message, and documents processed before the error.\n\nTo investigate a specific connector, pass connectorId. To scan all connectors for errors, omit connectorId. Results are ordered by most recent first.\n\nAfter identifying errors, use connector_health for a health score, or sync_trigger to retry after fixing the underlying issue (e.g., re-authenticating an expired OAuth token).",
      inputSchema: {
        connectorId: z
          .string()
          .optional()
          .describe(
            "Optional connector ID to filter errors for a specific connector. Omit to see errors across all connectors in the team."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe(
            "Maximum number of error entries to return, between 1 and 50. Defaults to 10."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const limit = params.limit ?? 10;

      if (params.connectorId) {
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
      }

      const baseWhere = {
        errorMessage: { not: null },
        status: "FAILED" as const,
      };
      const where = params.connectorId
        ? { ...baseWhere, connectorId: params.connectorId }
        : { ...baseWhere, connector: { teamId: ctx.teamId } };

      const [entries, total] = await Promise.all([
        prisma.syncHistory.findMany({
          where,
          orderBy: { startedAt: "desc" },
          take: limit,
          include: {
            syncJob: {
              select: { type: true },
            },
            connector: {
              select: { app: true },
            },
          },
        }),
        prisma.syncHistory.count({ where }),
      ]);

      const errors = entries.map((e) => ({
        connectorId: e.connectorId,
        connectorType: e.connector?.app ?? null,
        status: e.status,
        type: e.syncJob?.type ?? null,
        startedAt: e.startedAt?.toISOString() ?? null,
        errorMessage: e.errorMessage,
        documentsProcessed:
          e.dataAdded != null || e.dataUpdated != null
            ? (e.dataAdded ?? 0) + (e.dataUpdated ?? 0)
            : null,
      }));

      const response = { errors, total };

      return {
        content: [{ type: "text" as const, text: formatSyncErrors(response) }],
        structuredContent: response,
      };
    }, "Failed to get sync errors")
  );

  server.registerTool(
    "sync_health",
    {
      title: "Aggregate Sync Health",
      description:
        "Get an aggregate health overview of all connector syncs. Shows which connectors are healthy, which have errors, and which haven't synced recently. Use for a quick 'is everything OK?' check, or when the user asks about the overall state of their data sources.\n\nReturns per-connector: name, type, status, document count, last sync status, and last sync time. Also returns aggregate counts: healthy (active + last sync completed), warning (active but never synced or last sync old), and error (connector in error state or last sync failed).\n\nFor deeper investigation of a specific connector, use connector_health or sync_errors. To fix issues, use sync_trigger to retry a sync or connector_get to check configuration.",
      inputSchema: {},
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async () => {
      const connectors = await getConnectorsWithStats(prisma, ctx.teamId);

      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      let healthy = 0;
      let warning = 0;
      let error = 0;

      const entries = connectors.map((c) => {
        const lastSyncStatus = c.lastSync?.status ?? null;
        const lastSyncAt =
          c.lastSync?.completedAt?.toISOString() ??
          c.lastSync?.createdAt?.toISOString() ??
          null;

        const isError = c.status === "ERROR" || lastSyncStatus === "FAILED";
        const isStale =
          !lastSyncAt ||
          Date.now() - new Date(lastSyncAt).getTime() > ONE_DAY_MS;
        const isHealthy =
          c.status === "ACTIVE" && lastSyncStatus === "COMPLETED" && !isStale;

        if (isError) {
          error += 1;
        } else if (isHealthy) {
          healthy += 1;
        } else {
          warning += 1;
        }

        return {
          connectorId: c.id,
          connectorName: c.name,
          connectorType: c.app,
          status: c.status,
          documentCount: c.documentCount,
          lastSyncStatus,
          lastSyncAt,
        };
      });

      const response = {
        healthy,
        warning,
        error,
        total: connectors.length,
        connectors: entries,
      };

      return {
        content: [{ type: "text" as const, text: formatSyncHealth(response) }],
        structuredContent: response,
      };
    }, "Failed to get sync health")
  );
};
