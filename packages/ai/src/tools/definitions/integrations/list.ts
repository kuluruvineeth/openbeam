import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const integrationListAvailableTool = defineTool({
  name: "integration_list_available",
  description: `List all available integration types that can be connected.

USE THIS WHEN:
- User asks what integrations are supported
- User wants to connect a new data source
- Need to check if a specific service is supported
- Helping user plan which sources to connect

DO NOT USE WHEN:
- User wants to see already connected sources (use connector_list)
- User wants to trigger a sync (use connector_sync)

RETURNS: List of all supported integration types with names, categories, auth methods, and capabilities.`,
  category: "integration",
  searchKeywords: ["integration", "available", "supported", "connect", "apps"],
  requiredPermissions: ["connectors:read"],

  parameters: z.object({
    category: z
      .enum([
        "communication",
        "productivity",
        "development",
        "storage",
        "crm",
        "all",
      ])
      .optional()
      .default("all")
      .describe("Filter by integration category"),
    authType: z
      .enum(["oauth", "api_key", "service_account", "all"])
      .optional()
      .default("all")
      .describe("Filter by authentication method"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const integrations = await ctx.services.integrations.listAvailable();

    let filtered = integrations;

    if (params.category !== "all") {
      filtered = filtered.filter((i) => i.category === params.category);
    }

    if (params.authType !== "all") {
      filtered = filtered.filter((i) => i.authType === params.authType);
    }

    type IntegrationSummary = {
      type: string;
      name: string;
      authType: string;
      documentTypes: string[];
    };

    const grouped: Record<string, IntegrationSummary[]> = {};

    for (const integration of filtered) {
      const category = integration.category;
      const categoryGroup = grouped[category] ?? [];
      categoryGroup.push({
        type: integration.type,
        name: integration.name,
        authType: integration.authType,
        documentTypes: integration.documentTypes,
      });
      grouped[category] = categoryGroup;
    }

    return success(
      {
        integrations: filtered.map((i) => ({
          type: i.type,
          name: i.name,
          category: i.category,
          authType: i.authType,
          documentTypes: i.documentTypes,
        })),
        byCategory: grouped,
        totalCount: filtered.length,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "integrations",
      }
    );
  },
});
