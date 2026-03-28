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

export const registerConnectorTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "connectors.read")) {
    return;
  }

  server.registerTool(
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
      outputSchema: {
        meta: z.looseObject({
          cursor: z.string().nullable().optional(),
          hasNextPage: z.boolean(),
        }),
        data: z.array(z.record(z.string(), z.any())),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (_params) => {
      const results = await Promise.resolve([] as unknown[]);

      const data = sanitizeArray(mcpConnectorSchema, results);

      const response = {
        meta: {
          cursor: null as string | null,
          hasNextPage: false,
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

  server.registerTool(
    "connector_get",
    {
      title: "Get Connector",
      description:
        "Get full details for a single connector by ID, including configuration, sync schedule, health status, and error information.",
      inputSchema: {
        id: z.string().describe("Connector ID"),
      },
      outputSchema: {
        data: z.record(z.string(), z.any()),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ id: _id }) => {
      const result = await Promise.resolve(null as unknown);

      if (!result) {
        return {
          content: [{ type: "text" as const, text: "Connector not found" }],
          isError: true,
        };
      }

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
      outputSchema: {
        data: z.record(z.string(), z.any()),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async ({ id: _id }) => {
      const result = await Promise.resolve(null as unknown);

      if (!result) {
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

      const clean = sanitize(mcpConnectorHealthSchema, result);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to get connector health")
  );
};
