import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorResumeTool = defineTool({
  name: "connector_resume",
  description: `Resume a paused connector to restart syncing activity.

USE THIS WHEN:
- User explicitly requests "Resume my Slack connector" or "Start syncing Notion again"
- User wants to reactivate a previously paused connector
- After maintenance period is complete and syncing should continue
- User wants to restore normal sync operations

DO NOT USE WHEN:
- User wants to trigger an immediate sync (use connector_sync after resuming)
- Connector is in error state (may need reconfiguration first)
- User just wants to check connector status (use connector_status)

RETURNS: Confirmation of resume action with previous and new connector status.
Note: After resuming, the connector will sync on its normal schedule. Use connector_sync to trigger an immediate sync.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: [
    "resume",
    "start",
    "enable",
    "activate",
    "unpause",
    "reactivate",
  ],
  requiredPermissions: ["connector:write"],

  parameters: z.object({
    connectorId: z
      .string()
      .describe(
        "The connector ID to resume. Obtain from connector_list. Format: UUID."
      ),
    triggerSync: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        "If true, immediately trigger an incremental sync after resuming. Useful when resuming after a pause and wanting to catch up on missed changes."
      ),
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

    const statusLower = connector.status.toLowerCase();
    if (statusLower === "active" || statusLower === "syncing") {
      return success(
        {
          connectorId: connector.id,
          connectorName: connector.name,
          connectorType: connector.type,
          previousStatus: connector.status,
          newStatus: connector.status,
          alreadyActive: true,
          message: "Connector is already active",
          syncTriggered: false,
        },
        { latencyMs: performance.now() - startTime, source: "database" }
      );
    }

    if (statusLower === "error") {
      return failure(
        "INVALID_STATE",
        `Connector is in error state: ${connector.errorMessage ?? "Unknown error"}. The connector may need reconfiguration before resuming.`,
        {
          suggestion:
            "Check connector configuration or contact support to resolve the error before resuming.",
        }
      );
    }

    const result = await ctx.services.connectors.resume(
      params.connectorId,
      ctx.teamId
    );

    let syncTriggered = false;
    let syncJobId: string | undefined;

    if (params.triggerSync) {
      const syncResult = await ctx.services.connectors.triggerSync({
        connectorId: params.connectorId,
        teamId: ctx.teamId,
        syncType: "incremental",
        priority: "normal",
      });
      syncTriggered = true;
      syncJobId = syncResult.jobId;
    }

    return success(
      {
        connectorId: result.connectorId,
        connectorName: connector.name,
        connectorType: connector.type,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        alreadyActive: false,
        message: result.message,
        syncTriggered,
        syncJobId,
      },
      { latencyMs: performance.now() - startTime, source: "database" }
    );
  },
});
