import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Database } from "@openbeam/db";
import {
  findConnectorById,
  getConnectorHealth,
  getConnectorSyncHistory,
  getConnectorsWithStats,
  listConnectorsByTeam,
} from "@openbeam/db";

export const connectorTools: Tool[] = [
  {
    name: "list_connectors",
    description:
      "List all connectors for the authenticated team with their OAuth provider info",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_connector",
    description: "Get a specific connector by ID (must belong to your team)",
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
      "Get connectors with document counts and last sync info for the authenticated team",
    inputSchema: {
      type: "object",
      properties: {
        statusFilter: {
          type: "array",
          items: { type: "string" },
          description:
            "Filter by connector status (ACTIVE, INACTIVE, SYNCING, ERROR)",
        },
      },
    },
  },
  {
    name: "get_connector_health",
    description:
      "Get health information for a connector (must belong to your team)",
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
    description:
      "Get sync job history for a connector (must belong to your team)",
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

type ToolResult = {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
};

const PERMISSION_DENIED: ToolResult = {
  content: [{ type: "text", text: "Connector not found or access denied" }],
  isError: true,
};

async function verifyConnectorOwnership(
  db: Database,
  connectorId: string,
  teamId: string
): Promise<boolean> {
  const connector = await findConnectorById(db, connectorId);
  return connector?.teamId === teamId;
}

export async function handleConnectorTool(
  db: Database,
  teamId: string,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<ToolResult> {
  try {
    switch (name) {
      case "list_connectors": {
        const connectors = await listConnectorsByTeam(db, teamId);
        return {
          content: [
            { type: "text", text: JSON.stringify(connectors, null, 2) },
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
        if (!connector || connector.teamId !== teamId) {
          return PERMISSION_DENIED;
        }
        return {
          content: [{ type: "text", text: JSON.stringify(connector, null, 2) }],
        };
      }

      case "get_connectors_with_stats": {
        const statusFilter = args?.statusFilter as string[] | undefined;
        const connectors = await getConnectorsWithStats(
          db,
          teamId,
          statusFilter as Parameters<typeof getConnectorsWithStats>[2]
        );
        return {
          content: [
            { type: "text", text: JSON.stringify(connectors, null, 2) },
          ],
        };
      }

      case "get_connector_health": {
        const connectorId = args?.connectorId as string;
        if (!(await verifyConnectorOwnership(db, connectorId, teamId))) {
          return PERMISSION_DENIED;
        }
        const health = await getConnectorHealth(db, connectorId);
        if (!health) {
          return PERMISSION_DENIED;
        }
        return {
          content: [{ type: "text", text: JSON.stringify(health, null, 2) }],
        };
      }

      case "get_connector_sync_history": {
        const connectorId = args?.connectorId as string;
        if (!(await verifyConnectorOwnership(db, connectorId, teamId))) {
          return PERMISSION_DENIED;
        }
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
