import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const docListTool = defineTool({
  name: "doc_list",
  description: `List documents with filtering and pagination.
Returns document metadata without full content.
Use to browse available documents or filter by connector/date.`,
  category: "documents",
  deferLoading: false,
  searchKeywords: ["list", "browse", "documents", "catalog", "index"],

  parameters: z.object({
    limit: z.number().min(1).max(100).optional().default(20),
    offset: z.number().min(0).optional().default(0),
    connectorType: z.string().optional().describe("Filter by connector type"),
    sortBy: z
      .enum(["created_at", "updated_at", "title"])
      .optional()
      .default("updated_at"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),

  async execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required");
    }

    const result = await ctx.services.documents.list({
      teamId: ctx.teamId,
      limit: params.limit,
      offset: params.offset,
      connectorType: params.connectorType,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    });

    const documents = result.documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      url: doc.url,
      connectorType: doc.connectorType,
      documentType: doc.documentType,
      author: doc.authorName,
      sourceName: doc.sourceName,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return success(
      {
        documents,
        total: result.total,
        hasMore: params.offset + documents.length < result.total,
      },
      {
        latencyMs: performance.now() - startTime,
        source: "vespa",
      }
    );
  },
});
