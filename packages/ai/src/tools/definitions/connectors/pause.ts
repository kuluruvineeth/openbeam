import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorPauseTool = defineTool({
  name: "connector_pause",
  description: `Pause a connector to temporarily stop all syncing activity.

USE THIS WHEN:
- User explicitly requests "Pause my Slack connector" or "Stop syncing Notion"
- User wants to temporarily halt data ingestion for maintenance
- User needs to stop a connector due to rate limiting or API issues
- User wants to prevent sync jobs from running during a critical period

DO NOT USE WHEN:
- User wants to permanently remove a connector (that requires deletion via UI)
- User just wants to check connector status (use connector_status)
- User wants to trigger a one-time sync (use connector_sync)

RETURNS: Confirmation of pause action with previous and new connector status.
Note: Paused connectors retain all indexed data but won't sync new changes.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: ["pause", "stop", "halt", "disable", "freeze", "suspend"],
  requiredPermissions: ["connector:write"],

  parameters: z.object({
    connectorId: z
      .string()
      .describe(
        "The connector ID to pause. Obtain from connector_list. Format: UUID."
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

    if (
      connector.status === "inactive" ||
      connector.status.toLowerCase() === "inactive"
    ) {
      return success(
        {
          connectorId: connector.id,
          connectorName: connector.name,
          connectorType: connector.type,
          previousStatus: connector.status,
          newStatus: "inactive",
          alreadyPaused: true,
          message: "Connector is already paused",
        },
        { latencyMs: performance.now() - startTime, source: "database" }
      );
    }

    const result = await ctx.services.connectors.pause(
      params.connectorId,
      ctx.teamId
    );

    return success(
      {
        connectorId: result.connectorId,
        connectorName: connector.name,
        connectorType: connector.type,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        alreadyPaused: false,
        message: result.message,
      },
      { latencyMs: performance.now() - startTime, source: "database" }
    );
  },
});
