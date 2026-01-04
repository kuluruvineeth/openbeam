import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchSemanticTool = defineTool({
  name: "search_semantic",
  description: `Pure semantic/vector search optimized for meaning-based retrieval.
Use when you need to find conceptually related content, even if exact keywords don't match.
Best for: finding similar concepts, exploring related topics, meaning-based queries.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["semantic", "meaning", "conceptual", "vector", "similar"],

  parameters: z.object({
    query: z.string().min(1).describe("The semantic search query"),
    limit: z.number().min(1).max(100).optional().default(10),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.7)
      .describe("Minimum similarity score"),
    filters: z
      .object({
        connectorTypes: z.array(z.string()).optional(),
        documentIds: z.array(z.string()).optional(),
      })
      .optional(),
  }),

  async execute(params, ctx) {
    if (!ctx.teamId) {
      return failure("UNAUTHORIZED", "Team context required for search");
    }

    const result = await ctx.services.search.semantic({
      query: params.query,
      teamId: ctx.teamId,
      limit: params.limit,
      minScore: params.threshold,
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
          vectorScore: doc.vectorScore,
          source: doc.connectorType,
          url: doc.url,
          documentType: doc.documentType,
        })),
        totalCount: result.total,
        query: params.query,
      },
      {
        latencyMs: result.queryTime,
        source: "vespa",
      }
    );
  },
});
