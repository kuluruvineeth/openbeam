import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorSyncTool = defineTool({
  name: "connector_sync",
  description: `Trigger a sync job for a connector to refresh data from the source.

USE THIS WHEN:
- User explicitly requests "Sync my Slack" or "Refresh Notion data"
- User reports content is out of date and wants the latest
- After connector configuration changes that require re-indexing

DO NOT USE WHEN:
- User just wants to search for content (search works on existing data)
- User wants to check connector health (use connector_status)
- User hasn't explicitly requested a sync (syncs are resource-intensive)

RETURNS: Job ID for tracking sync progress. Use connector_status with the connector ID to monitor sync completion. Full syncs can take minutes to hours depending on data volume.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: ["sync", "refresh", "update", "trigger", "pull"],
  requiredPermissions: ["connector:sync"],

  parameters: z.object({
    connectorId: z
      .string()
      .describe(
        "The connector ID to sync. Obtain from connector_list. Format: UUID."
      ),
    syncType: z
      .enum(["full", "incremental"])
      .optional()
      .default("incremental")
      .describe(
        "'incremental' = only new/changed content (fast, default). 'full' = re-index everything (slow, use for fixing issues or after schema changes)."
      ),
    priority: z
      .enum(["low", "normal", "high"])
      .optional()
      .default("normal")
      .describe(
        "Queue priority. 'high' for urgent user requests, 'normal' for standard refreshes, 'low' for background maintenance."
      ),
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
