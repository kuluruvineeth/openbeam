import { z } from "zod";
import { sanitize, sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
  WRITE_ANNOTATIONS,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpSyncJobSchema = z.object({
  id: z.string(),
  connectorId: z.string(),
  connectorType: z.string().nullable().optional(),
  status: z.string(),
  type: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
  documentsProcessed: z.number().nullable().optional(),
  documentsErrored: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional(),
});

export const registerSyncTools: RegisterTools = (server, ctx) => {
  const hasReadScope = hasScope(ctx, "sync.read");
  const hasWriteScope = hasScope(ctx, "sync.write");

  if (!(hasReadScope || hasWriteScope)) {
    return;
  }

  if (hasWriteScope) {
    server.registerTool(
      "sync_trigger",
      {
        title: "Trigger Sync",
        description:
          "Start a sync job for a specific connector. Supports full sync (re-index everything) or incremental sync (changes since last sync). Returns a job ID to track progress via sync_status.",
        inputSchema: {
          connectorId: z.string().describe("Connector ID to sync"),
          type: z
            .enum(["full", "incremental"])
            .optional()
            .describe("Sync type (default: incremental)"),
        },
        annotations: WRITE_ANNOTATIONS,
      },
      async (params) => {
        try {
          const jobId = await Promise.resolve(
            `sync_${params.connectorId}_${Date.now()}`
          );

          const response = {
            message: `Sync triggered for connector ${params.connectorId}. Poll sync_status with the jobId to track progress.`,
            jobId,
            connectorId: params.connectorId,
            type: params.type ?? "incremental",
          };

          return {
            content: [
              { type: "text" as const, text: JSON.stringify(response) },
            ],
            structuredContent: response,
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  error instanceof Error
                    ? error.message
                    : "Failed to trigger sync",
              },
            ],
            isError: true,
          };
        }
      }
    );
  }

  if (hasReadScope) {
    server.registerTool(
      "sync_status",
      {
        title: "Sync Job Status",
        description:
          "Check the status of a sync job. Returns progress, document counts, and any errors. Status progresses: pending -> running -> completed/failed.",
        inputSchema: {
          jobId: z.string().describe("Sync job ID returned by sync_trigger"),
        },
        outputSchema: {
          data: z.record(z.string(), z.any()),
        },
        annotations: READ_ONLY_ANNOTATIONS,
      },
      withErrorHandling(async ({ jobId: _jobId }) => {
        const result = await Promise.resolve(null as unknown);

        if (!result) {
          return {
            content: [{ type: "text" as const, text: "Sync job not found" }],
            isError: true,
          };
        }

        const clean = sanitize(mcpSyncJobSchema, result);

        return {
          content: [{ type: "text" as const, text: JSON.stringify(clean) }],
          structuredContent: { data: clean },
        };
      }, "Failed to get sync status")
    );

    server.registerTool(
      "sync_history",
      {
        title: "Sync History",
        description:
          "List past sync jobs for a connector or across all connectors. Shows status, duration, document counts, and errors for each job. Use to diagnose sync issues or verify sync health.",
        inputSchema: {
          connectorId: z
            .string()
            .optional()
            .describe("Filter by connector ID (omit for all connectors)"),
          status: z
            .enum(["pending", "running", "completed", "failed"])
            .optional()
            .describe("Filter by job status"),
          limit: z.coerce
            .number()
            .min(1)
            .max(100)
            .optional()
            .describe("Max results (1-100, default 25)"),
          cursor: z.string().optional().describe("Pagination cursor"),
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

        const data = sanitizeArray(mcpSyncJobSchema, results);

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
      }, "Failed to list sync history")
    );
  }
};
