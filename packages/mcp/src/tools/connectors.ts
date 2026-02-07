import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Database } from "@openplane/db";
import {
  findConnectorById,
  getConnectorHealth,
  getConnectorSyncHistory,
  getConnectorsWithStats,
  listConnectorsByTeam,
} from "@openplane/db";

export const connectorTools: Tool[] = [
  {
    name: "list_connectors",
    description:
      "List all connectors for a team with their OAuth provider info",
    inputSchema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: "Team ID to list connectors for",
        },
      },
      required: ["teamId"],
    },
  },
  {
    name: "get_connector",
    description: "Get a specific connector by ID",
    inputSchema: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description: "Connector ID",
        },
        includeOAuth: {
          type: "boolean",
          description: "Include OAuth provider details",
          default: false,
        },
      },
      required: ["connectorId"],
    },
  },
  {
    name: "get_connectors_with_stats",
    description:
      "Get connectors with document counts and last sync info for a team",
    inputSchema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: "Team ID",
        },
        statusFilter: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by connector status (ACTIVE, INACTIVE, SYNCING, ERROR)",
        },
      },
      required: ["teamId"],
    },
  },
  {
    name: "get_connector_health",
    description:
      "Get health information for a connector including token expiry and error state",
    inputSchema: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description: "Connector ID",
        },
      },
      required: ["connectorId"],
    },
  },
  {
    name: "get_connector_sync_history",
    description: "Get sync job history for a connector",
    inputSchema: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description: "Connector ID",
        },
        limit: {
          type: "number",
          description: "Max number of sync jobs to return",
          default: 10,
        },
      },
      required: ["connectorId"],
    },
  },
];

export async function handleConnectorTool(
  db: Database,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (name) {
      case "list_connectors": {
        const teamId = args?.teamId as string;
        const connectors = await listConnectorsByTeam(db, teamId);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(connectors, null, 2),
            },
          ],
        };
      }

      case "get_connector": {
        const connectorId = args?.connectorId as string;
        const includeOAuth = (args?.includeOAuth as boolean) ?? false;
        const connector = await findConnectorById(
          db,
          connectorId,
          includeOAuth
        );
        if (!connector) {
          return {
            content: [{ type: "text", text: "Connector not found" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(connector, null, 2) }],
        };
      }

      case "get_connectors_with_stats": {
        const teamId = args?.teamId as string;
        const statusFilter = args?.statusFilter as string[] | undefined;
        const connectors = await getConnectorsWithStats(
          db,
          teamId,
          statusFilter as Parameters<typeof getConnectorsWithStats>[2]
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(connectors, null, 2),
            },
          ],
        };
      }

      case "get_connector_health": {
        const connectorId = args?.connectorId as string;
        const health = await getConnectorHealth(db, connectorId);
        if (!health) {
          return {
            content: [{ type: "text", text: "Connector not found" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(health, null, 2) }],
        };
      }

      case "get_connector_sync_history": {
        const connectorId = args?.connectorId as string;
        const limit = (args?.limit as number) ?? 10;
        const history = await getConnectorSyncHistory(db, connectorId, limit);
        return {
          content: [{ type: "text", text: JSON.stringify(history, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown connector tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
      isError: true,
    };
  }
}
