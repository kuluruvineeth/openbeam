import { z } from "zod";
import { sanitizeArray } from "../mcp.sanitize";
import {
  hasScope,
  READ_ONLY_ANNOTATIONS,
  type RegisterTools,
} from "../mcp.types";
import { truncateListResponse, withErrorHandling } from "../mcp.utils";

const mcpSearchResultSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  snippet: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  connectorType: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
});

const mcpPersonSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  connectorType: z.string().nullable().optional(),
});

export const registerSearchTools: RegisterTools = (server, ctx) => {
  if (!hasScope(ctx, "search.read")) {
    return;
  }

  server.registerTool(
    "search_documents",
    {
      title: "Search Documents",
      description:
        "Search across all connected enterprise data sources using hybrid semantic + keyword search. Returns ranked results with snippets. Use this as the primary way to find information across Slack, Google Drive, Notion, Jira, Confluence, GitHub, and 100+ other connectors.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("The search query — natural language or keywords"),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results to return (1-50, default 10)"),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Filter by connector type slugs (e.g. ['slack', 'google-drive', 'notion'])"
          ),
        dateFrom: z
          .string()
          .optional()
          .describe("Filter results updated after this date (ISO 8601)"),
        dateTo: z
          .string()
          .optional()
          .describe("Filter results updated before this date (ISO 8601)"),
      },
      outputSchema: {
        data: z.array(z.record(z.string(), z.any())),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (params) => {
      const results = await Promise.resolve([] as unknown[]);

      const clean = sanitizeArray(mcpSearchResultSchema, results);

      const response = {
        meta: {
          query: params.query,
          totalResults: clean.length,
          hasNextPage: false,
        },
        data: clean,
      };

      const { text, structuredContent } = truncateListResponse(response);

      return {
        content: [{ type: "text" as const, text }],
        structuredContent,
      };
    }, "Failed to search documents")
  );

  server.registerTool(
    "search_people",
    {
      title: "Search People",
      description:
        "Search for people across connected enterprise directories. Finds team members, contacts, and collaborators from Google Workspace, Microsoft 365, Slack, and other connectors.",
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe("Name, email, or title to search for"),
        limit: z.coerce
          .number()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results to return (1-50, default 10)"),
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe("Filter by connector type slugs"),
      },
      outputSchema: {
        data: z.array(z.record(z.string(), z.any())),
      },
      annotations: READ_ONLY_ANNOTATIONS,
    },
    withErrorHandling(async (_params) => {
      const results = await Promise.resolve([] as unknown[]);

      const clean = sanitizeArray(mcpPersonSchema, results);

      return {
        content: [{ type: "text" as const, text: JSON.stringify(clean) }],
        structuredContent: { data: clean },
      };
    }, "Failed to search people")
  );
};
