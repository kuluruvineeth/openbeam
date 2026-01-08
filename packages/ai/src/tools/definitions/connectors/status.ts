import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorStatusTool = defineTool({
  name: "connector_status",
  description: `Get detailed status and health information for a specific connector.

USE THIS WHEN:
- User asks "Is my Slack connector working?" or "When did Notion last sync?"
- Diagnosing why content from a specific source isn't appearing
- Checking sync progress after triggering a sync
- User reports issues with a specific integration

DO NOT USE WHEN:
- User wants to see all connectors (use connector_list first)
- User wants to trigger a new sync (use connector_sync)
- User wants to search for content (use search_hybrid)

RETURNS: Detailed connector status including current state, last sync time, document count, error messages if any, and optionally sync history with success/failure details.`,
  category: "connectors",
  deferLoading: false,
  searchKeywords: ["status", "health", "sync", "progress", "diagnose"],

  parameters: z.object({
    connectorId: z
      .string()
      .describe(
        "The connector ID to check. Obtain from connector_list results. Format: UUID."
      ),
    includeHistory: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "Include recent sync history. Enable to diagnose recurring issues or verify sync patterns."
      ),
    historyLimit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe(
        "Number of sync history entries to return (1-50). Use higher values when diagnosing intermittent issues."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const connector = await ctx.services.connectors.get(params.connectorId);

    if (!connector) {
      return failure("NOT_FOUND", `Connector not found: ${params.connectorId}`);
    }

    const allConnectors = await ctx.services.connectors.list(ctx.teamId);
    const belongsToTeam = allConnectors.some(
      (c) => c.id === params.connectorId
    );

    if (!belongsToTeam) {
      return failure("UNAUTHORIZED", "Connector belongs to different team");
    }

    let history: Array<{
      id: string;
      status: string;
      startedAt: Date | null;
      completedAt: Date | null;
      documentsProcessed: number;
      errorMessage: string | null;
    }> = [];

    if (params.includeHistory) {
      const syncHistory = await ctx.services.connectors.getSyncHistory(
        params.connectorId,
        params.historyLimit
      );

      history = syncHistory.map((h) => ({
        id: h.id,
        status: h.status.toLowerCase(),
        startedAt: h.startedAt,
        completedAt: h.completedAt,
        documentsProcessed: h.documentsProcessed,
        errorMessage: h.errorMessage ?? null,
      }));
    }

    return success(
      {
        connector: {
          id: connector.id,
          name: connector.name,
          type: connector.type,
        },
        found: true,
        status: connector.status.toLowerCase(),
        lastSync: connector.lastSyncAt,
        documentCount: connector.documentCount,
        errorMessage: connector.errorMessage,
        history,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "database",
      }
    );
  },
});
