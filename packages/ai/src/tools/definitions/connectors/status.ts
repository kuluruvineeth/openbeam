import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorStatusTool = defineTool({
  name: "connector_status",
  description: `Get detailed status for a specific connector.
Returns sync history, document counts, and health information.
Use to diagnose connector issues or check sync progress.`,
  category: "connectors",
  deferLoading: false,
  searchKeywords: ["status", "health", "sync", "progress", "diagnose"],

  parameters: z.object({
    connectorId: z.string().describe("The connector ID"),
    includeHistory: z
      .boolean()
      .optional()
      .default(false)
      .describe("Include sync history"),
    historyLimit: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe("Number of history entries"),
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
