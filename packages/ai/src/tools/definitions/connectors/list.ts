import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorListTool = defineTool({
  name: "connector_list",
  description: `List all configured connectors for the team.
Returns connector metadata including type, status, and last sync time.
Use to understand what data sources are available.`,
  category: "connectors",
  deferLoading: false,
  searchKeywords: ["connector", "integration", "source", "list", "available"],

  parameters: z.object({
    status: z
      .enum(["active", "inactive", "error", "all"])
      .optional()
      .default("all"),
    type: z.string().optional().describe("Filter by connector type"),
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
