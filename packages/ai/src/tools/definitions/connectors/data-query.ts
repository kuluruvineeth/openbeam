import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const connectorDataQueryTool = defineTool({
  name: "connector_data_query",
  description: `Query documents indexed from a specific connector.

USE THIS WHEN:
- User wants to see documents from a specific data source
- User asks "What's in my Linear?" or "Show me Notion documents"
- User needs to filter documents by both connector and search criteria

DO NOT USE WHEN:
- User wants to search across all sources (use search_hybrid)
- User wants connector status or sync info (use connector_status)
- User wants to trigger a sync (use connector_sync)

RETURNS: Documents indexed from the specified connector with metadata.
Results are paginated. Use offset for additional pages.`,
  category: "connectors",
  deferLoading: true,
  searchKeywords: [
    "connector",
    "query",
    "documents",
    "data",
    "source",
    "browse",
  ],

  parameters: z.object({
    connectorId: z
      .string()
      .describe(
        "The connector ID to query documents from. Obtain from connector_list."
      ),
    query: z
      .string()
      .optional()
      .describe("Optional text search within the connector's documents"),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe("Maximum documents to return (1-100)"),
    offset: z
      .number()
      .min(0)
      .optional()
      .default(0)
      .describe("Pagination offset for fetching additional pages"),
    dateFrom: z
      .string()
      .optional()
      .describe("Filter to documents created/updated after this ISO date"),
    dateTo: z
      .string()
      .optional()
      .describe("Filter to documents created/updated before this ISO date"),
    sortBy: z
      .enum(["created_at", "updated_at", "title"])
      .optional()
      .default("updated_at")
      .describe("Field to sort results by"),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .default("desc")
      .describe("Sort direction"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const connector = await ctx.services.connectors.get(params.connectorId);
    if (!connector) {
      return failure("NOT_FOUND", `Connector ${params.connectorId} not found`, {
        suggestion: "Use connector_list to see available connectors",
      });
    }

    const dateFrom = params.dateFrom ? new Date(params.dateFrom) : undefined;
    const dateTo = params.dateTo ? new Date(params.dateTo) : undefined;

    const result = await ctx.services.documents.list({
      teamId: ctx.teamId,
      connectorId: params.connectorId,
      query: params.query,
      limit: params.limit,
      offset: params.offset,
      dateFrom,
      dateTo,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });

    const documents = result.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      documentType: doc.documentType,
      author: doc.authorName,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return success(
      {
        connectorId: connector.id,
        connectorName: connector.name,
        connectorType: connector.type,
        documents,
        total: result.total,
        returned: documents.length,
        offset: params.offset,
        hasMore: (params.offset ?? 0) + documents.length < result.total,
        query: params.query,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "database",
      }
    );
  },
});
