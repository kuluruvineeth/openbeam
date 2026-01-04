import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const ragAnalyzeTool = defineTool({
  name: "rag_analyze",
  description: `Analyze a query to understand intent and optimize retrieval strategy.
Use before search to decompose complex queries or identify entity types.
Returns query analysis with suggested search parameters.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["analyze", "intent", "decompose", "query", "understand"],

  parameters: z.object({
    query: z.string().min(1).describe("The query to analyze"),
    context: z
      .string()
      .optional()
      .describe("Additional context about the query"),
  }),

  execute(params, ctx) {
    const startTime = performance.now();

    if (!ctx.teamId) {
      return Promise.resolve(failure("UNAUTHORIZED", "Team context required"));
    }

    const analysis = ctx.services.rag.analyzeQuery(params.query);

    let complexity: "simple" | "moderate" | "complex" = "simple";
    if (analysis.searchTerms.length > 5 || analysis.entities.length > 2) {
      complexity = "complex";
    } else if (analysis.searchTerms.length > 2) {
      complexity = "moderate";
    }

    return Promise.resolve(
      success(
        {
          originalQuery: params.query,
          normalizedQuery: analysis.normalizedQuery,
          intent: analysis.intent,
          entities: analysis.entities.map((e) => ({
            text: e.text,
            type: e.type,
            confidence: e.confidence,
          })),
          searchTerms: analysis.searchTerms,
          temporal: analysis.temporal,
          complexity,
          suggestedFilters: {
            connectorTypes: analysis.entities
              .filter((e) => e.type === "source")
              .map((e) => e.text.toLowerCase()),
          },
        },
        {
          latencyMs: performance.now() - startTime,
          source: "query-analyzer",
        }
      )
    );
  },
});
