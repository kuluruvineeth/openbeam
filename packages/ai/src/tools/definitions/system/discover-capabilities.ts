import { z } from "zod";
import { defineTool, failure, success } from "../../builder";
import { toolRegistry } from "../../registry";

export const discoverCapabilitiesTool = defineTool({
  name: "discover_capabilities",
  description: `Discover available data sources, tools, and capabilities for the current team.

USE THIS WHEN:
- Starting a new conversation to understand available resources
- User asks what data sources are connected
- Need to determine if a capability exists before attempting it
- Planning complex workflows that span multiple tools

DO NOT USE WHEN:
- You already know the available capabilities
- Performing a simple, well-defined task
- User has explicitly specified which tool to use

RETURNS: Comprehensive capability inventory including connected data sources with document counts, available tools by category, and aggregate statistics.`,
  category: "system",
  deferLoading: false,
  searchKeywords: [
    "discover",
    "capabilities",
    "connectors",
    "sources",
    "tools",
    "available",
    "what can",
  ],

  parameters: z.object({
    includeTools: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include list of available tools in the response"),
    includeConnectors: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include list of connected data sources"),
    includeStats: z
      .boolean()
      .optional()
      .default(true)
      .describe("Include aggregate statistics"),
    toolCategory: z
      .string()
      .optional()
      .describe("Filter tools to specific category (e.g., 'search', 'rag')"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const capabilities = await ctx.services.discovery.getCapabilities(
      ctx.teamId
    );

    const result: {
      connectors?: typeof capabilities.connectors;
      tools?: Array<{ name: string; category: string; description: string }>;
      stats?: typeof capabilities.stats;
    } = {};

    if (params.includeConnectors) {
      result.connectors = capabilities.connectors;
    }

    if (params.includeTools) {
      let tools = toolRegistry.getAllMetadata().map((t) => ({
        name: t.name,
        category: t.category,
        description: t.description.split("\n")[0] ?? t.description,
      }));

      if (params.toolCategory) {
        tools = tools.filter((t) => t.category === params.toolCategory);
      }

      result.tools = tools;
    }

    if (params.includeStats) {
      result.stats = capabilities.stats;
    }

    return success(result, {
      latencyMs: performance.now() - startTime,
      source: "capability-discovery",
    });
  },
});
