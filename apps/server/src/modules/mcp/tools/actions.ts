import db, { findConnectorById } from "@openbeam/db";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { z } from "zod";
import { formatActionsList } from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const actionsByConnector = new Map(
  ALL_CONNECTOR_ACTION_REGISTRIES.map((r) => [r.connectorType, r])
);

const mcpActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  connectorType: z.string(),
  category: z.string(),
  stakes: z.string(),
  reversible: z.boolean(),
  inputs: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      required: z.boolean(),
      description: z.string().nullable().optional(),
    })
  ),
});

export const registerActionTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "connectors.read")) {
    return;
  }

  server.registerTool(
    "connector_actions_list",
    {
      title: "List Connector Actions",
      description:
        "Discover available write actions for connected data sources. Lists operations like sending Slack messages, creating Jira issues, creating Notion pages, etc. Each action includes: ID, name, description, category, stakes level, reversibility, and required input parameters.\n\nUse this FIRST before connector_action_execute — it returns the action IDs and required parameters you need. Filter by connector type (e.g. 'slack', 'linear', 'notion') or category ('create', 'update', 'delete', 'notify'). Omit connectorType to see all available actions across all connectors.\n\nThe response includes stakes ('low', 'medium', 'high') and reversibility to help assess risk before execution.",
      inputSchema: {
        connectorType: z
          .string()
          .optional()
          .describe(
            "Filter by connector type (e.g. slack, linear, notion). Omit to list all."
          ),
        category: z
          .enum([
            "create",
            "read",
            "update",
            "delete",
            "search",
            "list",
            "notify",
          ])
          .optional()
          .describe("Filter by action category"),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    (params) => {
      let registries = ALL_CONNECTOR_ACTION_REGISTRIES;

      if (params.connectorType) {
        const type = params.connectorType.toLowerCase();
        registries = registries.filter(
          (r) => r.connectorType.toLowerCase() === type
        );
      }

      const allActions = registries.flatMap((r) =>
        r.actions.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          connectorType: a.connectorType,
          category: a.category,
          stakes: a.stakes,
          reversible: a.reversible,
          inputs: a.inputs.map((inp) => ({
            id: inp.id,
            name: inp.name,
            type: inp.type,
            required: inp.required,
            description: inp.description ?? null,
          })),
        }))
      );

      const filtered = params.category
        ? allActions.filter((a) => a.category === params.category)
        : allActions;

      const data = sanitizeArray(mcpActionSchema, filtered);

      const response = {
        meta: {
          totalActions: data.length,
          connectorTypes: [...new Set(data.map((a) => a.connectorType))],
          hasNextPage: false,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [
          {
            type: "text" as const,
            text: formatActionsList(data, params.connectorType),
          },
        ],
        structuredContent,
      };
    }
  );

  if (!hasScope(ctx, "connectors.write")) {
    return;
  }

  server.registerTool(
    "connector_action_execute",
    {
      title: "Execute Connector Action",
      description:
        "Execute a write action on a connected data source. Requires three parameters: the connector ID (from connector_list), the action ID (from connector_actions_list), and a params object whose keys match the input IDs from connector_actions_list.\n\nIMPORTANT: Always call connector_actions_list first to discover the exact action ID and required parameters. Always confirm with the user before executing high-stakes or irreversible actions.\n\nExamples: send a Slack message (action: 'message_send'), create a Linear issue (action: 'issue_create'), create a Notion page (action: 'page_create'). The connector ID must reference an active, connected instance — use connector_list to find it.",
      inputSchema: {
        connectorId: z
          .string()
          .describe("ID of the connected connector to execute the action on"),
        actionId: z
          .string()
          .describe(
            "Action ID from connector_actions_list (e.g. message_send, issue_create)"
          ),
        params: z
          .record(z.string(), z.unknown())
          .describe(
            "Action parameters — keys match the input IDs from connector_actions_list"
          ),
      },
      annotations: WRITE_ANNOTATIONS,
    },
    withErrorHandling(async ({ connectorId, actionId, params }) => {
      const connector = await findConnectorById(db, connectorId);

      if (!connector || connector.teamId !== ctx.teamId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or access denied",
            },
          ],
          isError: true,
        };
      }

      const registry = actionsByConnector.get(connector.app.toLowerCase());
      if (!registry) {
        return {
          content: [
            {
              type: "text" as const,
              text: `No actions available for connector type: ${connector.app}`,
            },
          ],
          isError: true,
        };
      }

      const actionDef = registry.actions.find((a) => a.id === actionId);
      if (!actionDef) {
        const available = registry.actions.map((a) => a.id).join(", ");
        return {
          content: [
            {
              type: "text" as const,
              text: `Action "${actionId}" not found. Available: ${available}`,
            },
          ],
          isError: true,
        };
      }

      const missingRequired = actionDef.inputs
        .filter((inp) => inp.required && !(inp.id in params))
        .map((inp) => inp.id);

      if (missingRequired.length > 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Missing required parameters: ${missingRequired.join(", ")}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text" as const,
            text: `Action "${actionDef.name}" on ${connector.name} is registered but execution is not yet wired. The action definition and parameter validation passed. Wire the executor in packages/services/src/${connector.app.toLowerCase()}/actions/ to enable execution.`,
          },
        ],
        structuredContent: {
          status: "validated",
          action: actionDef.name,
          connector: connector.name,
          connectorType: connector.app,
          params,
        },
      };
    }, "Failed to execute connector action")
  );
};
