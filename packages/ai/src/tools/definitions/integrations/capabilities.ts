import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const integrationCapabilitiesTool = defineTool({
  name: "integration_capabilities",
  description: `Get detailed capabilities and features of a specific integration type.

USE THIS WHEN:
- User asks what a specific integration can do
- Need to understand what data types an integration provides
- Checking if an integration supports a specific feature
- Helping user decide between integration options

DO NOT USE WHEN:
- Need to list all available integrations (use integration_list_available)
- Need info about an already connected source (use connector_status)

RETURNS: Detailed integration info including capabilities, document types, and authentication requirements.`,
  category: "integration",
  searchKeywords: ["integration", "capabilities", "features", "what can"],
  requiredPermissions: ["connectors:read"],

  parameters: z.object({
    integrationType: z
      .string()
      .describe(
        "The integration type to get capabilities for (e.g., 'slack', 'notion', 'jira')"
      ),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const integration = await ctx.services.integrations.getCapabilities(
      params.integrationType
    );

    if (!integration) {
      return failure(
        "NOT_FOUND",
        `Integration type '${params.integrationType}' not found`,
        {
          suggestion:
            "Use integration_list_available to see all supported types",
        }
      );
    }

    return success(
      {
        type: integration.type,
        name: integration.name,
        category: integration.category,
        authType: integration.authType,
        authDescription: getAuthDescription(integration.authType),
        capabilities: integration.capabilities,
        documentTypes: integration.documentTypes,
        documentTypesDescription: formatDocumentTypes(
          integration.documentTypes
        ),
      },
      {
        latencyMs: performance.now() - startTime,
        source: "integrations",
      }
    );
  },
});

function getAuthDescription(
  authType: "oauth" | "api_key" | "service_account"
): string {
  const descriptions = {
    oauth:
      "Connects via OAuth 2.0 - user authorizes access through provider login",
    api_key:
      "Connects via API key or personal access token - user provides credentials",
    service_account:
      "Connects via service account - organization-wide access with admin setup",
  };
  return descriptions[authType];
}

function formatDocumentTypes(types: string[]): string {
  if (types.length === 0) {
    return "No document types specified";
  }
  if (types.length === 1) {
    return `Provides ${types[0]} documents`;
  }
  if (types.length === 2) {
    return `Provides ${types[0]} and ${types[1]} documents`;
  }
  const last = types.at(-1);
  const rest = types.slice(0, -1);
  return `Provides ${rest.join(", ")}, and ${last} documents`;
}
