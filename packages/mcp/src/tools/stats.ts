import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { Database } from "@openbeam/db";
import {
  calculateConnectorHealthScore,
  getConnectorStats,
  getConnectorSyncTrend,
  getTeamConnectorsSummary,
} from "@openbeam/db";

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
        syncHistoryDays: {
          type: "number",
          description: "Number of days of sync history to analyze",
          default: 30,
        },
      },
      required: ["connectorId"],
    },
  },
  {
    name: "get_team_summary",
    description:
      "Get summary statistics for all connectors in the authenticated team",
    inputSchema: {
      type: "object",
      properties: {},
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
        days: {
          type: "number",
          description: "Number of days to analyze",
          default: 14,
        },
      },
      required: ["connectorId"],
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
      },
      required: ["connectorId"],
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

type ToolResult = {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
};

export async function handleStatsTool(
  db: Database,
  teamId: string,
  name: string,
  args: Record<string, unknown> | undefined
): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_connector_stats": {
        const connectorId = args?.connectorId as string;
        const syncHistoryDays = (args?.syncHistoryDays as number) ?? 30;
        const stats = await getConnectorStats(db, connectorId, teamId, {
          syncHistoryDays,
        });
        if (!stats) {
          return {
            content: [
              { type: "text", text: "Connector not found or access denied" },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
        };
      }

      case "get_team_summary": {
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
        const score = await calculateConnectorHealthScore(
          db,
          connectorId,
          teamId
        );
        if (!score) {
          return {
            content: [
              { type: "text", text: "Connector not found or access denied" },
            ],
            isError: true,
          };
        }
        return {
          content: [{ type: "text", text: JSON.stringify(score, null, 2) }],
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
