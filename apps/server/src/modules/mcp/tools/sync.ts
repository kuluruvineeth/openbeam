import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import prisma, {
  getConnectorsWithStats,
  getSyncHistory,
  getSyncStatus,
  verifyConnectorOwnership,
} from "@openbeam/db";
import {
  ConnectorServiceError,
  createManualConnectorSyncForTeam,
} from "@openbeam/services/connectors";
import {
  cancelAllSyncsForConnector,
  getActiveSyncsForConnector,
  getSyncProgress,
  pauseSync,
  resumeSync,
  startConnectorSync,
} from "@openbeam/temporal";
import { z } from "zod";
import {
  formatSyncControl,
  formatSyncErrors,
  formatSyncHealth,
  formatSyncHistory,
  formatSyncProgress,
  formatSyncStatus,
  formatSyncTrigger,
  formatSyncTriggerAll,
} from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  DESTRUCTIVE_ANNOTATIONS,
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

        const triggered = results.filter(
          (r) => r.status === "triggered"
        ).length;
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
          content: [
            { type: "text" as const, text: formatSyncControl(response) },
          ],
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
          content: [
            { type: "text" as const, text: formatSyncControl(response) },
          ],
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
          content: [
            { type: "text" as const, text: formatSyncControl(response) },
          ],
          structuredContent: response,
        };
      }, "Failed to resume syncs")
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
          content: [
            { type: "text" as const, text: formatSyncErrors(response) },
          ],
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
          content: [
            { type: "text" as const, text: formatSyncHealth(response) },
          ],
          structuredContent: response,
        };
      }, "Failed to get sync health")
    );
  }
};
