import type { AppType } from "@openbeam/db";
import db from "@openbeam/db";
import { z } from "zod";
import { formatActivityFeed } from "../formatters";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpActivitySchema = z.object({
  id: z.string(),
  type: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  connectorType: z.string().nullable().optional(),
  connectorId: z.string().nullable().optional(),
  personName: z.string().nullable().optional(),
  personEmail: z.string().nullable().optional(),
  documentCount: z.number().nullable().optional(),
  createdAt: z.string().nullable().optional(),
});

function mapSyncToActivity(s: {
  id: string;
  status: string;
  errorMessage: string | null;
  dataAdded: number;
  dataUpdated: number;
  startedAt: Date;
  connector: { id: string; name: string | null; app: AppType };
}) {
  return {
    id: s.id,
    type: `sync.${s.status}`,
    title: `${s.connector.name ?? s.connector.app} sync ${s.status}`,
    description: s.errorMessage,
    connectorType: String(s.connector.app),
    connectorId: s.connector.id,
    personName: null,
    personEmail: null,
    documentCount: s.dataAdded + s.dataUpdated,
    createdAt: s.startedAt.toISOString(),
  };
}

export const registerActivityTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "notifications.read")) {
    return;
  }

  server.registerTool(
    "activity_feed",
    {
      title: "Activity Feed",
      description:
        "Get a feed of recent activity across all connected data sources — new documents, sync completions, connector changes. " +
        "Use for daily digests, catching up on what changed, or monitoring data freshness. " +
        "Filter by connector type or time range. " +
        "For specific search results, use search_recent instead.",
      inputSchema: {
        hours: z.coerce
          .number()
          .min(1)
          .max(168)
          .optional()
          .describe("Lookback window in hours (default 24, max 168 = 7 days)."),
        connectorType: z
          .string()
          .optional()
          .describe(
            "Filter by connector type, e.g. 'SLACK', 'NOTION'. Omit for all."
          ),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max activity entries (default 20)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const hours = params.hours ?? 24;
      const take = params.limit ?? 20;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const syncs = await db.syncHistory.findMany({
        where: {
          startedAt: { gte: since },
          connector: {
            teamId: ctx.teamId,
            ...(params.connectorType
              ? { app: params.connectorType as AppType }
              : {}),
          },
        },
        orderBy: { startedAt: "desc" },
        take,
        include: { connector: true },
      });

      const results = syncs.map(mapSyncToActivity);

      const data = sanitizeArray(mcpActivitySchema, results);
      const response = {
        meta: {
          hours,
          totalResults: data.length,
          hasNextPage: false,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);
      return {
        content: [
          { type: "text" as const, text: formatActivityFeed(hours, data) },
        ],
        structuredContent,
      };
    }, "Failed to fetch activity feed")
  );

  server.registerTool(
    "activity_by_connector",
    {
      title: "Connector Activity",
      description:
        "Get recent activity for a specific connector — sync history, document counts, errors. " +
        "Use to monitor a specific data source's health and data freshness. " +
        "Requires a connector ID from connector_list.",
      inputSchema: {
        connectorId: z
          .string()
          .min(1)
          .describe("Connector ID (from connector_list)."),
        limit: z.coerce
          .number()
          .min(1)
          .max(30)
          .optional()
          .describe("Max entries (default 10)."),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const take = params.limit ?? 10;

      const syncs = await db.syncHistory.findMany({
        where: {
          connectorId: params.connectorId,
          connector: { teamId: ctx.teamId },
        },
        orderBy: { startedAt: "desc" },
        take,
        include: { connector: true },
      });

      const results = syncs.map(mapSyncToActivity);

      const data = sanitizeArray(mcpActivitySchema, results);
      const response = {
        meta: {
          connectorId: params.connectorId,
          totalResults: data.length,
          hasNextPage: false,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);
      return {
        content: [
          {
            type: "text" as const,
            text: formatActivityFeed(null, data),
          },
        ],
        structuredContent,
      };
    }, "Failed to fetch connector activity")
  );
};
