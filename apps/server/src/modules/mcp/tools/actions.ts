import { ALL_CONNECTOR_ACTION_REGISTRIES } from "@openbeam/integrations/connector-actions";
import { dispatchAction } from "@openbeam/services";
import { z } from "zod";
import { formatActionExecute, formatActionsList } from "../formatters";
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
        "Discover all available write actions for connected data sources. Use this FIRST before executing any write operation — it reveals the exact action IDs, their required and optional parameters with types, and important constraints. This is the discovery step in the two-step pattern: connector_actions_list (discover) then connector_action_execute (execute).\n\nReturns each action's: ID (e.g. 'message_send', 'issue_create', 'page_create'), human-readable name, description with usage hints, connector type (e.g. 'linear', 'slack', 'github'), category ('create', 'read', 'update', 'delete', 'search', 'list', 'notify'), stakes level ('low', 'medium', 'high' — confirm with user before high-stakes actions), reversibility (whether the action can be undone), and a full list of input parameters with their IDs, names, types, whether they are required, and descriptions.\n\nFilter by connectorType (e.g. 'slack' to see only Slack actions like message_send, channel_create) or by category (e.g. 'create' to see all creation actions across all connectors). Some actions require IDs from other actions first — for example, Linear issue_create needs a teamId, so call the team_list action first. These dependency hints are included in each action's description.\n\nAfter discovering the right action, use connector_list to get the connector ID, then connector_action_execute with the connector ID, action ID, and required parameters. Do NOT guess action IDs or parameter names — always call this tool first to get the exact schema.",
      inputSchema: {
        connectorType: z
          .string()
          .optional()
          .describe(
            "Filter actions to a specific connector type. Use lowercase, e.g. 'slack', 'linear', 'github', 'notion', 'jira'. Omit to list actions for ALL connected data sources. Recommended: always filter by type when you know which tool the user wants to interact with."
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
          .describe(
            "Filter by action category. 'create' = new resources (issues, messages, pages). 'read' = fetch specific items. 'update' = modify existing resources. 'delete' = remove resources. 'search' = find items by query. 'list' = enumerate collections. 'notify' = send notifications."
          ),
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
        "Execute a write action on a connected data source — send a Slack message, create a Linear issue, update a Jira ticket, create a Notion page, and hundreds more. This is the execution step in the two-step pattern: always call connector_actions_list first to discover the exact action ID and required parameters, then call this tool to execute.\n\nReturns a success/failure indicator, the action's response data (e.g. the created issue's ID and URL for issue_create, the sent message's timestamp for message_send), and an error message if the action failed. The response structure varies by action — check connector_actions_list for details on what each action returns.\n\nThe required flow is: (1) connector_actions_list to discover the action ID and its parameter schema, (2) connector_list to get the connector ID for the target data source, (3) this tool with connectorId + actionId + params. For actions that require entity IDs (e.g. Linear issue_create needs a teamId, Slack message_send needs a channelId), use the corresponding list/search actions first to obtain those IDs.\n\nAlways confirm with the user before executing high-stakes actions (stakes='high' in connector_actions_list) or irreversible actions (reversible=false). Do NOT guess parameter values — use connector_actions_list to see the exact parameter IDs and types required.",
      inputSchema: {
        connectorId: z
          .string()
          .describe(
            "The ID of the connected connector to execute the action on. Get this from connector_list results — it identifies which specific connected instance to use (e.g. which Slack workspace, which Linear workspace)."
          ),
        actionId: z
          .string()
          .describe(
            "The action ID from connector_actions_list, e.g. 'message_send', 'issue_create', 'page_create', 'comment_add', 'ticket_update'. Must exactly match an action ID from connector_actions_list for the corresponding connector type."
          ),
        params: z
          .record(z.string(), z.unknown())
          .describe(
            "Action parameters as key-value pairs. Keys must exactly match the input IDs from connector_actions_list. Example for Slack message_send: { channelId: 'C01234', text: 'Hello team!' }. Example for Linear issue_create: { teamId: 'team-uuid', title: 'Fix bug', description: 'Details...' }."
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

      return {
        content: [
          {
            type: "text" as const,
            text: formatActionExecute(
              actionId,
              result.success,
              result.data,
              result.error
            ),
          },
        ],
        structuredContent: {
          success: result.success,
          data: result.data,
          error: result.error,
        },
      };
    }, "Failed to execute connector action")
  );
};
