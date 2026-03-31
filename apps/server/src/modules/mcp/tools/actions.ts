import db, { findConnectorById } from "@openbeam/db";
import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { z } from "zod";
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
        "List all available write actions for a connector type. Shows what operations can be performed (send message, create issue, create page, etc.) with their required inputs. Use this to discover what you can do with each connector.",
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
    withErrorHandling((params) => {
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
        },
        data,
      };

      const { text, structuredContent } = truncateListResponse(response);

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }, "Failed to list connector actions")
  );

  if (!hasScope(ctx, "connectors.write")) {
    return;
  }

  server.registerTool(
    "connector_action_execute",
    {
      title: "Execute Connector Action",
      description:
        "Execute a write action on a connected data source. Use connector_actions_list first to discover available actions and their required inputs. Examples: send a Slack message, create a Linear issue, create a Notion page, send a Gmail email.",
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
