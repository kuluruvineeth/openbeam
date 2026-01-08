import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorListTool = defineTool({
  name: "connector_list",
  description: `List all configured data source connectors for the team.

USE THIS WHEN:
- User asks "What sources do I have connected?" or "What integrations are active?"
- Need to check available data sources before searching
- Troubleshooting why certain content isn't appearing in search
- Getting an overview of the team's connected applications

DO NOT USE WHEN:
- User wants to search for documents (use search_hybrid)
- User wants details about a specific connector (use connector_status)
- User wants to trigger a sync (use connector_sync)

RETURNS: List of connectors with id, name, type, status, last sync time, and document count.`,
  category: "connectors",
  deferLoading: false,
  searchKeywords: ["connector", "integration", "source", "list", "available"],

  parameters: z.object({
    status: z
      .enum(["active", "inactive", "error", "all"])
      .optional()
      .default("all")
      .describe(
        "Filter by connector status. 'active' = syncing normally, 'inactive' = paused, 'error' = has sync errors, 'all' = no filter."
      ),
    type: z
      .string()
      .optional()
      .describe(
        "Filter by connector type. Valid values: 'linear', 'slack', 'notion', 'jira', 'github', 'google-drive', 'confluence'. Omit to list all types."
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const allConnectors = await ctx.services.connectors.list(ctx.teamId);

    let filtered = allConnectors;

    if (params.status !== "all") {
      const statusMap: Record<string, string> = {
        active: "ACTIVE",
        inactive: "INACTIVE",
        error: "ERROR",
      };
      filtered = filtered.filter((c) => c.status === statusMap[params.status]);
    }

    if (params.type) {
      filtered = filtered.filter(
        (c) => c.type.toLowerCase() === params.type?.toLowerCase()
      );
    }

    const connectors = filtered.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      status: c.status.toLowerCase(),
      lastSyncAt: c.lastSyncAt,
      createdAt: c.createdAt,
      documentCount: c.documentCount,
      errorMessage: c.errorMessage,
    }));

    return success(
      {
        connectors,
        total: connectors.length,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "database",
      }
    );
  },
});
