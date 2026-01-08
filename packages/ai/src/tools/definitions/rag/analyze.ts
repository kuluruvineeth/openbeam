import { z } from "zod";
import { defineTool, failure, success } from "../../builder";

export const ragAnalyzeTool = defineTool({
  name: "rag_analyze",
  description: `Analyze a user query to understand intent, extract entities, and optimize search strategy.

USE THIS WHEN:
- Query is complex or multi-faceted and needs decomposition
- You need to identify named entities (people, projects, dates) before searching
- Query intent is ambiguous and you need to understand what the user really wants
- Planning a multi-step search strategy for comprehensive results
- Query contains temporal references ("last week", "Q3", "recent") that need resolution

DO NOT USE WHEN:
- Query is simple and clear (proceed directly to search_hybrid or rag_answer)
- You just need to search for documents (use search_hybrid)
- User wants a direct answer (use rag_answer)
- Query has no ambiguity or complexity

RETURNS: Structured analysis including normalized query, detected intent (question/command/exploration), extracted entities with types and confidence, key search terms, temporal context if present, and suggested filters for optimal retrieval.`,
  category: "rag",
  deferLoading: false,
  searchKeywords: ["analyze", "intent", "decompose", "query", "understand"],

  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        "The query to analyze. Can be a natural language question, command, or search phrase. Examples: 'Show me what John worked on last quarter', 'engineering decisions about the new auth system'"
      ),
    context: z
      .string()
      .optional()
      .describe(
        "Additional context about the query. Include relevant conversation history or user preferences that might disambiguate intent."
      ),
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
