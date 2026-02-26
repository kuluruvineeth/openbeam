import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const searchSemanticTool = defineTool({
  name: "search_semantic",
  description: `Pure semantic/vector search optimized for meaning-based retrieval using embeddings.

USE THIS WHEN:
- Query is conceptual or abstract without specific keywords
- User wants to explore topics or find thematically related content
- Exact terminology is unknown but the concept is clear
- Looking for documents that discuss similar ideas in different words
- Query like "documents about improving team collaboration" or "content related to cost optimization"

DO NOT USE WHEN:
- Query contains specific names, IDs, or exact phrases (use search_hybrid)
- User wants exact keyword matches (use search_hybrid)
- User already has a document and wants related content (use search_similar)
- User needs to answer a specific question with citations (use rag_answer)

RETURNS: Documents ranked by semantic similarity to the query embedding. Higher threshold values return more semantically relevant but fewer results.`,
  category: "search",
  deferLoading: false,
  searchKeywords: ["semantic", "meaning", "conceptual", "vector", "similar"],
  pricing: { amount: "0.01", description: "Per semantic search" },

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The semantic search query. Describe the concept or topic you're looking for. Examples: 'best practices for code review', 'strategies for reducing customer churn', 'documents about microservices architecture'"
      ),
    limit: z
      .number()
      .min(1)
      .max(100)
      .optional()
      .default(10)
      .describe(
        "Maximum results to return. Lower values (5-10) for focused exploration, higher (20-50) for broad topic research."
      ),
    threshold: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .default(0.7)
      .describe(
        "Minimum similarity score (0-1). Higher values (0.8-0.9) return fewer but more relevant results. Lower values (0.5-0.7) cast a wider net. Default 0.7 balances relevance and coverage."
      ),
    filters: z
      .object({
        connectorTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Limit to specific connectors: 'linear', 'slack', 'notion', 'jira', 'github', 'google-drive', 'confluence'."
          ),
        documentIds: z
          .array(z.string())
          .optional()
          .describe(
            "Search within specific document IDs only. Useful for scoped exploration within known documents."
          ),
      })
      .optional()
      .describe("Optional filters to narrow search scope."),
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
