import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import db, {
  type ConnectorStatus,
  findConnectorById,
  getConnectorHealth,
  getConnectorsWithStats,
} from "@openbeam/db";
import { z } from "zod";
import {
  formatConnectorDetail,
  formatConnectorHealth,
  formatConnectorList,
} from "../formatters";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpConnectorSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional(),
  documentCount: z.number().nullable().optional(),
});

const mcpConnectorDetailSchema = mcpConnectorSchema.extend({
  config: z.record(z.string(), z.unknown()).nullable().optional(),
  syncSchedule: z.string().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  health: z
    .object({
      score: z.number().nullable().optional(),
      status: z.string().nullable().optional(),
      lastCheckedAt: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const mcpConnectorHealthSchema = z.object({
  connectorId: z.string(),
  status: z.string(),
  score: z.number().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  lastSyncDuration: z.number().nullable().optional(),
  documentCount: z.number().nullable().optional(),
  errorCount: z.number().nullable().optional(),
  lastError: z.string().nullable().optional(),
});

const STATUS_MAP: Record<string, ConnectorStatus[]> = {
  active: ["ACTIVE", "SYNCING"],
  error: ["ERROR", "AUTH_EXPIRED", "RATE_LIMITED"],
  pending: ["CONNECTING"],
  disabled: ["INACTIVE", "PAUSED", "DELETING"],
};

export const registerConnectorTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "connectors.read")) {
    return;
  }

  registerAppTool(
    server,
    "connector_list",
    {
      title: "List Connectors",
      description:
        "List all configured data source connectors for the current team, with summary statistics for each. Use this FIRST when the user asks about their connected data sources, wants to know what tools are integrated, needs a connector ID for another tool (sync_trigger, connector_action_execute, connector_health), or wants to check which connectors have errors.\n\nReturns each connector's: ID (required by sync_trigger, connector_get, connector_action_execute, and other tools), display name, type slug (e.g. 'SLACK', 'NOTION', 'GITHUB'), status ('ACTIVE', 'SYNCING', 'ERROR', 'AUTH_EXPIRED', 'CONNECTING', 'INACTIVE', 'PAUSED'), indexed document count, and last sync timestamp. Supports cursor-based pagination with configurable page size (default 25). Filter by status category ('active', 'error', 'pending', 'disabled') to quickly isolate problematic connectors, or by type slug to find a specific integration.\n\nAfter identifying a connector, use connector_get for full configuration and error details, connector_health for a health score and failure diagnostics, sync_history for past sync job results, or sync_trigger to start a new sync. Use connector_actions_list with the connector's type to discover available write actions (send message, create issue, etc.).\n\nDo NOT use this to search for documents or content — use search_documents for that. Do NOT use this to find people — use search_people.",
      inputSchema: {
        status: z
          .enum(["active", "error", "pending", "disabled"])
          .optional()
          .describe(
            "Filter connectors by status category. 'active' = working connectors (ACTIVE, SYNCING). 'error' = connectors with issues (ERROR, AUTH_EXPIRED, RATE_LIMITED). 'pending' = connectors still being set up (CONNECTING). 'disabled' = paused or removed connectors (INACTIVE, PAUSED, DELETING). Omit to return all."
          ),
        type: z
          .string()
          .optional()
          .describe(
            "Filter by connector type slug, e.g. 'slack', 'notion', 'github', 'google-drive', 'jira'. Case-insensitive. Omit to return all types."
          ),
        cursor: z
          .string()
          .optional()
          .describe(
            "Pagination cursor from a previous response's meta.cursor field. Omit for the first page."
          ),
        pageSize: z.coerce
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe(
            "Number of connectors per page, between 1 and 100. Defaults to 25."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/connector-dashboard" } },
    },
    withErrorHandling(async (params) => {
      const statusFilter = params.status
        ? STATUS_MAP[params.status]
        : undefined;

      const connectors = await getConnectorsWithStats(
        db,
        ctx.teamId,
        statusFilter
      );

      let filtered = connectors;
      if (params.type) {
        filtered = filtered.filter(
          (c) => c.app.toLowerCase() === params.type?.toLowerCase()
        );
      }

      const pageSize = params.pageSize ?? 25;
      const cursorIndex = params.cursor
        ? filtered.findIndex((c) => c.id === params.cursor)
        : -1;
      const startIndex = cursorIndex >= 0 ? cursorIndex + 1 : 0;
      const page = filtered.slice(startIndex, startIndex + pageSize);
      const hasNextPage = startIndex + pageSize < filtered.length;
      const nextCursor = hasNextPage ? (page.at(-1)?.id ?? null) : null;

      const results = page.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.app,
        status: c.status,
        lastSyncAt: c.lastSyncedAt?.toISOString() ?? null,
        documentCount: c.documentCount ?? 0,
      }));

      const data = sanitizeArray(mcpConnectorSchema, results);

      const response = {
        meta: {
          cursor: nextCursor,
          hasNextPage,
        },
        data,
      };

      const { structuredContent } = truncateListResponse(response);

      return {
        content: [{ type: "text" as const, text: formatConnectorList(data) }],
        structuredContent,
      };
    }, "Failed to list connectors")
  );

  registerAppTool(
    server,
    "connector_get",
    {
      title: "Get Connector",
      description:
        "Retrieve full details for a single data source connector by its ID, including configuration, health, and error information. Use this after connector_list when you need to drill into a specific connector's setup — for example, to diagnose why a connector is in an error state, to check its sync schedule, or to see its full configuration.\n\nReturns: connector ID, name, type slug, current status, creation date, last sync timestamp, total indexed document count, error message (if any), sync schedule, and a health object containing health score (0-100), status, and last health check timestamp. The connector ID is obtained from connector_list results.\n\nFor a dedicated health assessment with failure diagnostics, use connector_health instead. For detailed sync job information (documents added/updated/deleted, duration, queue state), use sync_status. To trigger a new sync after diagnosing an issue, use sync_trigger with this connector's ID.",
      inputSchema: {
        id: z
          .string()
          .describe(
            "The connector ID to look up. Get this from connector_list results, e.g. 'clxyz123abc'."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
      _meta: { ui: { resourceUri: "ui://openbeam/document-preview" } },
    },
    withErrorHandling(async ({ id }) => {
      const connector = await findConnectorById(db, id, true);

      if (!connector || connector.teamId !== ctx.teamId) {
        return {
          content: [{ type: "text" as const, text: "Connector not found" }],
          isError: true,
        };
      }

      const result = {
        id: connector.id,
        name: connector.name,
        type: connector.app,
        status: connector.status,
        lastSyncAt: connector.lastSyncedAt?.toISOString() ?? null,
        errorMessage: connector.lastError ?? null,
        documentCount: connector.totalDocuments,
        createdAt: connector.createdAt.toISOString(),
        health: {
          score: connector.healthScore,
          status: connector.status,
          lastCheckedAt: connector.lastHealthCheck?.toISOString() ?? null,
        },
      };

      const clean = sanitize(mcpConnectorDetailSchema, result);

      return {
        content: [
          { type: "text" as const, text: formatConnectorDetail(clean) },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to get connector")
  );

  server.registerTool(
    "connector_health",
    {
      title: "Connector Health Check",
      description:
        "Get health metrics and diagnostics for a specific connector, identified by its ID. Use this when a connector appears unhealthy (status 'error' in connector_list), when the user asks about sync reliability, or when you need to assess whether a connector's data is trustworthy and up-to-date.\n\nReturns: health score (0-100, where 100 means fully healthy with no recent errors), current status, indexed document count, last successful sync timestamp, and last error message if any. A score below 75 indicates problems that may need attention — common causes include expired OAuth tokens, API rate limits, or configuration changes on the source platform.\n\nAfter identifying health issues, use sync_history to look for recurring failure patterns over time, then sync_trigger to attempt a fresh sync after the root cause is resolved. Use connector_list first if you need to discover the connector ID. For full connector configuration details, use connector_get instead.",
      inputSchema: {
        id: z
          .string()
          .describe(
            "The connector ID to check health for. Get this from connector_list results."
          ),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ id }) => {
      const connector = await findConnectorById(db, id);

      if (!connector || connector.teamId !== ctx.teamId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or no health data available",
            },
          ],
          isError: true,
        };
      }

      const health = await getConnectorHealth(db, id);

      if (!health) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Connector not found or no health data available",
            },
          ],
          isError: true,
        };
      }

      const result = {
        connectorId: health.id,
        status: health.status,
        score: health.documentCount > 0 ? 100 - (health.lastError ? 25 : 0) : 0,
        lastSyncAt: health.lastSyncAt?.toISOString() ?? null,
        documentCount: health.documentCount,
        lastError: health.lastError ?? null,
      };

      const clean = sanitize(mcpConnectorHealthSchema, result);

      return {
        content: [
          { type: "text" as const, text: formatConnectorHealth(clean) },
        ],
        structuredContent: { data: clean },
      };
    }, "Failed to get connector health")
  );
};
