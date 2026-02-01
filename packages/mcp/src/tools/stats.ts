import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Database } from "@openplane/db";
import {
  calculateConnectorHealthScore,
  getConnectorStats,
  getConnectorSyncTrend,
  getTeamConnectorsSummary,
  listTeamsWithConnectors,
} from "@openplane/db";

export const statsTools: Tool[] = [
  {
    name: "get_connector_stats",
    description:
      "Get detailed sync statistics for a connector including success rates and duration metrics",
    inputSchema: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description: "Connector ID",
        },
        teamId: {
          type: "string",
          description: "Team ID (for authorization)",
        },
        syncHistoryDays: {
          type: "number",
          description: "Number of days of sync history to analyze",
          default: 30,
        },
      },
      required: ["connectorId", "teamId"],
    },
  },
  {
    name: "get_team_summary",
    description:
      "Get summary statistics for all connectors in a team including document counts and health",
    inputSchema: {
      type: "object",
      properties: {
        teamId: {
          type: "string",
          description: "Team ID",
        },
      },
      required: ["teamId"],
    },
  },
  {
    name: "get_sync_trend",
    description:
      "Get daily sync trend data for a connector over a specified period",
    inputSchema: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description: "Connector ID",
        },
        teamId: {
          type: "string",
          description: "Team ID",
        },
        days: {
          type: "number",
          description: "Number of days to analyze",
          default: 14,
        },
      },
      required: ["connectorId", "teamId"],
    },
  },
  {
    name: "get_health_score",
    description:
      "Calculate health score for a connector with detailed factor breakdown",
    inputSchema: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description: "Connector ID",
        },
        teamId: {
          type: "string",
          description: "Team ID",
        },
      },
      required: ["connectorId", "teamId"],
    },
  },
  {
    name: "list_teams_with_connectors",
    description:
      "List all teams that have at least one connector configured, optionally filtered by connector status",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["ACTIVE", "INACTIVE", "ERROR", "SYNCING", "PENDING_AUTH"],
          description: "Filter by connector status (optional)",
        },
      },
    },
  },
];

function mapToObject<K, V>(map: Map<K, V>): Record<string, V> {
  const obj: Record<string, V> = {};
  for (const [key, value] of map) {
    obj[String(key)] = value;
  }
  return obj;
}

export async function handleStatsTool(
  db: Database,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}> {
  try {
    switch (name) {
      case "get_connector_stats": {
        const connectorId = args?.connectorId as string;
        const teamId = args?.teamId as string;
        const syncHistoryDays = (args?.syncHistoryDays as number) ?? 30;
        const stats = await getConnectorStats(db, connectorId, teamId, {
          syncHistoryDays,
        });
        if (!stats) {
          return {
            content: [{ type: "text", text: "Connector not found" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
        };
      }

      case "get_team_summary": {
        const teamId = args?.teamId as string;
        const summary = await getTeamConnectorsSummary(db, teamId);
        const serializable = {
          ...summary,
          connectorsByType: mapToObject(summary.connectorsByType),
        };
        return {
          content: [
            { type: "text", text: JSON.stringify(serializable, null, 2) },
          ],
        };
      }

      case "get_sync_trend": {
        const connectorId = args?.connectorId as string;
        const teamId = args?.teamId as string;
        const days = (args?.days as number) ?? 14;
        const trend = await getConnectorSyncTrend(
          db,
          connectorId,
          teamId,
          days
        );
        return {
          content: [{ type: "text", text: JSON.stringify(trend, null, 2) }],
        };
      }

      case "get_health_score": {
        const connectorId = args?.connectorId as string;
        const teamId = args?.teamId as string;
        const score = await calculateConnectorHealthScore(
          db,
          connectorId,
          teamId
        );
        if (!score) {
          return {
            content: [{ type: "text", text: "Connector not found" }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(score, null, 2) }],
        };
      }

      case "list_teams_with_connectors": {
        const status = args?.status as
          | "ACTIVE"
          | "INACTIVE"
          | "ERROR"
          | "SYNCING"
          | "PENDING_AUTH"
          | undefined;
        const teams = await listTeamsWithConnectors(db, status);
        return {
          content: [{ type: "text", text: JSON.stringify(teams, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown stats tool: ${name}` }],
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
