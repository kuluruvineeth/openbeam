import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorSyncTool = defineTool({
  name: "connector_sync",
  description: `Trigger a sync for a connector.
Starts a full or incremental sync depending on configuration.
Use to refresh data from a specific source.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: ["sync", "refresh", "update", "trigger", "pull"],
  requiredPermissions: ["connector:sync"],

  parameters: z.object({
    connectorId: z.string().describe("The connector ID to sync"),
    syncType: z.enum(["full", "incremental"]).optional().default("incremental"),
    priority: z.enum(["low", "normal", "high"]).optional().default("normal"),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return Promise.resolve(failure("UNAUTHORIZED", "Team context required"));
    }

    return Promise.resolve(
      success(
        {
          connectorId: params.connectorId,
          syncType: params.syncType,
          jobId: null,
          queued: false,
          message: "Sync functionality not yet implemented",
        },
        { latencyMs: performance.now() - startTime, source: "queue" }
      )
    );
  },
});
