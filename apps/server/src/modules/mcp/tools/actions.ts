import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { dispatchAction } from "@openbeam/services";
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
        "Discover available write actions for connected data sources. Returns action IDs, required parameters, and descriptions.\n\nUse this FIRST when the user wants to perform an action (send message, create issue, etc.). Filter by connectorType (e.g. 'linear', 'slack', 'notion') to see available actions for that tool.\n\nKey pattern: Some actions require IDs from other actions first. For example, Linear issue_create requires a teamId — call team_list first. The action descriptions include these hints.\n\nAfter discovering the action, use connector_action_execute with the connector ID from connector_list.",
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
        "Execute a write action on a connected data source.\n\nFlow: connector_actions_list (discover actions + params) → connector_list (get connector ID) → connector_action_execute.\n\nFor actions requiring IDs (e.g. Linear teamId, Jira projectKey): use list/search actions first. Example: Linear issue_create needs teamId — call team_list action first, then issue_create with the returned team ID.\n\nCommon actions: message_send (Slack), issue_create (Linear/Jira), page_create (Notion). Confirm with user before high-stakes or irreversible actions.",
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
      const result = await dispatchAction({
        connectorId,
        actionId,
        params,
        teamId: ctx.teamId,
        userId: ctx.userId,
        source: "mcp",
      });

      const text = result.success
        ? `Action "${actionId}" executed successfully.${result.data ? `\n${JSON.stringify(result.data)}` : ""}`
        : `Action "${actionId}" failed: ${result.error}`;

      return {
        content: [{ type: "text" as const, text }],
        structuredContent: {
          success: result.success,
          data: result.data,
          error: result.error,
        },
      };
    }, "Failed to execute connector action")
  );
};
