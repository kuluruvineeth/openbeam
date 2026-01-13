import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorSyncHistoryTool = defineTool({
  name: "connector_sync_history",
  description: `Get detailed sync history for a connector with pagination support.

USE THIS WHEN:
- User asks "Show me sync history for Slack" or "What syncs ran yesterday?"
- Diagnosing sync failures or patterns over time
- Auditing connector activity for compliance or debugging
- Comparing sync performance across multiple runs
- Looking for trends in sync duration, success rate, or document counts

DO NOT USE WHEN:
- User wants current connector status only (use connector_status)
- User wants to trigger a new sync (use connector_sync)
- User wants to check if a specific sync job is running (use connector_sync_status)

RETURNS: Paginated list of sync history entries with status, timing, document counts, and any error messages. Use offset and limit for pagination through large histories.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: [
    "history",
    "audit",
    "log",
    "past",
    "previous",
    "syncs",
    "runs",
  ],
  requiredPermissions: ["connector:read"],

  parameters: z.object({
    connectorId: z
      .string()
      .describe(
        "The connector ID to get history for. Obtain from connector_list. Format: UUID."
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe("Number of history entries to return (1-100). Default: 20."),
    offset: z
      .number()
      .min(0)
      .optional()
      .default(0)
      .describe("Number of entries to skip for pagination. Default: 0."),
    status: z
      .enum(["completed", "failed", "running", "cancelled"])
      .optional()
      .describe("Filter by sync status. Omit to include all statuses."),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const connector = await ctx.services.connectors.get(params.connectorId);
    if (!connector) {
      return failure("NOT_FOUND", `Connector ${params.connectorId} not found`);
    }

    const allConnectors = await ctx.services.connectors.list(ctx.teamId);
    const belongsToTeam = allConnectors.some(
      (c) => c.id === params.connectorId
    );

    if (!belongsToTeam) {
      return failure("FORBIDDEN", "Connector belongs to a different team");
    }

    const historyPage = await ctx.services.connectors.getSyncHistoryPaginated({
      connectorId: params.connectorId,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    });

    let entries = historyPage.entries;
    if (params.status) {
      entries = entries.filter((e) => e.status.toLowerCase() === params.status);
    }

    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      status: entry.status.toLowerCase(),
      startedAt: entry.startedAt?.toISOString() ?? null,
      completedAt: entry.completedAt?.toISOString() ?? null,
      durationMs:
        entry.startedAt && entry.completedAt
          ? entry.completedAt.getTime() - entry.startedAt.getTime()
          : null,
      documentsProcessed: entry.documentsProcessed,
      errorMessage: entry.errorMessage ?? null,
    }));

    const successCount = formattedEntries.filter(
      (e) => e.status === "completed"
    ).length;
    const failureCount = formattedEntries.filter(
      (e) => e.status === "failed"
    ).length;

    return success(
      {
        connector: {
          id: connector.id,
          name: connector.name,
          type: connector.type,
        },
        history: formattedEntries,
        pagination: historyPage.pagination,
        summary: {
          totalReturned: formattedEntries.length,
          successCount,
          failureCount,
          successRate:
            formattedEntries.length > 0
              ? Math.round((successCount / formattedEntries.length) * 100)
              : null,
        },
      },
      { latencyMs: performance.now() - startTime, source: "database" }
    );
  },
});
