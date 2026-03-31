import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import db, {
  type ConnectorStatus,
  findConnectorById,
  getConnectorHealth,
  getConnectorsWithStats,
} from "@openbeam/db";
import { z } from "zod";
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
        "List all configured connectors for the team with their sync status, document count, and last sync time. Filter by status (active, error, pending, disabled) or connector type.",
      inputSchema: {
        status: z
          .enum(["active", "error", "pending", "disabled"])
          .optional()
          .describe("Filter by connector status"),
        type: z.string().optional().describe("Filter by connector type slug"),
        cursor: z.string().optional().describe("Pagination cursor"),
        pageSize: z.coerce
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Results per page (1-100, default 25)"),
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
        lastSyncAt: c.lastSync?.completedAt?.toISOString() ?? null,
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

      const { text, structuredContent } = truncateListResponse(response);

      return {
        content: [{ type: "text" as const, text }],
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
        "Get full details for a single connector by ID, including configuration, sync schedule, health status, and error information.",
      inputSchema: {
        id: z.string().describe("Connector ID"),
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
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to get connector")
  );

  server.registerTool(
    "connector_health",
    {
      title: "Connector Health Check",
      description:
        "Get health metrics for a specific connector: sync success rate, document count, error count, last sync duration, and overall health score (0-100).",
      inputSchema: {
        id: z.string().describe("Connector ID"),
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
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to get connector health")
  );
};
