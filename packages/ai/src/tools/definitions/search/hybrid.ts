import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchHybridTool = defineTool({
  name: "search_hybrid",
  description: `Search across all connected data sources using hybrid semantic + keyword search.
Use for general queries when you need comprehensive results.
Returns documents with relevance scores and snippets.
Best for: finding specific information, answering questions, research.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["find", "search", "query", "lookup", "discover"],

  parameters: z.object({
    query: z.string().min(1).describe("The search query"),
    limit: z.number().min(1).max(100).optional().default(10),
    filters: z
      .object({
        connectorTypes: z.array(z.string()).optional(),
        dateRange: z
          .object({
            start: z.string().optional(),
            end: z.string().optional(),
          })
          .optional(),
        authors: z.array(z.string()).optional(),
      })
      .optional(),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for search");
    }

    const result = await ctx.services.search.hybrid({
      query: params.query,
      teamId: ctx.teamId,
      limit: params.limit,
      connectorTypes: params.filters?.connectorTypes,
      accessControlIds: ctx.accessControl,
    });

    return success(
      {
        results: result.documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          snippet: doc.content?.slice(0, 300),
          score: doc.relevanceScore,
          source: doc.connectorType,
          url: doc.url,
          documentType: doc.documentType,
          updatedAt: doc.updatedAt,
        })),
        totalCount: result.total,
        query: params.query,
      },
      {
        latencyMs: result.queryTime,
        source: "vespa",
        tokenCount: result.embeddingTime ? 1 : undefined,
      }
    );
  },
});
